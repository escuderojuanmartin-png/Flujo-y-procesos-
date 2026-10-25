import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Download,
  FileImage,
  GitBranch,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  DiagramMode,
  NodeKind,
  PartitionedWorkflow,
  ProcessEdge,
  ProcessNode,
} from "../types/process";
import {
  computeFlowchartLayout,
  exportSvgElementToFile,
  exportSvgElementToPng,
} from "../utils/flowchartLayout";

interface FlowchartDesignerProps {
  workflow: PartitionedWorkflow;
  isSyncingProcedure: boolean;
  onUpdateWorkflow: (updated: PartitionedWorkflow) => void;
  onSyncProcedureFromFlow: () => void;
  onGoToProcedure: () => void;
}

function wrapSvgLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Paso"];
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }

  const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const remaining = words.slice(consumedWords).join(" ");
  if (remaining) {
    const finalLine =
      remaining.length > maxCharsPerLine + 3
        ? `${remaining.slice(0, maxCharsPerLine)}…`
        : remaining;
    lines.push(finalLine);
  }

  return lines.slice(0, maxLines);
}

const NODE_KIND_LABELS: Record<NodeKind, string> = {
  start: "Inicio",
  step: "Tarea operativa",
  decision: "Decisión (Sí/No)",
  system: "Sistema / Registro",
  end: "Fin de proceso",
};

export const FlowchartDesigner: React.FC<FlowchartDesignerProps> = ({
  workflow,
  isSyncingProcedure,
  onUpdateWorkflow,
  onSyncProcedureFromFlow,
  onGoToProcedure,
}) => {
  const [diagramMode, setDiagramMode] = useState<DiagramMode>("vertical");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    workflow.nodes[0]?.id ?? null
  );
  const [zoom, setZoom] = useState<number>(0.95);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragOriginRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [newEdgeTarget, setNewEdgeTarget] = useState<string>("");
  const [newEdgeLabel, setNewEdgeLabel] = useState<string>("");

  useEffect(() => {
    if (!workflow.nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(workflow.nodes[0]?.id ?? null);
    }
  }, [workflow.id, workflow.nodes, selectedNodeId]);

  const layout = useMemo(
    () => computeFlowchartLayout(workflow, diagramMode),
    [workflow, diagramMode]
  );

  const selectedNode = useMemo(
    () => workflow.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [workflow.nodes, selectedNodeId]
  );

  const outgoingEdges = useMemo(
    () => workflow.edges.filter((e) => e.from === selectedNodeId),
    [workflow.edges, selectedNodeId]
  );

  const syncRolesList = (nodes: ProcessNode[]): string[] => {
    const roles: string[] = [];
    for (const n of nodes) {
      const r = n.role.trim();
      if (r && !roles.includes(r)) roles.push(r);
    }
    return roles;
  };

  const handleNodeFieldChange = (patch: Partial<ProcessNode>) => {
    if (!selectedNode) return;
    const nextNodes = workflow.nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, ...patch } : n
    );
    onUpdateWorkflow({
      ...workflow,
      nodes: nextNodes,
      roles: syncRolesList(nextNodes),
    });
  };

  const handleInsertStepAfter = () => {
    const newId = `n-${Date.now().toString().slice(-5)}`;
    const baseRole = selectedNode?.role || workflow.roles[0] || "Responsable operativo";
    const newNode: ProcessNode = {
      id: newId,
      type: "step",
      label: "Nuevo paso operativo",
      description: "Describe la actividad específica que se ejecuta en esta instancia.",
      role: baseRole,
      systemUsed: "",
      duration: "10 min",
    };

    if (!selectedNode) {
      const nextNodes = [...workflow.nodes, newNode];
      onUpdateWorkflow({
        ...workflow,
        nodes: nextNodes,
        roles: syncRolesList(nextNodes),
      });
      setSelectedNodeId(newId);
      return;
    }

    const currentOut = workflow.edges.filter((e) => e.from === selectedNode.id);
    let nextEdges = [...workflow.edges];

    if (selectedNode.type !== "decision" && currentOut.length === 1) {
      const existingEdge = currentOut[0];
      nextEdges = workflow.edges.map((e) =>
        e.id === existingEdge.id ? { ...e, to: newId } : e
      );
      nextEdges.push({
        id: `e-${Date.now().toString().slice(-5)}-b`,
        from: newId,
        to: existingEdge.to,
        label: "",
      });
    } else {
      nextEdges.push({
        id: `e-${Date.now().toString().slice(-5)}`,
        from: selectedNode.id,
        to: newId,
        label: selectedNode.type === "decision" ? "Nueva rama" : "",
      });
    }

    const idx = workflow.nodes.findIndex((n) => n.id === selectedNode.id);
    const nextNodes = [...workflow.nodes];
    nextNodes.splice(idx + 1, 0, newNode);

    onUpdateWorkflow({
      ...workflow,
      nodes: nextNodes,
      edges: nextEdges,
      roles: syncRolesList(nextNodes),
    });
    setSelectedNodeId(newId);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNode || workflow.nodes.length <= 1) return;
    const incoming = workflow.edges.filter((e) => e.to === selectedNode.id);
    const outgoing = workflow.edges.filter((e) => e.from === selectedNode.id);

    let nextEdges = workflow.edges.filter(
      (e) => e.from !== selectedNode.id && e.to !== selectedNode.id
    );

    if (outgoing.length > 0) {
      const primaryTarget = outgoing[0].to;
      for (const inc of incoming) {
        const alreadyExists = nextEdges.some(
          (e) => e.from === inc.from && e.to === primaryTarget
        );
        if (!alreadyExists && inc.from !== primaryTarget) {
          nextEdges.push({
            id: `e-heal-${inc.id}`,
            from: inc.from,
            to: primaryTarget,
            label: inc.label,
          });
        }
      }
    }

    const nextNodes = workflow.nodes.filter((n) => n.id !== selectedNode.id);
    onUpdateWorkflow({
      ...workflow,
      nodes: nextNodes,
      edges: nextEdges,
      roles: syncRolesList(nextNodes),
    });
    setSelectedNodeId(nextNodes[0]?.id ?? null);
  };

  const handleUpdateEdge = (edgeId: string, patch: Partial<ProcessEdge>) => {
    const nextEdges = workflow.edges.map((e) =>
      e.id === edgeId ? { ...e, ...patch } : e
    );
    onUpdateWorkflow({ ...workflow, edges: nextEdges });
  };

  const handleDeleteEdge = (edgeId: string) => {
    onUpdateWorkflow({
      ...workflow,
      edges: workflow.edges.filter((e) => e.id !== edgeId),
    });
  };

  const handleAddEdgeFromSelected = () => {
    if (!selectedNode || !newEdgeTarget || newEdgeTarget === selectedNode.id) return;
    const exists = workflow.edges.some(
      (e) => e.from === selectedNode.id && e.to === newEdgeTarget
    );
    if (exists) return;

    const created: ProcessEdge = {
      id: `e-${Date.now().toString().slice(-5)}`,
      from: selectedNode.id,
      to: newEdgeTarget,
      label: newEdgeLabel.trim(),
    };
    onUpdateWorkflow({
      ...workflow,
      edges: [...workflow.edges, created],
    });
    setNewEdgeLabel("");
    setNewEdgeTarget("");
  };

  const handleMouseDownCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-node-interactive='true']")) {
      return;
    }
    setIsDraggingCanvas(true);
    dragOriginRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCanvas || !dragOriginRef.current) return;
    const dx = e.clientX - dragOriginRef.current.x;
    const dy = e.clientY - dragOriginRef.current.y;
    setPan({
      x: dragOriginRef.current.panX + dx,
      y: dragOriginRef.current.panY + dy,
    });
  };

  const handleMouseUpCanvas = () => {
    setIsDraggingCanvas(false);
    dragOriginRef.current = null;
  };

  const resetView = () => {
    setZoom(0.95);
    setPan({ x: 0, y: 0 });
  };

  const safeSlug = workflow.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");

  return (
    <div className="space-y-4">
      {/* Canvas Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switch */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setDiagramMode("vertical");
                resetView();
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                diagramMode === "vertical"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Flujo Vertical
            </button>
            <button
              type="button"
              onClick={() => {
                setDiagramMode("swimlanes");
                resetView();
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                diagramMode === "swimlanes"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Carriles por Rol
            </button>
          </div>

          {/* Zoom */}
          <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))}
              title="Reducir zoom"
              className="p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono tabular-nums text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
              title="Ampliar zoom"
              className="p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              title="Centrar diagrama"
              className="p-2 text-slate-600 hover:text-slate-900 border-l border-slate-200 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleInsertStepAfter}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Insertar paso
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSyncProcedureFromFlow}
            disabled={isSyncingProcedure}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSyncingProcedure ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sincronizando POE...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar procedimiento desde flujo
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (svgRef.current) {
                exportSvgElementToFile(svgRef.current, `flujo-${safeSlug || "proceso"}.svg`);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            SVG
          </button>

          <button
            type="button"
            onClick={() => {
              if (svgRef.current) {
                exportSvgElementToPng(
                  svgRef.current,
                  layout.width,
                  layout.height,
                  `flujo-${safeSlug || "proceso"}.png`
                );
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileImage className="w-3.5 h-3.5" />
            PNG
          </button>

          <button
            type="button"
            onClick={onGoToProcedure}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ver procedimiento
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split: Interactive SVG Canvas + Step Designer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* SVG Viewport */}
        <div
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseLeave={handleMouseUpCanvas}
          className={`xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-auto relative min-h-[580px] max-h-[740px] select-none ${
            isDraggingCanvas ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <div
            className="min-w-full min-h-full flex items-start justify-center p-4"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            <svg
              ref={svgRef}
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="overflow-visible"
            >
              <defs>
                <pattern
                  id="architectural-grid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="1" fill="#e2e8f0" />
                </pattern>
                <marker
                  id="flow-arrow"
                  viewBox="0 0 10 10"
                  refX="8.5"
                  refY="5"
                  markerWidth="6.5"
                  markerHeight="6.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#475569" />
                </marker>
                <marker
                  id="flow-arrow-back"
                  viewBox="0 0 10 10"
                  refX="8.5"
                  refY="5"
                  markerWidth="6.5"
                  markerHeight="6.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#1d4ed8" />
                </marker>
              </defs>

              <rect
                x={0}
                y={0}
                width={layout.width}
                height={layout.height}
                fill="#ffffff"
              />
              <rect
                x={0}
                y={0}
                width={layout.width}
                height={layout.height}
                fill="url(#architectural-grid)"
              />

              {diagramMode === "swimlanes" &&
                layout.lanes.map((lane) => (
                  <g key={lane.role}>
                    <rect
                      x={16}
                      y={lane.y}
                      width={layout.width - 32}
                      height={lane.height}
                      fill={lane.index % 2 === 0 ? "#ffffff" : "#f8fafc"}
                      fillOpacity={0.88}
                      stroke="#cbd5e1"
                      strokeWidth={1}
                    />
                    <rect
                      x={16}
                      y={lane.y}
                      width={168}
                      height={lane.height}
                      fill="#f1f5f9"
                      stroke="#cbd5e1"
                      strokeWidth={1}
                    />
                    {wrapSvgLines(lane.role, 20, 3).map((line, lIdx, arr) => (
                      <text
                        key={lIdx}
                        x={100}
                        y={lane.y + lane.height / 2 + (lIdx - (arr.length - 1) / 2) * 16}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#0f172a"
                        fontSize="12"
                        fontWeight="600"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                ))}

              {layout.edges.map((routed) => {
                const hasLabel = Boolean(routed.edge.label?.trim());
                const labelText = routed.edge.label.trim();
                const badgeW = Math.max(44, labelText.length * 6.8 + 16);
                return (
                  <g key={routed.edge.id}>
                    <path
                      d={routed.path}
                      fill="none"
                      stroke={routed.isBackEdge ? "#1d4ed8" : "#475569"}
                      strokeWidth={1.65}
                      strokeDasharray={routed.isBackEdge ? "5 4" : undefined}
                      markerEnd={
                        routed.isBackEdge ? "url(#flow-arrow-back)" : "url(#flow-arrow)"
                      }
                    />
                    {hasLabel && (
                      <g transform={`translate(${routed.labelX}, ${routed.labelY})`}>
                        <rect
                          x={-badgeW / 2}
                          y={-10}
                          width={badgeW}
                          height={20}
                          rx={4}
                          fill="#ffffff"
                          stroke="#cbd5e1"
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#1e293b"
                          fontSize="11"
                          fontWeight="600"
                          fontFamily="Public Sans, sans-serif"
                        >
                          {labelText}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {layout.nodes.map((pNode) => {
                const { node, x, y, width, height } = pNode;
                const isSelected = node.id === selectedNodeId;
                const left = x - width / 2;
                const top = y - height / 2;

                if (node.type === "decision") {
                  const diamondPoints = `${x},${top} ${left + width},${y} ${x},${top + height} ${left},${y}`;
                  const lines = wrapSvgLines(node.label, 21, 2);
                  return (
                    <g
                      key={node.id}
                      data-node-interactive="true"
                      onClick={() => setSelectedNodeId(node.id)}
                      className="cursor-pointer"
                    >
                      <polygon
                        points={diamondPoints}
                        fill={isSelected ? "#eff6ff" : "#fffbeb"}
                        stroke={isSelected ? "#1d4ed8" : "#d97706"}
                        strokeWidth={isSelected ? 2.4 : 1.5}
                      />
                      <text
                        x={x}
                        y={y - 22}
                        textAnchor="middle"
                        fill="#b45309"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="Public Sans, sans-serif"
                      >
                        Decisión
                      </text>
                      {lines.map((line, idx) => (
                        <text
                          key={idx}
                          x={x}
                          y={y - 3 + idx * 15}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#0f172a"
                          fontSize="12"
                          fontWeight="600"
                          fontFamily="Plus Jakarta Sans, sans-serif"
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                }

                if (node.type === "start" || node.type === "end") {
                  const isStart = node.type === "start";
                  const lines = wrapSvgLines(node.label, 25, 2);
                  return (
                    <g
                      key={node.id}
                      data-node-interactive="true"
                      onClick={() => setSelectedNodeId(node.id)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={left}
                        y={top}
                        width={width}
                        height={height}
                        rx={height / 2}
                        fill={isStart ? "#f0fdf4" : "#f1f5f9"}
                        stroke={
                          isSelected
                            ? "#1d4ed8"
                            : isStart
                              ? "#16a34a"
                              : "#334155"
                        }
                        strokeWidth={isSelected ? 2.4 : 1.6}
                      />
                      {lines.map((line, idx) => (
                        <text
                          key={idx}
                          x={x}
                          y={
                            lines.length === 1
                              ? y + 1
                              : y - 7 + idx * 14
                          }
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#0f172a"
                          fontSize="12"
                          fontWeight="600"
                          fontFamily="Plus Jakarta Sans, sans-serif"
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                }

                const isSystem = node.type === "system";
                const titleLines = wrapSvgLines(node.label, 27, 2);
                const metaParts = [node.systemUsed, node.duration].filter(Boolean);
                const metaLine = metaParts.join(" · ");

                return (
                  <g
                    key={node.id}
                    data-node-interactive="true"
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={left}
                      y={top}
                      width={width}
                      height={height}
                      rx={8}
                      fill={isSelected ? "#eff6ff" : isSystem ? "#f8fafc" : "#ffffff"}
                      stroke={isSelected ? "#1d4ed8" : "#94a3b8"}
                      strokeWidth={isSelected ? 2.4 : 1.35}
                    />
                    {isSystem && (
                      <>
                        <line
                          x1={left + 9}
                          y1={top}
                          x2={left + 9}
                          y2={top + height}
                          stroke={isSelected ? "#1d4ed8" : "#cbd5e1"}
                          strokeWidth={1.2}
                        />
                        <line
                          x1={left + width - 9}
                          y1={top}
                          x2={left + width - 9}
                          y2={top + height}
                          stroke={isSelected ? "#1d4ed8" : "#cbd5e1"}
                          strokeWidth={1.2}
                        />
                      </>
                    )}

                    <text
                      x={x}
                      y={top + 16}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10.5"
                      fontWeight="500"
                      fontFamily="Public Sans, sans-serif"
                    >
                      {node.role.length > 30 ? `${node.role.slice(0, 29)}…` : node.role}
                    </text>

                    {titleLines.map((line, idx) => (
                      <text
                        key={idx}
                        x={x}
                        y={
                          titleLines.length === 1
                            ? top + 43
                            : top + 36 + idx * 15
                        }
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="12.5"
                        fontWeight="600"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                      >
                        {line}
                      </text>
                    ))}

                    {metaLine && (
                      <text
                        x={x}
                        y={top + height - 11}
                        textAnchor="middle"
                        fill="#475569"
                        fontSize="10"
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {metaLine.length > 32 ? `${metaLine.slice(0, 31)}…` : metaLine}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Side: Step Designer */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-5">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs text-slate-500">
                    Diseño posterior del bloque seleccionado
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                    {selectedNode.label}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteSelectedNode}
                  disabled={workflow.nodes.length <= 1}
                  title="Eliminar paso del diagrama"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nombre en el diagrama
                  </label>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) => handleNodeFieldChange({ label: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tipo de figura
                    </label>
                    <select
                      value={selectedNode.type}
                      onChange={(e) =>
                        handleNodeFieldChange({ type: e.target.value as NodeKind })
                      }
                      className="w-full px-2.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      {(Object.keys(NODE_KIND_LABELS) as NodeKind[]).map((k) => (
                        <option key={k} value={k}>
                          {NODE_KIND_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Duración estimada
                    </label>
                    <input
                      type="text"
                      value={selectedNode.duration}
                      onChange={(e) => handleNodeFieldChange({ duration: e.target.value })}
                      placeholder="Ej. 15 min"
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Rol responsable
                    </label>
                    <input
                      type="text"
                      value={selectedNode.role}
                      onChange={(e) => handleNodeFieldChange({ role: e.target.value })}
                      placeholder="Ej. Coordinador"
                      className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Sistema / Documento
                    </label>
                    <input
                      type="text"
                      value={selectedNode.systemUsed}
                      onChange={(e) => handleNodeFieldChange({ systemUsed: e.target.value })}
                      placeholder="Ej. TMS / SAP"
                      className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Descripción operativa del paso
                  </label>
                  <textarea
                    rows={3}
                    value={selectedNode.description}
                    onChange={(e) => handleNodeFieldChange({ description: e.target.value })}
                    className="w-full px-3 py-2 text-xs leading-relaxed text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 resize-y"
                  />
                </div>
              </div>

              {/* Outgoing Connections */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    Conexiones de salida ({outgoingEdges.length})
                  </span>
                </div>

                {outgoingEdges.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Este bloque no tiene flechas de salida.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {outgoingEdges.map((edge) => (
                      <div
                        key={edge.id}
                        className="grid grid-cols-12 gap-1.5 items-center py-1.5 border-b border-slate-100 last:border-b-0"
                      >
                        <input
                          type="text"
                          value={edge.label}
                          onChange={(e) =>
                            handleUpdateEdge(edge.id, { label: e.target.value })
                          }
                          placeholder="Condición (ej. Sí)"
                          className="col-span-4 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-600"
                        />
                        <select
                          value={edge.to}
                          onChange={(e) =>
                            handleUpdateEdge(edge.id, { to: e.target.value })
                          }
                          className="col-span-7 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-600 truncate"
                        >
                          {workflow.nodes
                            .filter((n) => n.id !== selectedNode.id)
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                → {n.label}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteEdge(edge.id)}
                          title="Quitar flecha"
                          className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <span className="block text-xs text-slate-500">
                    Agregar nueva transición o bifurcación:
                  </span>
                  <div className="grid grid-cols-12 gap-1.5">
                    <input
                      type="text"
                      value={newEdgeLabel}
                      onChange={(e) => setNewEdgeLabel(e.target.value)}
                      placeholder="Etiqueta (ej. No)"
                      className="col-span-4 px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                    />
                    <select
                      value={newEdgeTarget}
                      onChange={(e) => setNewEdgeTarget(e.target.value)}
                      className="col-span-6 px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                    >
                      <option value="">Destino...</option>
                      {workflow.nodes
                        .filter((n) => n.id !== selectedNode.id)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddEdgeFromSelected}
                      disabled={!newEdgeTarget}
                      className="col-span-2 px-2 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md disabled:opacity-40 cursor-pointer"
                    >
                      Unir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Selecciona cualquier figura en el lienzo para editar su rol, condición o secuencia.
              </p>
              <button
                type="button"
                onClick={handleInsertStepAfter}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear primer paso
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Haz clic en un bloque para editar · Arrastra el lienzo para desplazar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
