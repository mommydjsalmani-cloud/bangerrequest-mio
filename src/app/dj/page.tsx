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
  explicit?: boolean; // keep boolean type
  preview_url?: string | null;
  note?: string;
  event_code?: string | null;
  requester?: string | null;
  status: 'new' | 'accepted' | 'rejected' | 'muted' | 'cancelled';
  duplicates?: number;
  duplicates_log?: { at: string; requester?: string | null; note?: string | null }[];
};

// Estensione per rappresentare un gruppo aggregato di richieste identiche
type GroupedRequest = RequestItem & {
  __group?: true;
  groupKey?: string;
  groupedItems?: RequestItem[]; // richieste originali (incl. rappresentante)
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
  const [list, setList] = useState<RequestItem[]>([]); // lista "raw" dal backend
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
  // Debug raw requests
  const [rawVisible, setRawVisible] = useState(false);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawData, setRawData] = useState<GenericJSON | null>(null);
  // Stato per mostrare ultimo detection_mode ricevuto da un POST duplicato (se si decide di integrare in futuro la creazione client-side)
  const [lastDetectionMode] = useState<string | null>(null); // placeholder per future integrazione

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
    // Duplicati effettivi = total richieste - numero gruppi (ogni gruppo rappresenta almeno 1 originale)
    // Per ottenere numero gruppi riutilizziamo la stessa logica di grouping in modo leggero
    const byKey = new Set<string>();
    const norm = (s?: string|null) => (s||'').toLowerCase().trim();
    for (const r of list) {
      const key = r.event_code + '::' + (r.track_id || (norm(r.title)+'::'+norm(r.artists)));
      byKey.add(key);
    }
    const groupsCount = byKey.size;
    const duplicates = Math.max(0, total - groupsCount);
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // Diagnostica: mostra come viene calcolato
      console.debug('[dj-panel][stats] total', total, 'groups', groupsCount, 'duplicates', duplicates);
    }
    return { total, lastHour, duplicates };
  }, [list]);

  // Raggruppa richieste identiche (track_id + event_code). Se track_id assente, fallback su titolo+artisti normalizzati
  const groupedList: GroupedRequest[] = useMemo(() => {
    const byKey = new Map<string, RequestItem[]>();
    const norm = (s?: string|null) => (s||'').toLowerCase().trim();
    for (const r of list) {
      const key = r.event_code + '::' + (r.track_id || (norm(r.title)+'::'+norm(r.artists)));
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(r);
    }
    const groups: GroupedRequest[] = [];
    for (const [key, arr] of byKey.entries()) {
      if (arr.length === 1) {
        groups.push(arr[0]);
        continue;
      }
      // Ordiniamo per created_at crescente per avere rappresentante stabile
      arr.sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      // Scegliamo rappresentante: priorità accepted > new > resto, altrimenti primo
      const representative = arr.find(r=>r.status==='accepted') || arr.find(r=>r.status==='new') || arr[0];
      // Nuova semantica: duplicates = numero di righe duplicate (extra) rispetto all'originale
      const aggregatedDuplicates = arr.length - 1;
      const aggregated: GroupedRequest = {
        ...representative,
        duplicates: aggregatedDuplicates,
        __group: true,
        groupKey: key,
        groupedItems: arr,
        // duplicates_log non più usato nell'interfaccia (manteniamo proprietà vuota per compatibilità)
        duplicates_log: []
      };
      groups.push(aggregated);
    }
    // Ordine dei gruppi: manteniamo l'ordine originale apparizione (primo created_at in gruppo)
    groups.sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return groups.reverse(); // manteniamo lo stesso orientamento (latest first) come lista originale originaria
  }, [list]);

  // Lista finale renderizzata: se un gruppo è espanso lo sostituiamo con le sue righe reali (originale + duplicate) marcando le duplicate
  // Con layout unificato non costruiamo più una lista intermedia a tabella.

  // Evidenziazione temporanea duplicati al momento dell'espansione
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Quando un gruppo passa da collapsed -> expanded aggiungiamo gli id duplicati a flashIds
    for (const g of groupedList) {
      if (!g.__group) continue;
      const key = g.groupKey || g.id;
      if (expanded[key]) {
        // gruppo espanso: prendi duplicati (tutti tranne il primo created_at) e aggiungi se non già presenti
        if (g.groupedItems && g.groupedItems.length > 1) {
          const original = [...g.groupedItems].sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
            const duplicates = g.groupedItems.filter(it=>it.id!==original.id);
            const newIds: string[] = [];
            duplicates.forEach(d => { if (!flashIds.has(d.id)) newIds.push(d.id); });
            if (newIds.length) {
              setFlashIds(prev => new Set([...Array.from(prev), ...newIds]));
              // Rimuove dopo 1400ms
              setTimeout(() => {
                setFlashIds(prev => {
                  const copy = new Set(prev);
                  newIds.forEach(id => copy.delete(id));
                  return copy;
                });
              }, 1400);
            }
        }
      }
    }
  }, [expanded, groupedList, flashIds]);

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
              <form
                className="flex flex-col sm:flex-row gap-2 sm:items-end"
                onSubmit={async (e) => {
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
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:flex-1">
                  <input
                    name="name"
                    placeholder="Nome evento"
                    className="p-2 rounded bg-zinc-900 disabled:opacity-50 w-full flex-1 min-w-0"
                    disabled={eventCreateLoading}
                  />
                  <input
                    name="code"
                    placeholder="Codice (opzionale)"
                    className="p-2 rounded bg-zinc-900 disabled:opacity-50 w-full sm:w-40 min-w-0"
                    disabled={eventCreateLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={eventCreateLoading}
                  className="bg-green-700 px-3 py-2 rounded disabled:opacity-50 w-full sm:w-auto"
                >
                  {eventCreateLoading ? 'Creo…' : 'Crea evento'}
                </button>
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
              {selectedEvent && (
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    className="text-[11px] bg-red-800 hover:bg-red-700 px-2 py-1 rounded"
                    onClick={async () => {
                      if (!selectedEvent) return;
                      if (!confirm(`Eliminare evento ${selectedEvent}? Questa operazione rimuove anche le richieste collegate.`)) return;
                      try {
                        const res = await fetch(`/api/events?code=${encodeURIComponent(selectedEvent)}`, {
                          method: 'DELETE',
                          headers: { ...(password ? { 'x-dj-secret': password } : {}), ...(username ? { 'x-dj-user': username } : {}) }
                        });
                        const j = await res.json();
                        if (j.ok) {
                          setEvents(prev => prev.filter(ev => ev.code !== selectedEvent));
                          setSelectedEvent(null);
                          setList([]);
                        } else {
                          setError(j.error || 'Errore eliminazione evento');
                        }
                      } catch {
                        setError('Errore rete durante eliminazione evento');
                      }
                    }}
                  >Elimina evento</button>
                  <span className="text-[10px] opacity-60">(Solo evento selezionato)</span>
                </div>
              )}
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
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedEvent) { setError('Seleziona un evento prima'); return; }
                      if (!rawVisible) {
                        setRawVisible(true);
                        setRawLoading(true);
                        try {
                          const qs = `?event_code=${encodeURIComponent(selectedEvent)}`;
                          const res = await fetch(`/api/requests/raw${qs}`);
                          const j = await res.json();
                          setRawData(j);
                        } catch {
                          setRawData({ error: 'fetch_failed' });
                        } finally {
                          setRawLoading(false);
                        }
                      } else {
                        setRawVisible(false);
                      }
                    }}
                    className="text-xs bg-zinc-700 px-2 py-1 rounded"
                  >{rawVisible ? 'Nascondi raw' : 'Debug raw'}</button>
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
                {rawVisible && (
                  <div className="mt-2 text-[11px] bg-zinc-900 rounded p-2 max-h-64 overflow-auto font-mono whitespace-pre-wrap break-all">
                    <div className="mb-1 opacity-70">/api/requests/raw {selectedEvent ? `(evento=${selectedEvent})` : ''}</div>
                    {rawLoading ? 'Caricamento…' : <>{JSON.stringify(rawData, null, 2)}</>}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="bg-zinc-700 px-2 py-1 rounded text-[10px]"
                        onClick={async () => {
                          if (!selectedEvent) return;
                          setRawLoading(true);
                          try {
                            const qs = `?event_code=${encodeURIComponent(selectedEvent)}`;
                            const res = await fetch(`/api/requests/raw${qs}`);
                            const j = await res.json();
                            setRawData(j);
                          } catch {
                            setRawData({ error: 'fetch_failed' });
                          } finally {
                            setRawLoading(false);
                          }
                        }}
                      >Aggiorna</button>
                      <button
                        type="button"
                        className="bg-zinc-700 px-2 py-1 rounded text-[10px]"
                        onClick={() => setRawData(null)}
                      >Pulisci</button>
                    </div>
                    <div className="mt-2 opacity-50 leading-snug">
                      Suggerimento: se <code>replicated</code> è false o manca una riga attesa, controlla eventuale <code>replicated_error</code> nel POST duplicato.
                      {lastDetectionMode && (
                        <div className="mt-1">Ultima rilevazione duplicato: <code>{lastDetectionMode}</code></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[10px] flex flex-wrap gap-2 items-center">
                <span className="opacity-60">Legenda:</span>
                <span className="px-1 rounded bg-yellow-800/60 text-yellow-200 font-mono">dup new</span>
                <span className="px-1 rounded bg-green-800/60 text-green-200 font-mono">dup acc</span>
              </div>
              {Object.keys(expanded).some(k=>expanded[k]) && (
                <button
                  type="button"
                  onClick={()=> setExpanded({})}
                  className="self-end text-[11px] bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded"
                >Collassa tutti</button>
              )}
              {groupedList.map((r) => (
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
                    <button
                      type="button"
                      onClick={() => r.__group ? setExpanded(e=>({...e,[r.groupKey||r.id]:!e[r.groupKey||r.id]})) : r.duplicates ? setExpanded(e=>({...e,[r.id]:!e[r.id]})) : undefined}
                      className={`px-1 rounded ${(r.__group || r.duplicates)?'cursor-pointer hover:brightness-110':''} ${r.status==='accepted'?'bg-green-700':r.status==='rejected'?'bg-red-700':r.status==='muted'?'bg-gray-700':r.status==='cancelled'?'bg-zinc-700/60':'bg-yellow-700'}`}
                      title={r.__group ? 'Tocca per vedere richieste individuali' : (r.duplicates ? 'Tocca per vedere duplicati' : '')}
                    >{r.status}{r.duplicates ? ` +${r.duplicates}` : ''}</button>
                  </div>
                  {r.__group && expanded[r.groupKey || r.id] && (
                    <div className="mt-1 text-[10px] bg-zinc-900/80 rounded p-2 space-y-2">
                      <div className="opacity-70 mb-1">Richieste unite e duplicati</div>
                      <div className="space-y-1">
                        {r.groupedItems?.map((sub, idx) => (
                          <div key={sub.id} className="border border-zinc-800/60 rounded p-1">
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              {idx===0 ? (
                                <span className="px-1 rounded bg-zinc-700/70">originale</span>
                              ) : (
                                <span className={`px-1 rounded font-mono ${sub.status==='accepted'?'bg-green-800/60 text-green-200':'bg-yellow-800/60 text-yellow-200'}`}>{sub.status==='accepted'?'dup acc':'dup new'}</span>
                              )}
                              <span className="px-1 rounded bg-zinc-700 max-w-[100px] truncate" title={sub.requester||'-'}>{sub.requester||'-'}</span>
                              <span className="font-mono opacity-60">{new Date(sub.created_at).toLocaleTimeString()}</span>
                              <span className={`px-1 rounded ${sub.status==='accepted'?'bg-green-700':sub.status==='rejected'?'bg-red-700':sub.status==='muted'?'bg-gray-700':sub.status==='cancelled'?'bg-zinc-700/60':'bg-yellow-700'}`}>{sub.status}</span>
                              {idx>0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const original = r.groupedItems?.[0];
                                    if (original) act(sub.id, 'merge', original.id);
                                  }}
                                  className="ml-auto text-[10px] bg-blue-700 px-1 rounded"
                                >Merge</button>
                              )}
                            </div>
                            {sub.note && (
                              <div className="mt-1 whitespace-pre-wrap break-words leading-snug text-[10px] bg-zinc-900/60 px-1 py-0.5 rounded">
                                {sub.note}
                              </div>
                            )}
                          </div>
                        ))}
                        {r.duplicates_log && r.duplicates_log.map((d,i)=>(
                          <div key={`dup-${i}`} className="border border-zinc-800/60 rounded p-1">
                            <div className="flex flex-wrap gap-2 items-center mb-0.5">
                              <span className="px-1 rounded bg-yellow-700/60">duplicate</span>
                              <span className="px-1 rounded bg-zinc-700/70">{d.requester||'-'}</span>
                              <span className="px-1 rounded bg-yellow-800/50">new</span>
                              <span className="font-mono opacity-60">{new Date(d.at).toLocaleTimeString()}</span>
                            </div>
                            <div className="whitespace-pre-wrap break-words">{d.note || <span className="opacity-30 italic">(nessuna)</span>}</div>
                          </div>
                        ))}
                        {(() => {
                          const missing = (r.duplicates || 0) - (r.duplicates_log?.length || 0) - ((r.groupedItems?.length||1)-1);
                          if (missing > 0) {
                            return Array.from({length: missing}).map((_,i)=>(
                              <div key={`missing-${i}`} className="border border-zinc-800/60 rounded p-1 opacity-50 italic">
                                <div className="flex flex-wrap gap-2 items-center mb-0.5">
                                  <span className="px-1 rounded bg-zinc-700/40">storico</span>
                                  <span className="px-1 rounded bg-zinc-700/40">?</span>
                                  <span className="px-1 rounded bg-zinc-700/40">duplicate</span>
                                  <span className="font-mono opacity-60">—</span>
                                </div>
                                <div>(nessun dettaglio registrato)</div>
                              </div>
                            ));
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                  {(!r.__group && r.duplicates && expanded[r.id]) && (
                    <div className="mt-1 text-[10px] bg-zinc-900/80 rounded p-2 space-y-1">
                      <div className="opacity-70 mb-1">Duplicati: {r.duplicates}</div>
                      <div className="opacity-50 italic">Duplicati raggruppati: usa espansione per dettagli (solo se disponibile).</div>
                    </div>
                  )}
                  {r.__group ? (
                    <div className="text-[10px] opacity-60">Espandi per moderare le singole richieste</div>
                  ) : (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button onClick={() => act(r.id, 'accept')} className="flex-1 min-w-[30%] bg-green-700 py-1 rounded">Accetta</button>
                      <button onClick={() => act(r.id, 'reject')} className="flex-1 min-w-[30%] bg-red-700 py-1 rounded">Scarta</button>
                      <button onClick={() => act(r.id, 'mute')} className="flex-1 min-w-[30%] bg-gray-700 py-1 rounded">Mute</button>
                      <a href={`https://open.spotify.com/track/${r.track_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[30%] bg-zinc-700 py-1 rounded text-center">Apri</a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-4 text-sm">
              <span>Totali: {stats.total}</span>
              <span>Ultima ora: {stats.lastHour}</span>
              <span>Duplicati: {stats.duplicates}</span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
