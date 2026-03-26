type Props = {
  value: number;
  max: number;
  color?: string;
  height?: number;
};

export function ProgressBar({ value, max, color = "var(--color-accent)", height = 6 }: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = value > max;

  return (
    <div className="progress-bar-track" style={{ height }}>
      <div
        className="progress-bar-fill"
        style={{
          width: `${pct}%`,
          background: isOver ? "var(--color-danger)" : color,
        }}
      />
    </div>
  );
}

