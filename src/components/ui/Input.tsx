import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
} from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  pill?: boolean;
  revealToggle?: boolean;
}

function EyeIcon({ open }: Readonly<{ open: boolean }>) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.3 4.1M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.9 9.9 0 0 0 4.2-.9" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      )}
    </svg>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, pill = false, revealToggle = false, className = "", id, type, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  const [visible, setVisible] = useState(false);

  const hasToggle = revealToggle && type === "password";
  const inputType = hasToggle && visible ? "text" : type;

  const inputClass = `${pill ? "rounded-full" : "rounded-lg"} w-full border px-3 py-2 text-sm text-on-surface bg-surface-container-lowest outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-primary/40 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 ${
    hasToggle ? "pr-10" : ""
  } ${
    error ? "border-error" : "border-outline-variant dark:border-zinc-700"
  } ${className}`;

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
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={inputClass}
          {...props}
        />
        {hasToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-3 text-on-surface-variant transition-colors hover:text-on-surface dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <EyeIcon open={visible} />
          </button>
        )}
      </div>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
});
