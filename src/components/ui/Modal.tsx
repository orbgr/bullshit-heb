"use client";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-light rounded-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <div className="text-text-muted mb-4">{children}</div>
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}
