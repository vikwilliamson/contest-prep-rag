import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contest Prep RAG",
  description: "Ask questions about your NPC/IFBB contest prep documents — nutrition, training, and protocols — powered by RAG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
          <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Contest Prep RAG
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Upload your prep documents, then ask anything
          </p>
        </header>
        <div className="flex flex-1 min-h-0">{children}</div>
      </body>
    </html>
  );
}
