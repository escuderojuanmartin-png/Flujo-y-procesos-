import React, { useState } from "react";
import { X } from "lucide-react";
import { ClientType } from "../types/process";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    clientType: ClientType;
    clientName: string;
    department: string;
    interviewee: string;
  }) => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState("");
  const [clientType, setClientType] = useState<ClientType>("interno");
  const [clientName, setClientName] = useState("");
  const [department, setDepartment] = useState("");
  const [interviewee, setInterviewee] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title: title.trim() || "Nuevo relevamiento de proceso",
      clientType,
      clientName:
        clientName.trim() ||
        (clientType === "interno" ? "Operación Interna" : "Cliente Corporativo"),
      department: department.trim() || "Operaciones",
      interviewee: interviewee.trim() || "Referente del sector",
    });
    setTitle("");
    setClientName("");
    setDepartment("");
    setInterviewee("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Registrar Nueva Conversación de Relevamiento
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura los datos del cliente o área para grabar el audio o cargar la transcripción.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Título de la entrevista o proceso
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Circuito de Despacho y Ruteo en Transporte"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Origen del relevamiento
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              {(["interno", "externo"] as ClientType[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setClientType(kind)}
                  className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    clientType === kind
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {kind === "interno" ? "Cliente interno" : "Cliente externo"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {clientType === "interno" ? "Sede o División" : "Empresa Cliente"}
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={
                  clientType === "interno"
                    ? "Ej. Centro Logístico Norte"
                    : "Ej. Importadora Andina S.A."
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Departamento / Sector
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ej. Transporte, Compras, SAC"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Interlocutor y puesto
            </label>
            <input
              type="text"
              value={interviewee}
              onChange={(e) => setInterviewee(e.target.value)}
              placeholder="Ej. Valeria Sosa — Supervisora de Expedición"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Continuar a grabación / carga
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
