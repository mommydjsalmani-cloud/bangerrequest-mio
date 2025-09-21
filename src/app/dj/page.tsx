export default function DJPanel() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="w-full max-w-3xl p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6">
        <h2 className="text-2xl font-bold mb-2">Pannello DJ</h2>
        <form className="flex gap-2 mb-4">
          <input
            type="password"
            placeholder="Password evento"
            className="p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
          />
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Accedi</button>
        </form>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-zinc-800">
                <th className="p-2">Utente</th>
                <th className="p-2">Titolo</th>
                <th className="p-2">Artista</th>
                <th className="p-2">Provider</th>
                <th className="p-2">Ora</th>
                <th className="p-2">Explicit</th>
                <th className="p-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {/* Placeholder richieste */}
              <tr>
                <td className="p-2">Mario</td>
                <td className="p-2">Titolo</td>
                <td className="p-2">Artista</td>
                <td className="p-2">Spotify</td>
                <td className="p-2">22:15</td>
                <td className="p-2">No</td>
                <td className="p-2 flex gap-1">
                  <button className="bg-green-700 px-2 py-1 rounded">Accetta</button>
                  <button className="bg-red-700 px-2 py-1 rounded">Scarta</button>
                  <button className="bg-yellow-700 px-2 py-1 rounded">Unisci</button>
                  <button className="bg-gray-700 px-2 py-1 rounded">Mute</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-4 text-sm">
          <span>Totali: 0</span>
          <span>Ultima ora: 0</span>
          <span>% Duplicati: 0%</span>
        </div>
      </div>
    </main>
  );
}
