import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RenaEngine",
  description: "Interaction website for the RenaEngine game server",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
