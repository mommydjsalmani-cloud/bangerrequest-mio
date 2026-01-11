// Thin wrapper per la logica di moderazione usata dal pannello DJ
import { getSupabase } from './supabase';

export async function acceptRequest(requestId: string) {
  const supabase = getSupabase();
  if (supabase) {
    // Prima prova nel sistema libere
    const { data: libereRequest } = await supabase
      .from('richieste_libere')
      .select('id')
      .eq('id', requestId)
      .single();
    
    if (libereRequest) {
      // È una richiesta del sistema libere
      const { error } = await supabase
        .from('richieste_libere')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      if (error) throw new Error(`Accept failed (libere): ${error.message}`);
      return { ok: true };
    }
    
    // Fallback al sistema requests tradizionale
    const { error } = await supabase
      .from('requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    if (error) throw new Error(`Accept failed: ${error.message}`);
    return { ok: true };
  } else {
    // Fallback per storage in memoria (development)
    console.log(`Would accept request: ${requestId}`);
    return { ok: true };
  }
}

export async function rejectRequest(requestId: string) {
  const supabase = getSupabase();
  if (supabase) {
    // Prima prova nel sistema libere
    const { data: libereRequest } = await supabase
      .from('richieste_libere')
      .select('id')
      .eq('id', requestId)
      .single();
    
    if (libereRequest) {
      // È una richiesta del sistema libere
      const { error } = await supabase
        .from('richieste_libere')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      if (error) throw new Error(`Reject failed (libere): ${error.message}`);
      return { ok: true };
    }
    
    // Fallback al sistema requests tradizionale
    const { error } = await supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
    if (error) throw new Error(`Reject failed: ${error.message}`);
    return { ok: true };
  } else {
    // Fallback per storage in memoria (development)
    console.log(`Would reject request: ${requestId}`);
    return { ok: true };
  }
}

/**
 * Segna una richiesta come "played" (suonata).
 * La richiesta esce dalle liste attive DJ ma resta visibile lato utente.
 * I voti vengono disabilitati.
 */
export async function markAsPlayed(requestId: string) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Database non configurato');
  }
  
  // Verifica che la richiesta esista nel sistema libere
  const { data: libereRequest, error: fetchError } = await supabase
    .from('richieste_libere')
    .select('id, status')
    .eq('id', requestId)
    .single();
  
  if (fetchError || !libereRequest) {
    throw new Error('Richiesta non trovata');
  }
  
  // Se è già played, non fare nulla
  if (libereRequest.status === 'played') {
    return { ok: true, alreadyPlayed: true };
  }
  
  // Aggiorna lo stato a played
  const { error } = await supabase
    .from('richieste_libere')
    .update({ 
      status: 'played',
      played_at: new Date().toISOString()
    })
    .eq('id', requestId);
  
  if (error) {
    throw new Error(`Mark as played failed: ${error.message}`);
  }
  
  return { ok: true };
}

const moderation = { acceptRequest, rejectRequest, markAsPlayed };
export default moderation;
