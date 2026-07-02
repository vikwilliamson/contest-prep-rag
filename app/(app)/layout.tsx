"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { signOut } from "../../lib/firebase";

function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`px-3 py-2 text-sm font-medium border-b-2 ${
        active
          ? "border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50"
          : "border-transparent text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <nav className="shrink-0 flex gap-1 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6">
        <TabLink href="/chat" label="Chat" />
        <TabLink href="/journal" label="Journal" />
        <div className="ml-auto flex items-center gap-3 py-1">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200"
          >
            {user.uid.charAt(0).toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            Sign out
          </button>
        </div>
      </nav>
      <div className="flex flex-1 min-h-0">{children}</div>
    </div>
  );
}
