"use client";

import { useState, type KeyboardEvent } from "react";
import { IconX } from "./Icons";

export function ChipInput({
  id,
  value,
  onChange,
  placeholder = "输入后按 Enter 添加",
  tone = "green",
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  tone?: "green" | "amber";
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const items = raw
      .split(/[,，、;；]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    const next = [...value];
    for (const item of items) {
      if (!next.includes(item)) next.push(item);
    }
    onChange(next);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === "，") {
      event.preventDefault();
      add(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={`chip-input chip-input-${tone}`}>
      {value.map((item) => (
        <span key={item} className="chip">
          {item}
          <button
            type="button"
            onClick={() => onChange(value.filter((entry) => entry !== item))}
            aria-label={`移除 ${item}`}
          >
            <IconX size={11} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        aria-label={placeholder}
      />
    </div>
  );
}
