import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  pill?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, pill = false, className = "", id, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-on-surface-variant dark:text-zinc-300"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`${pill ? "rounded-full" : "rounded-lg"} border px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-primary/40 dark:bg-zinc-900 dark:text-zinc-50 ${
          error
            ? "border-error"
            : "border-outline-variant dark:border-zinc-700"
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
});
