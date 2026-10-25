import {
  ClientType,
  NarrationTone,
  PartitionedWorkflow,
  ProcedureDocument,
} from "../types/process";

export interface AnalyzeProcessPayload {
  title: string;
  clientType: ClientType;
  clientName: string;
  department: string;
  interviewee: string;
  transcript: string;
}

export interface AnalyzeProcessResult {
  executiveSummary: string;
  workflows: PartitionedWorkflow[];
}

export async function transcribeAudioRecording(
  audioBase64: string,
  mimeType: string,
  contextHint?: string
): Promise<string> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64, mimeType, contextHint }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "No se pudo transcribir la grabación de audio.");
  }
  return data.transcript as string;
}

export async function analyzeTranscriptToFlows(
  payload: AnalyzeProcessPayload
): Promise<AnalyzeProcessResult> {
  const response = await fetch("/api/analyze-process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Error al analizar la transcripción y diseñar los flujos.");
  }

  const normalizedWorkflows: PartitionedWorkflow[] = (data.workflows || []).map(
    (wf: PartitionedWorkflow, idx: number) => ({
      ...wf,
      id: wf.id || `wf-${Date.now()}-${idx + 1}`,
      nodes: (wf.nodes || []).map((n, nIdx) => ({
        id: n.id || `n${nIdx + 1}`,
        type:
          n.type === "start" ||
          n.type === "step" ||
          n.type === "decision" ||
          n.type === "system" ||
          n.type === "end"
            ? n.type
            : "step",
        label: n.label || `Paso ${nIdx + 1}`,
        description: n.description || "",
        role: n.role || "Responsable operativo",
        systemUsed: n.systemUsed || "",
        duration: n.duration || "",
      })),
      edges: (wf.edges || []).map((e, eIdx) => ({
        id: e.id || `e${eIdx + 1}`,
        from: e.from,
        to: e.to,
        label: e.label || "",
      })),
    })
  );

  return {
    executiveSummary: data.executiveSummary || "",
    workflows: normalizedWorkflows,
  };
}

export async function regenerateProcedureFromFlow(
  workflow: PartitionedWorkflow,
  tone: NarrationTone,
  transcriptContext?: string
): Promise<ProcedureDocument> {
  const response = await fetch("/api/regenerate-procedure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow, tone, transcriptContext }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Error al sincronizar el procedimiento desde el flujo.");
  }
  return data.procedure as ProcedureDocument;
}

export async function generateVoiceNarration(
  text: string,
  voiceName: string
): Promise<{ audioBase64: string; mimeType: string }> {
  const response = await fetch("/api/narrate-procedure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceName }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "No se pudo generar la locución del procedimiento.");
  }
  return {
    audioBase64: data.audioBase64 as string,
    mimeType: (data.mimeType as string) || "audio/wav",
  };
}
