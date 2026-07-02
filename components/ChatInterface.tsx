"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { authFetch } from "../lib/authFetch";

const SOURCES_SENTINEL = "\n\n__SOURCES__";

const QUICK_PROMPTS = [
  "What are my macros for today?",
  "What's my cardio protocol?",
  "What's my peak week water protocol?",
  "What are my mandatory poses?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

function parseSourceSuffix(raw: string): { text: string; sources: string[] } {
  const idx = raw.lastIndexOf(SOURCES_SENTINEL);
  if (idx === -1) return { text: raw, sources: [] };
  try {
    const json = raw.slice(idx + SOURCES_SENTINEL.length);
    const parsed: { source: string }[] = JSON.parse(json);
    const sources = [...new Set(parsed.map((s) => s.source))];
    return { text: raw.slice(0, idx), sources };
  } catch {
    return { text: raw, sources: [] };
  }
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question) return;

    const chat_history = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setIsStreaming(true);

    try {
      const response = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, chat_history }),
      });

      if (!response.ok) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Something went wrong. Please try again.",
          };
          return updated;
        });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const content = accumulated + decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content };
          return updated;
        });
        accumulated = content;
      }

      const { text, sources } = parseSourceSuffix(accumulated);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: text,
          sources,
        };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  const handleChipClick = (prompt: string) => {
    setInput(prompt);
    handleSend(prompt);
  };

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    setMessages([]);
  };

  const isWaiting =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content === "";

  return (
    <div className="flex flex-col h-full w-full border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 shrink-0 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Chat</h2>
        <button
          onClick={handleClear}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          aria-label="Clear conversation"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center mt-10">
            Ask something to get started
          </p>
        ) : (
          messages.map((msg, i) => (
            <article
              key={i}
              data-role={msg.role}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[78%] flex flex-col gap-1">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {isStreaming && i === messages.length - 1 && msg.content !== "" && (
                        <span className="inline-block w-0.5 h-3.5 bg-zinc-400 ml-0.5 align-middle animate-pulse" />
                      )}
                    </>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>

                {msg.role === "assistant" && msg.content !== "" && (
                  <div className="flex items-center gap-2 px-1">
                    <button
                      onClick={() => handleCopy(msg.content, i)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                      aria-label="Copy message"
                    >
                      {copiedIndex === i ? "Copied!" : "Copy"}
                    </button>
                    {msg.sources && msg.sources.length > 0 && (
                      <div
                        data-testid="message-sources"
                        className="flex flex-wrap gap-1"
                      >
                        {msg.sources.map((src) => (
                          <span
                            key={src}
                            className="text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded px-1.5 py-0.5"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))
        )}

        {isWaiting && (
          <div data-testid="typing-indicator" className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 flex flex-wrap gap-1.5 px-4 pt-2 pb-1">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            data-testid="quick-prompt-chip"
            onClick={() => handleChipClick(prompt)}
            disabled={isStreaming}
            className="text-xs px-2.5 py-1 rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="shrink-0 flex gap-2 p-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder="Ask about your prep plan…"
          className="flex-1 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition"
        />
        <button
          onClick={() => handleSend()}
          disabled={isStreaming}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
