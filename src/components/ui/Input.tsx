"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = "", ...props }: InputProps) {
  const borderColor = error ? "border-danger" : "border-surface-lighter focus:border-primary";

  return (
    <div className="w-full">
      <input
        className={`w-full bg-surface-light ${borderColor} border-2 rounded-lg py-3 px-4 text-text text-lg outline-none transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-danger text-sm mt-1">{error}</p>}
    </div>
  );
}
