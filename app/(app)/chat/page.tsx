import UploadPanel from "@/components/UploadPanel";
import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <main className="flex flex-1 gap-6 p-6 min-h-0 w-full">
      <aside className="w-80 shrink-0">
        <UploadPanel />
      </aside>
      <section className="flex flex-1 min-h-0">
        <ChatInterface />
      </section>
    </main>
  );
}
