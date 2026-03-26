import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nutrition Tracker",
  description: "Track your daily nutrition, macros and progress",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

