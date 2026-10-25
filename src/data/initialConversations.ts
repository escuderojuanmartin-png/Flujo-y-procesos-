import { ConversationSession } from "../types/process";

export interface SampleTranscriptTemplate {
  id: string;
  label: string;
  clientType: "interno" | "externo";
  clientName: string;
  department: string;
  interviewee: string;
  transcript: string;
}

export const SAMPLE_TRANSCRIPTS: SampleTranscriptTemplate[] = [
  {
    id: "sample-mantenimiento",
    label: "Taller y Flota: Mantenimiento Preventivo + Compra de Repuestos Urgentes",
    clientType: "interno",
    clientName: "División Operaciones Terrestres",
    department: "Mantenimiento de Flota",
    interviewee: "Ing. Raúl Domínguez (Jefe de Taller)",
    transcript: `Entrevistador: Raúl, contame paso a paso cómo manejan hoy el mantenimiento de los camiones y qué pasa cuando falta un repuesto crítico.

Raúl Domínguez: Mirá, nosotros tenemos dos circuitos bien separados. El primero es el mantenimiento preventivo programado. Primero, todos los lunes a las 7:30 el Planificador de Taller descarga del sistema telemático el reporte de kilómetros recorridos de cada unidad. Segundo, revisa si algún camión superó el umbral de 18.000 km desde el último servicio. Si no llegó al kilometraje, simplemente actualiza el tablero semanal y termina ahí. Pero si superó el umbral, genera la Orden de Trabajo Preventiva en SAP PM y bloquea la unidad en la grilla de Tráfico para el día siguiente. Tercero, el Mecánico de Turno recibe el camión en fosa, ejecuta el checklist de 24 puntos y registra el consumo de filtros y lubricantes de pañol. Cuarto, el Supervisor Técnico hace la prueba dinámica de frenos; si aprueba, libera el camión en el sistema y queda disponible para despacho.

Entrevistador: Clarísimo. ¿Y cuál es el segundo circuito cuando detectan una rotura o falta un repuesto que no está en pañol?

Raúl Domínguez: Ese es un flujo totalmente aparte, que es la Compra de Emergencia por Unidad Detenida. Arranca cuando el Pañolero verifica stock y confirma faltante crítico con camión parado. Primero, el Pañolero emite una Solicitud de Repuesto Crítico indicando número de chasis y código OEM. Segundo, el Comprador Técnico pide cotización inmediata a tres proveedores homologados por portal. Tercero, evalúa el monto total: si el repuesto cuesta menos de 1.500 dólares, el Jefe de Taller lo aprueba directo en el sistema; si supera los 1.500 dólares, pasa a firma digital de Gerencia de Operaciones. Una vez aprobado, se emite la Orden de Compra urgente, el proveedor entrega en puerta de taller con remito, Pañol da ingreso técnico verificando la pieza y entrega en mano al mecánico cerrando el ticket de urgencia.`,
  },
  {
    id: "sample-onboarding-ext",
    label: "Cliente Externo: Alta de Cuenta Corporativa + Conciliación de Facturación",
    clientType: "externo",
    clientName: "Grupo Alimenticio Río Plata",
    department: "Cuentas por Pagar y Proveedores",
    interviewee: "Lucía Pereyra (Líder de Administración)",
    transcript: `Entrevistador: Lucía, queremos mapear cómo operan ustedes internamente desde que contratan un nuevo servicio logístico hasta que liberan el pago mensual.

Lucía Pereyra: Perfecto, te explico porque son dos procesos en momentos distintos. Por un lado está el Alta y Homologación de Proveedor. Primero, el comprador comercial nos envía por la mesa de ayuda la carpeta fiscal del nuevo proveedor (constancia impositiva, certificados de seguro de carga y datos bancarios CBU). Segundo, Analista de Impuestos controla la vigencia de certificados y retenciones en el padrón oficial. Tercero, tomamos una decisión: ¿la documentación está completa y sin bloqueos fiscales? Si falta algo o tiene deuda, devolvemos el trámite por correo al proveedor detallando el requisito pendiente hasta que lo subsane. Si está todo en regla, Maestro de Datos da el alta en el ERP asignando código de acreedor y condición de pago a 30 días, enviando notificación automática de bienvenida.

Por otro lado, a fin de mes tenemos el proceso de Conciliación y Pago de Servicios. Primero, el proveedor sube su pre-liquidación junto con los viajes realizados al portal B2B antes del día 28. Segundo, nuestro Analista de Costos cruza en el ERP las tarifas pactadas contra las recepciones reales en planta. Si hay diferencias mayores al 2%, se abre una nota de ajuste y se pide refacturación parcial. Si las cantidades y tarifas coinciden, habilitamos la carga de la factura electrónica definitiva, Tesorería la agenda en la corrida bancaria de los jueves y el sistema dispara el comprobante de transferencia y certificados de retención.`,
  },
];

export const INITIAL_CONVERSATIONS: ConversationSession[] = [
  {
    id: "conv-transporte-01",
    title: "Relevamiento Operativo: Despacho, Incidencias en Ruta y Liquidación",
    clientType: "interno",
    clientName: "Sede Central Logística",
    department: "Transporte y Distribución",
    interviewee: "Martín Gómez — Coordinador de Tráfico",
    recordedAt: "2026-10-22",
    durationLabel: "18:40",
    transcript: `Entrevistador: Buen día Martín. La idea de esta sesión es que me cuentes tal cual cómo trabajan hoy en el departamento de Transporte, paso por paso, desde que les piden los viajes hasta que cierran todo.

Martín Gómez: Qué tal, buen día. Dale, te cuento completo porque en el día a día manejamos tres flujos bien marcados según el momento de la operación.

El primer flujo es el de Programación y Asignación de Unidades, que hacemos todas las mañanas entre las 08:00 y las 10:30. Primero, Comercial y Almacén cierran el corte de pedidos preparados en el WMS y eso nos dispara la bolsa de cargas pendientes del día. Segundo, desde Coordinación de Tráfico consolidamos las entregas por zona geográfica, peso y ventana horaria de cada cliente en nuestro sistema TMS. Tercero, revisamos disponibilidad de flota: nos fijamos si tenemos camión propio disponible con la capacidad y habilitación necesaria. Si hay flota propia libre, asignamos chofer interno directo en el TMS y emitimos la Hoja de Ruta. Ahora, si no alcanza la flota propia, abrimos pedido rápido a agencias de transporte homologadas, validamos que los papeles del chofer y seguro estén vigentes en el portal documental y recién ahí confirmamos la unidad tercerizada. Cuarto, Almacén carga el camión en dársena, verificamos precinto y el chofer sale con carta de porte y remitos emitidos.

Entrevistador: Impecable. ¿Qué pasa después cuando el camión ya está en la calle y surge algún problema en la entrega?

Martín Gómez: Ahí entra el segundo flujo independiente, que es la Gestión de Incidencias en Ruta. Esto se dispara únicamente cuando el chofer nos reporta por la app móvil una novedad en destino: puede ser demora de más de dos horas en descarga, diferencia de bultos o rechazo parcial del cliente. Primero, el Operador de Monitoreo recibe la alerta geolocalizada con foto del remito observado en la Torre de Control. Segundo, clasifica la gravedad: si es solo demora operativa en rampa del cliente, registra el inicio de estadía en el TMS para cobrar el adicional y avisa al siguiente punto de la hoja de ruta. En cambio, si es rechazo de mercadería o rotura, el Operador contacta en el acto al Ejecutivo Comercial de esa cuenta para que defina en menos de 20 minutos si se reentrega en sucursal cercana o vuelve a planta. Con esa autorización escrita en el ticket, se instruye al chofer en la app y se genera la Orden de Retorno para que Recepción de Logística Inversa lo espere.

Entrevistador: Clarísimo cómo se separa. ¿Y el tercer flujo cuál sería?

Martín Gómez: El tercero es la Rendición Documental y Liquidación de Viaje cuando termina el recorrido. Primero, al regresar a base —o dentro de las 24 horas si es fletero externo— el chofer entrega en Mesa de Control los remitos físicos firmados y sellados junto con los tickets de peaje o estadía. Segundo, el Administrativo de Transporte escanea y puntea cada remito contra la Hoja de Ruta en el TMS. Tercero, controla si están todos los remitos conformados sin faltantes: si falta algún remito o hay diferencia no declarada, bloquea preventivamente la liquidación del viaje y abre reclamo al transportista con plazo de 48 horas. Si la documentación cuadra al 100%, cierra el viaje como 'Cumplido', genera la pre-liquidación de flete en el ERP y la envía a Administración para su pago quincenal.`,
    executiveSummary:
      "El relevamiento con Coordinación de Tráfico permitió identificar y particionar tres procesos operativos autónomos dentro del área de Transporte: (1) la programación matutina y asignación de flota propia o tercerizada, (2) el protocolo reactivo ante incidencias o rechazos durante el tránsito en calle, y (3) el control documental de remitos conformados previo a la liquidación contable del flete.",
    workflows: [
      {
        id: "wf-trn-1",
        name: "Programación y Asignación de Unidades",
        partitionReason:
          "Proceso planificado diario con disparador fijo por corte de almacén (08:00 hs) previo a la salida del vehículo.",
        department: "Transporte y Distribución",
        trigger: "Cierre del corte de pedidos preparados en WMS por Almacén y Comercial.",
        deliverable: "Unidad cargada, precintada y despachada con Hoja de Ruta y Carta de Porte.",
        roles: [
          "Almacén / Comercial",
          "Coordinador de Tráfico",
          "Control Documental",
          "Chofer",
        ],
        estimatedTotalTime: "2 h 30 min",
        sourceExcerpt:
          "“Primero, Comercial y Almacén cierran el corte de pedidos preparados en el WMS... consolidamos las entregas por zona geográfica, peso y ventana horaria en nuestro TMS...”",
        nodes: [
          {
            id: "n1",
            type: "start",
            label: "Corte de pedidos en WMS",
            description: "Recepción de la bolsa diaria de pedidos preparados listos para expedición.",
            role: "Almacén / Comercial",
            systemUsed: "WMS",
            duration: "",
          },
          {
            id: "n2",
            type: "system",
            label: "Consolidar rutas y zonas en TMS",
            description:
              "Agrupación de entregas según zona geográfica, tonelaje total y ventanas horarias de descarga de clientes.",
            role: "Coordinador de Tráfico",
            systemUsed: "TMS Rutas",
            duration: "35 min",
          },
          {
            id: "n3",
            type: "decision",
            label: "¿Flota propia disponible?",
            description:
              "Verificación de disponibilidad de camiones propios con capacidad y habilitación técnica acorde a la ruta.",
            role: "Coordinador de Tráfico",
            systemUsed: "TMS Flota",
            duration: "10 min",
          },
          {
            id: "n4",
            type: "step",
            label: "Asignar camión y chofer interno",
            description: "Asignación directa de tractor/chasis propio y conductor de nómina en la grilla operativa.",
            role: "Coordinador de Tráfico",
            systemUsed: "TMS",
            duration: "10 min",
          },
          {
            id: "n5",
            type: "step",
            label: "Solicitar fletero y validar legajo",
            description:
              "Contratación de agencia homologada validando vigencia de seguro, VTV y registro del chofer en portal documental.",
            role: "Control Documental",
            systemUsed: "Portal Proveedores",
            duration: "30 min",
          },
          {
            id: "n6",
            type: "system",
            label: "Emitir Hoja de Ruta y Carta de Porte",
            description: "Generación oficial de documentación de tránsito, remitos asociados y orden de carga.",
            role: "Coordinador de Tráfico",
            systemUsed: "TMS / ERP",
            duration: "15 min",
          },
          {
            id: "n7",
            type: "step",
            label: "Cargar en dársena y colocar precinto",
            description: "Estiba física de mercadería en rampa, control cruzado de bultos y precintado numerado.",
            role: "Almacén / Comercial",
            systemUsed: "Colector RF",
            duration: "45 min",
          },
          {
            id: "n8",
            type: "end",
            label: "Unidad despachada a ruta",
            description: "Salida efectiva del transporte por portería con seguimiento satelital activo.",
            role: "Chofer",
            systemUsed: "App Chofer",
            duration: "",
          },
        ],
        edges: [
          { id: "e1", from: "n1", to: "n2", label: "" },
          { id: "e2", from: "n2", to: "n3", label: "" },
          { id: "e3", from: "n3", to: "n4", label: "Sí" },
          { id: "e4", from: "n3", to: "n5", label: "No (Tercerizar)" },
          { id: "e5", from: "n4", to: "n6", label: "" },
          { id: "e6", from: "n5", to: "n6", label: "Habilitado" },
          { id: "e7", from: "n6", to: "n7", label: "" },
          { id: "e8", from: "n7", to: "n8", label: "" },
        ],
        procedure: {
          code: "POE-TRN-001",
          objective:
            "Asegurar la consolidación diaria de cargas y la asignación eficiente y reglamentaria de unidades propias o contratadas dentro de la franja matutina de despacho.",
          scope:
            "Aplica a todas las expediciones nacionales y urbanas gestionadas por Coordinación de Tráfico desde el cierre del corte en WMS hasta la salida de portería.",
          narrativeText:
            "El procedimiento de Programación y Asignación de Unidades comienza cada mañana a las ocho horas, cuando Almacén y Comercial confirman el corte de pedidos preparados en el sistema WMS. Con esa bolsa de cargas disponible, el Coordinador de Tráfico ingresa al módulo de ruteo del TMS para consolidar los pedidos según zona geográfica, peso total y ventana horaria de cada cliente. Una vez armadas las rutas óptimas, verifica la disponibilidad de flota propia. Si existe un vehículo interno libre con la capacidad adecuada, asigna directamente unidad y chofer en el sistema. En caso de no contar con flota propia suficiente, solicita unidad a una agencia homologada y Control Documental valida en el portal que el seguro, la revisión técnica y la licencia del conductor estén vigentes antes de confirmar el servicio. Con la unidad asignada, se emite la Hoja de Ruta y la Carta de Porte, Almacén procede a la carga en dársena colocando el precinto numerado y el chofer inicia formalmente el viaje.",
          prerequisites: [
            "Corte de preparación de pedidos cerrado en WMS antes de las 08:15 hs.",
            "Maestro de ventanas horarias de clientes actualizado en TMS.",
            "Padrón de transportistas tercerizados con pólizas vigentes en Portal Documental.",
          ],
          steps: [
            {
              stepNumber: 1,
              title: "Recepción de bolsa de cargas pendientes",
              actor: "Coordinador de Tráfico",
              instruction:
                "Importar en el TMS el lote de pedidos liberados por WMS verificando volumen (m³), peso bruto y prioridad comercial.",
              controlPoint: "Conciliación sin diferencias entre pedidos liberados en WMS y pendientes en TMS.",
            },
            {
              stepNumber: 2,
              title: "Consolidación y armado de hojas de ruta",
              actor: "Coordinador de Tráfico",
              instruction:
                "Agrupar las entregas por corredor logístico y ventana horaria maximizando el factor de ocupación de bodega (>85%).",
              controlPoint: "Simulación de ruta aprobada en TMS sin solapamiento de horarios.",
            },
            {
              stepNumber: 3,
              title: "Evaluación y asignación de flota (propia o externa)",
              actor: "Coordinador de Tráfico / Control Documental",
              instruction:
                "Priorizar asignación de unidades propias disponibles. De requerirse flota externa, adjudicar a transportista homologado únicamente tras verificar aptitud documental vigente.",
              controlPoint: "Estado 'Habilitado' en Portal Documental y patente vinculada a la ruta.",
            },
            {
              stepNumber: 4,
              title: "Emisión documental y despacho físico en dársena",
              actor: "Almacén / Chofer",
              instruction:
                "Imprimir Hoja de Ruta, remitos y Carta de Porte. Ejecutar la carga física en rampa, colocar precinto de seguridad y registrar número de precinto al salir.",
              controlPoint: "Remito de salida firmado por chofer y número de precinto asentado en TMS.",
            },
          ],
          exceptions: [
            {
              scenario: "Transportista externo presenta seguro o licencia vencida en el portal.",
              resolution:
                "El sistema bloquea la emisión de Hoja de Ruta y se reasigna de inmediato a la segunda agencia homologada en orden de tarifa.",
            },
            {
              scenario: "Exceso de volumen real en dársena respecto al cubicaje teórico del pedido.",
              resolution:
                "Almacén notifica a Tráfico antes del cierre de puertas para desdoblar la última parada en el siguiente turno de salida.",
            },
          ],
        },
      },
      {
        id: "wf-trn-2",
        name: "Gestión de Incidencias y Rechazos en Ruta",
        partitionReason:
          "Flujo eventual y reactivo en tiempo real disparado por eventos en calle (demoras o rechazos), con actores de monitoreo y comercial.",
        department: "Transporte y Distribución",
        trigger: "Alerta enviada por el chofer desde la App Móvil durante el recorrido.",
        deliverable: "Estadía registrada o mercadería redireccionada con Orden de Retorno emitida.",
        roles: [
          "Chofer",
          "Operador de Monitoreo",
          "Ejecutivo Comercial",
          "Logística Inversa",
        ],
        estimatedTotalTime: "35 min",
        sourceExcerpt:
          "“Esto se dispara únicamente cuando el chofer nos reporta por la app móvil una novedad en destino: demora de más de dos horas, diferencia de bultos o rechazo parcial...”",
        nodes: [
          {
            id: "n1",
            type: "start",
            label: "Reporte de novedad en App Móvil",
            description: "El conductor informa incidente geolocalizado adjuntando evidencia fotográfica.",
            role: "Chofer",
            systemUsed: "App Chofer",
            duration: "",
          },
          {
            id: "n2",
            type: "system",
            label: "Recepción de alerta en Torre de Control",
            description: "Apertura automática de ticket de incidencia vinculado a la patente y remito.",
            role: "Operador de Monitoreo",
            systemUsed: "Torre Control TMS",
            duration: "5 min",
          },
          {
            id: "n3",
            type: "decision",
            label: "¿Existe rechazo o daño de carga?",
            description:
              "Clasificación del evento entre demora operativa simple en descarga o rechazo/avería de mercadería.",
            role: "Operador de Monitoreo",
            systemUsed: "Torre Control TMS",
            duration: "5 min",
          },
          {
            id: "n4",
            type: "step",
            label: "Registrar estadía y avisar próximas paradas",
            description:
              "Cómputo de horas de espera excedentes y notificación preventiva de reprogramación a siguientes clientes.",
            role: "Operador de Monitoreo",
            systemUsed: "TMS Monitoreo",
            duration: "10 min",
          },
          {
            id: "n5",
            type: "step",
            label: "Solicitar definición a Ejecutivo Comercial",
            description:
              "Consulta urgente (SLA máximo 20 minutos) para decidir reentrega cercana o devolución a planta.",
            role: "Ejecutivo Comercial",
            systemUsed: "CRM / Ticket",
            duration: "15 min",
          },
          {
            id: "n6",
            type: "system",
            label: "Emitir Orden de Retorno e instruir chofer",
            description:
              "Generación del documento digital de retorno o desvío y envío de instrucciones a la App del conductor.",
            role: "Logística Inversa",
            systemUsed: "WMS / TMS",
            duration: "10 min",
          },
          {
            id: "n7",
            type: "end",
            label: "Incidencia resuelta y trazada",
            description: "Continuidad de la hoja de ruta con respaldo documental del evento.",
            role: "Chofer",
            systemUsed: "App Chofer",
            duration: "",
          },
        ],
        edges: [
          { id: "e1", from: "n1", to: "n2", label: "" },
          { id: "e2", from: "n2", to: "n3", label: "" },
          { id: "e3", from: "n3", to: "n4", label: "No (Solo demora)" },
          { id: "e4", from: "n3", to: "n5", label: "Sí (Rechazo / Avería)" },
          { id: "e5", from: "n5", to: "n6", label: "Autorizado" },
          { id: "e6", from: "n4", to: "n7", label: "" },
          { id: "e7", from: "n6", to: "n7", label: "" },
        ],
        procedure: {
          code: "POE-TRN-002",
          objective:
            "Estandarizar la respuesta en tiempo real ante eventos anómalos en tránsito para minimizar tiempos improductivos del vehículo y asegurar la trazabilidad de mercadería rechazada.",
          scope:
            "Comprende todas las novedades reportadas por choferes propios o externos desde su salida de planta hasta la última entrega de la hoja de ruta.",
          narrativeText:
            "Cuando surge un imprevisto durante el reparto, el proceso de Gestión de Incidencias en Ruta se activa en el momento en que el chofer reporta la novedad desde su aplicación móvil adjuntando geolocalización y fotografía del remito observado. El Operador de Monitoreo recibe la alerta en la Torre de Control y clasifica de inmediato la naturaleza del problema. Si se trata únicamente de una demora mayor a dos horas en la rampa de descarga del cliente, deja asentado el inicio de estadía en el TMS para su posterior cargo y notifica el corrimiento horario a los clientes siguientes de la ruta. Por el contrario, si existe un rechazo parcial, total o rotura de mercadería, contacta al Ejecutivo Comercial responsable, quien dispone de veinte minutos como máximo para instruir por escrito una reentrega alternativa o el regreso de la carga. Con esa definición, se genera la Orden de Retorno para Logística Inversa y el chofer recibe la instrucción exacta en pantalla para retomar el recorrido.",
          prerequisites: [
            "Aplicación móvil de choferes sincronizada con GPS activo.",
            "Matriz de contactos comerciales de guardia cargada en Torre de Control.",
          ],
          steps: [
            {
              stepNumber: 1,
              title: "Notificación geolocalizada desde destino",
              actor: "Chofer",
              instruction:
                "Seleccionar motivo de incidencia en la App Móvil antes de retirarse del domicilio del cliente y tomar fotografía legible del remito con observaciones.",
              controlPoint: "Ticket creado con coordenadas GPS e imagen adjunta.",
            },
            {
              stepNumber: 2,
              title: "Triage operativo en Torre de Control",
              actor: "Operador de Monitoreo",
              instruction:
                "Evaluar el ticket entrante en menos de 5 minutos diferenciando demoras en descarga de rechazos físicos o faltantes.",
              controlPoint: "Tipificación registrada en el tablero de tráfico.",
            },
            {
              stepNumber: 3,
              title: "Tratamiento de demora o resolución comercial de rechazo",
              actor: "Operador de Monitoreo / Ejecutivo Comercial",
              instruction:
                "Para demoras: activar cronómetro de estadía y avisar próximos destinos. Para rechazos: obtener disposición escrita del Ejecutivo Comercial dentro de los 20 minutos.",
              controlPoint: "Aprobación comercial asentada en el ticket o registro horario de estadía.",
            },
            {
              stepNumber: 4,
              title: "Emisión de Orden de Retorno y cierre en ruta",
              actor: "Logística Inversa",
              instruction:
                "Emitir pre-ingreso de devolución en WMS/TMS e informar al chofer la liberación para retirarse del punto de entrega.",
              controlPoint: "Número de Orden de Retorno visible en la App del conductor.",
            },
          ],
          exceptions: [
            {
              scenario: "Sin respuesta del Ejecutivo Comercial cumplidos los 20 minutos en rampa.",
              resolution:
                "Por regla de liberación de flota, el Coordinador de Tráfico autoriza el retorno inmediato a planta para no comprometer el resto del reparto.",
            },
          ],
        },
      },
      {
        id: "wf-trn-3",
        name: "Rendición Documental y Liquidación de Viaje",
        partitionReason:
          "Proceso administrativo-contable post-operativo que valida comprobantes físicos antes de habilitar el pago del flete.",
        department: "Transporte y Administración",
        trigger: "Regreso de la unidad a base o presentación de comprobantes dentro de las 24 hs.",
        deliverable: "Viaje cerrado como 'Cumplido' y pre-liquidación de flete transferida al ERP.",
        roles: [
          "Chofer",
          "Administrativo de Transporte",
          "Administración / Pagos",
        ],
        estimatedTotalTime: "24 h",
        sourceExcerpt:
          "“Al regresar a base el chofer entrega en Mesa de Control los remitos físicos firmados... Si la documentación cuadra al 100%, cierra el viaje y genera la pre-liquidación...”",
        nodes: [
          {
            id: "n1",
            type: "start",
            label: "Entrega de remitos físicos en Mesa",
            description: "Recepción de remitos conformados, tickets de peaje y actas de estadía.",
            role: "Chofer",
            systemUsed: "Mesa de Control",
            duration: "",
          },
          {
            id: "n2",
            type: "system",
            label: "Digitalizar y puntear contra Hoja de Ruta",
            description: "Escaneo óptico de cada comprobante y cruce línea por línea en el sistema TMS.",
            role: "Administrativo de Transporte",
            systemUsed: "TMS Documental",
            duration: "20 min",
          },
          {
            id: "n3",
            type: "decision",
            label: "¿Documentación 100% conforme?",
            description:
              "Verificación de firmas, sellos de recepción y coincidencia con órdenes de retorno si hubo rechazos.",
            role: "Administrativo de Transporte",
            systemUsed: "TMS Documental",
            duration: "10 min",
          },
          {
            id: "n4",
            type: "step",
            label: "Bloquear pago y reclamar faltante (48 h)",
            description:
              "Retención preventiva de la liquidación del viaje y notificación formal al transportista para recupero documental.",
            role: "Administrativo de Transporte",
            systemUsed: "Portal Proveedores",
            duration: "48 h",
          },
          {
            id: "n5",
            type: "system",
            label: "Cerrar viaje y emitir pre-liquidación ERP",
            description:
              "Cambio de estado a 'Cumplido', cálculo automático de tarifa + adicionales y transferencia contable.",
            role: "Administrativo de Transporte",
            systemUsed: "TMS / ERP",
            duration: "10 min",
          },
          {
            id: "n6",
            type: "end",
            label: "Flete habilitado para pago quincenal",
            description: "Liquidación disponible en tesorería para facturación y desembolso.",
            role: "Administración / Pagos",
            systemUsed: "ERP Finanzas",
            duration: "",
          },
        ],
        edges: [
          { id: "e1", from: "n1", to: "n2", label: "" },
          { id: "e2", from: "n2", to: "n3", label: "" },
          { id: "e3", from: "n3", to: "n4", label: "No (Faltante)" },
          { id: "e4", from: "n3", to: "n5", label: "Sí (Conforme)" },
          { id: "e5", from: "n4", to: "n2", label: "Subsanado" },
          { id: "e6", from: "n5", to: "n6", label: "" },
        ],
        procedure: {
          code: "POE-TRN-003",
          objective:
            "Garantizar el recupero íntegro y oportuno de los remitos conformados por clientes como condición excluyente para la liquidación y pago de servicios de transporte.",
          scope:
            "Alcanza el 100% de las hojas de ruta cerradas por flota propia y agencias tercerizadas al concluir cada recorrido.",
          narrativeText:
            "El procedimiento de Rendición Documental y Liquidación de Viaje inicia al finalizar el recorrido, o dentro de un plazo máximo de veinticuatro horas para transportistas externos, con la entrega en Mesa de Control de todos los remitos físicos firmados, sellados y acompañados por comprobantes de peajes o estadías. El Administrativo de Transporte digitaliza los documentos y realiza el punteo contra la Hoja de Ruta en el TMS. Seguidamente verifica si la totalidad de los comprobantes se encuentra conforme y respaldada. Si detecta un remito faltante o una diferencia sin Orden de Retorno autorizada, bloquea preventivamente el pago del viaje e intima al transportista a regularizar la documentación en un plazo de cuarenta y ocho horas para volver a auditarla. Cuando el legajo del viaje está cien por ciento conforme, se marca el estado Cumplido, el sistema calcula automáticamente la pre-liquidación en el ERP y queda habilitada en Administración para el ciclo quincenal de pagos.",
          prerequisites: [
            "Hoja de ruta en estado 'En tránsito / Finalizada en App' en TMS.",
            "Órdenes de retorno cerradas por almacén en caso de rechazos parciales.",
          ],
          steps: [
            {
              stepNumber: 1,
              title: "Recepción física de legajo de viaje",
              actor: "Chofer / Mesa de Control",
              instruction:
                "Entregar sobre de viaje ordenado cronológicamente con la totalidad de remitos conformados dentro de las 24 horas posteriores a la última entrega.",
              controlPoint: "Acuse de recibo emitido por Mesa de Control con fecha y hora.",
            },
            {
              stepNumber: 2,
              title: "Digitalización e indexación en TMS",
              actor: "Administrativo de Transporte",
              instruction:
                "Escanear los remitos vinculando cada imagen al número de entrega y cliente correspondiente en el sistema documental.",
              controlPoint: "Imagen legible asociada al 100% de las paradas de la ruta.",
            },
            {
              stepNumber: 3,
              title: "Auditoría de conformidad o bloqueo preventivo",
              actor: "Administrativo de Transporte",
              instruction:
                "Validar firma, aclaración y sello del receptor. Ante ausencias o tachaduras sin respaldo, aplicar estado 'Retenido por Documentación' y notificar reclamo por 48 hs.",
              controlPoint: "Checklist de auditoría aprobado o ticket de reclamo emitido.",
            },
            {
              stepNumber: 4,
              title: "Cierre de viaje y transferencia de pre-liquidación",
              actor: "Administrativo de Transporte / Administración",
              instruction:
                "Confirmar estado 'Cumplido' en TMS para transferir el importe tarifado y adicionales aprobados hacia el módulo de Cuentas a Pagar del ERP.",
              controlPoint: "Número de pre-liquidación contabilizado en ERP Finanzas.",
            },
          ],
          exceptions: [
            {
              scenario: "Extravío definitivo de remito físico por parte del fletero externo.",
              resolution:
                "El transportista debe gestionar una certificación de recepción firmada por el cliente destinatario antes de liberar la liquidación retenida.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "conv-cliente-ext-02",
    title: "Integración de Pedidos Mayoristas y Devoluciones Comerciales",
    clientType: "externo",
    clientName: "Distribuidora Mayorista del Sur S.A.",
    department: "Abastecimiento y Operaciones B2B",
    interviewee: "Carolina Vega — Jefa de Abastecimiento",
    recordedAt: "2026-10-20",
    durationLabel: "14:15",
    transcript: `Entrevistador: Carolina, gracias por sumarte. Como ustedes son uno de nuestros principales clientes externos, queríamos entender cómo arman sus pedidos de reposición y cómo gestionan después cualquier diferencia en recepción.

Carolina Vega: Gracias a ustedes. Mirá, de nuestro lado tenemos dos circuitos separados. El primero es la Emisión y Aprobación de Pedidos de Reposición Semanal. Primero, todos los martes nuestro Analista de Inventarios corre el cálculo de stock mínimo de las 14 sucursales en nuestro ERP. Segundo, genera el borrador de Orden de Compra sugerida por proveedor y lo pasa a revisión comercial. Tercero, evaluamos si el pedido supera el cupo financiero semanal asignado a la línea: si no lo supera, se aprueba automático y se transmite por EDI al portal de ustedes; si supera el cupo por alguna promoción estacional, necesita firma conjunta de nuestra Gerencia Financiera antes de enviarse. Finalmente recibimos la confirmación de stock asignado y agendamos turno de rampa en nuestro centro de distribución.

El segundo circuito ocurre cuando recibimos el camión en nuestro depósito y hay diferencias: es el proceso de Reclamo de Recepción y Nota de Crédito. Primero, nuestro Receptor de Rampa controla bultos y vencimientos con colector de códigos al bajar el pallet. Si detecta vida útil menor a 90 días o cajas dañadas, emite en el acto un Acta de Discrepancia firmada por el chofer. Segundo, Administración de Compras carga ese acta en el portal B2B de reclamos dentro de las 24 horas y bloquea parcialmente el pago de esa factura solo por el monto afectado. Tercero, espera la validación comercial: una vez que ustedes emiten la Nota de Crédito electrónica, nuestro sistema concilia automáticamente el saldo y libera el pago del remanente conforme.`,
    executiveSummary:
      "Relevamiento con cliente externo (Distribuidora Mayorista del Sur S.A.) particionado en dos flujos de interfaz comercial-logística: (1) el ciclo semanal de reposición y aprobación crediticia de órdenes EDI, y (2) la gestión de discrepancias en rampa de recepción y conciliación de notas de crédito.",
    workflows: [
      {
        id: "wf-ext-1",
        name: "Emisión y Aprobación de Pedidos de Reposición EDI",
        partitionReason:
          "Flujo transaccional semanal de compra B2B previo al abastecimiento físico.",
        department: "Abastecimiento Mayorista",
        trigger: "Ejecución semanal (martes) del cálculo MRP de stock mínimo en 14 sucursales.",
        deliverable: "Orden de Compra transmitida vía EDI y turno de descarga reservado en CD.",
        roles: [
          "Analista de Inventarios",
          "Gerencia Financiera",
          "Portal EDI Proveedor",
        ],
        estimatedTotalTime: "4 h",
        sourceExcerpt:
          "“Todos los martes nuestro Analista de Inventarios corre el cálculo de stock mínimo... evaluamos si supera el cupo financiero semanal...”",
        nodes: [
          {
            id: "n1",
            type: "start",
            label: "Cálculo semanal de reposición",
            description: "Ejecución del motor de reabastecimiento consolidando demanda de 14 sucursales.",
            role: "Analista de Inventarios",
            systemUsed: "ERP Cliente",
            duration: "",
          },
          {
            id: "n2",
            type: "step",
            label: "Generar borrador de Orden de Compra",
            description: "Armado de propuesta de compra por proveedor respetando múltiplos de pallet.",
            role: "Analista de Inventarios",
            systemUsed: "ERP Compras",
            duration: "45 min",
          },
          {
            id: "n3",
            type: "decision",
            label: "¿Supera cupo financiero semanal?",
            description: "Validación presupuestaria del monto valorizado frente al límite operativo semanal.",
            role: "Analista de Inventarios",
            systemUsed: "ERP Finanzas",
            duration: "10 min",
          },
          {
            id: "n4",
            type: "step",
            label: "Aprobación extraordinaria Financiera",
            description: "Revisión y firma digital de ampliación de cupo por campaña o estacionalidad.",
            role: "Gerencia Financiera",
            systemUsed: "Workflow Aprobaciones",
            duration: "2 h",
          },
          {
            id: "n5",
            type: "system",
            label: "Transmitir Orden de Compra por EDI",
            description: "Envío electrónico estandarizado de la orden firme hacia el proveedor.",
            role: "Portal EDI Proveedor",
            systemUsed: "Conector EDI",
            duration: "5 min",
          },
          {
            id: "n6",
            type: "end",
            label: "Confirmación recibida y turno asignado",
            description: "Recepción de aviso de despacho (ASN) y reserva de rampa en centro de distribución.",
            role: "Analista de Inventarios",
            systemUsed: "Agenda Rampa CD",
            duration: "",
          },
        ],
        edges: [
          { id: "e1", from: "n1", to: "n2", label: "" },
          { id: "e2", from: "n2", to: "n3", label: "" },
          { id: "e3", from: "n3", to: "n5", label: "No (Dentro de cupo)" },
          { id: "e4", from: "n3", to: "n4", label: "Sí (Excede cupo)" },
          { id: "e5", from: "n4", to: "n5", label: "Autorizado" },
          { id: "e6", from: "n5", to: "n6", label: "" },
        ],
        procedure: {
          code: "POE-EXT-101",
          objective:
            "Formalizar el circuito semanal de emisión, control presupuestario y transmisión electrónica EDI de órdenes de reposición del cliente mayorista.",
          scope:
            "Desde la corrida de necesidades de inventario de los martes hasta la reserva efectiva de ventana de recepción en el Centro de Distribución.",
          narrativeText:
            "El proceso de Emisión y Aprobación de Pedidos de Reposición se ejecuta todos los martes comenzando con el cálculo automatizado de stock mínimo de las catorce sucursales en el ERP del cliente. A partir de ese resultado, el Analista de Inventarios confecciona el borrador de Orden de Compra ajustado a múltiplos logísticos de pallet y verifica si el importe total respeta el cupo financiero semanal asignado. Cuando el pedido se encuentra dentro del límite habitual, se libera de forma directa hacia la interfaz EDI; si lo supera debido a acciones estacionales, se deriva previamente a la Gerencia Financiera para su firma digital extraordinaria. Una vez transmitida la orden por EDI y recibida la confirmación de stock asignado del proveedor, el analista bloquea el turno de rampa correspondiente en el Centro de Distribución.",
          prerequisites: [
            "Cierre de stock nocturno sincronizado en las 14 sucursales.",
            "Catálogo de precios y unidades por pallet conciliado en el conector EDI.",
          ],
          steps: [
            {
              stepNumber: 1,
              title: "Ejecución de necesidad de reabastecimiento",
              actor: "Analista de Inventarios",
              instruction:
                "Correr el proceso de cálculo de reposición evaluando cobertura objetivo y tránsito pendiente.",
              controlPoint: "Reporte MRP emitido sin errores de maestro de artículos.",
            },
            {
              stepNumber: 2,
              title: "Validación de cupo presupuestario",
              actor: "Analista de Inventarios / Gerencia Financiera",
              instruction:
                "Verificar tope semanal de compras. Escalar a firma de Gerencia Financiera todo pedido que supere el umbral asignado.",
              controlPoint: "Estado 'Liberado' con firma electrónica en ERP.",
            },
            {
              stepNumber: 3,
              title: "Transmisión EDI y agendamiento de recepción",
              actor: "Analista de Inventarios",
              instruction:
                "Despachar mensaje EDI ORDERS05, verificar acuse ORDRSP y asignar fecha y rampa de descarga en el Centro de Distribución.",
              controlPoint: "Comprobante de turno de descarga vinculado a la Orden de Compra.",
            },
          ],
          exceptions: [
            {
              scenario: "Rechazo parcial de líneas en confirmación EDI por quiebre de stock del proveedor.",
              resolution:
                "El analista evalúa producto sustituto o reprograma el saldo pendiente para la corrida del martes siguiente.",
            },
          ],
        },
      },
      {
        id: "wf-ext-2",
        name: "Reclamo de Recepción y Conciliación de Nota de Crédito",
        partitionReason:
          "Flujo post-entrega de control de calidad físico y ajuste financiero ante discrepancias en rampa.",
        department: "Recepción CD y Cuentas por Pagar",
        trigger: "Detección en rampa de averías o vencimiento corto (<90 días) durante la descarga.",
        deliverable: "Nota de Crédito conciliada y saldo remanente de factura liberado al pago.",
        roles: [
          "Receptor de Rampa",
          "Administración de Compras",
          "Proveedor / Comercial",
        ],
        estimatedTotalTime: "48 h",
        sourceExcerpt:
          "“Si detecta vida útil menor a 90 días o cajas dañadas, emite en el acto un Acta de Discrepancia... bloquea parcialmente el pago solo por el monto afectado...”",
        nodes: [
          {
            id: "n1",
            type: "start",
            label: "Control físico y vida útil en rampa",
            description: "Escaneo de pallets recibidos verificando integridad de envase y lote de vencimiento.",
            role: "Receptor de Rampa",
            systemUsed: "Colector WMS",
            duration: "",
          },
          {
            id: "n2",
            type: "decision",
            label: "¿Presenta avería o vida útil <90d?",
            description: "Inspección de estándares pactados de calidad comercial en recepción.",
            role: "Receptor de Rampa",
            systemUsed: "Colector WMS",
            duration: "15 min",
          },
          {
            id: "n3",
            type: "end",
            label: "Ingreso conforme y factura liberada",
            description: "Recepción total sin observaciones habilitada para pago normal.",
            role: "Receptor de Rampa",
            systemUsed: "ERP",
            duration: "",
          },
          {
            id: "n4",
            type: "step",
            label: "Emitir Acta de Discrepancia firmada",
            description: "Confección inmediata del acta detallando SKU, lote, cantidad rechazada y firma del chofer.",
            role: "Receptor de Rampa",
            systemUsed: "Formulario Rampa",
            duration: "15 min",
          },
          {
            id: "n5",
            type: "system",
            label: "Cargar reclamo B2B y retener parcial",
            description:
              "Registro del reclamo en portal dentro de las 24 hs aplicando bloqueo contable exclusivamente por el importe observado.",
            role: "Administración de Compras",
            systemUsed: "Portal B2B / ERP",
            duration: "24 h",
          },
          {
            id: "n6",
            type: "end",
            label: "Conciliar Nota de Crédito y pagar saldo",
            description: "Imputación automática de la NC emitida y liberación del pago del remanente.",
            role: "Administración de Compras",
            systemUsed: "ERP Finanzas",
            duration: "",
          },
        ],
        edges: [
          { id: "e1", from: "n1", to: "n2", label: "" },
          { id: "e2", from: "n2", to: "n3", label: "No (Conforme)" },
          { id: "e3", from: "n2", to: "n4", label: "Sí (Con desvío)" },
          { id: "e4", from: "n4", to: "n5", label: "" },
          { id: "e5", from: "n5", to: "n6", label: "NC emitida" },
        ],
        procedure: {
          code: "POE-EXT-102",
          objective:
            "Documentar en rampa las diferencias cualitativas o cuantitativas de recepción y agilizar su compensación contable sin detener el pago de la mercadería conforme.",
          scope:
            "Aplica a todas las descargas recibidas en el Centro de Distribución del cliente mayorista.",
          narrativeText:
            "Durante la descarga en el Centro de Distribución, el Receptor de Rampa verifica mediante colector de radiofrecuencia tanto la cantidad de bultos como la integridad y fecha de vencimiento de cada lote. Si la partida cumple con una vida útil igual o superior a noventa días y sin averías, se ingresa como recepción conforme habilitando el pago total de la factura. En cambio, cuando se detectan cajas dañadas o vencimiento corto, se emite en el acto un Acta de Discrepancia refrendada por el conductor del transporte. Dentro de las veinticuatro horas siguientes, Administración de Compras registra el acta en el portal B2B de reclamos y aplica una retención parcial únicamente sobre el valor afectado. Finalmente, al recibirse la Nota de Crédito electrónica del proveedor, el sistema concilia la diferencia y libera el pago del saldo conforme.",
          prerequisites: [
            "Orden de compra activa en el colector de recepción de rampa.",
            "Parámetro de vida útil mínima (90 días) configurado por familia de producto.",
          ],
          steps: [
            {
              stepNumber: 1,
              title: "Inspección de descarga y control de vencimientos",
              actor: "Receptor de Rampa",
              instruction:
                "Escanear etiquetas logísticas SSCC/EAN verificando estado físico de embalaje y fecha de caducidad mínima de 90 días.",
              controlPoint: "Lectura registrada en colector WMS.",
            },
            {
              stepNumber: 2,
              title: "Labrado de Acta de Discrepancia en rampa",
              actor: "Receptor de Rampa",
              instruction:
                "En caso de rechazo parcial, emitir Acta de Discrepancia por duplicado haciendo constar firma y DNI del transportista antes de su retiro.",
              controlPoint: "Acta firmada y digitalizada.",
            },
            {
              stepNumber: 3,
              title: "Carga en Portal B2B y retención parcial selectiva",
              actor: "Administración de Compras",
              instruction:
                "Subir el acta al portal dentro de las 24 hs y bloquear en cuentas por pagar únicamente el importe de las unidades rechazadas.",
              controlPoint: "Ticket B2B activo y factura con bloqueo parcial por monto exacto.",
            },
            {
              stepNumber: 4,
              title: "Imputación de Nota de Crédito y liberación de pago",
              actor: "Administración de Compras",
              instruction:
                "Vincular la Nota de Crédito electrónica recibida con la factura original para destrabar automáticamente la liquidación neta.",
              controlPoint: "Partida compensada en cuenta corriente del proveedor.",
            },
          ],
          exceptions: [
            {
              scenario: "Reclamo cargado fuera del plazo acordado de 24 horas hábiles.",
              resolution:
                "Requiere aprobación excepcional de Gerencia Comercial adjuntando registro de cámaras de dársena.",
            },
          ],
        },
      },
    ],
  },
];
