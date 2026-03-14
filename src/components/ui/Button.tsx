"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "success" | "danger" | "ghost";
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  loading,
  fullWidth,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "font-bold py-3 px-6 rounded-lg transition-all duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white",
    success: "bg-truth text-surface font-black",
    danger: "bg-danger text-white",
    ghost:
      "bg-surface-lighter hover:bg-surface-light text-text border border-surface-lighter",
  };
  const width = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${base} ${variants[variant]} ${width} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
