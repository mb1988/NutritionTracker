type Props = {
  id:       string;
  label:    string;
  value:    number;
  onChange: (raw: string) => void;
};

export function MacroInput({ id, label, value, onChange }: Props) {
  return (
    <div className="macro-input">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={0}
        step={0.1}
        placeholder="0"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

