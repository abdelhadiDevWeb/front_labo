import AppLoadingScreen from "@/components/AppLoadingScreen";

/** Same outer shell as public pages so Suspense fallback doesn't fight hydration. */
export default function RootLoading() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <AppLoadingScreen />
    </div>
  );
}
