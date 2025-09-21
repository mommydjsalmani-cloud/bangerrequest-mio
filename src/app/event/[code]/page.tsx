export default function EventLanding() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6 items-center">
        <h2 className="text-2xl font-bold mb-2">Stato Evento</h2>
        <div className="mb-2">Coda: <span className="font-bold text-green-400">Aperta</span></div>
        <div className="mb-2">Orari: 22:00 - 03:00</div>
        <div className="mb-4">Scansiona il QR per partecipare!</div>
        <div className="w-32 h-32 bg-zinc-800 flex items-center justify-center rounded">QR</div>
        <div className="text-xs text-gray-400 mt-4">Istruzioni brevi qui</div>
      </div>
    </main>
  );
}
