"use client";

import { formatLongDate, localISODate, offsetDate } from "@/app/lib/dates";

type Props = {
  date:     string;
  onChange: (date: string) => void;
};

export function DatePicker({ date, onChange }: Props) {
  const today = localISODate();
  const isToday = date === today;
  const eyebrow = isToday
    ? "Today"
    : date === offsetDate(today, -1)
      ? "Yesterday"
      : date > today
        ? "Upcoming"
        : "Viewing";

  return (
    <div className="card date-picker">
      <button
        type="button"
        className="btn-ghost date-picker__arrow"
        onClick={() => onChange(offsetDate(date, -1))}
        aria-label="Previous day"
      >
        ‹
      </button>

      <label className="date-picker__info">
        <span className="date-picker__eyebrow">{eyebrow}</span>
        <span className="date-picker__value">{formatLongDate(date)}</span>
        {/* Invisible native input over the label opens the platform date picker. */}
        <input
          type="date"
          className="date-picker__native"
          value={date}
          onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
          aria-label="Choose a date"
        />
      </label>

      <button
        type="button"
        className="btn-ghost date-picker__arrow"
        onClick={() => onChange(offsetDate(date, 1))}
        aria-label="Next day"
      >
        ›
      </button>

      {!isToday && (
        <button type="button" className="btn-tonal btn-xs date-picker__today" onClick={() => onChange(today)}>
          Jump to today
        </button>
      )}
    </div>
  );
}
