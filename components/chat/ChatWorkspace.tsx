"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  getChatMessages,
  listConversations,
  markConversationRead,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/api";
import { emitRealtime } from "@/lib/realtime";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";
import {
  Loader2,
  MessageCircle,
  Search,
  Send,
  ArrowLeft,
} from "lucide-react";

type Theme = "blue" | "green";

type Props = {
  viewerId: string;
  theme?: Theme;
  /** Prefill / open this conversation when present in the URL */
  initialConversationId?: string | null;
  emptyHint?: string;
};

type PendingMessage = ChatMessage & { pending?: boolean; failed?: boolean };

const THEME = {
  blue: {
    accent: "bg-blue-600 hover:bg-blue-700",
    accentText: "text-blue-600",
    bubbleMine: "bg-blue-600 text-white",
    activeRow: "bg-blue-50 border-blue-200",
    ring: "focus:ring-blue-500",
    badge: "bg-blue-600",
  },
  green: {
    accent: "bg-green-600 hover:bg-green-700",
    accentText: "text-green-600",
    bubbleMine: "bg-green-600 text-white",
    activeRow: "bg-green-50 border-green-200",
    ring: "focus:ring-green-500",
    badge: "bg-green-600",
  },
};

const formatTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" });
};

const formatDay = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function ChatWorkspace({
  viewerId,
  theme = "blue",
  initialConversationId,
  emptyHint = "Sélectionnez une conversation pour commencer.",
}: Props) {
  const t = THEME[theme];
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(
    Boolean(initialConversationId)
  );
  const [peerTyping, setPeerTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmit = useRef(0);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const reloadList = useCallback(async () => {
    const result = await listConversations();
    if (result.success && result.data) {
      setConversations(result.data.conversations);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId);
      setMobileShowThread(true);
    }
  }, [initialConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    const result = await getChatMessages(conversationId);
    if (result.success && result.data) {
      setMessages(result.data.messages);
    } else {
      setMessages([]);
    }
    setLoadingMessages(false);
    void markConversationRead(conversationId).then(() => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c))
      );
    });
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  useRealtimeEvents(
    true,
    {
      "chat:message": (payload: unknown) => {
        const data = payload as {
          conversationId?: string;
          message?: ChatMessage;
          unreadForReceiver?: number;
        };
        if (!data?.conversationId || !data.message) return;

        const isActive = selectedIdRef.current === data.conversationId;
        const isMine = data.message.senderId === viewerId;

        if (isActive) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message!.id)) return prev;
            if (
              data.message!.clientMessageId &&
              prev.some((m) => m.clientMessageId === data.message!.clientMessageId)
            ) {
              return prev.map((m) =>
                m.clientMessageId === data.message!.clientMessageId
                  ? { ...data.message! }
                  : m
              );
            }
            return [...prev, data.message!];
          });
          if (!isMine) {
            void markConversationRead(data.conversationId);
          }
        }

        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === data.conversationId);
          if (idx === -1) {
            void reloadList();
            return prev;
          }
          const next = [...prev];
          const row = { ...next[idx] };
          row.lastMessage = {
            text: data.message!.text,
            senderId: data.message!.senderId,
            at: data.message!.createdAt,
          };
          if (!isMine && !isActive) {
            row.unread = Math.max(
              row.unread || 0,
              data.unreadForReceiver || (row.unread || 0) + 1
            );
          } else if (isActive && !isMine) {
            row.unread = 0;
          }
          next.splice(idx, 1);
          next.unshift(row);
          return next;
        });
      },
      "chat:newConversation": () => {
        void reloadList();
      },
      "chat:typing": (payload: unknown) => {
        const data = payload as { conversationId?: string; userId?: string };
        if (
          !data?.conversationId ||
          data.conversationId !== selectedIdRef.current ||
          data.userId === viewerId
        ) {
          return;
        }
        setPeerTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPeerTyping(false), 2500);
      },
    },
    () => {
      void reloadList();
      if (selectedIdRef.current) void loadMessages(selectedIdRef.current);
    }
  );

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = c.peer?.name || "";
      const last = c.lastMessage?.text || "";
      return (
        name.toLowerCase().includes(q) || last.toLowerCase().includes(q)
      );
    });
  }, [conversations, search]);

  const openConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowThread(true);
    setPeerTyping(false);
  };

  const emitTyping = () => {
    if (!selectedId) return;
    const now = Date.now();
    if (now - lastTypingEmit.current < 1200) return;
    lastTypingEmit.current = now;
    emitRealtime("chat:typing", { conversationId: selectedId });
  };

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || sending) return;

    const clientMessageId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tmp-${Date.now()}`;

    const optimistic: PendingMessage = {
      id: clientMessageId,
      conversationId: selectedId,
      senderId: viewerId,
      text,
      clientMessageId,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);

    const ok = emitRealtime(
      "chat:send",
      { conversationId: selectedId, text, clientMessageId },
      (result: { ok?: boolean; message?: ChatMessage; error?: string }) => {
        setSending(false);
        if (!result?.ok || !result.message) {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientMessageId === clientMessageId
                ? { ...m, pending: false, failed: true }
                : m
            )
          );
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId
              ? { ...result.message!, pending: false }
              : m
          )
        );
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === selectedId);
          if (idx === -1) return prev;
          const next = [...prev];
          const row = { ...next[idx] };
          row.lastMessage = {
            text: result.message!.text,
            senderId: result.message!.senderId,
            at: result.message!.createdAt,
          };
          next.splice(idx, 1);
          next.unshift(row);
          return next;
        });
      }
    );

    if (!ok) {
      setSending(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, pending: false, failed: true }
            : m
        )
      );
    }
  };

  let lastDay = "";

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[420px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:h-[calc(100dvh-7rem)]">
      {/* Conversation list */}
      <aside
        className={`w-full shrink-0 border-r border-gray-100 md:w-80 lg:w-96 ${
          mobileShowThread ? "hidden md:flex" : "flex"
        } flex-col`}
      >
        <div className="border-b border-gray-100 p-3 sm:p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
            <MessageCircle className={`h-5 w-5 ${t.accentText}`} />
            Messages
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className={`w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:bg-white focus:ring-2 ${t.ring}`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              Aucune conversation pour le moment.
            </div>
          ) : (
            filtered.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openConversation(c.id)}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 px-3 py-3 text-left transition-colors sm:px-4 ${
                    active ? t.activeRow : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${t.badge}`}
                  >
                    {(c.peer?.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-gray-900">
                        {c.peer?.name || "Conversation"}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {formatTime(c.lastMessage?.at)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-gray-500">
                        {c.lastMessage?.text || "Nouvelle conversation"}
                      </span>
                      {c.unread > 0 && (
                        <span
                          className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${t.badge}`}
                        >
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <section
        className={`min-w-0 flex-1 flex-col ${
          mobileShowThread ? "flex" : "hidden md:flex"
        }`}
      >
        {!selectedId || !selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-gray-500">
            <MessageCircle className="h-12 w-12 text-gray-300" />
            <p className="text-sm">{emptyHint}</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 sm:px-4">
              <button
                type="button"
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
                onClick={() => setMobileShowThread(false)}
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${t.badge}`}
              >
                {(selected.peer?.name || "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">
                  {selected.peer?.name || "Conversation"}
                </p>
                {selected.peer?.email && (
                  <p className="truncate text-xs text-gray-500">
                    {selected.peer.email}
                  </p>
                )}
              </div>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/70 px-3 py-4 sm:px-5">
              {loadingMessages ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des messages…
                </div>
              ) : messages.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">
                  Envoyez le premier message.
                </p>
              ) : (
                messages.map((m) => {
                  const day = formatDay(m.createdAt);
                  const showDay = day !== lastDay;
                  lastDay = day;
                  const mine = m.senderId === viewerId;
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <div className="my-3 flex justify-center">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
                            {day}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%] ${
                            mine
                              ? `${t.bubbleMine} rounded-br-md`
                              : "rounded-bl-md bg-white text-gray-900"
                          } ${m.pending ? "opacity-70" : ""} ${
                            m.failed ? "ring-2 ring-red-400" : ""
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              mine ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            {formatTime(m.createdAt)}
                            {m.failed ? " · Échec" : m.pending ? " · …" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {peerTyping && (
                <p className="px-1 text-xs text-gray-400">En train d&apos;écrire…</p>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-end gap-2 border-t border-gray-100 bg-white p-3 sm:p-4"
            >
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  emitTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Écrire un message…"
                className={`max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 ${t.ring}`}
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${t.accent}`}
                aria-label="Envoyer"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
