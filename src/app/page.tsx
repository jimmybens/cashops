export default function Home() {
  return (
    <div className="min-h-screen p-8 text-text-0 font-sans">
      <header className="mb-8 border-b border-line pb-4 flex justify-between items-center">
        <h1 className="font-serif text-2xl font-bold text-amber">MARIANNE · POSTE CLIENT</h1>
        <div className="flex gap-4">
          <span className="text-text-2 text-sm">Last sync: ...</span>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border border-line rounded-md bg-bg-1">
          <h2 className="font-serif text-lg mb-2">CA Encaissé</h2>
          <p className="text-3xl font-bold text-green">-- €</p>
        </div>
        <div className="p-6 border border-line rounded-md bg-bg-1">
          <h2 className="font-serif text-lg mb-2">Retours</h2>
          <p className="text-3xl font-bold text-red">-- €</p>
        </div>
        <div className="p-6 border border-line rounded-md bg-bg-1">
          <h2 className="font-serif text-lg mb-2">Net</h2>
          <p className="text-3xl font-bold text-cyan">-- €</p>
        </div>
      </main>
      
      <div className="mt-8 text-center">
        <p className="text-text-2">Data will be fetched via /api/journal.</p>
        <a href="/debug" className="text-amber hover:underline text-sm">View debug connection</a>
      </div>
    </div>
  );
}

