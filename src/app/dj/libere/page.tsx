"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDateTime, formatDuration, LibereSession, LibereRequest, LibereStats, SESSION_STATUS_LABELS, STATUS_LABELS, STATUS_COLORS, generatePublicUrl, generateQRCodeUrl } from '@/lib/libereStore';
import { apiPath } from '@/lib/apiPath';

export default function LibereAdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [initializing, setInitializing] = useState(true); // Nuovo stato per evitare il flash
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Data state
  const [sessions, setSessions] = useState<LibereSession[]>([]);
  const [currentSession, setCurrentSession] = useState<LibereSession | null>(null);
  const [requests, setRequests] = useState<LibereRequest[]>([]);
  const [stats, setStats] = useState<LibereStats | null>(null);
  
  // UI state
  const [showQR, setShowQR] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [newSessionName, setNewSessionName] = useState('');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [schemaError, setSchemaError] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [showArchive, setShowArchive] = useState(false); // Nuovo stato per archivio
  const [eventMode, setEventMode] = useState(false); // Nuovo stato per modalità evento
  const [homepageVisible, setHomepageVisible] = useState(false); // Stato visibilità homepage
  const [currentEventCodeInput, setCurrentEventCodeInput] = useState(''); // Input codice evento corrente
  const [sortByPriority, setSortByPriority] = useState(false); // Toggle ordinamento per priorità
  
  /**
   * Calcola lo score di una richiesta.
   * Formula: up_votes - down_votes
   * A parità di score, l'ordinamento secondario per created_at ASC dà precedenza alle più vecchie.
   */
  const calculateScore = (upVotes: number, downVotes: number): number => {
    return (upVotes || 0) - (downVotes || 0);
  };
  
  // Funzione per ordinare le richieste
  const filteredRequests = (() => {
    // Se il toggle priorità è attivo, ordina per score DESC, created_at ASC
    if (sortByPriority) {
      return [...requests].sort((a, b) => {
        const scoreA = calculateScore(a.up_votes || 0, a.down_votes || 0);
        const scoreB = calculateScore(b.up_votes || 0, b.down_votes || 0);
        const scoreDiff = scoreB - scoreA;
        if (scoreDiff !== 0) return scoreDiff;
        // A parità di score, ordina per created_at ASC (più vecchie prima)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
    return requests;
  })();
  
  // Auto-clear messaggi con debounce
  useEffect(() => {
    if (success) {
      const timeoutId = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [success]);
  
  useEffect(() => {
    if (error) {
      const timeoutId = setTimeout(() => setError(null), 10000); // Errori rimangono più a lungo
      return () => clearTimeout(timeoutId);
    }
  }, [error]);

  // Sincronizza campo input con codice evento corrente della sessione
  useEffect(() => {
    if (currentSession?.current_event_code) {
      setCurrentEventCodeInput(currentSession.current_event_code);
    } else {
      setCurrentEventCodeInput('');
    }
  }, [currentSession?.current_event_code]);
  
  // Carica credenziali e verifica autenticazione
  useEffect(() => {
    const loadCredentialsAndAuth = async () => {
      try {
        const savedUser = sessionStorage.getItem('dj_user');
        const savedPassword = sessionStorage.getItem('dj_secret');
        
        if (savedUser && savedPassword) {
          setUsername(savedUser);
          setPassword(savedPassword);
          
          // Verifica credenziali caricando le sessioni
          const response = await fetch(apiPath('/api/libere/admin?action=sessions'), {
            headers: {
              'x-dj-user': savedUser,
              'x-dj-secret': savedPassword
            }
          });
          
          const data = await response.json();
          
          if (data.ok) {
            setAuthed(true);
            setSessions(data.sessions || []);
            
            // Seleziona prima sessione se disponibile
            if (data.sessions?.length > 0) {
              setSelectedSessionId(data.sessions[0].id);
              // loadSessionData sarà chiamata automaticamente dal useEffect che monitora selectedSessionId
            }
          } else {
            // Credenziali non valide, gestisce errori di schema
            if (data.error && data.error.includes('sessioni_libere')) {
              setSchemaError(true);
              setError('Database non configurato: le tabelle delle Richieste Libere non sono state create.');
            }
          }
        }
      } catch {
        // Errore nel caricamento, l'utente dovrà fare login manualmente
      } finally {
        setInitializing(false); // Inizializzazione completata
      }
    };
    
    loadCredentialsAndAuth();
  }, []);

  const saveTidalAuth = async (
    sessionId: string,
    accessToken: string,
    refreshToken: string,
    userId: string | null,
    expiresAt: string | null
  ) => {
    setLoading(true);
    try {
      const response = await fetch(apiPath('/api/libere/admin'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          action: 'save_tidal_auth',
          session_id: sessionId,
          tidal_access_token: accessToken,
          tidal_refresh_token: refreshToken,
          tidal_user_id: userId || '',
          tidal_token_expires_at: expiresAt
        })
      });

      const data = await response.json();
      console.log('Save Tidal auth response:', data);

      if (data.ok) {
        setSuccess('✅ Tidal autenticato con successo!');
        sessionStorage.removeItem('tidal_session_id');
        localStorage.removeItem('tidal_session_id');
        localStorage.removeItem('tidal_oauth_pending');
        setSelectedSessionId(sessionId);
        await loadSessionData(sessionId);
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setError(data.error || 'Errore salvataggio auth Tidal');
      }
    } catch (err) {
      console.error('Errore save tidal auth:', err);
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  };

  // Gestisci callback OAuth Tidal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tidal_success = params.get('tidal_success');
    const tidal_error = params.get('tidal_error');
    const accessToken = params.get('tidal_access_token');
    const refreshToken = params.get('tidal_refresh_token');
    const userId = params.get('tidal_user_id');
    const expiresAt = params.get('tidal_expires_at');
    const callbackSessionId = params.get('tidal_session_id');

    // Se il callback è già passato ma la sessione DJ si è persa (caso mobile), completa il salvataggio dopo login
    const pendingRaw = localStorage.getItem('tidal_oauth_pending');
    if (!tidal_success && !tidal_error && pendingRaw && username && password) {
      try {
        const pending = JSON.parse(pendingRaw) as {
          sessionId?: string;
          accessToken?: string;
          refreshToken?: string;
          userId?: string;
          expiresAt?: string;
        };
        if (pending.sessionId && pending.accessToken && pending.refreshToken) {
          saveTidalAuth(
            pending.sessionId,
            pending.accessToken,
            pending.refreshToken,
            pending.userId || null,
            pending.expiresAt || null
          );
          return;
        }
      } catch {
        localStorage.removeItem('tidal_oauth_pending');
      }
    }

    if (tidal_success) {
      const savedSessionId = callbackSessionId || sessionStorage.getItem('tidal_session_id') || localStorage.getItem('tidal_session_id');
      
      console.log('Tidal callback ricevuto:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        savedSessionId,
        hasCredentials: !!username && !!password
      });
      
      if (!accessToken || !refreshToken) {
        setError('❌ Token Tidal mancanti dal callback');
        return;
      }
      
      if (!savedSessionId) {
        localStorage.setItem('tidal_oauth_pending', JSON.stringify({
          sessionId: callbackSessionId || '',
          accessToken,
          refreshToken,
          userId: userId || '',
          expiresAt: expiresAt || ''
        }));
        setError('❌ Session ID non trovato. Riapri il pannello DJ e rifai login.');
        return;
      }
      
      if (!username || !password) {
        localStorage.setItem('tidal_oauth_pending', JSON.stringify({
          sessionId: savedSessionId,
          accessToken,
          refreshToken,
          userId: userId || '',
          expiresAt: expiresAt || ''
        }));
        console.log('Credenziali DJ perse durante callback, salvate in localStorage e attesa login');
        setSuccess('🔐 Callback Tidal ricevuto. Fai login DJ per completare il collegamento.');
        // Non pulire URL, così il messaggio rimane visibile
        setTimeout(() => window.history.replaceState({}, '', window.location.pathname), 5000);
        return;
      }

      saveTidalAuth(savedSessionId, accessToken, refreshToken, userId, expiresAt);
    }

    if (tidal_error) {
      setError(`Errore Tidal OAuth: ${tidal_error}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [username, password]);
  
  const checkMigration = async () => {
    setMigrationLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(apiPath('/api/libere/migrate'), {
        method: 'POST',
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        }
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setSuccess(data.message);
      } else {
        if (data.sql) {
          setError(`${data.error}\n\nSQL da eseguire:\n${data.sql}`);
        } else {
          setError(data.error || 'Errore durante il controllo migrazione');
        }
      }
    } catch {
      setError('Errore connessione durante il controllo migrazione');
    } finally {
      setMigrationLoading(false);
    }
  };
  
  const loadSessionData = async (sessionId: string) => {
    if (!sessionId || !authed) return;
    
    setLoading(true);
    setError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout di 10 secondi
    
    try {
      const response = await fetch(apiPath(`/api/libere/admin?session_id=${sessionId}`), {
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Non autorizzato: verifica credenziali DJ.');
          setAuthed(false); // Logout automatico
          return;
        }
        if (response.status === 404) {
          setError('Sessione non trovata');
          return;
        }
        throw new Error(`Errore HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore caricamento dati');
        return;
      }
      
      setCurrentSession(data.session);
      setRequests(data.requests || []);
      setStats(data.stats || null);
      setHomepageVisible(data.session?.homepage_visible || false); // Aggiorna stato homepage
      setError(null);
      
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Timeout caricamento - riprova');
        } else {
          console.error('Errore caricamento sessione:', err);
          setError('Errore connessione');
        }
      } else {
        setError('Errore sconosciuto');
      }
    } finally {
      setLoading(false);
    }
  };

  // Polling automatico - MA SOLO se non stiamo visualizzando l'archivio
  useEffect(() => {
    if (!authed || !selectedSessionId || showArchive) return; // Non fare polling se stiamo visualizzando l'archivio
    
    let mounted = true;
    let interval: ReturnType<typeof setTimeout> | undefined;
    let backoff = 4000;

    const controllerRef: { current?: AbortController } = { current: undefined };

    async function load() {
      // Cleanup precedente controller
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      
      const controller = new AbortController();
      controllerRef.current = controller;
      
      try {
        const response = await fetch(apiPath(`/api/libere/admin?session_id=${selectedSessionId}`), {
          headers: {
            'x-dj-user': username,
            'x-dj-secret': password
          },
          signal: controller.signal
        });
        
        // Controllo se il componente è ancora montato e la richiesta non è stata abortita
        if (!mounted || controller.signal.aborted) return;
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Non autorizzato: verifica credenziali DJ.');
          } else if (response.status === 404) {
            setError('Sessione non trovata');
          } else {
            setError(`Errore server: ${response.status}`);
          }
          return;
        }
        
        const data = await response.json();
        if (!mounted || controller.signal.aborted) return;
        
        if (data.ok) {
          setCurrentSession(data.session);
          setRequests(data.requests || []);
          setStats(data.stats || null);
          setError(null);
          backoff = 4000; // reset backoff su successo
        } else {
          setError(data.error || 'Errore risposta server');
        }
      } catch (error: unknown) {
        if (!mounted || (error instanceof Error && error.name === 'AbortError')) return;
        console.error('Errore polling libere:', error);
        // Non svuotare i dati su errore di rete
        setError('Problema rete, ritento...');
        backoff = Math.min(backoff * 1.5, 15000);
      }
    }

    function schedule() {
      if (!mounted) return;
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
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [authed, selectedSessionId, password, username, showArchive]); // Aggiunto showArchive alle dipendenze
  
  // Funzione per caricare richieste archiviate
  const loadArchivedRequests = async (sessionId: string) => {
    if (!sessionId || !authed) return;
    
    setLoading(true);
    setError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout di 10 secondi
    
    try {
      const response = await fetch(apiPath(`/api/libere/admin?session_id=${sessionId}&archived=true`), {
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Non autorizzato: verifica credenziali DJ.');
          setAuthed(false); // Logout automatico
          return;
        }
        if (response.status === 404) {
          setError('Sessione non trovata');
          return;
        }
        throw new Error(`Errore HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.ok) {
        setRequests(data.requests || []);
        setStats(null); // Le statistiche non hanno senso per l'archivio
        setError(null);
      } else {
        setError(data.error || 'Errore caricamento archivio');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Timeout caricamento archivio - riprova');
        } else {
          console.error('Errore caricamento archivio:', err);
          setError('Errore caricamento archivio');
        }
      } else {
        setError('Errore sconosciuto archivio');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const adminAction = async (action: string, extraData = {}) => {
    // Per la creazione di sessioni non serve selectedSessionId
    if (!authed || (!selectedSessionId && action !== 'create_session')) {
      setError('Azione non autorizzata o sessione non selezionata');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout di 15 secondi per operazioni admin
    
    try {
      const response = await fetch(apiPath('/api/libere/admin'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        signal: controller.signal,
        body: JSON.stringify({
          action,
          session_id: action === 'create_session' ? undefined : selectedSessionId,
          ...extraData
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Non autorizzato: verifica credenziali DJ');
          setAuthed(false); // Logout automatico
          return;
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Richiesta non valida');
          return;
        }
        throw new Error(`Errore HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore operazione');
        return;
      }
      
      setSuccess(data.message);
      
      // Auto-clear success message dopo 5 secondi
      setTimeout(() => setSuccess(null), 5000);
      
      // Ricarica dati con gestione errori
      try {
        if (action === 'create_session') {
          // Pulisci il form e chiudi la creazione
          setNewSessionName('');
          setShowCreateSession(false);
          
          // Ricarica lista sessioni
          const sessionsResponse = await fetch(apiPath('/api/libere/admin?action=sessions'), {
            headers: {
              'x-dj-user': username,
              'x-dj-secret': password
            }
          });
          
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            if (sessionsData.ok) {
              setSessions(sessionsData.sessions || []);
              if (data.session) {
                setSelectedSessionId(data.session.id);
                await loadSessionData(data.session.id);
              }
            }
          }
        } else if (action === 'delete_session') {
          // Ricarica lista sessioni e resetta selezione
          const sessionsResponse = await fetch(apiPath('/api/libere/admin?action=sessions'), {
            headers: {
              'x-dj-user': username,
              'x-dj-secret': password
            }
          });
          
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            if (sessionsData.ok) {
              setSessions(sessionsData.sessions || []);
              setSelectedSessionId('');
              setCurrentSession(null);
              setRequests([]);
              setStats(null);
            }
          }
        } else {
          // Per altre azioni, ricarica dati della sessione corrente
          if (showArchive) {
            await loadArchivedRequests(selectedSessionId);
          } else {
            await loadSessionData(selectedSessionId);
          }
        }
      } catch (reloadError) {
        console.error('Errore ricaricamento dopo azione:', reloadError);
        setError('Operazione completata ma errore nel ricaricamento dati');
      }
      
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Timeout operazione - riprova');
        } else {
          console.error('Errore admin action:', err);
          setError('Errore connessione');
        }
      } else {
        setError('Errore sconosciuto');
      }
    } finally {
      setLoading(false);
    }
  };

  // Funzione per gestire visibilità homepage
  const toggleHomepageVisibility = async () => {
    if (!selectedSessionId || !authed) {
      setError('Nessuna sessione selezionata o non autorizzato');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(apiPath('/api/homepage-sessions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          visible: !homepageVisible
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        setHomepageVisible(!homepageVisible);
        setSuccess(data.message);
        // Ricarica la lista delle sessioni per aggiornare l'indicatore Home
        try {
          const sessionsResponse = await fetch(apiPath('/api/libere/admin?action=sessions'), {
            headers: {
              'x-dj-user': username,
              'x-dj-secret': password
            }
          });
          const sessionsData = await sessionsResponse.json();
          if (sessionsData.ok) {
            setSessions(sessionsData.sessions || []);
          }
        } catch (e) {
          console.error('Errore ricarica sessioni:', e);
        }
      } else {
        setError(data.error || 'Errore aggiornamento homepage');
      }
    } catch (error) {
      console.error('Errore toggle homepage:', error);
      setError('Errore connessione homepage');
    } finally {
      setLoading(false);
    }
  };

  // Cambia catalogo Deezer/Tidal
  const switchCatalog = async (catalogType: 'deezer' | 'tidal') => {
    if (!selectedSessionId || !authed) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(apiPath('/api/libere/admin'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          action: 'switch_catalog',
          session_id: selectedSessionId,
          catalog_type: catalogType
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setSuccess(`Catalogo: ${catalogType === 'tidal' ? 'Tidal 🎵' : 'Deezer 🎵'}`);
        await loadSessionData(selectedSessionId);
      } else {
        setError(data.error || 'Errore cambio catalogo');
      }
    } catch {
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  };

  // Avvia OAuth Tidal
  const initTidalAuth = async () => {
    if (!authed) return;
    if (!selectedSessionId) {
      setError('Seleziona prima una sessione');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(
        apiPath(`/api/tidal/auth?session_id=${encodeURIComponent(selectedSessionId)}`),
        {
          method: 'GET',
          headers: {
            'x-dj-user': username,
            'x-dj-secret': password
          },
          cache: 'no-store'
        }
      );
      
      const data = await response.json();
      
      if (data.ok && data.authUrl) {
        sessionStorage.setItem('tidal_session_id', selectedSessionId);
        localStorage.setItem('tidal_session_id', selectedSessionId);
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Errore auth Tidal');
      }
    } catch {
      setError('Errore connessione Tidal');
    } finally {
      setLoading(false);
    }
  };

  // Retry manuale aggiunta Tidal
  const retryTidalAdd = async (requestId: string) => {
    if (!authed) return;
    
    setLoading(true);
    
    try {
      // Resetta lo stato a pending e lascia che il backend riprovi
      await fetch(apiPath('/api/libere/admin'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          request_id: requestId,
          status: 'accepted'
        })
      });
      
      setSuccess('⏳ Tentativo aggiunta Tidal...');
      
      // Ricarica dopo un po' per vedere il risultato
      setTimeout(() => {
        if (showArchive) {
          loadArchivedRequests(selectedSessionId);
        } else {
          loadSessionData(selectedSessionId);
        }
      }, 2000);
    } catch {
      setError('Errore retry');
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione veloce con retry automatico
  const act = async (requestId: string, action: 'accepted' | 'rejected' | 'cancelled' | 'played', retryCount = 0) => {
    if (!authed) {
      setError('Non autenticato');
      return;
    }
    
    const maxRetries = 2;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Timeout di 8 secondi
    
    try {
      const response = await fetch(apiPath('/api/libere/admin'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        signal: controller.signal,
        body: JSON.stringify({
          request_id: requestId,
          status: action,
          note: action === 'cancelled' ? 'Cambiato idea - richiesta cancellata dal DJ' : undefined
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Non autorizzato: credenziali DJ errate.');
          setAuthed(false); // Logout automatico
          return;
        }
        if (response.status === 404) {
          setError('Richiesta non trovata');
          return;
        }
        throw new Error(`Errore HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Errore aggiornamento richiesta');
      }
      
      // Refresh ottimistico immediato
      if (showArchive) {
        loadArchivedRequests(selectedSessionId);
      } else {
        loadSessionData(selectedSessionId);
      }
      
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Retry automatico per errori di rete
      if (retryCount < maxRetries && err instanceof Error && (
        err.name === 'AbortError' || 
        err.message.includes('fetch') || 
        err.message.includes('network')
      )) {
        console.warn(`Tentativo ${retryCount + 1}/${maxRetries + 1} fallito, riprovo...`);
        setTimeout(() => act(requestId, action, retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Timeout aggiornamento richiesta');
        } else {
          console.error('Errore azione richiesta:', err);
          setError('Errore server.');
        }
      } else {
        setError('Errore sconosciuto');
      }
    }
  };
  
  // Gestione eliminazione sessione
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sessione? Verranno eliminate anche tutte le richieste associate.')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(apiPath('/api/libere/admin'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          action: 'delete_session',
          session_id: sessionId
        })
      });

      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore durante l\'eliminazione della sessione');
        return;
      }

      setSuccess('Sessione eliminata con successo ✓');

      // Ricarica lista sessioni e resetta selezione
      const sessionsResponse = await fetch(apiPath('/api/libere/admin?action=sessions'), {
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        }
      });
      const sessionsData = await sessionsResponse.json();
      if (sessionsData.ok) {
        setSessions(sessionsData.sessions || []);
        setSelectedSessionId('');
        setCurrentSession(null);
        setRequests([]);
        setStats(null);
      }
      
    } catch (error) {
      console.error('Errore durante l\'eliminazione della sessione:', error);
      setError('Errore durante l\'eliminazione della sessione');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Link copiato ✓');
    } catch {
      setError('Errore copia link');
    }
  };
  
  // Funzione per esportare richieste in CSV
  const exportToCSV = () => {
    if (requests.length === 0) {
      setError('Nessuna richiesta da esportare');
      return;
    }
    
    // Header CSV
    const headers = ['Titolo', 'Artista', 'Album', 'Data Richiesta', 'Stato', 'Richiedente', 'Note', 'Fonte', 'Durata', 'Codice Evento'];
    
    // Converti richieste in righe CSV
    const csvRows = requests.map(request => [
      `"${(request.title || '').replace(/"/g, '""')}"`, // Escape delle virgolette
      `"${(request.artists || '').replace(/"/g, '""')}"`,
      `"${(request.album || '').replace(/"/g, '""')}"`,
      `"${formatDateTime(request.created_at)}"`,
      `"${STATUS_LABELS[request.status]}"`,
      `"${(request.requester_name || '').replace(/"/g, '""')}"`,
      `"${(request.note || '').replace(/"/g, '""')}"`,
      `"${request.source === 'deezer' ? 'Deezer' : 'Manuale'}"`,
      `"${request.duration_ms ? formatDuration(request.duration_ms) : ''}"`,
      `"${(request.event_code || '').replace(/"/g, '""')}"`
    ]);
    
    // Combina header e righe
    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    
    // Crea e scarica il file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Nome file con timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const viewType = showArchive ? 'archiviate' : 'attive';
    const fileName = `richieste_libere_${viewType}_${timestamp}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccess(`File ${fileName} scaricato ✓`);
  };
  
  const setupDatabase = async () => {
    setSetupLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(apiPath('/api/libere/setup'), {
        method: 'POST',
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        }
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore setup database');
        return;
      }
      
      setSuccess('Database configurato con successo! ✓');
      setSchemaError(false);
      
      // Riprova il caricamento delle sessioni
      setTimeout(async () => {
        try {
          const savedUser = sessionStorage.getItem('dj_user');
          const savedPassword = sessionStorage.getItem('dj_secret');
          
          if (savedUser && savedPassword) {
            const response = await fetch(apiPath('/api/libere/admin?action=sessions'), {
              headers: {
                'x-dj-user': savedUser,
                'x-dj-secret': savedPassword
              }
            });
            
            const data = await response.json();
            
            if (data.ok) {
              setAuthed(true);
              setSessions(data.sessions || []);
              setError(null);
              
              if (data.sessions?.length > 0) {
                setSelectedSessionId(data.sessions[0].id);
              }
            }
          }
        } catch {
          // Errore silenzioso
        }
      }, 1000);
      
    } catch {
      setError('Errore connessione durante setup database');
    } finally {
      setSetupLoading(false);
    }
  };
  
  const publicUrl = currentSession ? generatePublicUrl(currentSession.token) : '';
  
  // Mostra loading durante l'inizializzazione per evitare il flash della pagina di login
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full border border-white/20 text-center">
          <h1 className="text-2xl font-bold mb-6 text-white">🎵 Richieste Libere</h1>
          <div className="text-white/80">
            <div className="text-3xl mb-4">⏳</div>
            <p>Verifica autenticazione...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full border border-white/20 text-center">
          <h1 className="text-2xl font-bold mb-6 text-white">🎵 Richieste Libere</h1>
          
          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded mb-4 backdrop-blur-sm">
              {error}
              {schemaError && (
                <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400 rounded backdrop-blur-sm text-left">
                  <h4 className="font-medium text-blue-200 mb-2">🔧 Configurazione Database</h4>
                  <button
                    onClick={setupDatabase}
                    disabled={setupLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded mr-3 mb-2"
                  >
                    {setupLoading ? '⏳ Verifica...' : '🚀 Verifica Database'}
                  </button>
                  <button
                    onClick={checkMigration}
                    disabled={migrationLoading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded mr-3 mb-2"
                  >
                    {migrationLoading ? '⏳ Controllo...' : '⚡ Controlla Migrazione Rate Limiting'}
                  </button>
                  <div className="text-sm text-blue-200 bg-blue-600/20 p-2 rounded border-l-4 border-blue-400">
                    <strong>Setup Manuale:</strong><br/>
                    1. Vai su <strong>Supabase Dashboard</strong><br/>
                    2. Clicca <strong>SQL Editor</strong><br/>
                    3. Incolla il contenuto di <code className="bg-white/20 px-1 rounded">docs/richieste_libere_schema.sql</code><br/>
                    4. Clicca <strong>Run</strong>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-blue-500/20 border border-blue-400 text-blue-100 px-4 py-3 rounded backdrop-blur-sm">
            <p className="font-medium">Accesso richiesto</p>
            <p className="text-sm mt-1">Effettua il login per accedere al pannello richieste libere</p>
            <a 
              href="/dj/login" 
              className="inline-block mt-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Vai al Login
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-2 md:p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-4 md:p-6 mb-4 md:mb-6 border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-white">
              🎵 Pannello Richieste Libere
              {eventMode && <span className="text-lg font-normal text-blue-200 ml-2">- Modalità Evento</span>}
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setEventMode(!eventMode)}
                className={`px-4 py-2 rounded-lg transition-colors backdrop-blur-sm border font-medium ${
                  eventMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
                    : 'bg-white/20 hover:bg-white/30 text-white border-white/30'
                }`}
              >
                {eventMode ? '⚙️ Vista Completa' : '🎧 Modalità Evento'}
              </button>
              
              <Link
                href="/"
                className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-colors backdrop-blur-sm font-medium inline-flex items-center gap-2"
                title="Vai alla homepage"
              >
                🏠 Home
              </Link>
              
              <button
                onClick={() => setAuthed(false)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Session Selection */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4 items-stretch sm:items-center mb-4">
            <select
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                if (e.target.value) loadSessionData(e.target.value);
              }}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"
            >
              <option value="" className="text-gray-800">Seleziona sessione...</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id} className="text-gray-800">
                  {session.name} ({SESSION_STATUS_LABELS[session.status]}){session.homepage_visible ? ' 🏠 Home' : ''}
                </option>
              ))}
            </select>
            
            {!eventMode && (
              <>
                <button
                  onClick={() => setShowCreateSession(!showCreateSession)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg"
                >
                  + Nuova
                </button>
                
                {selectedSessionId && (
                  <button
                    onClick={() => handleDeleteSession(selectedSessionId)}
                    disabled={loading}
                    className={`px-4 py-2 text-white rounded-lg transition-colors shadow-lg ${
                      loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {loading ? '⏳ Eliminando...' : '🗑️ Elimina'}
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Create Session Form - Solo se NON in modalità evento */}
          {!eventMode && showCreateSession && (
            <div className="border border-white/20 rounded-lg p-4 bg-white/10 backdrop-blur-sm mb-4 shadow-lg">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nome sessione..."
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-white/30 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => adminAction('create_session', { session_name: newSessionName })}
                    disabled={!newSessionName.trim() || loading}
                    className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg shadow-lg transition-colors text-sm sm:text-base"
                  >
                    {loading ? '⏳ Creando...' : 'Crea'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateSession(false);
                      setNewSessionName('');
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors text-sm sm:text-base"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
        </div>
        
        {currentSession && (
          <>
            {/* Header Modalità Evento - Semplificato */}
            {eventMode && (
              <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{currentSession.name}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        currentSession.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {SESSION_STATUS_LABELS[currentSession.status]}
                      </span>
                      <button
                        onClick={() => adminAction('toggle_status')}
                        className={`py-2 px-4 rounded-lg text-white font-medium transition-colors shadow-sm ${
                          currentSession.status === 'active' 
                            ? 'bg-orange-600 hover:bg-orange-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {currentSession.status === 'active' ? '⏸️ Pausa' : '▶️ Attiva'}
                      </button>
                    </div>
                  </div>
                  {showArchive && (
                    <div className="text-right">
                      <button
                        onClick={() => {
                          setShowArchive(false);
                          loadSessionData(selectedSessionId);
                        }}
                        className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                      >
                        📋 Vista Normale
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Controls - Solo se NON in modalità evento */}
            {!eventMode && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{currentSession.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentSession.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {SESSION_STATUS_LABELS[currentSession.status]}
                  </span>
                </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                <button
                  onClick={() => adminAction('toggle_status')}
                  className={`py-3 px-4 rounded-lg text-white font-medium transition-colors shadow-lg ${
                    currentSession.status === 'active' 
                      ? 'bg-orange-600 hover:bg-orange-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {currentSession.status === 'active' ? '⏸️ Pausa' : '▶️ Attiva'}
                </button>
                
                <button
                  onClick={() => {
                    if (showArchive) {
                      setShowArchive(false);
                      loadSessionData(selectedSessionId); // Ricarica richieste normali
                    } else {
                      setShowArchive(true);
                      loadArchivedRequests(selectedSessionId); // Carica archivio
                    }
                  }}
                  disabled={loading}
                  className={`py-3 px-4 rounded-lg text-white font-medium shadow-lg transition-colors ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : showArchive 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {loading 
                    ? '⏳ Caricando...' 
                    : showArchive 
                      ? '📋 Vista Normale' 
                      : '📁 Visualizza Archivio'
                  }
                </button>
                
                <button
                  onClick={exportToCSV}
                  disabled={requests.length === 0}
                  className={`py-3 px-4 rounded-lg text-white font-medium shadow-lg transition-colors ${
                    requests.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                  title={`Esporta ${requests.length} richieste ${showArchive ? 'archiviate' : 'attive'} in CSV`}
                >
                  📥 Esporta CSV
                </button>
                
                <button
                  onClick={() => adminAction('soft_reset')}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-colors"
                >
                  🗂️ Reset Morbido
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('ATTENZIONE: Eliminerà definitivamente tutte le richieste. Continuare?')) {
                      adminAction('hard_reset');
                    }
                  }}
                  className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg transition-colors"
                >
                  🗑️ Reset Duro
                </button>
                
                <button
                  onClick={() => adminAction('regenerate_token')}
                  className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-lg transition-colors"
                >
                  🔄 Rigenera Token
                </button>
                
                {selectedSessionId && (
                  <button
                    onClick={toggleHomepageVisibility}
                    disabled={loading}
                    className={`py-3 px-4 rounded-lg font-medium shadow-lg transition-colors ${
                      homepageVisible
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-pink-600 hover:bg-pink-700 text-white'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={homepageVisible ? 'Rimuovi dalla homepage' : 'Aggiungi alla homepage'}
                  >
                    {homepageVisible ? '🏠 Su Home ✓' : '🏠 Aggiungi a Home'}
                  </button>
                )}
              </div>
              
              {/* Catalog Selection Controls */}
              {selectedSessionId && (
                <div className="border border-gray-300 rounded-lg p-4 mb-6 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">🎵 Catalogo Musicale</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => switchCatalog('deezer')}
                        disabled={loading || currentSession?.catalog_type === 'deezer'}
                        className={`py-2 px-4 rounded-lg font-medium shadow transition-colors ${
                          currentSession?.catalog_type === 'deezer'
                            ? 'bg-blue-600 text-white cursor-not-allowed'
                            : 'bg-gray-200 hover:bg-blue-500 hover:text-white text-gray-700'
                        }`}
                      >
                        🎧 Deezer {currentSession?.catalog_type === 'deezer' && '✓'}
                      </button>
                      
                      <button
                        onClick={() => switchCatalog('tidal')}
                        disabled={loading || currentSession?.catalog_type === 'tidal'}
                        className={`py-2 px-4 rounded-lg font-medium shadow transition-colors ${
                          currentSession?.catalog_type === 'tidal'
                            ? 'bg-purple-600 text-white cursor-not-allowed'
                            : 'bg-gray-200 hover:bg-purple-500 hover:text-white text-gray-700'
                        }`}
                      >
                        🎶 Tidal {currentSession?.catalog_type === 'tidal' && '✓'}
                      </button>
                    </div>
                    
                    {currentSession?.catalog_type === 'tidal' && (
                      <div className="border-t border-gray-300 pt-4 mt-4">
                        {currentSession?.tidal_access_token ? (
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <span className="text-lg">✅</span>
                            <span className="font-medium">Autenticato con Tidal</span>
                            {currentSession?.tidal_user_id && (
                              <span className="text-gray-600 ml-2">
                                (User ID: {currentSession.tidal_user_id})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-orange-700 mb-3 flex items-center gap-2">
                              <span className="text-lg">⚠️</span>
                              <span>Accedi a Tidal per abilitare le funzioni playlist</span>
                            </p>
                            <button
                              onClick={initTidalAuth}
                              disabled={loading}
                              className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow transition-colors disabled:opacity-50"
                            >
                              🔐 Accedi a Tidal
                            </button>
                          </div>
                        )}
                        
                        {currentSession?.tidal_playlist_id && (
                          <p className="text-sm text-gray-600 mt-3">
                            📋 Playlist: <span className="font-mono text-xs">{currentSession.tidal_playlist_id}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Rate Limiting Controls */}
              <div className="border border-gray-300 rounded-lg p-4 mb-6 bg-gray-50">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">⏱️ Controllo Rate Limiting</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-gray-800 font-medium">
                      <input
                        type="checkbox"
                        checked={currentSession?.rate_limit_enabled !== false}
                        onChange={(e) => {
                          adminAction('update_rate_limit', {
                            rate_limit_enabled: e.target.checked,
                            rate_limit_seconds: currentSession?.rate_limit_seconds || 60
                          });
                        }}
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                      Abilita rate limiting
                    </label>
                  </div>
                  
                  {currentSession?.rate_limit_enabled !== false && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                      <label className="text-gray-800 font-medium whitespace-nowrap">Secondi tra richieste:</label>
                      <select
                        value={currentSession?.rate_limit_seconds || 60}
                        onChange={(e) => {
                          adminAction('update_rate_limit', {
                            rate_limit_enabled: currentSession?.rate_limit_enabled !== false,
                            rate_limit_seconds: parseInt(e.target.value)
                          });
                        }}
                        className="px-3 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      >
                        <option value={5} className="text-gray-900">5 secondi</option>
                        <option value={10} className="text-gray-900">10 secondi</option>
                        <option value={30} className="text-gray-900">30 secondi</option>
                        <option value={60} className="text-gray-900">60 secondi (default)</option>
                        <option value={120} className="text-gray-900">2 minuti</option>
                        <option value={300} className="text-gray-900">5 minuti</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="text-sm font-medium p-3 rounded-lg border-l-4 bg-white">
                    {currentSession?.rate_limit_enabled === false 
                      ? <span className="text-orange-700 border-orange-400">⚠️ Gli utenti possono inviare richieste senza limitazioni</span>
                      : <span className="text-green-700 border-green-400">✅ Gli utenti devono attendere <strong>{currentSession?.rate_limit_seconds || 60} secondi</strong> tra le richieste</span>
                    }
                  </div>
                </div>
              </div>
              
              {/* Notes Control */}
              <div className="border border-gray-300 rounded-lg p-4 mb-6 bg-gray-50">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">💬 Controllo Note/Commenti</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-gray-800 font-medium">
                      <input
                        type="checkbox"
                        checked={currentSession?.notes_enabled !== false}
                        onChange={(e) => {
                          adminAction('update_notes_control', {
                            notes_enabled: e.target.checked
                          });
                        }}
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                      Abilita note/commenti degli utenti
                    </label>
                  </div>
                  
                  <div className="text-sm font-medium p-3 rounded-lg border-l-4 bg-white">
                    {currentSession?.notes_enabled === false 
                      ? <span className="text-orange-700 border-orange-400">⚠️ Gli utenti non possono lasciare note o dediche</span>
                      : <span className="text-green-700 border-green-400">✅ Gli utenti possono lasciare note e dediche opzionali</span>
                    }
                  </div>
                </div>
              </div>

              {/* Event Code Control */}
              <div className="border border-gray-300 rounded-lg p-4 mb-6 bg-gray-50">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">🎫 Controllo Codice Evento</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-gray-800 font-medium">
                      <input
                        type="checkbox"
                        checked={currentSession?.require_event_code === true}
                        onChange={(e) => {
                          adminAction('update_event_code_control', {
                            require_event_code: e.target.checked
                          });
                        }}
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                      Richiedi codice evento
                    </label>
                  </div>
                  
                  <div className="text-sm font-medium p-3 rounded-lg border-l-4 bg-white">
                    {currentSession?.require_event_code === true 
                      ? <span className="text-green-700 border-green-400">🔒 Gli utenti devono inserire il codice evento per inviare richieste</span>
                      : <span className="text-blue-700 border-blue-400">📖 Il codice evento è opzionale per gli utenti</span>
                    }
                  </div>

                  {/* Campo per impostare codice evento corrente */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Codice Evento Corrente
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={currentEventCodeInput}
                        onChange={(e) => setCurrentEventCodeInput(e.target.value.toUpperCase())}
                        placeholder="es. EVENTO2025"
                        className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-black"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            adminAction('set_current_event_code', {
                              current_event_code: currentEventCodeInput.trim() || null
                            });
                          }}
                          disabled={loading}
                          className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm font-medium"
                        >
                          Salva
                        </button>
                        {currentSession?.current_event_code && (
                          <button
                            onClick={() => {
                              setCurrentEventCodeInput('');
                              adminAction('set_current_event_code', {
                                current_event_code: null
                              });
                            }}
                            disabled={loading}
                            className="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 text-sm font-medium"
                          >
                            Rimuovi
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {currentSession?.current_event_code 
                        ? `Codice attuale: ${currentSession.current_event_code}` 
                        : 'Nessun codice evento impostato'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Link & QR */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(publicUrl)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-colors"
                  >
                    📋 Copia Link
                  </button>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-lg transition-colors"
                  >
                    📱 {showQR ? 'Nascondi' : 'Mostra'} QR
                  </button>
                </div>
                
                {showQR && (
                  <div className="text-center bg-gray-50 p-6 rounded-lg border-2 border-gray-300">
                    <Image 
                      src={generateQRCodeUrl(publicUrl)} 
                      alt="QR Code" 
                      width={400}
                      height={400}
                      className="mx-auto border-4 border-white rounded-xl shadow-lg" 
                    />
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-600 font-medium">Scansiona per accedere alle richieste</p>
                      <a 
                        href={generateQRCodeUrl(publicUrl)}
                        download="qr-code-richieste.png"
                        className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        💾 Scarica QR Code
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
            
            {/* Stats - Solo se NON in modalità evento */}
            {!eventMode && stats && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-gray-800">📊 Statistiche</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{stats.total}</div>
                    <div className="text-gray-700 font-medium">Totali</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-1">{stats.lastHour}</div>
                    <div className="text-gray-700 font-medium">Ultima ora</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="font-semibold mb-3 text-gray-800">Top 3 richieste:</div>
                    {stats.topRequests.length > 0 ? (
                      <div className="space-y-2">
                        {stats.topRequests.map((req, i) => (
                          <div key={i} className="text-sm bg-white p-2 rounded border">
                            <span className="font-medium text-gray-900">{req.title}</span>
                            {req.artists && <span className="text-gray-600"> - {req.artists}</span>}
                            <span className="text-blue-600 font-semibold"> ({req.count}x)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm italic">Nessuna richiesta</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Requests List */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                📝 {showArchive ? 'Archivio Richieste' : 'Richieste'} ({filteredRequests.length}{requests.length !== filteredRequests.length ? ` di ${requests.length}` : ''})
                {showArchive && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (Visualizzazione sola lettura)
                  </span>
                )}
              </h2>
              
              {/* Toggle Ordinamento Priorità */}
              <div className="mb-4 flex justify-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔥 Ordinamento
                  </label>
                  <button
                    onClick={() => setSortByPriority(!sortByPriority)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm flex items-center gap-2 ${
                      sortByPriority
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title={sortByPriority 
                      ? 'Ordinamento per priorità attivo: score alto e richieste recenti in cima' 
                      : 'Clicca per ordinare per priorità (voti e tempo)'}
                  >
                    <span>{sortByPriority ? '⚡' : '📅'}</span>
                    <span>{sortByPriority ? 'Priorità ON' : 'Cronologico'}</span>
                  </button>
                </div>
              </div>
              
              {filteredRequests.length === 0 ? (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-4xl mb-2">🎵</div>
                  <div className="font-medium">
                    {showArchive ? 'Nessuna richiesta archiviata' : 'Nessuna richiesta presente'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className={`border rounded-lg p-4 transition-colors ${
                        showArchive 
                          ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' // Colore diverso per archivio
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'     // Colore normale
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-lg text-gray-900">{request.title}</div>
                            {/* Badge contatore richieste multiple */}
                            {(request.request_count ?? 1) > 1 && (
                              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                                +{request.request_count}
                              </span>
                            )}
                          </div>
                          {request.artists && (
                            <div className="text-gray-700 font-medium">{request.artists}</div>
                          )}
                          {request.album && (
                            <div className="text-gray-600 text-sm">{request.album}</div>
                          )}
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[request.status]}`}>
                            {STATUS_LABELS[request.status]}
                          </span>
                          
                          {/* Tidal Status Flag */}
                          {currentSession?.catalog_type === 'tidal' && request.status === 'accepted' && (
                            <div className="mt-1">
                              {request.tidal_added_status === 'success' && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                  ✅ In Playlist
                                </span>
                              )}
                              {request.tidal_added_status === 'pending' && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                  ⏳ In aggiunta...
                                </span>
                              )}
                              {request.tidal_added_status === 'failed' && (
                                <div className="flex flex-col gap-1 items-end">
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                    ❌ Errore Tidal
                                  </span>
                                  <button
                                    onClick={() => retryTidalAdd(request.id)}
                                    disabled={loading}
                                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                    title={request.tidal_error_message || 'Riprova ad aggiungere alla playlist'}
                                  >
                                    🔄 Riprova
                                  </button>
                                  {request.tidal_retry_count && request.tidal_retry_count > 0 && (
                                    <span className="text-xs text-gray-500">
                                      (Tentativi: {request.tidal_retry_count})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Contatori voti */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              👍 {request.up_votes || 0}
                            </span>
                            <span className="flex items-center gap-1 text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              👎 {request.down_votes || 0}
                            </span>
                            {sortByPriority && (
                              <span className="flex items-center gap-1 text-sm bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full" title="Score (up - down)">
                                ⚡ {calculateScore(request.up_votes || 0, request.down_votes || 0)}
                              </span>
                            )}
                          </div>
                          
                          {request.duration_ms && (
                            <div className="text-gray-600 text-sm mt-1 font-medium">
                              ⏱️ {formatDuration(request.duration_ms)}
                            </div>
                          )}
                          {showArchive && (
                            <div className="text-amber-600 text-xs mt-1 font-medium">
                              📁 Archiviata
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className={`text-sm text-gray-600 mb-3 p-3 rounded border ${
                        showArchive ? 'bg-amber-25 border-amber-200' : 'bg-white border-gray-200'
                      }`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div><strong>📅 Data:</strong> {formatDateTime(request.created_at)}</div>
                          {request.requester_name && (
                            <div><strong>👤 Richiedente:</strong> {request.requester_name}</div>
                          )}
                          <div><strong>🔍 Fonte:</strong> {request.source === 'deezer' ? 'Deezer' : request.source === 'spotify' ? 'Spotify' : 'Manuale'}</div>
                          <div><strong>🌐 IP:</strong> {request.client_ip}</div>
                          {request.event_code && (
                            <div className="col-span-1 sm:col-span-2">
                              <strong>🎫 Codice Evento:</strong> 
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {request.event_code}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Messaggio/nota del richiedente - SEMPRE VISIBILE */}
                      {request.note && (
                        <div className={`mb-3 text-sm border p-4 rounded-lg shadow-sm ${
                          showArchive 
                            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                            : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
                        }`}>
                          <div className={`flex items-center gap-2 font-semibold mb-2 ${
                            showArchive ? 'text-amber-800' : 'text-purple-800'
                          }`}>
                            💌 Messaggio dal richiedente
                            {request.requester_name && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                showArchive ? 'bg-amber-100' : 'bg-purple-100'
                              }`}>
                                da {request.requester_name}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-800 italic leading-relaxed">
                            &ldquo;{request.note}&rdquo;
                          </div>
                        </div>
                      )}
                      
                      {/* Pulsanti azione - SOLO se NON stiamo visualizzando l'archivio */}
                      {!showArchive && (
                        <div className="flex gap-2 flex-wrap">
                          {/* Pulsante ACCETTA - sempre visibile, evidenziato se attivo */}
                          <button
                            onClick={() => act(request.id, 'accepted')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
                              request.status === 'accepted'
                                ? 'bg-green-600 ring-4 ring-green-400 ring-offset-2 ring-offset-gray-100 text-white scale-105'
                                : 'bg-green-500/30 hover:bg-green-600 text-green-800 hover:text-white border-2 border-green-600'
                            }`}
                          >
                            ✅ Accetta
                          </button>
                          
                          {/* Pulsante RIFIUTA - sempre visibile, evidenziato se attivo */}
                          <button
                            onClick={() => act(request.id, 'rejected')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
                              request.status === 'rejected'
                                ? 'bg-red-600 ring-4 ring-red-400 ring-offset-2 ring-offset-gray-100 text-white scale-105'
                                : 'bg-red-500/30 hover:bg-red-600 text-red-800 hover:text-white border-2 border-red-600'
                            }`}
                          >
                            ❌ Rifiuta
                          </button>
                          
                          {/* Pulsante SUONATA - sempre visibile, evidenziato se attivo */}
                          <button
                            onClick={() => act(request.id, 'played')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
                              request.status === 'played'
                                ? 'bg-purple-600 ring-4 ring-purple-400 ring-offset-2 ring-offset-gray-100 text-white scale-105'
                                : 'bg-purple-500/30 hover:bg-purple-600 text-purple-800 hover:text-white border-2 border-purple-600'
                            }`}
                          >
                            🎵 Suonata
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}