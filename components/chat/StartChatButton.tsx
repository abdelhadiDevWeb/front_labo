"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/api";
import { Loader2, MessageCircle } from "lucide-react";

type Props = {
  supplierId: string;
  productId?: string;
  className?: string;
  label?: string;
};

export default function StartChatButton({
  supplierId,
  productId,
  className,
  label = "Contacter",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!supplierId || loading) return;
    setLoading(true);
    try {
      const result = await getOrCreateConversation({
        supplierId,
        productId,
      });
      if (result.success && result.data?.conversation?.id) {
        router.push(`/messages?c=${result.data.conversation.id}`);
        return;
      }
      alert(result.message || "Impossible d'ouvrir la conversation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading || !supplierId}
      className={
        className ||
        "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
