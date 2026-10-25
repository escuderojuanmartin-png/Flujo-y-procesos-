import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  FileAudio,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Upload,
  Volume2,
  Wand2,
} from "lucide-react";
import { SAMPLE_TRANSCRIPTS } from "../data/initialConversations";
import { transcribeAudioRecording } from "../services/api";
import { ClientType, ConversationSession } from "../types/process";

interface TranscriptStudioProps {
  session: ConversationSession;
  isAnalyzing: boolean;
  analysisError: string | null;
  onUpdateSessionMeta: (patch: Partial<ConversationSession>) => void;
  onAnalyzeTranscript: () => void;
}

function cleanSubtitleText(raw: string, filename: string): string {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".vtt") && !lower.endsWith(".srt")) {
    return raw;
  }
  return raw
    .replace(/^WEBVTT.*$/gim, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const TranscriptStudio: React.FC<TranscriptStudioProps> = ({
  session,
  isAnalyzing,
  analysisError,
  onUpdateSessionMeta,
  onAnalyzeTranscript,
}) => {
  // Audio file recorder state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Live real-time speech dictation state
  const [isLiveDictating, setIsLiveDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeNotice, setTranscribeNotice] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [validationHint, setValidationHint] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [recordedUrl]);

  // Real-time voice dictation (Web Speech Recognition)
  const toggleLiveDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setTranscribeError(
        "El dictado en tiempo real no está disponible en este navegador. Puedes usar el botón «Grabar audio», subir un archivo o pegar la transcripción."
      );
      return;
    }

    if (isLiveDictating && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsLiveDictating(false);
      setTranscribeNotice("Dictado por voz finalizado.");
      return;
    }

    try {
      setTranscribeError(null);
      setTranscribeNotice("Escuchando... habla y el texto se escribirá en tiempo real.");
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + " ";
          }
        }
        if (finalChunk.trim()) {
          const current = session.transcript.trim();
          const updated = current ? `${current} ${finalChunk.trim()}` : finalChunk.trim();
          onUpdateSessionMeta({ transcript: updated });
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e.error);
        if (e.error === "not-allowed") {
          setTranscribeError(
            "Permiso de micrófono no habilitado para dictado. Puedes escribir o cargar un caso de prueba."
          );
        }
        setIsLiveDictating(false);
      };

      recognition.onend = () => {
        setIsLiveDictating(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsLiveDictating(true);
    } catch (err: unknown) {
      setIsLiveDictating(false);
      setTranscribeError("No se pudo iniciar el dictado por voz en este navegador.");
    }
  };

  // MediaRecorder audio capture
  const startRecordingAudio = async () => {
    setTranscribeError(null);
    setTranscribeNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        setRecordedBlob(blob);
        setRecordedUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        onUpdateSessionMeta({ durationLabel: formatSeconds(elapsedSeconds || 1) });
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setElapsedSeconds(0);
      setIsRecordingAudio(true);
      setIsAudioPaused(false);

      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? `Acceso al micrófono no disponible (${err.message}). Puedes usar «Cargar caso de prueba», subir un audio o pegar la transcripción.`
          : "No se pudo acceder al micrófono en el entorno actual.";
      setTranscribeError(msg);
    }
  };

  const togglePauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setIsAudioPaused(true);
      if (timerRef.current) window.clearInterval(timerRef.current);
    } else if (recorder.state === "paused") {
      recorder.resume();
      setIsAudioPaused(false);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecordingAudio = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecordingAudio(false);
    setIsAudioPaused(false);
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || "");
        const base64 = res.includes(",") ? res.split(",")[1] : res;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo de audio."));
      reader.readAsDataURL(blob);
    });

  const handleTranscribeBlob = async (blob: Blob, sourceLabel: string) => {
    setIsTranscribing(true);
    setTranscribeError(null);
    setTranscribeNotice(`Transcribiendo ${sourceLabel} con IA...`);
    try {
      const base64 = await blobToBase64(blob);
      const contextHint = `${session.title} — ${session.department} (${session.clientName})`;
      const text = await transcribeAudioRecording(base64, blob.type || "audio/webm", contextHint);
      const merged = session.transcript.trim()
        ? `${session.transcript.trim()}\n\n${text}`
        : text;
      onUpdateSessionMeta({ transcript: merged });
      setTranscribeNotice("Transcripción incorporada con éxito. Ya puedes generar los flujos.");
    } catch (err: unknown) {
      setTranscribeNotice(null);
      setTranscribeError(
        err instanceof Error
          ? err.message
          : "No se pudo transcribir el archivo de audio."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setTranscribeError(null);
    setTranscribeNotice(null);

    const isAudio =
      file.type.startsWith("audio/") ||
      /\.(mp3|wav|webm|m4a|ogg|aac|flac)$/i.test(file.name);

    if (isAudio) {
      setRecordedBlob(file);
      setRecordedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      await handleTranscribeBlob(file, `archivo "${file.name}"`);
      return;
    }

    try {
      const rawText = await file.text();
      const cleaned = cleanSubtitleText(rawText, file.name);
      onUpdateSessionMeta({ transcript: cleaned });
      setTranscribeNotice(`Archivo de texto "${file.name}" cargado en el editor.`);
    } catch {
      setTranscribeError("No se pudo leer el archivo seleccionado.");
    }
  };

  const applySampleTemplate = (sampleId: string) => {
    const tpl = SAMPLE_TRANSCRIPTS.find((s) => s.id === sampleId);
    if (!tpl) return;
    onUpdateSessionMeta({
      title: tpl.label,
      clientType: tpl.clientType,
      clientName: tpl.clientName,
      department: tpl.department,
      interviewee: tpl.interviewee,
      transcript: tpl.transcript,
    });
    setTranscribeNotice("Caso de prueba cargado. Haz clic en «Generar flujos y procedimientos» para procesarlo.");
    setTranscribeError(null);
    setValidationHint(null);
  };

  const handleGenerateClick = () => {
    setValidationHint(null);
    if (!session.transcript.trim()) {
      setValidationHint(
        "Ingresa o pega el relato de la conversación, o pulsa en uno de los casos de prueba (Transporte o Mantenimiento) para cargar un ejemplo completo."
      );
      return;
    }
    if (session.transcript.trim().length < 15) {
      setValidationHint(
        "El texto es muy breve para extraer un flujo de proceso. Describe al menos 2 o 3 pasos secuenciales (ej. 'Primero hago X, segundo verifico Y, si aprueba hago Z')."
      );
      return;
    }
    onAnalyzeTranscript();
  };

  const wordCount = session.transcript.trim()
    ? session.transcript.trim().split(/\s+/).length
    : 0;
  const paragraphCount = session.transcript.trim()
    ? session.transcript
        .trim()
        .split(/\n\s*\n/)
        .filter(Boolean).length
    : 0;

  const activeError = transcribeError || analysisError;

  return (
    <div className="space-y-6">
      {/* Quick Test Bar */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Wand2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="text-xs font-semibold text-blue-950">
            ¿Quieres probar la generación ahora mismo?
          </span>
          <span className="text-xs text-blue-700 hidden md:inline">
            Carga un caso de relevamiento operativo real con 1 clic:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_TRANSCRIPTS.map((sample, idx) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => applySampleTemplate(sample.id)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-900 bg-white border border-blue-300 hover:bg-blue-100/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              {idx === 0 ? "Cargar caso: Taller y Mantenimiento" : "Cargar caso: Proveedores Externos"}
            </button>
          ))}
        </div>
      </div>

      {/* Capture & Metadata Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Captura de Conversación y Transcripción Fuente
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Habla por micrófono, sube un audio o pega la entrevista para que la IA dibuje los flujos y redacte los procedimientos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Dictation Button */}
            <button
              type="button"
              onClick={toggleLiveDictation}
              disabled={isRecordingAudio || isTranscribing || isAnalyzing}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                isLiveDictating
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              }`}
            >
              {isLiveDictating ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  Detener dictado en vivo
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-blue-700" />
                  Dictar en vivo
                </>
              )}
            </button>

            {/* MediaRecorder Audio Recording */}
            {!isRecordingAudio ? (
              <button
                type="button"
                onClick={startRecordingAudio}
                disabled={isLiveDictating || isTranscribing || isAnalyzing}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <FileAudio className="w-3.5 h-3.5 text-red-600" />
                Grabar audio
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span className="font-mono tabular-nums text-xs font-medium text-red-800">
                  {formatSeconds(elapsedSeconds)}
                </span>
                <button
                  type="button"
                  onClick={togglePauseRecording}
                  className="px-2 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isAudioPaused ? (
                    <span className="inline-flex items-center gap-1">
                      <Play className="w-3 h-3" /> Reanudar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Pause className="w-3 h-3" /> Pausar
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={stopRecordingAudio}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Square className="w-3 h-3" />
                  Finalizar
                </button>
              </div>
            )}

            {/* Upload Audio / Text File */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg,.txt,.md,.vtt,.srt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecordingAudio || isLiveDictating || isTranscribing || isAnalyzing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              Subir audio o archivo
            </button>
          </div>
        </div>

        {/* Recorded audio preview & transcribe button */}
        {recordedUrl && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 px-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <FileAudio className="w-4 h-4 text-slate-600 shrink-0" />
              <audio controls src={recordedUrl} className="h-9 max-w-full sm:w-80" />
            </div>
            {recordedBlob && (
              <button
                type="button"
                onClick={() => handleTranscribeBlob(recordedBlob, "grabación de audio")}
                disabled={isTranscribing || isAnalyzing}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Transcribiendo audio...
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    Transcribir grabación
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Metadata fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Título del relevamiento o proceso
            </label>
            <input
              type="text"
              value={session.title}
              onChange={(e) => onUpdateSessionMeta({ title: e.target.value })}
              placeholder="Ej. Relevamiento de Transporte y Despacho"
              className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Tipo de cliente
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              {(["interno", "externo"] as ClientType[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onUpdateSessionMeta({ clientType: kind })}
                  className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    session.clientType === kind
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {kind === "interno" ? "Cliente interno" : "Cliente externo"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Departamento o área
            </label>
            <input
              type="text"
              value={session.department}
              onChange={(e) => onUpdateSessionMeta({ department: e.target.value })}
              placeholder="Ej. Transporte y Logística"
              className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Organización / Sede
            </label>
            <input
              type="text"
              value={session.clientName}
              onChange={(e) => onUpdateSessionMeta({ clientName: e.target.value })}
              placeholder="Ej. Sede Central Logística"
              className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Persona entrevistada y cargo
            </label>
            <input
              type="text"
              value={session.interviewee}
              onChange={(e) => onUpdateSessionMeta({ interviewee: e.target.value })}
              placeholder="Ej. Martín Gómez — Coordinador de Tráfico"
              className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Informational notices */}
        {transcribeNotice && (
          <p className="text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5">
            {transcribeNotice}
          </p>
        )}

        {/* Validation hint if user clicks with empty text */}
        {validationHint && (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
            {validationHint}
          </p>
        )}

        {/* Target Error Alert */}
        {activeError && (
          <p className="text-xs text-red-900 bg-red-50/90 border border-red-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{activeError}</span>
            </span>
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 underline shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reintentar
            </button>
          </p>
        )}

        {/* Transcript Textarea */}
        <div className="pt-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-900">Transcripción de la conversación</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{wordCount} palabras</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{paragraphCount} párrafos</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applySampleTemplate(SAMPLE_TRANSCRIPTS[0].id)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
              >
                Insertar ejemplo de conversación
              </button>
            </div>
          </div>

          <textarea
            rows={13}
            value={session.transcript}
            onChange={(e) => {
              onUpdateSessionMeta({ transcript: e.target.value });
              if (validationHint) setValidationHint(null);
            }}
            placeholder="Pega o escribe aquí la conversación donde el cliente relata su flujo de trabajo (por ejemplo: 'Primero hago esto, segundo hago esto, si hay stock hago esto, si no hago lo otro...'). Si relata varios procesos distintos, se particionarán en flujos independientes con su diagrama y procedimiento."
            className="w-full p-4 text-sm leading-relaxed text-slate-800 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
          />
        </div>

        {/* Bottom Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 max-w-xl">
            Al procesar, el sistema analiza las etapas, detecta si contiene más de un flujo para particionarlo, dibuja los diagramas interactivos y redacta los procedimientos narrados.
          </p>

          <button
            type="button"
            onClick={handleGenerateClick}
            disabled={isAnalyzing || isTranscribing}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Particionando flujos y dibujando diagramas...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                Generar flujos y procedimientos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
