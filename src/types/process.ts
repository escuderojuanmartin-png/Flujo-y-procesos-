export type ClientType = "interno" | "externo";

export type WorkspaceTab = "resumen" | "transcripcion" | "flujo" | "procedimiento";

export type NodeKind = "start" | "step" | "decision" | "system" | "end";

export type DiagramMode = "vertical" | "swimlanes";

export type NarrationTone = "operativo" | "ejecutivo" | "capacitacion";

export interface ProcessNode {
  id: string;
  type: NodeKind;
  label: string;
  description: string;
  role: string;
  systemUsed: string;
  duration: string;
}

export interface ProcessEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface ProcedureStep {
  stepNumber: number;
  title: string;
  actor: string;
  instruction: string;
  controlPoint: string;
}

export interface ProcedureException {
  scenario: string;
  resolution: string;
}

export interface ProcedureDocument {
  code: string;
  objective: string;
  scope: string;
  narrativeText: string;
  prerequisites: string[];
  steps: ProcedureStep[];
  exceptions: ProcedureException[];
}

export interface PartitionedWorkflow {
  id: string;
  name: string;
  partitionReason: string;
  department: string;
  trigger: string;
  deliverable: string;
  roles: string[];
  estimatedTotalTime: string;
  sourceExcerpt: string;
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  procedure: ProcedureDocument;
}

export interface ConversationSession {
  id: string;
  title: string;
  clientType: ClientType;
  clientName: string;
  department: string;
  interviewee: string;
  recordedAt: string;
  durationLabel: string;
  transcript: string;
  executiveSummary: string;
  workflows: PartitionedWorkflow[];
}
