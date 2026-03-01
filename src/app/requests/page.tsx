"use client";

import { useEffect, useState, useRef } from "react";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { apiPath } from '@/lib/apiPath';

export default function Requests() {
  const router = useRouter();
  const [nome, setNome] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [catalogType, setCatalogType] = useState<'deezer' | 'tidal'>('deezer');
  const catalogTypeRef = useRef<'deezer' | 'tidal'>('deezer');
  const [validatingSession, setValidatingSession] = useState(true);

  useEffect(() => {
    // Load stored name and get active session from homepage
    const storedNome = localStorage.getItem("banger_nome");
    setNome(storedNome);

    async function loadActiveSession() {
      try {
        const res = await fetch(apiPath('/api/homepage-sessions'));
        const j = await res.json();
        if (!res.ok || !j.ok || !j.sessions || j.sessions.length === 0) {
          // Nessuna sessione attiva sulla homepage
          router.replace("/?no_session=1");
          return;
        }
        // Usa la prima sessione attiva
        const activeSession = j.sessions[0];
        setSessionToken(activeSession.token);
        const ct = activeSession.catalog_type || 'deezer';
        setCatalogType(ct);
        catalogTypeRef.current = ct;
      } catch {
        router.replace("/?retry=1");
        return;
      } finally {
        setValidatingSession(false);
      }
    }

    loadActiveSession();
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

  // Helper function per convertire millisecondi in formato mm:ss
  const formatDuration = (durationMs: number) => {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query) {
        setResults([]);
        return;
      }
      setLoading(true);
      const searchEndpoint = catalogType === 'tidal' 
        ? `/api/tidal/search?q=${encodeURIComponent(query)}&limit=10&s=${sessionToken}`
        : `/api/deezer/search?q=${encodeURIComponent(query)}&limit=10`;
      
      fetch(apiPath(searchEndpoint))
        .then((r) => r.json())
        .then((data) => {
          setResults(data.tracks || data.results || []);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query, catalogType, sessionToken]);

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

  // Poll catalog_type changes (DJ might switch to Tidal while user is on page)
  useEffect(() => {
    if (!sessionToken) return;
    
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    
    async function checkCatalogChange() {
      try {
        const res = await fetch(apiPath('/api/homepage-sessions'));
        const j = await res.json();
        if (!mounted || !j.ok || !j.sessions || j.sessions.length === 0) return;
        
        const activeSession = j.sessions[0];
        const newCatalogType: 'deezer' | 'tidal' = activeSession.catalog_type || 'deezer';
        
        // Usa ref per evitare stale closure
        if (newCatalogType !== catalogTypeRef.current) {
          catalogTypeRef.current = newCatalogType;
          setCatalogType(newCatalogType);
          setResults([]);
          setQuery(''); // Resetta anche la query per forzare nuova ricerca
        }
      } catch {
        // Silent error - continue polling
      }
      
      if (mounted) {
        timeoutId = setTimeout(checkCatalogChange, 4000);
      }
    }
    
    timeoutId = setTimeout(checkCatalogChange, 1000);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionToken]);

  // Poll status of last request if present
  useEffect(() => {
    if (!lastRequestId) return;
    const id = lastRequestId; // capture non-null
    let mounted = true;
    async function check() {
      try {
        const r = await fetch(apiPath(`/api/requests?id=${encodeURIComponent(id)}`));
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
    if (!sessionToken) {
      setMessage('Sessione non valida. Torna alla home.');
      setTimeout(() => router.replace('/'), 2500);
      return;
    }
    const payload = {
      session_token: sessionToken,
      track_id: selected.id,
      uri: selected.uri,
      title: selected.title,
      artists: selected.artists,
      album: selected.album,
      cover_url: selected.cover_url,
      isrc: selected.isrc,
      explicit: selected.explicit,
      preview_url: selected.preview_url,
      duration_ms: selected.duration_ms,
      note,
      requester_name: nome,
    };

    const res = await fetch(apiPath('/api/requests'), {
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

  if (validatingSession) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-black text-white p-6">
        <div className="text-sm text-gray-300">Caricamento sessione...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-black text-white p-4 sm:p-6">
      <div className="w-full max-w-3xl p-6 sm:p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6 mt-4 mb-8">
        <h2 className="text-2xl font-bold mb-2">Ciao {nome ?? 'ospite'}! 🎵</h2>

        {!submitted && (
          <>
            <div className="flex flex-col gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder={catalogType === 'tidal' ? 'Cerca titolo o artista su Tidal 🎵' : 'Cerca titolo o artista su Deezer 🎵'}
                className="w-full p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>
            {loading && <div className="text-sm text-gray-300">Ricerca in corso...</div>}
            <div className="grid grid-cols-1 gap-2">
              {results.map((t) => (
                <div key={t.id} className={`p-2 rounded flex items-center gap-3 sm:gap-4 ${selected?.id === t.id ? 'ring-2 ring-green-500' : 'bg-zinc-800/40'} transition`}>
              <Image src={t.cover_url || '/file.svg'} alt={t.title || 'cover'} width={56} height={56} className="w-12 h-12 sm:w-14 sm:h-14 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base truncate">{t.title} {t.explicit ? <span className="text-[10px] bg-red-600 px-1 rounded ml-1 align-middle">E</span> : null}</div>
                    <div className="text-[11px] sm:text-xs text-gray-400 truncate">{t.artists} — {t.album}</div>
                    <div className="text-[10px] text-gray-500">{formatDuration(t.duration_ms || 0)}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {t.preview_url ? (
                      <audio controls src={t.preview_url} className="w-28 sm:w-36 h-8" preload="none" />
                    ) : (
                      <div className="text-[10px] text-gray-500">No preview</div>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(t)} className="bg-green-600 text-white py-1 px-2 rounded text-[11px] sm:text-sm">Sel.</button>
                      <a 
                        href={catalogType === 'tidal' 
                          ? `https://tidal.com/browse/track/${t.id}` 
                          : `https://www.deezer.com/track/${t.id}`
                        } 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-gray-700 text-white py-1 px-2 rounded text-[11px] sm:text-sm"
                      >
                        {catalogType === 'tidal' ? 'Ascolta su Tidal' : 'Ascolta su Deezer'}
                      </a>
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
            
            {/* Pulsante Instagram */}
            <div className="mt-2 p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
              <div className="text-white text-sm font-medium mb-2">Ti è piaciuto il servizio?</div>
              <a 
                href="/instagram" 
                className="inline-block w-full text-center bg-white text-purple-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition text-sm"
              >
                🎵 Seguici su Instagram
              </a>
            </div>

            {(lastRequestStatus === 'accepted' || lastRequestStatus === 'rejected' || lastRequestStatus === 'muted' || lastRequestStatus === 'cancelled') && (
              <button onClick={()=>{ sessionStorage.removeItem('banger_last_request_id'); sessionStorage.removeItem('banger_last_request_status'); sessionStorage.removeItem('banger_last_request_title'); sessionStorage.removeItem('banger_last_request_artists'); setLastRequestId(null); setLastRequestStatus(null); setSubmittedTrack(null); }} className="mt-2 bg-gray-700 hover:bg-gray-600 rounded px-3 py-2 text-sm">Invia un&#39;altra richiesta</button>
            )}
            {lastRequestStatus === 'new' && (
              <button
                onClick={async ()=>{
                  if (!lastRequestId) return;
                  try {
                    const r = await fetch(apiPath('/api/requests'), { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id: lastRequestId, action: 'cancel' }) });
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

        <div className="text-[11px] sm:text-xs text-gray-400 mt-4 leading-snug">
          Nota: preview disponibili solo quando presenti in {catalogType === 'tidal' ? 'Tidal' : 'Deezer'}. 
          Nessun account {catalogType === 'tidal' ? 'Tidal' : 'Deezer'} richiesto.
        </div>
      </div>
    </main>
  );
}
