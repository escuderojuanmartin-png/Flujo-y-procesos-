import React from "react";
import { ArrowRight, FileText, GitFork, Plus, Trash2 } from "lucide-react";
import {
  ConversationSession,
  PartitionedWorkflow,
  WorkspaceTab,
} from "../types/process";

interface SessionOverviewProps {
  session: ConversationSession;
  activeWorkflowId: string | null;
  onSelectWorkflowAndNavigate: (workflowId: string, tab: WorkspaceTab) => void;
  onAddManualPartition: () => void;
  onDeletePartition: (workflowId: string) => void;
  onOpenTranscript: () => void;
}

export const SessionOverview: React.FC<SessionOverviewProps> = ({
  session,
  activeWorkflowId,
  onSelectWorkflowAndNavigate,
  onAddManualPartition,
  onDeletePartition,
  onOpenTranscript,
}) => {
  const totalSteps = session.workflows.reduce(
    (acc, wf) => acc + wf.nodes.length,
    0
  );
  const distinctRoles = Array.from(
    new Set(session.workflows.flatMap((wf) => wf.roles))
  );

  return (
    <div className="space-y-6">
      {/* Executive Summary & Metrics */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Síntesis del Relevamiento y Particionado de Flujos
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              {session.executiveSummary ||
                "Aún no se ha ejecutado la extracción automática sobre esta sesión. Carga o graba la transcripción para particionar los flujos de trabajo y generar sus procedimientos."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenTranscript}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Editar transcripción
            </button>
            <button
              type="button"
              onClick={onAddManualPartition}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar partición manual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-5 border-t border-slate-200">
          <div>
            <span className="block text-xs text-slate-500">
              Flujos particionados
            </span>
            <span className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1 block">
              {session.workflows.length}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500">
              Bloques diagramados
            </span>
            <span className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1 block">
              {totalSteps}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500">
              Roles identificados
            </span>
            <span className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1 block">
              {distinctRoles.length}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500">
              Duración registrada
            </span>
            <span className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1 block">
              {session.durationLabel || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Flujos de Proceso Detectados en la Conversación
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada partición dispone de su propio diagrama editable y procedimiento operativo narrado.
            </p>
          </div>
        </div>

        {session.workflows.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3">
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Esta conversación todavía no tiene flujos particionados. Graba o ingresa la transcripción para extraerlos automáticamente.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenTranscript}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ir a Transcripción
              </button>
              <button
                type="button"
                onClick={onAddManualPartition}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                Diseñar flujo manual
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {session.workflows.map((wf: PartitionedWorkflow, idx: number) => {
              const isCurrent = wf.id === activeWorkflowId;
              return (
                <div
                  key={wf.id}
                  className={`p-6 transition-colors ${
                    isCurrent ? "bg-slate-50/70" : "hover:bg-slate-50/40"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono tabular-nums font-semibold text-blue-700">
                          Partición {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {wf.procedure.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{wf.department}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {wf.nodes.length} bloques
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Ciclo: {wf.estimatedTotalTime}
                        </span>
                      </div>

                      <h4 className="text-base font-semibold text-slate-900">
                        {wf.name}
                      </h4>

                      <p className="text-sm text-slate-600 leading-relaxed">
                        {wf.partitionReason}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-800">
                            Disparador:{" "}
                          </span>
                          {wf.trigger}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800">
                            Resultado final:{" "}
                          </span>
                          {wf.deliverable}
                        </div>
                      </div>

                      {wf.sourceExcerpt && (
                        <p className="text-xs italic text-slate-500 pt-1">
                          Referencia en charla: {wf.sourceExcerpt}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectWorkflowAndNavigate(wf.id, "flujo")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <GitFork className="w-3.5 h-3.5 text-blue-700" />
                        Ver y diseñar flujo
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onSelectWorkflowAndNavigate(wf.id, "procedimiento")
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Procedimiento y narración
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {session.workflows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeletePartition(wf.id)}
                          title="Eliminar esta partición"
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
