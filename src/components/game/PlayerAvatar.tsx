"use client";

interface PlayerAvatarProps {
  joinOrder: number;
  size?: "sm" | "md" | "lg";
}

const COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
];

const EMOJIS = ["🦊", "🐸", "🦉", "🐙", "🦁", "🐼", "🦄", "🐲"];

const sizes = { sm: "w-8 h-8 text-base", md: "w-12 h-12 text-xl", lg: "w-16 h-16 text-3xl" };

export function PlayerAvatar({ joinOrder, size = "md" }: PlayerAvatarProps) {
  return (
    <div
      className={`${COLORS[joinOrder % 8]} ${sizes[size]} rounded-full flex items-center justify-center`}
    >
      {EMOJIS[joinOrder % 8]}
    </div>
  );
}
