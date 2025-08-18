"use client";

import React from "react";

type Option = {
  value: string;
  label: string;
  sublabel?: string;
};

type Props = {
  options: Option[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  columns?: number;
  idPrefix?: string;
};

export default function OptionButtonGroup({
  options,
  value,
  onChange,
  size = "md",
  columns = 2,
  idPrefix = "opt",
}: Props) {
  const base =
    size === "sm"
      ? "px-3 py-3 text-sm"
      : "px-4 py-4 text-sm md:text-base";
  return (
    <div className={`grid grid-cols-${columns} gap-3`}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            id={`${idPrefix}-${opt.value}`}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${base} rounded-lg font-medium transition-all duration-200 text-left border-2 ${
              selected
                ? "bg-blue-900 text-white shadow-md border-blue-900"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
            }`}
          >
            <div className="font-medium">{opt.label}</div>
            {opt.sublabel ? (
              <div className="text-xs opacity-75">{opt.sublabel}</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
