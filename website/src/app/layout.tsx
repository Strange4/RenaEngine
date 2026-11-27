// AI contribution: No substantial AI-generated code
import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import AuthProvider from "./components/AuthProvider";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const bodyFont = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RenaEngine",
  description: "Interaction website for the RenaEngine game server",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${bodyFont.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
