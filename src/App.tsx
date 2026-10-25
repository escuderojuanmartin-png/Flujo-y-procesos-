import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  FolderOpen,
  GitFork,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { FlowchartDesigner } from "./components/FlowchartDesigner";
import { NewConversationModal } from "./components/NewConversationModal";
import { ProcedureStudio } from "./components/ProcedureStudio";
import { SessionOverview } from "./components/SessionOverview";
import { TranscriptStudio } from "./components/TranscriptStudio";
import { INITIAL_CONVERSATIONS } from "./data/initialConversations";
import {
  analyzeTranscriptToFlows,
  regenerateProcedureFromFlow,
} from "./services/api";
import {
  ClientType,
  ConversationSession,
  NarrationTone,
  PartitionedWorkflow,
  ProcedureDocument,
  WorkspaceTab,
} from "./types/process";

const STORAGE_KEY = "procflow_sessions_v2";

function sanitizeStoredSession(s: any): ConversationSession | null {
  if (!s || typeof s !== "object") return null;
  const workflows: PartitionedWorkflow[] = Array.isArray(s.workflows)
    ? s.workflows.map((wf: any, idx: number) => ({
        id: typeof wf.id === "string" && wf.id ? wf.id : `wf-${idx + 1}`,
        name: typeof wf.name === "string" && wf.name ? wf.name : `Flujo ${idx + 1}`,
        partitionReason: wf.partitionReason || "",
        department: wf.department || s.department || "Operaciones",
        trigger: wf.trigger || "Inicio de solicitud",
        deliverable: wf.deliverable || "Entrega conforme",
        roles: Array.isArray(wf.roles) && wf.roles.length > 0 ? wf.roles : ["Responsable"],
        estimatedTotalTime: wf.estimatedTotalTime || "30 min",
        sourceExcerpt: wf.sourceExcerpt || "",
        nodes: Array.isArray(wf.nodes)
          ? wf.nodes.map((n: any, nIdx: number) => ({
              id: typeof n.id === "string" && n.id ? n.id : `n${nIdx + 1}`,
              type: ["start", "step", "decision", "system", "end"].includes(n.type)
                ? n.type
                : "step",
              label: typeof n.label === "string" && n.label ? n.label : `Paso ${nIdx + 1}`,
              description: n.description || "",
              role: n.role || "Responsable",
              systemUsed: n.systemUsed || "",
              duration: n.duration || "",
            }))
          : [],
        edges: Array.isArray(wf.edges)
          ? wf.edges.map((e: any, eIdx: number) => ({
              id: typeof e.id === "string" && e.id ? e.id : `e${eIdx + 1}`,
              from: typeof e.from === "string" ? e.from : "",
              to: typeof e.to === "string" ? e.to : "",
              label: e.label || "",
            }))
          : [],
        procedure:
          wf.procedure && typeof wf.procedure === "object"
            ? {
                code: wf.procedure.code || "POE-001",
                objective: wf.procedure.objective || "Estandarizar el procedimiento operativo.",
                scope: wf.procedure.scope || "Aplica al área correspondiente.",
                narrativeText: wf.procedure.narrativeText || "",
                prerequisites: Array.isArray(wf.procedure.prerequisites)
                  ? wf.procedure.prerequisites
                  : [],
                steps: Array.isArray(wf.procedure.steps) ? wf.procedure.steps : [],
                exceptions: Array.isArray(wf.procedure.exceptions) ? wf.procedure.exceptions : [],
              }
            : {
                code: "POE-001",
                objective: "Estandarizar el procedimiento operativo.",
                scope: "Aplica al sector operativo.",
                narrativeText: "",
                prerequisites: [],
                steps: [],
                exceptions: [],
              },
      }))
    : [];

  return {
    id: typeof s.id === "string" && s.id ? s.id : `conv-${Date.now()}`,
    title: typeof s.title === "string" && s.title ? s.title : "Relevamiento de Procesos",
    clientType: s.clientType === "externo" ? "externo" : "interno",
    clientName: typeof s.clientName === "string" && s.clientName ? s.clientName : "General",
    department: typeof s.department === "string" && s.department ? s.department : "Operaciones",
    interviewee: typeof s.interviewee === "string" && s.interviewee ? s.interviewee : "Referente operativo",
    recordedAt: s.recordedAt || "2026-10-24",
    durationLabel: s.durationLabel || "—",
    transcript: typeof s.transcript === "string" ? s.transcript : "",
    executiveSummary: typeof s.executiveSummary === "string" ? s.executiveSummary : "",
    workflows,
  };
}

function loadStoredSessions(): ConversationSession[] {
  try {
    const raw =
      window.localStorage.getItem("procflow_sessions_v2") ||
      window.localStorage.getItem("procflow_sessions_v1");
    if (!raw) return INITIAL_CONVERSATIONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const sanitized = parsed
        .map(sanitizeStoredSession)
        .filter((s): s is ConversationSession => s !== null);
      if (sanitized.length > 0) {
        return sanitized;
      }
    }
    return INITIAL_CONVERSATIONS;
  } catch {
    return INITIAL_CONVERSATIONS;
  }
}

export function App() {
  const [sessions, setSessions] = useState<ConversationSession[]>(() =>
    loadStoredSessions()
  );
  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => loadStoredSessions()[0]?.id ?? ""
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("flujo");
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(
    () => loadStoredSessions()[0]?.workflows[0]?.id ?? null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState<"todos" | ClientType>("todos");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSyncingProcedure, setIsSyncingProcedure] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore quota
    }
  }, [sessions]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null,
    [sessions, activeSessionId]
  );

  useEffect(() => {
    if (!activeSession) return;
    const hasCurrentWf = activeSession.workflows.some(
      (wf) => wf.id === activeWorkflowId
    );
    if (!hasCurrentWf) {
      setActiveWorkflowId(activeSession.workflows[0]?.id ?? null);
    }
  }, [activeSession, activeWorkflowId]);

  const activeWorkflow = useMemo(() => {
    if (!activeSession) return null;
    return (
      activeSession.workflows.find((wf) => wf.id === activeWorkflowId) ??
      activeSession.workflows[0] ??
      null
    );
  }, [activeSession, activeWorkflowId]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (clientFilter !== "todos" && s.clientType !== clientFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.clientName.toLowerCase().includes(q) ||
        s.interviewee.toLowerCase().includes(q)
      );
    });
  }, [sessions, clientFilter, searchQuery]);

  const handleSelectSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    setActiveSessionId(sessionId);
    setAnalysisError(null);
    setRegenerateError(null);
    setMobileListOpen(false);
    if (target) {
      setActiveWorkflowId(target.workflows[0]?.id ?? null);
      if (target.workflows.length === 0) {
        setActiveTab("transcripcion");
      }
    }
  };

  const handleUpdateSessionMeta = (patch: Partial<ConversationSession>) => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, ...patch } : s))
    );
  };

  const handleCreateConversation = (data: {
    title: string;
    clientType: ClientType;
    clientName: string;
    department: string;
    interviewee: string;
  }) => {
    const today = new Date().toISOString().slice(0, 10);
    const created: ConversationSession = {
      id: `conv-${Date.now()}`,
      title: data.title,
      clientType: data.clientType,
      clientName: data.clientName,
      department: data.department,
      interviewee: data.interviewee,
      recordedAt: today,
      durationLabel: "—",
      transcript: "",
      executiveSummary: "",
      workflows: [],
    };
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setActiveWorkflowId(null);
    setActiveTab("transcripcion");
    setIsNewModalOpen(false);
    setAnalysisError(null);
  };

  const handleDeleteConversation = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
      setActiveWorkflowId(remaining[0].workflows[0]?.id ?? null);
    }
  };

  const handleAnalyzeTranscript = async () => {
    if (!activeSession) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await analyzeTranscriptToFlows({
        title: activeSession.title,
        clientType: activeSession.clientType,
        clientName: activeSession.clientName,
        department: activeSession.department,
        interviewee: activeSession.interviewee,
        transcript: activeSession.transcript,
      });

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                executiveSummary: result.executiveSummary,
                workflows: result.workflows,
              }
            : s
        )
      );

      if (result.workflows.length > 0) {
        setActiveWorkflowId(result.workflows[0].id);
        setActiveTab(result.workflows.length > 1 ? "resumen" : "flujo");
      }
    } catch (err: unknown) {
      setAnalysisError(
        err instanceof Error
          ? err.message
          : "No se pudo completar el análisis de la transcripción."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateActiveWorkflow = (updated: PartitionedWorkflow) => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              workflows: s.workflows.map((wf) =>
                wf.id === updated.id ? updated : wf
              ),
            }
          : s
      )
    );
  };

  const handleUpdateActiveProcedure = (procedure: ProcedureDocument) => {
    if (!activeWorkflow) return;
    handleUpdateActiveWorkflow({
      ...activeWorkflow,
      procedure,
    });
  };

  const handleSyncProcedure = async (tone: NarrationTone = "operativo") => {
    if (!activeSession || !activeWorkflow) return;
    setIsSyncingProcedure(true);
    setRegenerateError(null);
    try {
      const updatedProcedure = await regenerateProcedureFromFlow(
        activeWorkflow,
        tone,
        activeSession.transcript
      );
      handleUpdateActiveProcedure(updatedProcedure);
    } catch (err: unknown) {
      setRegenerateError(
        err instanceof Error
          ? err.message
          : "Error al sincronizar el procedimiento desde el flujo."
      );
    } finally {
      setIsSyncingProcedure(false);
    }
  };

  const handleAddManualPartition = () => {
    if (!activeSession) return;
    const index = activeSession.workflows.length + 1;
    const wfId = `wf-manual-${Date.now().toString().slice(-5)}`;
    const newWf: PartitionedWorkflow = {
      id: wfId,
      name: `Subproceso Operativo ${String(index).padStart(2, "0")}`,
      partitionReason: "Partición diseñada manualmente por el analista de procesos.",
      department: activeSession.department || "Operaciones",
      trigger: "Solicitud o evento disparador inicial",
      deliverable: "Proceso completado y registrado",
      roles: ["Responsable Operativo", "Supervisor"],
      estimatedTotalTime: "30 min",
      sourceExcerpt: "",
      nodes: [
        {
          id: "n1",
          type: "start",
          label: "Recepción de solicitud",
          description: "Inicio del circuito operativo.",
          role: "Responsable Operativo",
          systemUsed: "Correo / Sistema",
          duration: "",
        },
        {
          id: "n2",
          type: "step",
          label: "Ejecutar validación inicial",
          description: "Revisión de datos e insumos necesarios para procesar la solicitud.",
          role: "Responsable Operativo",
          systemUsed: "ERP",
          duration: "15 min",
        },
        {
          id: "n3",
          type: "decision",
          label: "¿Cumple criterios?",
          description: "Evaluación de conformidad operativa.",
          role: "Supervisor",
          systemUsed: "ERP",
          duration: "10 min",
        },
        {
          id: "n4",
          type: "end",
          label: "Trámite finalizado",
          description: "Cierre formal y notificación al solicitante.",
          role: "Responsable Operativo",
          systemUsed: "ERP",
          duration: "",
        },
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2", label: "" },
        { id: "e2", from: "n2", to: "n3", label: "" },
        { id: "e3", from: "n3", to: "n4", label: "Sí" },
        { id: "e4", from: "n3", to: "n2", label: "No (Ajustar)" },
      ],
      procedure: {
        code: `POE-${String(index).padStart(3, "0")}`,
        objective: "Definir la secuencia operativa estandarizada del subproceso.",
        scope: `Aplica al sector de ${activeSession.department || "Operaciones"}.`,
        narrativeText:
          "El procedimiento se inicia con la recepción de la solicitud por parte del Responsable Operativo, quien realiza la validación inicial de datos en el sistema. A continuación, el Supervisor evalúa si se cumplen los criterios establecidos: en caso negativo se solicita el ajuste de información, y en caso afirmativo se procede al cierre formal del trámite.",
        prerequisites: ["Solicitud registrada con datos completos."],
        steps: [
          {
            stepNumber: 1,
            title: "Recepción y validación inicial",
            actor: "Responsable Operativo",
            instruction: "Verificar integridad de los datos recibidos en el sistema.",
            controlPoint: "Registro ingresado sin campos faltantes.",
          },
          {
            stepNumber: 2,
            title: "Evaluación de conformidad y cierre",
            actor: "Supervisor",
            instruction: "Aprobar la operación cuando cumpla los requisitos o devolver para corrección.",
            controlPoint: "Estado 'Finalizado' en sistema.",
          },
        ],
        exceptions: [],
      },
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, workflows: [...s.workflows, newWf] }
          : s
      )
    );
    setActiveWorkflowId(wfId);
    setActiveTab("flujo");
  };

  const handleDeletePartition = (workflowId: string) => {
    if (!activeSession || activeSession.workflows.length <= 1) return;
    const nextWfs = activeSession.workflows.filter((w) => w.id !== workflowId);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? { ...s, workflows: nextWfs } : s
      )
    );
    if (activeWorkflowId === workflowId) {
      setActiveWorkflowId(nextWfs[0]?.id ?? null);
    }
  };

  const navItems: Array<{ id: WorkspaceTab; label: string }> = [
    { id: "resumen", label: "Particiones" },
    { id: "transcripcion", label: "Transcripción" },
    { id: "flujo", label: "Flujo de Proceso" },
    { id: "procedimiento", label: "Procedimiento" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 3-Zone Top Bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-8 px-6 h-14 bg-white border-b border-slate-200">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("resumen");
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          ProcFlow AI
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? "border-blue-700 text-slate-900 font-semibold"
                    : "border-transparent hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Nueva conversación
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Mobile Session Switcher */}
        <div className="no-print lg:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileListOpen((v) => !v)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-slate-500" />
            {mobileListOpen ? "Ocultar conversaciones" : "Cambiar conversación"} (
            {sessions.length})
          </button>

          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === item.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className={`no-print w-full lg:w-72 xl:w-80 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex-col ${
            mobileListOpen ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="p-4 space-y-3 border-b border-slate-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar área, cliente o charla..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: "todos", label: "Todos" },
                  { id: "interno", label: "Internos" },
                  { id: "externo", label: "Externos" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setClientFilter(f.id)}
                  className={`py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    clientFilter === f.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
            {filteredSessions.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  No hay conversaciones que coincidan con el filtro actual.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setClientFilter("todos");
                  }}
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              filteredSessions.map((item) => {
                const isSelected = activeSession?.id === item.id;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSession(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectSession(item.id);
                      }
                    }}
                    className={`group p-4 transition-colors cursor-pointer ${
                      isSelected ? "bg-slate-100/90" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-sm leading-snug line-clamp-2 ${
                          isSelected
                            ? "font-semibold text-slate-900"
                            : "font-medium text-slate-800"
                        }`}
                      >
                        {item.title}
                      </h3>

                      {sessions.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(item.id, e)}
                          title="Eliminar conversación"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-2">
                      <span>
                        {item.clientType === "externo"
                          ? "Cliente externo"
                          : "Cliente interno"}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[125px]">
                        {item.department}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-700 font-medium">
                        {item.workflows.length}{" "}
                        {item.workflows.length === 1 ? "flujo" : "flujos"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setSessions(INITIAL_CONVERSATIONS);
                setActiveSessionId(INITIAL_CONVERSATIONS[0].id);
                setActiveWorkflowId(INITIAL_CONVERSATIONS[0].workflows[0].id);
                setActiveTab("flujo");
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Restablecer ejemplos operativos
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1360px] w-full mx-auto space-y-6">
          {activeSession ? (
            <>
              {/* Context Header */}
              <div className="space-y-4 pb-5 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {activeSession.clientType === "externo"
                      ? "Cliente externo"
                      : "Cliente interno"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSession.clientName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSession.department}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSession.interviewee}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {activeSession.recordedAt}
                  </span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                  <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight text-balance max-w-3xl">
                    {activeSession.title}
                  </h1>

                  <div className="no-print flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab("transcripcion")}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === "transcripcion"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Transcripción fuente
                    </button>
                  </div>
                </div>

                {/* Partition Switcher */}
                {activeSession.workflows.length > 0 &&
                  (activeTab === "flujo" || activeTab === "procedimiento") && (
                    <div className="no-print pt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 mr-1 whitespace-nowrap">
                        Flujo activo:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/65 rounded-lg">
                        {activeSession.workflows.map((wf, idx) => {
                          const selected = activeWorkflow?.id === wf.id;
                          return (
                            <button
                              key={wf.id}
                              type="button"
                              onClick={() => setActiveWorkflowId(wf.id)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                selected
                                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <span className="font-mono tabular-nums mr-1.5 text-blue-700">
                                {String(idx + 1).padStart(2, "0")}.
                              </span>
                              {wf.name}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddManualPartition}
                        title="Agregar nueva partición de flujo"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nueva partición
                      </button>
                    </div>
                  )}
              </div>

              {/* View Components */}
              {activeTab === "resumen" && (
                <SessionOverview
                  session={activeSession}
                  activeWorkflowId={activeWorkflow?.id ?? null}
                  onSelectWorkflowAndNavigate={(wfId, nextTab) => {
                    setActiveWorkflowId(wfId);
                    setActiveTab(nextTab);
                  }}
                  onAddManualPartition={handleAddManualPartition}
                  onDeletePartition={handleDeletePartition}
                  onOpenTranscript={() => setActiveTab("transcripcion")}
                />
              )}

              {activeTab === "transcripcion" && (
                <TranscriptStudio
                  session={activeSession}
                  isAnalyzing={isAnalyzing}
                  analysisError={analysisError}
                  onUpdateSessionMeta={handleUpdateSessionMeta}
                  onAnalyzeTranscript={handleAnalyzeTranscript}
                />
              )}

              {activeTab === "flujo" &&
                (activeWorkflow ? (
                  <FlowchartDesigner
                    workflow={activeWorkflow}
                    isSyncingProcedure={isSyncingProcedure}
                    onUpdateWorkflow={handleUpdateActiveWorkflow}
                    onSyncProcedureFromFlow={() =>
                      handleSyncProcedure("operativo")
                    }
                    onGoToProcedure={() => setActiveTab("procedimiento")}
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
                    <GitFork className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="space-y-1 max-w-md mx-auto">
                      <h2 className="text-base font-semibold text-slate-900">
                        Aún no hay un diagrama generado para esta conversación
                      </h2>
                      <p className="text-sm text-slate-600">
                        Carga o graba la transcripción del relevamiento para dibujar y particionar los flujos automáticamente.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab("transcripcion")}
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Cargar o grabar transcripción
                      </button>
                      <button
                        type="button"
                        onClick={handleAddManualPartition}
                        className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Diseñar diagrama manual
                      </button>
                    </div>
                  </div>
                ))}

              {activeTab === "procedimiento" &&
                (activeWorkflow ? (
                  <ProcedureStudio
                    session={activeSession}
                    workflow={activeWorkflow}
                    isRegenerating={isSyncingProcedure}
                    regenerateError={regenerateError}
                    onUpdateProcedure={handleUpdateActiveProcedure}
                    onRegenerateWithTone={(tone) => handleSyncProcedure(tone)}
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="space-y-1 max-w-md mx-auto">
                      <h2 className="text-base font-semibold text-slate-900">
                        Sin procedimiento disponible todavía
                      </h2>
                      <p className="text-sm text-slate-600">
                        Procesa primero la transcripción de la entrevista para obtener el procedimiento estructurado y su narración.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("transcripcion")}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Ir a Transcripción
                    </button>
                  </div>
                ))}
            </>
          ) : null}
        </main>
      </div>

      <NewConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateConversation}
      />
    </div>
  );
}

export default App;
