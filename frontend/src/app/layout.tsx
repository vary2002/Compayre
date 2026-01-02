// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compayre – Executive Pay Intelligence",
  description:
    "Compayre helps investors and executive directors compare executive compensation against peers with clear, data-backed insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 p-0 bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
