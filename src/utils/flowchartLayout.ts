import {
  ConversationSession,
  DiagramMode,
  PartitionedWorkflow,
  ProcessEdge,
  ProcessNode,
} from "../types/process";

export interface PositionedNode {
  node: ProcessNode;
  x: number; // center X
  y: number; // center Y
  width: number;
  height: number;
  layer: number;
  laneIndex: number;
}

export interface RoutedEdge {
  edge: ProcessEdge;
  path: string;
  labelX: number;
  labelY: number;
  isBackEdge: boolean;
}

export interface SwimlaneBand {
  role: string;
  index: number;
  y: number;
  height: number;
}

export interface FlowchartLayoutResult {
  width: number;
  height: number;
  nodes: PositionedNode[];
  edges: RoutedEdge[];
  lanes: SwimlaneBand[];
}

function getNodeDimensions(node: ProcessNode): { width: number; height: number } {
  if (node.type === "start" || node.type === "end") {
    return { width: 210, height: 54 };
  }
  if (node.type === "decision") {
    return { width: 236, height: 112 };
  }
  return { width: 244, height: 84 };
}

function assignNodeLayers(nodes: ProcessNode[], edges: ProcessEdge[]): Map<string, number> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to) && e.from !== e.to);

  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    outgoing.set(n.id, []);
  }
  for (const e of validEdges) {
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    outgoing.get(e.from)?.push(e.to);
  }

  // Roots: start nodes or zero in-degree
  const roots = nodes.filter((n) => n.type === "start" || (inDegree.get(n.id) || 0) === 0);
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  const layers = new Map<string, number>();
  const queue: Array<{ id: string; depth: number; visited: Set<string> }> = [];

  for (const r of roots) {
    layers.set(r.id, 0);
    queue.push({ id: r.id, depth: 0, visited: new Set([r.id]) });
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = outgoing.get(current.id) || [];
    for (const nextId of neighbors) {
      if (current.visited.has(nextId)) {
        continue;
      }
      const nextDepth = current.depth + 1;
      const prevDepth = layers.get(nextId);
      if (prevDepth === undefined || nextDepth > prevDepth) {
        layers.set(nextId, Math.min(nextDepth, nodes.length));
        const nextVisited = new Set(current.visited);
        nextVisited.add(nextId);
        queue.push({ id: nextId, depth: Math.min(nextDepth, nodes.length), visited: nextVisited });
      }
    }
  }

  let maxLayer = 0;
  for (const val of layers.values()) {
    if (val > maxLayer) maxLayer = val;
  }
  for (const n of nodes) {
    if (!layers.has(n.id)) {
      maxLayer += 1;
      layers.set(n.id, maxLayer);
    }
  }

  return layers;
}

export function computeFlowchartLayout(
  workflow: PartitionedWorkflow,
  mode: DiagramMode
): FlowchartLayoutResult {
  const { nodes, edges } = workflow;
  if (nodes.length === 0) {
    return { width: 800, height: 420, nodes: [], edges: [], lanes: [] };
  }

  const layerMap = assignNodeLayers(nodes, edges);

  if (mode === "swimlanes") {
    return computeSwimlaneLayout(nodes, edges, layerMap, workflow.roles);
  }
  return computeVerticalLayout(nodes, edges, layerMap);
}

function computeVerticalLayout(
  nodes: ProcessNode[],
  edges: ProcessEdge[],
  layerMap: Map<string, number>
): FlowchartLayoutResult {
  const byLayer = new Map<number, ProcessNode[]>();
  let maxLayer = 0;

  for (const n of nodes) {
    const l = layerMap.get(n.id) ?? 0;
    if (l > maxLayer) maxLayer = l;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n);
  }

  const colGap = 300;
  const rowGap = 148;
  const paddingX = 110;
  const paddingY = 76;

  let maxCols = 1;
  for (const group of byLayer.values()) {
    if (group.length > maxCols) maxCols = group.length;
  }

  const canvasWidth = Math.max(820, maxCols * colGap + paddingX * 2);
  const centerX = canvasWidth / 2;

  const positionedMap = new Map<string, PositionedNode>();
  const positionedList: PositionedNode[] = [];

  for (let l = 0; l <= maxLayer; l++) {
    const group = byLayer.get(l) || [];
    const count = group.length;
    const y = paddingY + l * rowGap;

    group.forEach((node, idx) => {
      const dims = getNodeDimensions(node);
      const offsetIndex = idx - (count - 1) / 2;
      const x = centerX + offsetIndex * colGap;
      const pNode: PositionedNode = {
        node,
        x,
        y,
        width: dims.width,
        height: dims.height,
        layer: l,
        laneIndex: 0,
      };
      positionedMap.set(node.id, pNode);
      positionedList.push(pNode);
    });
  }

  const canvasHeight = Math.max(480, paddingY * 2 + maxLayer * rowGap + 70);
  const routedEdges = routeVerticalEdges(edges, positionedMap, canvasWidth);

  return {
    width: canvasWidth,
    height: canvasHeight,
    nodes: positionedList,
    edges: routedEdges,
    lanes: [],
  };
}

function routeVerticalEdges(
  edges: ProcessEdge[],
  positionedMap: Map<string, PositionedNode>,
  canvasWidth: number
): RoutedEdge[] {
  const outgoingCount = new Map<string, number>();
  const outgoingSeen = new Map<string, number>();
  for (const e of edges) {
    if (positionedMap.has(e.from) && positionedMap.has(e.to)) {
      outgoingCount.set(e.from, (outgoingCount.get(e.from) || 0) + 1);
    }
  }

  const results: RoutedEdge[] = [];

  edges.forEach((edge, idx) => {
    const source = positionedMap.get(edge.from);
    const target = positionedMap.get(edge.to);
    if (!source || !target) return;

    const seen = outgoingSeen.get(edge.from) || 0;
    outgoingSeen.set(edge.from, seen + 1);
    const totalOut = outgoingCount.get(edge.from) || 1;

    const isBackEdge = target.layer <= source.layer && source.node.id !== target.node.id;

    if (isBackEdge) {
      const goRight = source.x >= canvasWidth / 2;
      const startX = goRight ? source.x + source.width / 2 : source.x - source.width / 2;
      const startY = source.y;
      const endX = goRight ? target.x + target.width / 2 : target.x - target.width / 2;
      const endY = target.y;
      const channelX = goRight
        ? Math.max(source.x, target.x) + 175 + (idx % 2) * 18
        : Math.min(source.x, target.x) - 175 - (idx % 2) * 18;

      const path = `M ${startX} ${startY} L ${channelX} ${startY} L ${channelX} ${endY} L ${endX} ${endY}`;
      results.push({
        edge,
        path,
        labelX: channelX,
        labelY: (startY + endY) / 2,
        isBackEdge: true,
      });
      return;
    }

    let startX = source.x;
    let startY = source.y + source.height / 2;

    if (source.node.type === "decision" && totalOut >= 2) {
      if (target.x < source.x - 30) {
        startX = source.x - source.width / 2;
        startY = source.y;
      } else if (target.x > source.x + 30) {
        startX = source.x + source.width / 2;
        startY = source.y;
      } else if (seen === 1 && Math.abs(target.x - source.x) <= 30) {
        startX = source.x + source.width / 2;
        startY = source.y;
      }
    }

    const endX = target.x;
    const endY = target.y - target.height / 2;

    let path = "";
    let labelX = (startX + endX) / 2;
    let labelY = (startY + endY) / 2;

    if (startY === source.y && Math.abs(endX - startX) > 10) {
      path = `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`;
      labelX = (startX + endX) / 2;
      labelY = startY - 10;
    } else if (Math.abs(startX - endX) < 4) {
      path = `M ${startX} ${startY} L ${endX} ${endY}`;
      labelX = startX;
      labelY = (startY + endY) / 2;
    } else {
      const midY = startY + (endY - startY) * 0.5;
      path = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
      labelX = (startX + endX) / 2;
      labelY = midY - 10;
    }

    results.push({
      edge,
      path,
      labelX,
      labelY,
      isBackEdge: false,
    });
  });

  return results;
}

function computeSwimlaneLayout(
  nodes: ProcessNode[],
  edges: ProcessEdge[],
  layerMap: Map<string, number>,
  declaredRoles: string[]
): FlowchartLayoutResult {
  const roleOrder: string[] = [];
  for (const r of declaredRoles || []) {
    const clean = r.trim();
    if (clean && !roleOrder.includes(clean)) roleOrder.push(clean);
  }
  for (const n of nodes) {
    const clean = (n.role || "General").trim();
    if (!roleOrder.includes(clean)) roleOrder.push(clean);
  }
  if (roleOrder.length === 0) roleOrder.push("Operación General");

  const headerWidth = 190;
  const colWidth = 300;
  const baseLaneHeight = 165;
  const topMargin = 52;

  let maxLayer = 0;
  for (const l of layerMap.values()) {
    if (l > maxLayer) maxLayer = l;
  }

  const cellGroups = new Map<string, ProcessNode[]>();
  for (const n of nodes) {
    const role = (n.role || roleOrder[0]).trim();
    const laneIdx = Math.max(0, roleOrder.indexOf(role));
    const l = layerMap.get(n.id) ?? 0;
    const key = `${laneIdx}:${l}`;
    if (!cellGroups.has(key)) cellGroups.set(key, []);
    cellGroups.get(key)!.push(n);
  }

  const lanes: SwimlaneBand[] = [];
  let currentY = topMargin;

  roleOrder.forEach((role, laneIdx) => {
    let maxStackInLane = 1;
    for (let l = 0; l <= maxLayer; l++) {
      const stack = cellGroups.get(`${laneIdx}:${l}`)?.length || 0;
      if (stack > maxStackInLane) maxStackInLane = stack;
    }
    const laneHeight = Math.max(baseLaneHeight, maxStackInLane * 132 + 36);
    lanes.push({
      role,
      index: laneIdx,
      y: currentY,
      height: laneHeight,
    });
    currentY += laneHeight;
  });

  const canvasWidth = Math.max(960, headerWidth + (maxLayer + 1) * colWidth + 90);
  const canvasHeight = Math.max(440, currentY + 48);

  const positionedMap = new Map<string, PositionedNode>();
  const positionedList: PositionedNode[] = [];

  for (const [key, stack] of cellGroups.entries()) {
    const [laneStr, layerStr] = key.split(":");
    const laneIdx = Number(laneStr);
    const l = Number(layerStr);
    const lane = lanes[laneIdx];
    const x = headerWidth + l * colWidth + colWidth / 2;

    stack.forEach((node, idx) => {
      const dims = getNodeDimensions(node);
      const stepY = lane.height / (stack.length + 1);
      const y = lane.y + stepY * (idx + 1);
      const pNode: PositionedNode = {
        node,
        x,
        y,
        width: dims.width,
        height: dims.height,
        layer: l,
        laneIndex: laneIdx,
      };
      positionedMap.set(node.id, pNode);
      positionedList.push(pNode);
    });
  }

  const routedEdges: RoutedEdge[] = [];
  edges.forEach((edge) => {
    const source = positionedMap.get(edge.from);
    const target = positionedMap.get(edge.to);
    if (!source || !target) return;

    const isBackEdge = target.layer < source.layer;
    if (isBackEdge) {
      const startX = source.x;
      const startY = source.y - source.height / 2;
      const endX = target.x;
      const endY = target.y - target.height / 2;
      const arcY = Math.min(startY, endY) - 42;
      const path = `M ${startX} ${startY} L ${startX} ${arcY} L ${endX} ${arcY} L ${endX} ${endY}`;
      routedEdges.push({
        edge,
        path,
        labelX: (startX + endX) / 2,
        labelY: arcY - 8,
        isBackEdge: true,
      });
      return;
    }

    if (target.layer === source.layer) {
      const goingDown = target.y >= source.y;
      const startX = source.x;
      const startY = goingDown ? source.y + source.height / 2 : source.y - source.height / 2;
      const endX = target.x;
      const endY = goingDown ? target.y - target.height / 2 : target.y + target.height / 2;
      const path = `M ${startX} ${startY} L ${endX} ${endY}`;
      routedEdges.push({
        edge,
        path,
        labelX: startX + 26,
        labelY: (startY + endY) / 2,
        isBackEdge: false,
      });
      return;
    }

    const startX = source.x + source.width / 2;
    const startY = source.y;
    const endX = target.x - target.width / 2;
    const endY = target.y;
    const midX = startX + (endX - startX) * 0.5;

    const path =
      Math.abs(startY - endY) < 4
        ? `M ${startX} ${startY} L ${endX} ${endY}`
        : `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

    routedEdges.push({
      edge,
      path,
      labelX: midX,
      labelY: (startY + endY) / 2 - 10,
      isBackEdge: false,
    });
  });

  return {
    width: canvasWidth,
    height: canvasHeight,
    nodes: positionedList,
    edges: routedEdges,
    lanes,
  };
}

export function exportSvgElementToFile(svgEl: SVGSVGElement, filename: string): void {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const serializer = new XMLSerializer();
  const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(clone)}`;
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSvgElementToPng(
  svgEl: SVGSVGElement,
  width: number,
  height: number,
  filename: string
): void {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          const pngUrl = URL.createObjectURL(pngBlob);
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
        }
      }, "image/png");
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function buildWorkflowMarkdown(
  session: ConversationSession,
  workflow: PartitionedWorkflow
): string {
  const procedure = workflow?.procedure || {
    code: "POE-001",
    objective: "Estandarizar el procedimiento.",
    scope: "Área operativa.",
    narrativeText: "",
    prerequisites: [],
    steps: [],
    exceptions: [],
  };
  const prerequisites = Array.isArray(procedure.prerequisites) ? procedure.prerequisites : [];
  const steps = Array.isArray(procedure.steps) ? procedure.steps : [];
  const exceptions = Array.isArray(procedure.exceptions) ? procedure.exceptions : [];

  const lines: string[] = [
    `# ${procedure.code || "POE-001"} — ${workflow?.name || "Procedimiento"}`,
    ``,
    `- **Sesión de origen:** ${session?.title || "Relevamiento"}`,
    `- **Tipo de cliente:** ${session?.clientType === "externo" ? "Cliente externo" : "Cliente interno"} (${session?.clientName || "General"})`,
    `- **Departamento:** ${workflow?.department || "Operaciones"}`,
    `- **Interlocutor relevado:** ${session?.interviewee || "Referente operativo"}`,
    `- **Disparador:** ${workflow?.trigger || "Inicio de solicitud"}`,
    `- **Entregable final:** ${workflow?.deliverable || "Entrega conforme"}`,
    `- **Tiempo estimado de ciclo:** ${workflow?.estimatedTotalTime || "30 min"}`,
    ``,
    `## 1. Objetivo`,
    procedure.objective || "Estandarizar el procedimiento operativo.",
    ``,
    `## 2. Alcance`,
    procedure.scope || "Aplica al área operativa correspondiente.",
    ``,
    `## 3. Narración Integral del Procedimiento`,
    procedure.narrativeText || "Relato del procedimiento operativo en curso.",
    ``,
    `## 4. Requisitos Previos`,
    ...(prerequisites.length > 0
      ? prerequisites.map((req) => `- ${req}`)
      : ["- Sin requisitos especiales declarados."]),
    ``,
    `## 5. Desarrollo Paso a Paso`,
    ...steps.flatMap((s) => [
      `### Paso ${String(s.stepNumber || 1).padStart(2, "0")}. ${s.title || "Tarea"}`,
      `- **Responsable:** ${s.actor || "Responsable"}`,
      `- **Acción operativa:** ${s.instruction || ""}`,
      `- **Punto de control / Evidencia:** ${s.controlPoint || "Registro"}`,
      ``,
    ]),
    `## 6. Manejo de Excepciones y Contingencias`,
    ...(exceptions.length > 0
      ? exceptions.map((ex) => `- **${ex.scenario}:** ${ex.resolution}`)
      : ["- Sin contingencias específicas registradas."]),
    ``,
  ];
  return lines.join("\n");
}
