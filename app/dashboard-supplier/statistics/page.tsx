"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const StatisticsContent = dynamic(() => import("./StatisticsContent"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  ),
});

export default function SupplierStatisticsPage() {
  return <StatisticsContent />;
}
