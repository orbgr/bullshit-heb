"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/sessionStore";

export default function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ pin: string }>;
}) {
  const router = useRouter();
  const role = useSessionStore((s) => s.role);

  useEffect(() => {
    if (!role) {
      params.then(({ pin }) => {
        router.push(`/join?pin=${pin}`);
      });
    }
  }, [role, router, params]);

  if (!role) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <div className="h-dvh flex flex-col">{children}</div>;
}
