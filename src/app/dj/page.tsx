"use client";

import { useEffect, useMemo, useState } from 'react';

type RequestItem = {
  id: string;
  created_at: string;
  track_id: string;
  uri?: string;
  title?: string;
  artists?: string;
  album?: string;
  cover_url?: string | null;
  isrc?: string | null;
  explicit?: boolean;
  preview_url?: string | null;
  note?: string;
  event_code?: string | null;
  requester?: string | null;
  status: 'new' | 'accepted' | 'rejected' | 'muted' | 'cancelled';
  duplicates?: number;
};

type EventItem = {
  id: string;
  code: string;
  name: string;
  created_at: string;
  active?: boolean;
  status?: 'active' | 'paused' | 'closed';
};

export default function DJPanel() {
  // Codice evento rimosso: la selezione avviene creando/selezionando eventi dopo login
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [list, setList] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [persistenceMode, setPersistenceMode] = useState<'supabase' | 'in-memory' | 'unknown'>('unknown');
  const [authConfigOk, setAuthConfigOk] = useState<boolean | null>(null);
  const [authEndpointMissing, setAuthEndpointMissing] = useState(false);
  const [eventCreateLoading, setEventCreateLoading] = useState(false);
  // Debug states
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  type GenericJSON = Record<string, unknown>;
  const [debugData, setDebugData] = useState<GenericJSON | null>(null);
  const [lastPostDebug, setLastPostDebug] = useState<GenericJSON | null>(null);

  useEffect(() => {
    // Recupera stato persistenza (non blocca il resto)
    fetch('/api/health/supabase').then(r => r.json()).then(j => {
      if (j.mode === 'supabase') setPersistenceMode('supabase');
      else if (j.mode === 'in-memory' || j.error === 'missing_env') setPersistenceMode('in-memory');
      else setPersistenceMode('unknown');
    }).catch(()=> setPersistenceMode('unknown'));
    fetch('/api/health/auth').then(r => {
      if (r.status === 404) {
        setAuthEndpointMissing(true);
        setAuthConfigOk(null);
        return { ok:false };
      }
      return r.json();
    }).then(j => {
      if (j) setAuthConfigOk(!!j.ok);
    }).catch(()=> setAuthConfigOk(null));
  }, []);

  useEffect(() => {
  // Rimosso caricamento codice evento: non più richiesto al login
    try {
      const savedPwd = sessionStorage.getItem('dj_secret');
      if (savedPwd) setPassword(savedPwd);
      const savedUser = sessionStorage.getItem('dj_user');
      if (savedUser) setUsername(savedUser);
    } catch {}
  }, []);

  // load events when authed/password changes
  useEffect(() => {
    if (!authed) return;
    let active = true;
    async function loadEvents() {
      try {
        const headers: Record<string,string> = {};
        if (password) headers['x-dj-secret'] = password;
        if (username) headers['x-dj-user'] = username;
        const res = await fetch('/api/events', { headers });
        if (!res.ok) {
          if (res.status === 401) setError('Non autorizzato: verifica password DJ.');
          else if (res.status === 500) setError('Configurazione server mancante (DJ_PANEL_USER/SECRET).');
          return;
        }
        const j = await res.json();
        if (!active) return;
        setEvents(j.events || []);
      } catch {}
    }
    loadEvents();
    return () => {
      active = false;
    };
  }, [authed, password, username]);

  useEffect(() => {
    try {
      if (password) sessionStorage.setItem('dj_secret', password);
      else sessionStorage.removeItem('dj_secret');
    } catch {}
  }, [password]);

  useEffect(() => {
    if (!authed) return;
    let mounted = true;
  let interval: ReturnType<typeof setTimeout> | undefined;
  let backoff = 4000;

    const controllerRef: { current?: AbortController } = { current: undefined };

    async function load() {
  const code = selectedEvent || '';
      const qs = code ? `?event_code=${encodeURIComponent(code)}` : '';
      const headersInit: HeadersInit | undefined = password || username ? { ...(password?{'x-dj-secret':password}:{}) , ...(username?{'x-dj-user':username}:{}) } : undefined;
      const controller = new AbortController();
      controllerRef.current?.abort();
      controllerRef.current = controller;
      try {
        setLoading(true);
        const res = await fetch(`/api/requests${qs}`, { headers: headersInit, signal: controller.signal });
        if (!res.ok) {
          if (res.status === 401) {
            if (mounted) setError('Non autorizzato: verifica password DJ.');
          }
          return;
        }
        const j = await res.json();
        if (!mounted) return;
        // Evita di sostituire lista se l'utente ha cambiato evento nel frattempo
  if (code !== (selectedEvent || '')) return;
        setList((prev) => {
          // Se la risposta è vuota ma prima avevamo dati, manteniamoli (probabile race o evento cambiato momentaneamente)
            if ((!j.requests || j.requests.length === 0) && prev.length > 0) return prev;
            return j.requests || [];
        });
        setError(null);
        backoff = 4000; // reset backoff su successo
  } catch {
        if (!mounted) return;
        // Non svuotare la lista su errore di rete
        setError('Problema rete, ritento...');
        backoff = Math.min(backoff * 1.5, 15000);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    function schedule() {
      interval = setTimeout(async () => {
        await load();
        if (mounted) schedule();
      }, backoff);
    }

    load();
    schedule();

    return () => {
      mounted = false;
      if (interval) clearTimeout(interval);
      controllerRef.current?.abort();
    };
  }, [authed, selectedEvent, password, username]);

  async function act(id: string, action: 'accept' | 'reject' | 'mute' | 'merge', mergeWithId?: string) {
    const res = await fetch('/api/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) },
      body: JSON.stringify({ id, action, mergeWithId }),
    });
    if (!res.ok) {
      if (res.status === 401) setError('Non autorizzato: password DJ errata.');
      else if (res.status === 500) setError('Configurazione server mancante (DJ_PANEL_USER/SECRET).');
      return;
    }
    // optimistic refresh
  const code = selectedEvent || '';
    const qs = code ? `?event_code=${encodeURIComponent(code)}` : '';
  const r2 = await fetch(`/api/requests${qs}`, { headers: { ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) } });
    const j2 = await r2.json();
    setList(j2.requests || []);
  }

  const stats = useMemo(() => {
    const total = list.length;
    const lastHour = list.filter((r) => Date.now() - new Date(r.created_at).getTime() <= 3600_000).length;
    const duplicates = list.reduce((acc, r) => acc + (r.duplicates || 0), 0);
    const dupPct = total ? Math.round((duplicates / total) * 100) : 0;
    return { total, lastHour, dupPct };
  }, [list]);

  const [loginLoading, setLoginLoading] = useState(false);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError('Inserisci username DJ');
      return;
    }
    if (!password.trim()) {
      setError('Inserisci password DJ');
      return;
    }
    setLoginLoading(true);
    try {
      // Effettuiamo una chiamata protetta per validare la password (es: lista eventi)
  const res = await fetch('/api/events', { headers: { 'x-dj-secret': password.trim(), 'x-dj-user': username.trim() } });
      if (!res.ok) {
        if (res.status === 401) setError('Password DJ errata. Accesso negato.');
        else if (res.status === 500) setError('Server non configurato: contatta admin (mancano credenziali).');
        else setError('Errore di validazione password.');
        return;
      }
      const j = await res.json();
      if (!j.events) {
        setError('Risposta inattesa dal server.');
        return;
      }
  // Non salviamo più codice evento al login
  sessionStorage.setItem('dj_secret', password.trim());
  sessionStorage.setItem('dj_user', username.trim());
      setAuthed(true);
    } catch {
      setError('Errore di rete durante il login.');
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-5xl p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6">
        <h2 className="text-2xl font-bold mb-2">Pannello DJ</h2>
        {persistenceMode !== 'supabase' && (
          <div className="text-xs bg-yellow-800/40 border border-yellow-700 rounded p-2 leading-snug">
            {persistenceMode === 'in-memory' ? (
              <>Avviso: stai usando storage <strong>in-memory</strong> (Supabase non attivo). Le richieste si perdono a riavvio/scaling. Configura le variabili e redeploy per attivare persistenza.</>
            ) : (
              <>Verifica stato persistenza…</>
            )}
          </div>
        )}
        {authEndpointMissing && (
          <div className="text-xs bg-blue-800/40 border border-blue-700 rounded p-2 leading-snug">
            Endpoint auth mancante (deployment vecchio). Esegui un redeploy per includere <code>/api/health/auth</code>.
          </div>
        )}
        {authConfigOk === false && !authEndpointMissing && (
          <div className="text-xs bg-red-800/40 border border-red-700 rounded p-2 leading-snug">
            Credenziali DJ non configurate: imposta <code>DJ_PANEL_USER</code> e <code>DJ_PANEL_SECRET</code> nelle variabili (Production) e redeploy per creare/moderare eventi.
          </div>
        )}

        {!authed ? (
          <div className="flex flex-col gap-2 mb-4 w-full max-w-xl">
          <form className="flex gap-2 flex-col sm:flex-row" onSubmit={login}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username DJ"
              className="p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password DJ (se impostata)"
              className="p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
            />
            <button disabled={loginLoading} className="bg-green-600 disabled:opacity-50 hover:bg-green-700 text-white font-bold py-2 px-4 rounded min-w-[90px]">{loginLoading ? 'Verifico…' : 'Entra'}</button>
          </form>
          {error && <div className="text-xs text-red-400">{error}</div>}
          </div>
        ) : null}

        {authed && (
          <>
            <div className="text-sm text-gray-300 flex justify-between items-center">
              <div>
                Evento: <span className="font-mono">{selectedEvent || '-'}</span>
              </div>
              <div className="text-xs">
                {password ? 'Protezione DJ: attiva' : 'Protezione DJ: non attiva'}
              </div>
              <div>{loading ? 'Aggiorno…' : error ? error : `Richieste: ${list.length}`}</div>
            </div>

            <div className="bg-zinc-800 p-3 rounded flex flex-col gap-3">
              <form className="flex gap-2" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const formData = new FormData(form);
                const name = (formData.get('name') as string)?.trim();
                const code = (formData.get('code') as string)?.trim();
                if (!name) return;
                setEventCreateLoading(true);
                setError(null);
                try {
                  const res = await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) },
                    body: JSON.stringify({ name, code }),
                  });
                  if (res.ok) {
                    const j = await res.json();
                    setEvents((prev) => [j.event, ...prev]);
                    setSelectedEvent(j.event.code);
                    setLastPostDebug(j);
                    form.reset();
                  } else {
                    let msg = 'Errore creazione evento';
                    let data: GenericJSON | null = null;
                    try { data = await res.json(); } catch {}
                    setLastPostDebug({ status: res.status, body: data });
                    if (res.status === 401) msg = 'Non autorizzato (credenziali DJ errate)';
                    else if (res.status === 409) {
                      // Gestiamo SEMPRE il 409 come conflitto codice (anche se il server non ha restituito duplicate_code)
                      if (code) {
                        try {
                          const retry = await fetch('/api/events', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) },
                            body: JSON.stringify({ name }) // niente codice -> generazione automatica
                          });
                          if (retry.ok) {
                            const jr = await retry.json();
                            setEvents((prev) => [jr.event, ...prev]);
                            setSelectedEvent(jr.event.code);
                            setLastPostDebug(jr);
                            form.reset();
                            msg = `Conflitto sul codice '${code}'. Generato nuovo codice: ${jr.event.code}`;
                          } else {
                            let rdata: GenericJSON | null = null; try { rdata = await retry.json(); } catch {}
                            setLastPostDebug({ status: retry.status, body: rdata });
                            msg = 'Conflitto codice e retry automatico fallito' + (rdata?.error ? ` (${rdata.error})` : '');
                          }
                        } catch {
                          msg = 'Conflitto codice e rete assente per retry automatico';
                        }
                      } else {
                        msg = 'Conflitto codice: lascia vuoto il campo per generare automaticamente';
                      }
                    }
                    else if (res.status === 400 && data?.error === 'invalid_name') msg = 'Nome evento mancante o non valido';
                    else if (res.status === 500) msg = 'Errore server (verifica configurazione Supabase o credenziali)';
                    else if (data?.error) msg = `Errore: ${data.error}`;
                    setError(msg);
                  }
                } catch {
                  setError('Errore di rete durante la creazione evento');
                } finally {
                  setEventCreateLoading(false);
                }
              }}>
                <input name="name" placeholder="Nome evento" className="p-2 rounded bg-zinc-900 disabled:opacity-50" disabled={eventCreateLoading} />
                <input name="code" placeholder="Codice (opzionale)" className="p-2 rounded bg-zinc-900 disabled:opacity-50" disabled={eventCreateLoading} />
                <button type="submit" disabled={eventCreateLoading} className="bg-green-700 px-3 py-2 rounded disabled:opacity-50">{eventCreateLoading ? 'Creo…' : 'Crea evento'}</button>
              </form>
              {error && <div className="text-xs text-red-400 -mt-2">{error}</div>}
              <div className="flex gap-2 overflow-x-auto">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 bg-zinc-700 rounded px-2 py-1">
                    <button onClick={() => setSelectedEvent(ev.code)} className={`${selectedEvent === ev.code ? 'underline' : ''}`}>
                      {ev.name} <span className="opacity-70">({ev.code})</span>
                    </button>
                    <span className={`text-[10px] px-1 rounded ${ev.status==='active'?'bg-green-600':ev.status==='paused'?'bg-yellow-600':'bg-red-700'}`}>{ev.status || (ev.active ? 'active':'paused')}</span>
                    <div className="flex gap-1">
                      {ev.status !== 'active' && ev.status !== 'closed' && (
                        <button className="text-[10px] bg-green-700 px-1 rounded" onClick={async ()=>{
                          const res = await fetch('/api/events', { method:'PATCH', headers:{'Content-Type':'application/json', ...(password?{'x-dj-secret':password}:{}), ...(username?{'x-dj-user':username}:{})}, body: JSON.stringify({ id: ev.id, status: 'active' }) });
                          if (res.ok){ const j=await res.json(); setEvents(p=>p.map(x=>x.id===ev.id?j.event:x)); }
                        }}>Avvia</button>
                      )}
                      {ev.status === 'active' && (
                        <button className="text-[10px] bg-yellow-700 px-1 rounded" onClick={async ()=>{
                          const res = await fetch('/api/events', { method:'PATCH', headers:{'Content-Type':'application/json', ...(password?{'x-dj-secret':password}:{}), ...(username?{'x-dj-user':username}:{})}, body: JSON.stringify({ id: ev.id, status: 'paused' }) });
                          if (res.ok){ const j=await res.json(); setEvents(p=>p.map(x=>x.id===ev.id?j.event:x)); }
                        }}>Pausa</button>
                      )}
                      {ev.status !== 'closed' && (
                        <button className="text-[10px] bg-red-700 px-1 rounded" onClick={async ()=>{
                          const res = await fetch('/api/events', { method:'PATCH', headers:{'Content-Type':'application/json', ...(password?{'x-dj-secret':password}:{}), ...(username?{'x-dj-user':username}:{})}, body: JSON.stringify({ id: ev.id, status: 'closed' }) });
                          if (res.ok){ const j=await res.json(); setEvents(p=>p.map(x=>x.id===ev.id?j.event:x)); }
                        }}>Chiudi</button>
                      )}
                      {ev.status === 'closed' && (
                        <button className="text-[10px] bg-green-800 px-1 rounded" onClick={async ()=>{
                          const res = await fetch('/api/events', { method:'PATCH', headers:{'Content-Type':'application/json', ...(password?{'x-dj-secret':password}:{}), ...(username?{'x-dj-user':username}:{})}, body: JSON.stringify({ id: ev.id, status: 'active' }) });
                          if (res.ok){ const j=await res.json(); setEvents(p=>p.map(x=>x.id===ev.id?j.event:x)); }
                        }}>Riapri</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!debugVisible) {
                        setDebugVisible(true);
                        setDebugLoading(true);
                        try {
                          const res = await fetch('/api/events/debug', { headers: { ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) } });
                          const j = await res.json();
                          setDebugData(j);
                        } catch {
                          setDebugData({ error: 'fetch_failed' });
                        } finally {
                          setDebugLoading(false);
                        }
                      } else {
                        // Hide panel
                        setDebugVisible(false);
                      }
                    }}
                    className="text-xs bg-zinc-700 px-2 py-1 rounded"
                  >
                    {debugVisible ? 'Nascondi debug' : 'Mostra debug eventi'}
                  </button>
                  {debugVisible && (
                    <button
                      type="button"
                      onClick={async () => {
                        setDebugLoading(true);
                        try {
                          const res = await fetch('/api/events/debug', { headers: { ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) } });
                          const j = await res.json();
                          setDebugData(j);
                        } catch {
                          setDebugData({ error: 'fetch_failed' });
                        } finally {
                          setDebugLoading(false);
                        }
                      }}
                      className="text-xs bg-zinc-700 px-2 py-1 rounded"
                    >
                      {debugLoading ? 'Ricarico…' : 'Ricarica'}
                    </button>
                  )}
                </div>
                {debugVisible && (
                  <div className="mt-2 text-[11px] bg-zinc-900 rounded p-2 max-h-64 overflow-auto font-mono whitespace-pre-wrap break-all">
                    <div className="mb-1 opacity-70">/api/events/debug</div>
                    {debugLoading ? 'Caricamento…' : <>{JSON.stringify(debugData, null, 2)}</>}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="bg-red-700 px-2 py-1 rounded text-[10px]"
                        onClick={async () => {
                          if (!confirm('Confermi la cancellazione di tutti gli eventi e richieste?')) return;
                          try {
                            const res = await fetch('/api/events/debug', { method: 'DELETE', headers: { ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) } });
                            const j = await res.json();
                            setDebugData(j);
                            if (j.ok) {
                              setEvents([]);
                              setSelectedEvent(null);
                              setList([]);
                            }
                          } catch {
                            setDebugData({ error: 'reset_failed' });
                          }
                        }}
                      >Reset eventi+richieste</button>
                      <button
                        type="button"
                        className="bg-zinc-700 px-2 py-1 rounded text-[10px]"
                        onClick={async () => {
                          setDebugLoading(true);
                          try {
                            const res = await fetch('/api/events/debug', { headers: { ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) } });
                            const j = await res.json();
                            setDebugData(j);
                          } catch {
                            setDebugData({ error: 'fetch_failed' });
                          } finally {
                            setDebugLoading(false);
                          }
                        }}
                      >Aggiorna</button>
                    </div>
                    {lastPostDebug && (
                      <>
                        <div className="mt-3 mb-1 opacity-70">Ultima risposta POST /api/events</div>
                        <div>{JSON.stringify(lastPostDebug, null, 2)}</div>
                      </>
                    )}
                    <div className="mt-3 opacity-60">Suggerimento: copia e incolla questi JSON quando chiedi supporto.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-zinc-800 text-left">
                    <th className="p-2">Utente</th>
                    <th className="p-2">Titolo</th>
                    <th className="p-2">Artista</th>
                    <th className="p-2">Album</th>
                    <th className="p-2">Messaggio</th>
                    <th className="p-2">Ora</th>
                    <th className="p-2">Explicit</th>
                    <th className="p-2">Stato</th>
                    <th className="p-2">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-800">
                      <td className="p-2">{r.requester || '-'}</td>
                      <td className="p-2">{r.title}</td>
                      <td className="p-2">{r.artists}</td>
                      <td className="p-2">{r.album}</td>
                      <td className="p-2 max-w-[260px] truncate" title={r.note || ''}>{r.note || '-'}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</td>
                      <td className="p-2">{r.explicit ? 'Sì' : 'No'}</td>
                      <td className="p-2">
                        <span className={`px-1 rounded ${r.status==='accepted'?'bg-green-700':r.status==='rejected'?'bg-red-700':r.status==='muted'?'bg-gray-700':r.status==='cancelled'?'bg-zinc-700/60':'bg-yellow-700'}`}>{r.status}{r.duplicates ? ` (+${r.duplicates})` : ''}</span>
                      </td>
                      <td className="p-2 flex flex-wrap gap-1">
                        <button onClick={() => act(r.id, 'accept')} className="bg-green-700 px-2 py-1 rounded">Accetta</button>
                        <button onClick={() => act(r.id, 'reject')} className="bg-red-700 px-2 py-1 rounded">Scarta</button>
                        <button onClick={() => act(r.id, 'merge')} className="bg-yellow-700 px-2 py-1 rounded">Unisci</button>
                        <button onClick={() => act(r.id, 'mute')} className="bg-gray-700 px-2 py-1 rounded">Mute</button>
                        <a href={`https://open.spotify.com/track/${r.track_id}`} target="_blank" rel="noopener noreferrer" className="bg-zinc-700 px-2 py-1 rounded">Apri</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden flex flex-col gap-2">
              {list.map((r) => (
                <div key={r.id} className="bg-zinc-800 rounded p-3 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold truncate">{r.title}</span>
                    <span className="text-[10px] opacity-70 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] opacity-80">
                    <span>{r.artists}</span>
                    <span className="opacity-50">•</span>
                    <span className="truncate max-w-[40%]">{r.album}</span>
                  </div>
                  {r.note ? <div className="text-[11px] bg-zinc-900/70 px-2 py-1 rounded leading-snug whitespace-pre-wrap break-words">{r.note}</div> : null}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="px-1 rounded bg-zinc-700">{r.requester || '-'}</span>
                    {r.explicit ? <span className="px-1 rounded bg-red-600">E</span> : null}
                    <span className={`px-1 rounded ${r.status==='accepted'?'bg-green-700':r.status==='rejected'?'bg-red-700':r.status==='muted'?'bg-gray-700':r.status==='cancelled'?'bg-zinc-700/60':'bg-yellow-700'}`}>{r.status}{r.duplicates ? ` +${r.duplicates}` : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button onClick={() => act(r.id, 'accept')} className="flex-1 min-w-[30%] bg-green-700 py-1 rounded">Accetta</button>
                    <button onClick={() => act(r.id, 'reject')} className="flex-1 min-w-[30%] bg-red-700 py-1 rounded">Scarta</button>
                    <button onClick={() => act(r.id, 'merge')} className="flex-1 min-w-[30%] bg-yellow-700 py-1 rounded">Unisci</button>
                    <button onClick={() => act(r.id, 'mute')} className="flex-1 min-w-[30%] bg-gray-700 py-1 rounded">Mute</button>
                    <a href={`https://open.spotify.com/track/${r.track_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[30%] bg-zinc-700 py-1 rounded text-center">Apri</a>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-4 text-sm">
              <span>Totali: {stats.total}</span>
              <span>Ultima ora: {stats.lastHour}</span>
              <span>% Duplicati: {stats.dupPct}%</span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
