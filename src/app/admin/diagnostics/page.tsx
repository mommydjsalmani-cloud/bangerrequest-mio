"use client";
import { useEffect, useState } from 'react';

type Health = {
  ok: boolean;
  mode?: string;
  error?: string;
  tables?: { requests: boolean; events: boolean };
  hasUrl?: boolean;
  hasServiceRole?: boolean;
  hasAnon?: boolean;
  hint?: string;
};

export default function DiagnosticsPage() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    fetch('/api/health/supabase').then(r => r.json()).then(j => { if (!aborted){ setData(j); setLoading(false);} }).catch(e => { if(!aborted){ setErr(e.message); setLoading(false);} });
    return () => { aborted = true; };
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Diagnostics</h1>
      <p style={{ color: '#555' }}>Stato persistenza e tabelle.</p>
      {loading && <p>Caricamento...</p>}
      {err && <p style={{ color: 'red' }}>Errore: {err}</p>}
      {data && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem', background: '#fafafa' }}>
          <p><strong>Mode:</strong> {data.mode || 'n/d'}</p>
          <p><strong>OK:</strong> {String(data.ok)}</p>
          {!data.ok && data.error && <p><strong>Errore:</strong> {data.error}</p>}
          {data.hint && <p style={{ fontSize: '.9rem', color: '#666' }}>{data.hint}</p>}
          {data.tables && (
            <div style={{ marginTop: '.5rem' }}>
              <strong>Tabelle:</strong>
              <ul style={{ margin: '.3rem 0 .5rem 1.2rem' }}>
                <li>requests: {data.tables.requests ? '✓' : '✗'}</li>
                <li>events: {data.tables.events ? '✓' : '✗'}</li>
              </ul>
            </div>
          )}
          {!data.ok && (
            <div style={{ marginTop: '.5rem' }}>
              <strong>Variabili presenti:</strong>
              <ul style={{ margin: '.3rem 0 .5rem 1.2rem' }}>
                <li>NEXT_PUBLIC_SUPABASE_URL: {data.hasUrl ? '✅' : '❌'}</li>
                <li>SUPABASE_SERVICE_ROLE_KEY: {data.hasServiceRole ? '✅' : '❌'}</li>
                <li>Anon key (opzionale): {data.hasAnon ? '✅' : '—'}</li>
              </ul>
            </div>
          )}
        </section>
      )}
      <details style={{ marginTop: '1.5rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Come attivo Supabase?</summary>
        <ol style={{ marginTop: '.6rem', lineHeight: 1.5 }}>
          <li>Crea progetto su Supabase (Free ok).</li>
          <li>Settings → API: copia Project URL e service_role key.</li>
          <li>Vercel → Settings → Environment Variables: aggiungi le due variabili.</li>
          <li>Supabase → SQL: esegui `docs/supabase_schema.sql`.</li>
          <li>Redeploy dell&apos;app.</li>
          <li>Riapri questa pagina: deve mostrare mode: <code>supabase</code>.</li>
        </ol>
      </details>
    </main>
  );
}
