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
      style={color ? { color } : undefined}
    >
      {label}&nbsp;{Math.round(value * 10) / 10}{unit}
    </span>
  );
}

