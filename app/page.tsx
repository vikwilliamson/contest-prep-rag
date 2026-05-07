import UploadPanel from "@/components/UploadPanel";

export default function Home() {
  return (
    <main className="flex flex-1 gap-6 p-6 min-h-0">
      <aside className="w-80 shrink-0">
        <UploadPanel />
      </aside>
      <section className="flex flex-1 items-center justify-center border border-zinc-200 rounded-xl dark:border-zinc-700">
        <p className="text-sm text-zinc-400 dark:text-zinc-600">Chat coming soon</p>
      </section>
    </main>
  );
}
