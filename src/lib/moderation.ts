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

const moderation = { acceptRequest, rejectRequest };
export default moderation;
