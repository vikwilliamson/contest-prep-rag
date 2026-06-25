"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useAuth } from "../../lib/auth-context";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <nav className="shrink-0 flex gap-1 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6">
        <Link
          href="/chat"
          className="px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Chat
        </Link>
        <Link
          href="/journal"
          className="px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Journal
        </Link>
      </nav>
      <div className="flex flex-1 min-h-0">{children}</div>
    </div>
  );
}
