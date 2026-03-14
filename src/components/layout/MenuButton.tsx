"use client";

import Link from "next/link";

interface MenuButtonProps {
  href: string;
  icon: string;
  label: string;
  subtitle: string;
}

export function MenuButton({ href, icon, label, subtitle }: MenuButtonProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-surface-light hover:bg-surface-lighter rounded-xl p-5 transition-colors group"
    >
      <span className="text-3xl w-12 text-center group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <div>
        <p className="text-lg font-bold text-text">{label}</p>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>
    </Link>
  );
}
