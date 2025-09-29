"use client";

import { useEffect, useState } from "react";
import Image from 'next/image';
import { useRouter } from "next/navigation";

export default function Requests() {
  const router = useRouter();
  const [nome, setNome] = useState<string | null>(null);
  const [codice, setCodice] = useState<string | null>(null);
  const [validatingCode, setValidatingCode] = useState(true);

  useEffect(() => {
    // On mount load stored data then validate the event code
    const storedNome = localStorage.getItem("banger_nome");
    const storedCode = localStorage.getItem("banger_codice");
    setNome(storedNome);
    setCodice(storedCode);

    async function validate(code: string) {
      try {
        const res = await fetch(`/api/events/validate?code=${encodeURIComponent(code)}`);
        const j = await res.json();
        if (!res.ok || !j.valid) {
          localStorage.removeItem("banger_codice");
          router.replace("/?invalid=1");
          return;
        }
      } catch {
        // In caso di errore rete, meglio rimandare alla home per riprovare
        router.replace("/?retry=1");
        return;
      } finally {
        setValidatingCode(false);
      }
    }

    if (!storedCode) {
      router.replace("/");
      setValidatingCode(false);
      return;
    }
    validate(storedCode);
  }, [router]);

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
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastRequestStatus, setLastRequestStatus] = useState<"new"|"accepted"|"rejected"|"muted"|"cancelled"|null>(null);
  const [submittedTrack, setSubmittedTrack] = useState<{ title?: string; artists?: string } | null>(null);
  const submitted = !!lastRequestId;

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

  // Load last request id + track info from session on mount
  useEffect(() => {
    const id = sessionStorage.getItem('banger_last_request_id');
    if (id) setLastRequestId(id);
    const st = sessionStorage.getItem('banger_last_request_status');
  if (st === 'new' || st === 'accepted' || st === 'rejected' || st === 'muted' || st === 'cancelled') setLastRequestStatus(st);
    const tTitle = sessionStorage.getItem('banger_last_request_title');
    const tArtists = sessionStorage.getItem('banger_last_request_artists');
    if (tTitle || tArtists) setSubmittedTrack({ title: tTitle || undefined, artists: tArtists || undefined });
  }, []);

  // Poll status of last request if present
  useEffect(() => {
    if (!lastRequestId) return;
    const id = lastRequestId; // capture non-null
    let mounted = true;
    async function check() {
      try {
        const r = await fetch(`/api/requests?id=${encodeURIComponent(id)}`);
        const j = await r.json();
        const item = j.requests?.[0];
        if (!mounted || !item) return;
        const st = item.status as typeof lastRequestStatus;
        if (st !== lastRequestStatus) {
          setLastRequestStatus(st);
          sessionStorage.setItem('banger_last_request_status', st || '');
          if (st === 'accepted') setMessage('Il DJ ha accettato la tua richiesta! ✅');
          else if (st === 'rejected') setMessage('La tua richiesta è stata rifiutata.');
          else if (st === 'muted') setMessage('La tua richiesta è stata silenziata.');
          else if (st === 'cancelled') setMessage('Hai annullato la richiesta.');
          else setMessage(null);
          if (st === 'accepted' || st === 'rejected' || st === 'muted' || st === 'cancelled') {
            setTimeout(() => {
              if (!mounted) return;
              setMessage(null);
            }, 4000);
          }
        }
      } catch {}
    }
    const interval = setInterval(check, 4000);
    // run immediately first time
    check();
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [lastRequestId, lastRequestStatus]);

  async function confirmTrack() {
    if (!selected) return;
    if (!codice) {
      setMessage('Evento non valido. Torna alla home.');
      setTimeout(() => router.replace('/'), 2500);
      return;
    }
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
  type PostRespBase = { ok?: boolean; error?: string; details?: { code?: string } };
  type PostResp = (PostRespBase & { item?: { id?: string; status?: string; duplicates?: number } }) | null;
  let j: PostResp = null;
  try { j = await res.json(); } catch { j = null; }
    if (j && j.ok) {
      // Richiesta creata con successo
      if (j.item?.id) {
        sessionStorage.setItem('banger_last_request_id', j.item.id);
        setLastRequestId(j.item.id);
        const stRaw = j.item.status || 'new';
        const allowed: ReadonlyArray<'new'|'accepted'|'rejected'|'muted'|'cancelled'> = ['new','accepted','rejected','muted','cancelled'] as const;
        const st = (allowed as readonly string[]).includes(stRaw) ? (stRaw as typeof allowed[number]) : 'new';
        setLastRequestStatus(st);
        sessionStorage.setItem('banger_last_request_status', st);
        
        if (selected) {
          sessionStorage.setItem('banger_last_request_title', selected.title || '');
          sessionStorage.setItem('banger_last_request_artists', selected.artists || '');
          setSubmittedTrack({ title: selected.title, artists: selected.artists });
        }

        // Mostra messaggio appropriato basato sui duplicati
        if (j.item.duplicates && j.item.duplicates > 0) {
          setMessage('Questo brano è già in coda ✅');
        } else {
          setMessage('Richiesta inviata! ✅');
        }
        
        setSelected(null);
        setNote('');
        setTimeout(() => setMessage(null), 3500);
        return;
      }
    }

    // Gestione errore
    if (j && j.error) {
      setMessage(`Errore: ${j.error}`);
      setTimeout(() => setMessage(null), 3500);
      return;
    }

    setMessage('Errore sconosciuto');
    setTimeout(() => setMessage(null), 3500);
  };

  if (validatingCode) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-black text-white p-6">
        <div className="text-sm text-gray-300">Verifica codice evento...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-black text-white p-4 sm:p-6">
      <div className="w-full max-w-3xl p-6 sm:p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6 mt-4 mb-8">
        <h2 className="text-2xl font-bold mb-2">Ciao {nome ?? 'ospite'}, codice evento: {codice ?? '-'}</h2>

        {!submitted && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Cerca titolo o artista su Spotify"
                className="flex-1 p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none text-sm"
              />
              <a href="/instagram" className="text-center bg-pink-600 hover:bg-pink-700 active:scale-[0.97] transition text-white font-bold py-3 px-4 rounded text-sm">Segui su Instagram</a>
            </div>
            {loading && <div className="text-sm text-gray-300">Ricerca in corso...</div>}
            <div className="grid grid-cols-1 gap-2">
              {results.map((t) => (
                <div key={t.id} className={`p-2 rounded flex items-center gap-3 sm:gap-4 ${selected?.id === t.id ? 'ring-2 ring-green-500' : 'bg-zinc-800/40'} transition`}>
              <Image src={t.cover_url || '/file.svg'} alt={t.title || 'cover'} width={56} height={56} className="w-12 h-12 sm:w-14 sm:h-14 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base truncate">{t.title} {t.explicit ? <span className="text-[10px] bg-red-600 px-1 rounded ml-1 align-middle">E</span> : null}</div>
                    <div className="text-[11px] sm:text-xs text-gray-400 truncate">{t.artists} — {t.album}</div>
                    <div className="text-[10px] text-gray-500">{Math.floor((t.duration_ms||0)/1000)}s</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {t.preview_url ? (
                      <audio controls src={t.preview_url} className="w-28 sm:w-36 h-8" preload="none" />
                    ) : (
                      <div className="text-[10px] text-gray-500">No preview</div>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(t)} className="bg-green-600 text-white py-1 px-2 rounded text-[11px] sm:text-sm">Sel.</button>
                      <a href={`https://open.spotify.com/track/${t.id}`} target="_blank" rel="noopener noreferrer" className="bg-gray-700 text-white py-1 px-2 rounded text-[11px] sm:text-sm">Apri</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selected && !submitted && (
          <div className="p-4 bg-zinc-800 rounded text-sm sm:text-base">
            <div className="font-semibold">Conferma richiesta: {selected.title} — {selected.artists}</div>
            <textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Nota o dedica (opzionale)" className="w-full mt-2 p-2 rounded bg-zinc-900 text-white text-sm" rows={3} />
            <div className="flex gap-2 mt-3">
              <button onClick={confirmTrack} className="flex-1 bg-green-600 hover:bg-green-700 active:scale-[0.98] transition text-white py-2 px-4 rounded text-sm">Conferma</button>
              <button onClick={()=>setSelected(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 active:scale-[0.98] transition text-white py-2 px-4 rounded text-sm">Annulla</button>
            </div>
          </div>
        )}

        {submitted && (
          <div className="p-5 bg-zinc-800 rounded text-sm sm:text-base flex flex-col gap-3">
            <div className="font-semibold text-lg">Richiesta inviata</div>
            <div className="text-gray-300 text-sm">Brano: <span className="text-white font-medium">{submittedTrack?.title || '—'}</span>{submittedTrack?.artists ? <span className="text-gray-400"> — {submittedTrack.artists}</span> : null}</div>
            <div className="text-xs text-gray-400">
              Stato attuale: <span className="font-semibold text-white">{lastRequestStatus || 'in attesa'}</span><br/>
              La pagina si aggiorna automaticamente quando il DJ decide.
            </div>
            {(lastRequestStatus === 'accepted' || lastRequestStatus === 'rejected' || lastRequestStatus === 'muted' || lastRequestStatus === 'cancelled') && (
              <button onClick={()=>{ sessionStorage.removeItem('banger_last_request_id'); sessionStorage.removeItem('banger_last_request_status'); sessionStorage.removeItem('banger_last_request_title'); sessionStorage.removeItem('banger_last_request_artists'); setLastRequestId(null); setLastRequestStatus(null); setSubmittedTrack(null); }} className="mt-2 bg-gray-700 hover:bg-gray-600 rounded px-3 py-2 text-sm">Invia un&#39;altra richiesta</button>
            )}
            {lastRequestStatus === 'new' && (
              <button
                onClick={async ()=>{
                  if (!lastRequestId) return;
                  try {
                    const r = await fetch('/api/requests', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id: lastRequestId, action: 'cancel' }) });
                    const j = await r.json();
                    if (j.ok) {
                      setLastRequestStatus('cancelled');
                      sessionStorage.setItem('banger_last_request_status','cancelled');
                    }
                  } catch {}
                }}
                className="mt-2 bg-red-700 hover:bg-red-600 active:scale-[0.97] transition rounded px-3 py-2 text-sm"
              >Annulla richiesta</button>
            )}
          </div>
        )}

  {message && !submitted && <div className="text-center mt-2 text-sm p-2 rounded bg-zinc-800 text-white">{message}</div>}

        {!submitted && lastRequestId && (
          <div className="text-xs text-gray-300 mt-2">Ultima richiesta ID {lastRequestId} — stato: <span className="font-semibold">{lastRequestStatus ?? 'in attesa'}</span></div>
        )}

        <div className="text-[11px] sm:text-xs text-gray-400 mt-4 leading-snug">Nota: preview disponibili solo quando presenti in Spotify. Nessun account Spotify richiesto.</div>
      </div>
    </main>
  );
}
