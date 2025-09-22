"use client";

import { useEffect, useState } from "react";

function openInstagram() {
  const username = "mommymusicentertainment";
  const webUrl = `https://www.instagram.com/${username}`;
  const appUrl = `instagram://user?username=${username}`;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const intentUrl = `intent://instagram.com/_u/${username}/#Intent;package=com.instagram.android;scheme=https;end`;
  try {
    if (isAndroid) window.location.href = intentUrl;
    else window.location.href = appUrl;
  } catch (e) {}
  setTimeout(() => window.open(webUrl, "_blank"), 800);
}

export default function Requests() {
  const [nome, setNome] = useState<string | null>(null);
  const [codice, setCodice] = useState<string | null>(null);

  useEffect(() => {
    setNome(localStorage.getItem("banger_nome"));
    setCodice(localStorage.getItem("banger_codice"));
  }, []);

  const [query, setQuery] = useState("");
  type Track = {
    id: string;
    uri?: string;
    title?: string;
    artists?: string;
    album?: string;
    cover_url?: string | null;
    duration_ms?: number;
    explicit?: boolean;
    preview_url?: string | null;
    isrc?: string | null;
  };
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Track | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query) {
        setResults([]);
        return;
      }
      setLoading(true);
      fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=10`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data.tracks || []);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  async function confirmTrack() {
    if (!selected) return;
    const payload = {
      track_id: selected.id,
      uri: selected.uri,
      title: selected.title,
      artists: selected.artists,
      album: selected.album,
      cover_url: selected.cover_url,
      isrc: selected.isrc,
      explicit: selected.explicit,
      preview_url: selected.preview_url,
      note,
      event_code: codice,
      requester: nome,
    };

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (j.ok) {
      setMessage('Richiesta inviata. Grazie!');
      setSelected(null);
      setNote('');
    } else {
      setMessage('Errore nell\'invio della richiesta');
    }
    setTimeout(() => setMessage(null), 4000);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-3xl p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6">
        <h2 className="text-2xl font-bold mb-2">Ciao {nome ?? 'ospite'}, codice evento: {codice ?? '-'}</h2>

        <div className="flex gap-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Cerca titolo o artista su Spotify"
            className="flex-1 p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
          />
          <a href="/instagram" className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded">Segui su Instagram</a>
        </div>

        {loading && <div className="text-sm text-gray-300">Ricerca in corso...</div>}

        <div className="grid grid-cols-1 gap-2">
          {results.map((t) => (
            <div key={t.id} className={`p-2 rounded flex items-center gap-3 ${selected?.id === t.id ? 'ring-2 ring-green-500' : ''}`}>
              <img src={t.cover_url || '/file.svg'} alt={t.title} className="w-14 h-14 rounded object-cover" />
              <div className="flex-1">
                <div className="font-semibold">{t.title} {t.explicit ? <span className="text-xs bg-red-600 px-1 rounded ml-2">E</span> : null}</div>
                <div className="text-sm text-gray-400">{t.artists} — {t.album}</div>
                <div className="text-xs text-gray-500">{Math.floor((t.duration_ms||0)/1000)}s</div>
              </div>
              <div className="flex flex-col gap-1">
                {t.preview_url ? (
                  <audio controls src={t.preview_url} className="w-36" />
                ) : (
                  <div className="text-xs text-gray-500">No preview</div>
                )}
                <div className="flex gap-1">
                  <button onClick={() => setSelected(t)} className="bg-green-600 text-white py-1 px-2 rounded text-sm">Seleziona</button>
                  <a href={`https://open.spotify.com/track/${t.id}`} target="_blank" rel="noopener noreferrer" className="bg-gray-700 text-white py-1 px-2 rounded text-sm">Apri</a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="p-4 bg-zinc-800 rounded">
            <div className="font-semibold">Conferma richiesta: {selected.title} — {selected.artists}</div>
            <textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Nota o dedica (opzionale)" className="w-full mt-2 p-2 rounded bg-zinc-900 text-white" />
            <div className="flex gap-2 mt-2">
              <button onClick={confirmTrack} className="bg-green-600 text-white py-2 px-4 rounded">Conferma</button>
              <button onClick={()=>setSelected(null)} className="bg-gray-700 text-white py-2 px-4 rounded">Annulla</button>
            </div>
          </div>
        )}

        {message && <div className="text-green-400 text-center mt-2">{message}</div>}

        <div className="text-xs text-gray-400 mt-4">Nota: preview disponibili solo quando presenti in Spotify. Nessun account Spotify richiesto.</div>
      </div>
    </main>
  );
}
