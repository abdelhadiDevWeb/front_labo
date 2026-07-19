export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-blue-700">
        <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-sm font-medium">Chargement de l&apos;accueil…</p>
      </div>
    </div>
  );
}
