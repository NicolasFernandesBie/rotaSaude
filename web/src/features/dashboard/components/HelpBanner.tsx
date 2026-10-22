const STEPS = [
  "Cadastre quem precisa",
  "A fila ordena por prioridade",
  "Dê vaga na próxima viagem",
  "O paciente recebe no WhatsApp",
];

export function HelpBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <p className="text-sm font-semibold text-teal-900">Como funciona</p>
      <ol className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-xs text-teal-800">
        {STEPS.map((texto, i) => (
          <li key={texto} className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
              {i + 1}
            </span>
            {texto}
          </li>
        ))}
      </ol>
      <button
        onClick={onDismiss}
        className="self-start text-xs font-medium text-teal-700 hover:underline sm:self-auto"
      >
        Ocultar
      </button>
    </div>
  );
}
