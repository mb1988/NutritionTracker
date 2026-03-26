import { ProgressBar } from "@/app/components/ProgressBar";

type Props = {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  color?: string;
};

export function MacroProgressRow({ label, value, goal, unit = "g", color = "var(--color-accent)" }: Props) {
  const isOver        = value > goal;
  const pct           = goal > 0 ? Math.round((value / goal) * 100) : 0;
  const displayValue  = unit === "kcal" ? Math.round(value) : Math.round(value * 10) / 10;
  const effectiveColor = isOver ? "var(--color-danger)" : color;

  return (
    <div className="macro-progress-row">
      <div className="macro-progress-row__header">
        <span className="macro-progress-row__label">{label}</span>
        <span className="macro-progress-row__values">
          <span style={{ fontWeight: 700, color: effectiveColor, fontVariantNumeric: "tabular-nums" }}>
            {displayValue}
          </span>
          <span style={{ color: "var(--md-on-surface-variant)" }}>
            {" "}/{" "}{goal}{unit}
          </span>
          <span
            className="macro-progress-row__pct"
            style={{ color: isOver ? "var(--color-danger)" : "var(--md-on-surface-variant)" }}
          >
            {pct}%
          </span>
        </span>
      </div>
      <ProgressBar value={value} max={goal} color={effectiveColor} height={8} />
    </div>
  );
}
