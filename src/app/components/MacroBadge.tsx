type Props = {
  label:  string;
  value:  number;
  unit?:  string;
  color?: string;
  dim?:   boolean;
};

export function MacroBadge({ label, value, unit = "g", color, dim = false }: Props) {
  return (
    <span
      className={`macro-badge${dim ? " macro-badge--dim" : ""}`}
      style={color ? { color, background: "var(--md-surface-container-highest)" } : undefined}
    >
      <span style={{ opacity: 0.7, fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      {" "}
      <span style={{ fontWeight: 800 }}>{Math.round(value * 10) / 10}{unit}</span>
    </span>
  );
}
