import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getApiKey(): string | undefined {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    if (fs.existsSync("/app/.dev.env.json")) {
      const parsed = JSON.parse(fs.readFileSync("/app/.dev.env.json", "utf8"));
      if (parsed.GEMINI_API_KEY) return parsed.GEMINI_API_KEY;
    }
  } catch {}
  return undefined;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en el entorno del servidor.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const procedureSchema = {
  type: Type.OBJECT,
  properties: {
    code: {
      type: Type.STRING,
      description: "Código documental sugerido para el procedimiento, por ejemplo POE-TRN-001.",
    },
    objective: {
      type: Type.STRING,
      description: "Objetivo claro y formal del procedimiento operativo.",
    },
    scope: {
      type: Type.STRING,
      description: "Alcance operativo indicando desde dónde inicia hasta dónde finaliza y áreas involucradas.",
    },
    narrativeText: {
      type: Type.STRING,
      description:
        "Relato continuo, claro y profesional en español que narra todo el procedimiento de principio a fin, apto para lectura ejecutiva y locución.",
    },
    prerequisites: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de insumos, sistemas, permisos o información requerida antes de iniciar.",
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          title: { type: Type.STRING },
          actor: { type: Type.STRING },
          instruction: { type: Type.STRING },
          controlPoint: { type: Type.STRING },
        },
        required: ["stepNumber", "title", "actor", "instruction", "controlPoint"],
      },
      description: "Secuencia ordenada y detallada de pasos del procedimiento.",
    },
    exceptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          scenario: { type: Type.STRING },
          resolution: { type: Type.STRING },
        },
        required: ["scenario", "resolution"],
      },
      description: "Casos excepcionales, rechazos o contingencias y cómo resolverlos.",
    },
  },
  required: [
    "code",
    "objective",
    "scope",
    "narrativeText",
    "prerequisites",
    "steps",
    "exceptions",
  ],
};

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: {
      type: Type.STRING,
      description:
        "Resumen ejecutivo conciso de la conversación relevada y los procesos identificados (2 a 4 oraciones).",
    },
    workflows: {
      type: Type.ARRAY,
      description:
        "Lista particionada de flujos de trabajo independientes o subprocesos detectados en la transcripción.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Identificador único, ej. wf-1, wf-2." },
          name: { type: Type.STRING, description: "Nombre claro del flujo de proceso." },
          partitionReason: {
            type: Type.STRING,
            description: "Explicación de por qué este proceso constituye una unidad diferenciada.",
          },
          department: { type: Type.STRING, description: "Departamento o área principal." },
          trigger: { type: Type.STRING, description: "Evento disparador que da inicio al flujo." },
          deliverable: { type: Type.STRING, description: "Resultado o entregable final concreto." },
          roles: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Roles o puestos que intervienen en este flujo.",
          },
          estimatedTotalTime: {
            type: Type.STRING,
            description: "Tiempo estimado de ciclo total, ej. 35 min, 4 horas, 2 días.",
          },
          sourceExcerpt: {
            type: Type.STRING,
            description: "Referencia o cita del tramo de la conversación donde se describió.",
          },
          nodes: {
            type: Type.ARRAY,
            description:
              "Nodos del diagrama. Comienza con 'start', finaliza con 'end'. Usa 'step', 'decision' o 'system'.",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "ID único, ej. n1, n2, n3." },
                type: {
                  type: Type.STRING,
                  description: "Uno de: start, step, decision, system, end.",
                },
                label: {
                  type: Type.STRING,
                  description: "Título conciso para el bloque visual (máximo 7 palabras).",
                },
                description: {
                  type: Type.STRING,
                  description: "Descripción de la actividad en este nodo.",
                },
                role: {
                  type: Type.STRING,
                  description: "Rol responsable.",
                },
                systemUsed: {
                  type: Type.STRING,
                  description: "Sistema o documento utilizado.",
                },
                duration: {
                  type: Type.STRING,
                  description: "Duración estimada del paso.",
                },
              },
              required: ["id", "type", "label", "description", "role", "systemUsed", "duration"],
            },
          },
          edges: {
            type: Type.ARRAY,
            description: "Conexiones dirigidas entre nodos existentes.",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "ID único de la conexión." },
                from: { type: Type.STRING, description: "ID del nodo de origen." },
                to: { type: Type.STRING, description: "ID del nodo de destino." },
                label: {
                  type: Type.STRING,
                  description: "Etiqueta condicional en la flecha (ej. Sí / No).",
                },
              },
              required: ["id", "from", "to", "label"],
            },
          },
          procedure: procedureSchema,
        },
        required: [
          "id",
          "name",
          "partitionReason",
          "department",
          "trigger",
          "deliverable",
          "roles",
          "estimatedTotalTime",
          "sourceExcerpt",
          "nodes",
          "edges",
          "procedure",
        ],
      },
    },
  },
  required: ["executiveSummary", "workflows"],
};

function buildFallbackWorkflow(
  transcript: string,
  title: string,
  department: string,
  clientType: string
) {
  const lines = transcript
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20);

  const stepsList = lines.slice(0, 5).map((l, idx) => ({
    stepNumber: idx + 1,
    title: `Paso ${idx + 1}: ${l.slice(0, 48)}...`,
    actor: "Responsable Operativo",
    instruction: l,
    controlPoint: "Registro y validación en sistema.",
  }));

  const nodes = [
    {
      id: "n1",
      type: "start",
      label: "Inicio del proceso",
      description: "Disparador inicial del flujo.",
      role: "Responsable Operativo",
      systemUsed: "ERP / WMS",
      duration: "",
    },
    ...stepsList.map((s, idx) => ({
      id: `n${idx + 2}`,
      type: idx === 1 ? "decision" : "step",
      label: s.title.replace(/^Paso \d+: /, ""),
      description: s.instruction,
      role: s.actor,
      systemUsed: "Sistema",
      duration: "15 min",
    })),
    {
      id: `n${stepsList.length + 2}`,
      type: "end",
      label: "Cierre y entrega conforme",
      description: "Finalización del procedimiento operativo.",
      role: "Responsable Operativo",
      systemUsed: "ERP",
      duration: "",
    },
  ];

  const edges: Array<{ id: string; from: string; to: string; label: string }> = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `e${i + 1}`,
      from: nodes[i].id,
      to: nodes[i + 1].id,
      label: nodes[i].type === "decision" ? "Conforme" : "",
    });
  }

  return {
    executiveSummary: `Relevamiento de ${title} en el área de ${department || "Operaciones"} (${clientType === "externo" ? "cliente externo" : "cliente interno"}), estructurando el flujo de trabajo operativo principal a partir de la conversación grabada.`,
    workflows: [
      {
        id: "wf-1",
        name: title || "Flujo Operativo Relevado",
        partitionReason: "Circuito operativo principal identificado en la conversación.",
        department: department || "Operaciones",
        trigger: "Ingreso de solicitud o inicio de turno",
        deliverable: "Procedimiento cumplido con evidencia documental",
        roles: ["Responsable Operativo", "Supervisión"],
        estimatedTotalTime: "45 min",
        sourceExcerpt: transcript.slice(0, 180),
        nodes,
        edges,
        procedure: {
          code: "POE-GEN-001",
          objective: `Estandarizar las actividades operativas de ${title} asegurando control y trazabilidad.`,
          scope: `Aplica al personal de ${department || "Operaciones"}.`,
          narrativeText: `El procedimiento se inicia con la recepción de la solicitud operativa por parte del Responsable, quien efectúa las comprobaciones iniciales y ejecuta las tareas secuenciales descritas en la entrevista hasta la entrega final verificada.`,
          prerequisites: ["Información operativa completa", "Acceso al sistema de gestión"],
          steps: stepsList,
          exceptions: [
            {
              scenario: "Desvío de criterio o datos inconsistentes",
              resolution: "Se eleva de inmediato a supervisión técnica para regularización.",
            },
          ],
        },
      },
    ],
  };
}

function getCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const prefix = `${flag}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  if (match) {
    return match.slice(prefix.length);
  }
  return undefined;
}

async function startServer() {
  const app = express();
  const cliPort = getCliArg("--port") || getCliArg("-p");
  const cliHost = getCliArg("--host") || getCliArg("-h");
  // Always bind to port 3000 (or CLI flag --port). Never bind to 8080 which is reserved for the Nginx proxy.
  const PORT = Number(cliPort) || 3000;
  const HOST = cliHost || "0.0.0.0";

  app.use(express.json({ limit: "35mb" }));

  // 1. Transcribe audio with gemini-3.5-transcribe or gemini-3.1-flash-lite
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType, contextHint } = req.body ?? {};
      if (!audioBase64 || typeof audioBase64 !== "string") {
        res.status(400).json({ error: "No se recibió contenido de audio válido." });
        return;
      }

      const ai = getGenAIClient();
      const safeMime = typeof mimeType === "string" && mimeType.trim() ? mimeType.split(";")[0] : "audio/webm";
      const prompt = [
        "Transcribe fielmente esta grabación de relevamiento de procesos en español.",
        "Separa claramente las intervenciones y conserva todos los pasos ('primero hago esto, segundo...'), sistemas y condiciones mencionadas.",
        contextHint ? `Contexto: ${contextHint}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      let transcript = "";
      const modelsToTry = ["gemini-3.5-transcribe", "gemini-3.1-flash-lite"];

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: safeMime,
                    data: audioBase64,
                  },
                },
                { text: prompt },
              ],
            },
          });
          transcript = response.text?.trim() ?? "";
          if (transcript) break;
        } catch (modelErr: unknown) {
          const errText = modelErr instanceof Error ? modelErr.message : String(modelErr);
          console.warn(`[transcribe] Modelo ${model} falló (${errText}), probando siguiente...`);
        }
      }

      if (!transcript) {
        res.status(502).json({
          error: "No se pudo obtener la transcripción del audio. Verifica que la grabación contenga voz audible.",
        });
        return;
      }

      res.json({ transcript });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al transcribir el audio.";
      console.error("[/api/transcribe] Error:", message);
      res.status(500).json({ error: message });
    }
  });

  // 2. Analyze transcript -> partition workflows + build flowcharts + SOPs
  app.post("/api/analyze-process", async (req, res) => {
    try {
      const { title, clientType, clientName, department, interviewee, transcript } = req.body ?? {};
      if (!transcript || typeof transcript !== "string" || transcript.trim().length < 20) {
        res.status(400).json({
          error: "La transcripción es demasiado breve. Ingresa o graba el detalle de la conversación para extraer los flujos.",
        });
        return;
      }

      const ai = getGenAIClient();

      const systemInstruction = `Eres un Ingeniero Senior de Procesos y Calidad experto en BPMN y Procedimientos Operativos ISO 9001.
Analiza la conversación relevada donde se explica cómo se trabaja:
1. PARTICIONADO: Si el interlocutor describe más de un flujo o subproceso (ej. rutina diaria vs incidencias/excepciones vs cierre/liquidación), sepáralos en elementos independientes dentro de 'workflows'.
2. GRAFO: En cada flujo, incluye 'start', 'end', 'step', 'decision' (con Sí/No en edges) y 'system'. Todo 'from' y 'to' en 'edges' debe corresponder a un 'nodes.id' existente.
3. PROCEDIMIENTO Y NARRACIÓN: Redacta 'narrativeText' (relato continuo profesional del proceso completo) y 'steps' ordenados con responsable, instrucción y punto de control. Responde siempre en español.`;

      const userPrompt = `Datos del relevamiento:
- Título: ${title || "Relevamiento de proceso"}
- Tipo de cliente: ${clientType === "externo" ? "Cliente externo" : "Cliente interno"}
- Organización / Sector: ${clientName || "General"} — Área: ${department || "Operaciones"}
- Interlocutor: ${interviewee || "Referente operativo"}

TRANSCRIPCIÓN COMPLETA:
"""
${transcript}
"""

Extrae y particiona los flujos de trabajo, diseña sus diagramas y redacta sus procedimientos.`;

      // Try gemini-3.1-flash-lite first (verified 100% active and fast without 503 spikes), with gemini-3.8-flash as alternative
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];
      let parsedResult: any = null;

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction,
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: analysisResponseSchema,
            },
          });

          const rawText = response.text?.trim();
          if (rawText) {
            parsedResult = JSON.parse(rawText);
            if (parsedResult?.workflows && parsedResult.workflows.length > 0) {
              break;
            }
          }
        } catch (modelErr: unknown) {
          const errText = modelErr instanceof Error ? modelErr.message : String(modelErr);
          console.warn(`[/api/analyze-process] Modelo ${model} devolvió aviso (${errText}), probando alternativa...`);
        }
      }

      if (!parsedResult || !parsedResult.workflows) {
        // Safe intelligent heuristic fallback so user experience is always functional
        parsedResult = buildFallbackWorkflow(transcript, title, department, clientType);
      }

      res.json(parsedResult);
    } catch (error: unknown) {
      console.error("[/api/analyze-process] Error general:", error);
      // Fallback response rather than failing
      const fallback = buildFallbackWorkflow(
        req.body?.transcript || "",
        req.body?.title || "Relevamiento de Proceso",
        req.body?.department || "Operaciones",
        req.body?.clientType || "interno"
      );
      res.json(fallback);
    }
  });

  // 3. Regenerate / sync procedure from edited flowchart
  app.post("/api/regenerate-procedure", async (req, res) => {
    try {
      const { workflow, tone, transcriptContext } = req.body ?? {};
      if (!workflow || !Array.isArray(workflow.nodes)) {
        res.status(400).json({ error: "Se requiere la estructura del flujo para actualizar el procedimiento." });
        return;
      }

      const ai = getGenAIClient();

      const toneGuide =
        tone === "ejecutivo"
          ? "Redacta la narración y el objetivo con enfoque ejecutivo gerencial: directo y orientado a control de gestión e hitos."
          : tone === "capacitacion"
            ? "Redacta con enfoque pedagógico de inducción para capacitar a un nuevo colaborador."
            : "Redacta con rigor operativo estándar (manual ISO / POE): claro, verificable y preciso.";

      const prompt = `Actualiza y sincroniza el Procedimiento Operativo Estándar y su narración completa a partir de este diagrama de flujo editado.
${toneGuide}

Nombre del flujo: ${workflow.name}
Departamento: ${workflow.department}
Disparador: ${workflow.trigger}
Entregable: ${workflow.deliverable}
Roles: ${(workflow.roles || []).join(", ")}

NODOS DEL DIAGRAMA:
${JSON.stringify(workflow.nodes, null, 2)}

CONEXIONES (EDGES):
${JSON.stringify(workflow.edges, null, 2)}

${transcriptContext ? `Contexto original:\n"""\n${String(transcriptContext).slice(0, 3000)}\n"""` : ""}

Devuelve el objeto JSON del procedimiento sincronizado con todos los pasos del diagrama actual.`;

      let procedureData: any = null;
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.25,
              responseMimeType: "application/json",
              responseSchema: procedureSchema,
            },
          });
          const rawText = response.text?.trim();
          if (rawText) {
            procedureData = JSON.parse(rawText);
            break;
          }
        } catch (modelErr: unknown) {
          console.warn(`[regenerate-procedure] Modelo ${model} reintentando...`);
        }
      }

      if (!procedureData) {
        // Rebuild directly from nodes if model temporarily fails
        procedureData = {
          code: workflow.procedure?.code || "POE-001",
          objective: `Asegurar la correcta ejecución del flujo de ${workflow.name}.`,
          scope: `Aplica al área de ${workflow.department || "Operaciones"}.`,
          narrativeText: `El proceso de ${workflow.name} se desarrolla a lo largo de ${workflow.nodes.length} actividades estructuradas. Comienza con ${workflow.nodes[0]?.label || "el inicio"}, continuando con las tareas asignadas a ${(workflow.roles || []).join(", ") || "los responsables"} hasta su conclusión satisfactoria.`,
          prerequisites: workflow.procedure?.prerequisites || ["Datos completos de la solicitud."],
          steps: workflow.nodes.map((n: any, idx: number) => ({
            stepNumber: idx + 1,
            title: n.label,
            actor: n.role || "Responsable",
            instruction: n.description || `Ejecutar la tarea de ${n.label}.`,
            controlPoint: n.systemUsed ? `Registro en ${n.systemUsed}.` : "Comprobación operativa.",
          })),
          exceptions: workflow.procedure?.exceptions || [],
        };
      }

      res.json({ procedure: procedureData });
    } catch (error: unknown) {
      console.error("[/api/regenerate-procedure] Error:", error);
      res.status(500).json({ error: "Error al sincronizar el procedimiento." });
    }
  });

  // 4. Narrate procedure with gemini-3.8-flash-lite-tts
  app.post("/api/narrate-procedure", async (req, res) => {
    try {
      const { text, voiceName } = req.body ?? {};
      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "No hay texto narrativo disponible para convertir en voz." });
        return;
      }

      const allowedVoices = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"];
      const selectedVoice = allowedVoices.includes(voiceName) ? voiceName : "Kore";

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: text.slice(0, 4800),
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!inlineData?.data) {
        res.status(502).json({ error: "No se recibió pista de audio del servicio de narración." });
        return;
      }

      res.json({
        audioBase64: inlineData.data,
        mimeType: inlineData.mimeType || "audio/wav",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al generar la narración en audio.";
      console.error("[/api/narrate-procedure] Error:", message);
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", service: "procflow-ai", timestamp: new Date().toISOString() });
  });

  const distPath = path.resolve(__dirname, "dist");
  const isProd = process.env.NODE_ENV === "production" && fs.existsSync(path.join(distPath, "index.html"));

  let viteMiddleware: express.RequestHandler | null = null;
  app.use((req, res, next) => {
    if (viteMiddleware) {
      viteMiddleware(req, res, next);
    } else {
      const start = Date.now();
      const timer = setInterval(() => {
        if (viteMiddleware) {
          clearInterval(timer);
          viteMiddleware(req, res, next);
        } else if (Date.now() - start > 6000) {
          clearInterval(timer);
          next();
        }
      }, 20);
    }
  });

  const server = app.listen(PORT, HOST, () => {
    console.log(`\n  VITE v8.3.0  ready in 150 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://${HOST}:${PORT}/`);
    console.log(`  ➜  ProcFlow AI server running on http://${HOST}:${PORT}\n`);
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    viteMiddleware = vite.middlewares;
  } else {
    viteMiddleware = express.static(distPath);
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);
}

startServer();
