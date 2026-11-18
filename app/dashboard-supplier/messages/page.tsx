"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProfile } from "@/lib/api";
import ChatWorkspace from "@/components/chat/ChatWorkspace";
import AppLoadingScreen from "@/components/AppLoadingScreen";

function SupplierMessagesInner() {
  const searchParams = useSearchParams();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const conversationId = searchParams.get("c");

  useEffect(() => {
    let cancelled = false;
    void getProfile().then((result) => {
      if (cancelled) return;
      if (result.success && result.data?.id) {
        setViewerId(String(result.data.id));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!viewerId) return <AppLoadingScreen />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Messages</h1>
        <p className="text-sm text-gray-500">
          Conversations avec les laboratoires
        </p>
      </div>
      <ChatWorkspace
        viewerId={viewerId}
        theme="green"
        initialConversationId={conversationId}
        emptyHint="Les laboratoires apparaîtront ici lorsqu'ils vous contactent."
      />
    </div>
  );
}

export default function SupplierMessagesPage() {
  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <SupplierMessagesInner />
    </Suspense>
  );
}
