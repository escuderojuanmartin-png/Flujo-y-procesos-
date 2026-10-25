import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileDown,
  Loader2,
  Pause,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { generateVoiceNarration } from "../services/api";
import {
  ConversationSession,
  NarrationTone,
  PartitionedWorkflow,
  ProcedureDocument,
  ProcedureStep,
} from "../types/process";
import { buildWorkflowMarkdown } from "../utils/flowchartLayout";

interface ProcedureStudioProps {
  session: ConversationSession;
  workflow: PartitionedWorkflow;
  isRegenerating: boolean;
  regenerateError: string | null;
  onUpdateProcedure: (procedure: ProcedureDocument) => void;
  onRegenerateWithTone: (tone: NarrationTone) => void;
}

function formatAudioClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const ProcedureStudio: React.FC<ProcedureStudioProps> = ({
  session,
  workflow,
  isRegenerating,
  regenerateError,
  onUpdateProcedure,
  onRegenerateWithTone,
}) => {
  const { procedure } = workflow;

  const [tone, setTone] = useState<NarrationTone>("operativo");
  const [selectedVoice, setSelectedVoice] = useState<string>("Kore");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingWav, setIsPlayingWav] = useState(false);
  const [audioCurrent, setAudioCurrent] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setIsPlayingWav(false);
    setAudioCurrent(0);
    setAudioDuration(0);
    setAudioError(null);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsBrowserSpeaking(false);
    }
  }, [workflow.id]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioUrl]);

  const handleGenerateAiVoice = async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsBrowserSpeaking(false);
    }

    try {
      const script = [
        `${procedure.code}. Procedimiento: ${workflow.name}.`,
        `Objetivo: ${procedure.objective}`,
        procedure.narrativeText,
      ]
        .filter(Boolean)
        .join("\n\n");

      const { audioBase64, mimeType } = await generateVoiceNarration(script, selectedVoice);
      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType || "audio/wav" });
      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    } catch (err: unknown) {
      setAudioError(
        err instanceof Error
          ? err.message
          : "No se pudo generar el audio de narración."
      );
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const toggleWavPlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.playbackRate = playbackRate;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const handleChangeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleBrowserSpeech = () => {
    if (!("speechSynthesis" in window)) return;
    if (isBrowserSpeaking) {
      window.speechSynthesis.cancel();
      setIsBrowserSpeaking(false);
      return;
    }
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${workflow.name}. ${procedure.narrativeText}`
    );
    utterance.lang = "es-ES";
    utterance.rate = playbackRate;
    utterance.onend = () => setIsBrowserSpeaking(false);
    utterance.onerror = () => setIsBrowserSpeaking(false);
    setIsBrowserSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyMarkdown = async () => {
    const md = buildWorkflowMarkdown(session, workflow);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = buildWorkflowMarkdown(session, workflow);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = workflow.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "");
    a.download = `${procedure.code.toLowerCase() || "poe"}-${slug}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateStep = (index: number, patch: Partial<ProcedureStep>) => {
    const nextSteps = procedure.steps.map((s, idx) =>
      idx === index ? { ...s, ...patch } : s
    );
    onUpdateProcedure({ ...procedure, steps: nextSteps });
  };

  const addProcedureStep = () => {
    const nextNum = procedure.steps.length + 1;
    const newStep: ProcedureStep = {
      stepNumber: nextNum,
      title: `Paso operativo ${nextNum}`,
      actor: workflow.roles[0] || "Responsable operativo",
      instruction: "Detalla aquí la acción específica a realizar.",
      controlPoint: "Registro o comprobante verificable.",
    };
    onUpdateProcedure({
      ...procedure,
      steps: [...procedure.steps, newStep],
    });
  };

  const removeProcedureStep = (index: number) => {
    const filtered = procedure.steps
      .filter((_, idx) => idx !== index)
      .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    onUpdateProcedure({ ...procedure, steps: filtered });
  };

  const updatePrerequisite = (index: number, val: string) => {
    const next = procedure.prerequisites.map((p, idx) => (idx === index ? val : p));
    onUpdateProcedure({ ...procedure, prerequisites: next });
  };

  const removePrerequisite = (index: number) => {
    onUpdateProcedure({
      ...procedure,
      prerequisites: procedure.prerequisites.filter((_, idx) => idx !== index),
    });
  };

  const addPrerequisite = () => {
    onUpdateProcedure({
      ...procedure,
      prerequisites: [...procedure.prerequisites, "Nuevo requisito o acceso previo"],
    });
  };

  const addException = () => {
    onUpdateProcedure({
      ...procedure,
      exceptions: [
        ...procedure.exceptions,
        {
          scenario: "Describir desvío o excepción operativa",
          resolution: "Definir criterio de escalamiento o contingencia",
        },
      ],
    });
  };

  const removeException = (index: number) => {
    onUpdateProcedure({
      ...procedure,
      exceptions: procedure.exceptions.filter((_, idx) => idx !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: "operativo", label: "Manual Operativo" },
                { id: "ejecutivo", label: "Enfoque Ejecutivo" },
                { id: "capacitacion", label: "Guía Capacitación" },
              ] as Array<{ id: NarrationTone; label: string }>
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTone(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tone === item.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onRegenerateWithTone(tone)}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Redactando procedimiento...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Redactar según enfoque y flujo actual
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar texto
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Exportar .MD
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {regenerateError && (
        <p className="no-print text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {regenerateError}
        </p>
      )}

      {/* Section 1: Procedure Narration Studio */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Narración del Procedimiento
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Edita el relato corrido del flujo o genera una locución en audio lista para compartir con el equipo.
            </p>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              aria-label="Seleccionar voz de locución"
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option value="Kore">Voz Kore (Profesional clara)</option>
              <option value="Puck">Voz Puck (Dinámica)</option>
              <option value="Zephyr">Voz Zephyr (Serena)</option>
              <option value="Charon">Voz Charon (Ejecutiva)</option>
            </select>

            <button
              type="button"
              onClick={handleGenerateAiVoice}
              disabled={isGeneratingAudio || !procedure.narrativeText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingAudio ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generando locución WAV...
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  Narrar procedimiento en voz (IA)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={toggleBrowserSpeech}
              disabled={!procedure.narrativeText.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isBrowserSpeaking ? (
                <>
                  <Square className="w-3 h-3 text-red-600" />
                  Detener lectura
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Lectura rápida
                </>
              )}
            </button>
          </div>
        </div>

        {audioError && (
          <p className="no-print text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            {audioError}
          </p>
        )}

        {audioUrl && (
          <div className="no-print flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlayingWav(true)}
              onPause={() => setIsPlayingWav(false)}
              onEnded={() => setIsPlayingWav(false)}
              onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
              onTimeUpdate={(e) => setAudioCurrent(e.currentTarget.currentTime)}
              className="hidden"
            />

            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <button
                type="button"
                onClick={toggleWavPlay}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shrink-0"
              >
                {isPlayingWav ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              <span className="text-xs font-mono tabular-nums text-slate-700 shrink-0">
                {formatAudioClock(audioCurrent)} / {formatAudioClock(audioDuration)}
              </span>

              <input
                type="range"
                min={0}
                max={audioDuration || 1}
                step={0.1}
                value={audioCurrent}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setAudioCurrent(next);
                  if (audioRef.current) {
                    audioRef.current.currentTime = next;
                  }
                }}
                className="w-full accent-blue-700 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 p-0.5 bg-white border border-slate-200 rounded-md">
                {[1, 1.25, 1.5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleChangeRate(r)}
                    className={`px-2 py-1 text-xs font-mono tabular-nums rounded-xs cursor-pointer ${
                      playbackRate === r
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>

              <a
                href={audioUrl}
                download={`narracion-${procedure.code.toLowerCase() || "procedimiento"}.wav`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar WAV
              </a>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Relato narrado continuo (editable)
          </label>
          <textarea
            rows={5}
            value={procedure.narrativeText}
            onChange={(e) =>
              onUpdateProcedure({ ...procedure, narrativeText: e.target.value })
            }
            className="w-full p-4 text-sm leading-relaxed text-slate-800 bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 resize-y"
          />
        </div>
      </div>

      {/* Section 2: Formal Standard Operating Procedure */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-5 border-b border-slate-200">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Código documental
            </label>
            <input
              type="text"
              value={procedure.code}
              onChange={(e) =>
                onUpdateProcedure({ ...procedure, code: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="md:col-span-9">
            <span className="block text-xs font-medium text-slate-500 mb-1">
              Proceso documentado y trazabilidad
            </span>
            <div className="py-2 text-sm text-slate-800">
              <span className="font-semibold text-slate-900">{workflow.name}</span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="text-slate-600">{workflow.department}</span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="font-mono tabular-nums text-xs text-slate-600">
                Ciclo estimado: {workflow.estimatedTotalTime}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              01. Objetivo del procedimiento
            </label>
            <textarea
              rows={3}
              value={procedure.objective}
              onChange={(e) =>
                onUpdateProcedure({ ...procedure, objective: e.target.value })
              }
              className="w-full p-3 text-sm leading-relaxed text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              02. Alcance operativo
            </label>
            <textarea
              rows={3}
              value={procedure.scope}
              onChange={(e) =>
                onUpdateProcedure({ ...procedure, scope: e.target.value })
              }
              className="w-full p-3 text-sm leading-relaxed text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 resize-y"
            />
          </div>
        </div>

        {/* Prerequisites */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              03. Requisitos Previos e Insumos
            </h3>
            <button
              type="button"
              onClick={addPrerequisite}
              className="no-print inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar requisito
            </button>
          </div>

          {procedure.prerequisites.length === 0 ? (
            <p className="text-xs text-slate-500">
              Sin requisitos previos registrados.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {procedure.prerequisites.map((req, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2">
                  <span className="text-xs font-mono tabular-nums text-slate-400 w-6">
                    {String(idx + 1).padStart(2, "0")}.
                  </span>
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => updatePrerequisite(idx, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-sm text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-600 rounded-md focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removePrerequisite(idx)}
                    className="no-print p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step-by-Step Sequence */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              04. Secuencia Operativa Paso a Paso
            </h3>
            <button
              type="button"
              onClick={addProcedureStep}
              className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar paso al POE
            </button>
          </div>

          <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
            {procedure.steps.map((step, idx) => (
              <div key={idx} className="py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums text-xs font-semibold text-blue-700">
                      Paso {String(step.stepNumber).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProcedureStep(idx)}
                      title="Eliminar paso"
                      className="no-print text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => updateStep(idx, { title: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Responsable de ejecución
                    </label>
                    <input
                      type="text"
                      value={step.actor}
                      onChange={(e) => updateStep(idx, { actor: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Instrucción detallada de trabajo
                  </label>
                  <textarea
                    rows={3}
                    value={step.instruction}
                    onChange={(e) =>
                      updateStep(idx, { instruction: e.target.value })
                    }
                    className="w-full p-2.5 text-sm leading-relaxed text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 resize-y"
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Punto de control / Evidencia
                  </label>
                  <textarea
                    rows={3}
                    value={step.controlPoint}
                    onChange={(e) =>
                      updateStep(idx, { controlPoint: e.target.value })
                    }
                    className="w-full p-2.5 text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-600 resize-y"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exceptions */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              05. Excepciones y Criterios de Contingencia
            </h3>
            <button
              type="button"
              onClick={addException}
              className="no-print inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar contingencia
            </button>
          </div>

          {procedure.exceptions.length === 0 ? (
            <p className="text-xs text-slate-500">
              No se registraron desvíos o excepciones para este flujo.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 border-t border-slate-200">
              {procedure.exceptions.map((ex, idx) => (
                <div
                  key={idx}
                  className="py-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                >
                  <div className="md:col-span-5">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Escenario / Desvío detectado
                    </label>
                    <input
                      type="text"
                      value={ex.scenario}
                      onChange={(e) => {
                        const next = procedure.exceptions.map((item, i) =>
                          i === idx ? { ...item, scenario: e.target.value } : item
                        );
                        onUpdateProcedure({ ...procedure, exceptions: next });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Resolución obligatoria
                    </label>
                    <input
                      type="text"
                      value={ex.resolution}
                      onChange={(e) => {
                        const next = procedure.exceptions.map((item, i) =>
                          i === idx ? { ...item, resolution: e.target.value } : item
                        );
                        onUpdateProcedure({ ...procedure, exceptions: next });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end pt-5">
                    <button
                      type="button"
                      onClick={() => removeException(idx)}
                      className="no-print text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
