import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "בולשיט - כי האמת מוערכת יתר על המידה",
  description: "משחק חברתי של בלופים וטריוויה",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
