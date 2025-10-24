// Thin wrapper per la logica di moderazione usata dal pannello DJ
import { getSupabase } from './supabase';

export async function acceptRequest(requestId: string) {
  const supabase = getSupabase();
  if (supabase) {
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
