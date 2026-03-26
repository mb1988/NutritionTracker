type Props = {
  label:     string;
  value:     number;
  unit:      string;
  color:     string;
  prominent?: boolean;
};

export function MacroTile({ label, value, unit, color, prominent = false }: Props) {
  return (
    <div className={`macro-tile${prominent ? " macro-tile--prominent" : ""}`}>
      <span className="macro-tile__value" style={{ color }}>
        {prominent ? Math.round(value) : Math.round(value * 10) / 10}
      </span>
      <span className="macro-tile__label">{label}</span>
      <span className="macro-tile__unit">{unit}</span>
    </div>
  );
}

