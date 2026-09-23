import AppLoadingScreen from "@/components/AppLoadingScreen";

/** Same outer shell as HomePage so Suspense fallback doesn't fight hydration. */
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <AppLoadingScreen />
    </div>
  );
}
