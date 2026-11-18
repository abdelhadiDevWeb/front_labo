"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getOrCreateConversation,
  getSessionRole,
  getProfile,
} from "@/lib/api";
import ChatWorkspace from "@/components/chat/ChatWorkspace";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import BackButton from "@/components/BackButton";
import { MessageCircle } from "lucide-react";

function LabMessagesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    searchParams.get("c")
  );
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const session = await getSessionRole();
      if (!session || session.role !== "client") {
        router.replace("/login?next=/messages");
        return;
      }

      const profile = await getProfile();
      if (!profile.success || !profile.data?.id) {
        if (!cancelled) {
          setBootError("Impossible de charger votre profil.");
          setReady(true);
        }
        return;
      }

      const supplierId = searchParams.get("supplier");
      const productId = searchParams.get("product") || undefined;
      let openId = searchParams.get("c");

      if (supplierId && !openId) {
        const created = await getOrCreateConversation({
          supplierId,
          productId,
        });
        if (created.success && created.data?.conversation?.id) {
          openId = created.data.conversation.id;
          router.replace(`/messages?c=${openId}`);
        } else if (!cancelled) {
          setBootError(created.message || "Impossible d'ouvrir la conversation.");
        }
      }

      if (!cancelled) {
        setViewerId(String(profile.data.id));
        setConversationId(openId);
        setReady(true);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (!ready || !viewerId) {
    if (bootError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
            <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="mb-4 text-gray-700">{bootError}</p>
            <Link href="/home" className="font-semibold text-blue-600">
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      );
    }
    return <AppLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <BackButton
            fallbackHref="/home"
            className="rounded-lg p-2 hover:bg-gray-100"
            iconClassName="h-5 w-5 text-gray-600"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Messages</h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              Échangez en direct avec vos fournisseurs
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <ChatWorkspace
          viewerId={viewerId}
          theme="blue"
          initialConversationId={conversationId}
          emptyHint="Choisissez un fournisseur ou ouvrez une conversation existante."
        />
      </main>
    </div>
  );
}

export default function LabMessagesPage() {
  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <LabMessagesInner />
    </Suspense>
  );
}
