import { type NutrientStatus } from "./nutrientStatus";

type Props = {
  label:   string;
  value:   number;
  unit?:   string;
  status?: NutrientStatus;
};

const STATUS_COLORS: Record<NutrientStatus, { color: string; bg: string }> = {
  good:    { color: "#6ec987",  bg: "rgba(110,201,135,0.10)" },
  warn:    { color: "#d4a64c",  bg: "rgba(212,166,76,0.10)" },
  bad:     { color: "#de7c74",  bg: "rgba(222,124,116,0.10)" },
  neutral: { color: "var(--md-on-surface-variant)", bg: "var(--md-surface-container-highest)" },
};

export function MacroBadge({ label, value, unit = "g", status = "neutral" }: Props) {
  const { color, bg } = STATUS_COLORS[status];

  return (
    <span
      className="macro-badge"
      style={{ color, background: bg }}
    >
      <span className="macro-badge__label">{label}</span>
      {" "}
      <span className="macro-badge__value">{Math.round(value * 10) / 10}{unit}</span>
    </span>
  );
}
