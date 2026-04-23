const statusConfig: Record<string, { label: string; chip: string; dot: string }> = {
  PENDING:    { label: "En attente", chip: "chip-ochre",                    dot: "bg-ochre" },
  SENT:       { label: "Envoyé",     chip: "chip-azure",                    dot: "bg-azure" },
  CONFIRMED:  { label: "Confirmé",   chip: "chip-signal",                   dot: "bg-signal-ink" },
  DELETED:    { label: "Supprimé",   chip: "bg-rust text-white",            dot: "bg-white/60" },
  FOUND:      { label: "Trouvé",     chip: "chip-signal",                   dot: "bg-signal-ink" },
  NOT_FOUND:  { label: "Introuvable",chip: "chip-rust",                     dot: "bg-rust" },
  ERROR:      { label: "Erreur",     chip: "chip-ochre",                    dot: "bg-ochre" },
  REDIRECTED: { label: "Redirigé",   chip: "bg-paper-deep text-ink-2",      dot: "bg-ink-3" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[2px] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${config.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
