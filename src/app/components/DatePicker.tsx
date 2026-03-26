"use client";

type Props = {
  date:     string;
  onChange: (date: string) => void;
};

function formatDisplayDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  });
}

export function DatePicker({ date, onChange }: Props) {
  return (
    <div className="card date-picker">
      <div className="date-picker__info">
        <span className="date-picker__eyebrow">Viewing</span>
        <span className="date-picker__value">{formatDisplayDate(date)}</span>
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        className="date-picker__input"
      />
    </div>
  );
}

