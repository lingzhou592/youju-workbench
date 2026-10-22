import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${className}`.trim()}>
      <div className="field-label-row">
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="required-mark">必填</span> : null}
        </label>
        {hint ? <span className="field-hint">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  invalid,
  ...props
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "id"
>) {
  return (
    <input
      id={id}
      className={`input ${invalid ? "input-invalid" : ""}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      {...props}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  invalid,
  ...props
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  invalid?: boolean;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "id"
>) {
  return (
    <textarea
      id={id}
      className={`textarea ${invalid ? "input-invalid" : ""}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      {...props}
    />
  );
}

export function Select({
  id,
  value,
  onChange,
  children,
  ...props
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
} & Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange" | "id"
>) {
  return (
    <select
      id={id}
      className="select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...props}
    >
      {children}
    </select>
  );
}
