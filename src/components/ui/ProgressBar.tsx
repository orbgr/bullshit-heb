"use client";

interface ProgressBarProps {
  progress: number; // 0 to 1
  panic?: boolean;
}

export function ProgressBar({ progress, panic }: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const color = panic ? "bg-danger" : "bg-primary";

  return (
    <div className="w-full h-2 bg-surface-lighter rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-300 ease-linear`}
        style={{ width: `${clampedProgress * 100}%` }}
      />
    </div>
  );
}
