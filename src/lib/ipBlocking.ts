import { NextRequest } from 'next/server';
import { getSupabase } from './supabase';

export interface BlockedIP {
  id: number;
  ip_address: string;
  reason: string | null;
  blocked_at: string;
  blocked_by: string | null;
  created_at: string;
}

/**
 * Estrae l'IP del client dalla richiesta
 */
export function getClientIP(request: NextRequest | Request): string {
  // Prova headers comuni per IP forwarding
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for può contenere più IP separati da virgola
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback per sviluppo locale
  return '127.0.0.1';
}

/**
 * Controlla se un IP è bloccato
 */
export async function isIPBlocked(ip: string): Promise<{ blocked: boolean; reason?: string; blockedBy?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { blocked: false };
    }
    
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('reason, blocked_by')
      .eq('ip_address', ip)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking blocked IP:', error);
      return { blocked: false };
    }
    
    if (data) {
      return {
        blocked: true,
        reason: data.reason || 'Nessun motivo specificato',
        blockedBy: data.blocked_by || 'Sconosciuto'
      };
    }
    
    return { blocked: false };
  } catch (error) {
    console.error('Error in isIPBlocked:', error);
    return { blocked: false };
  }
}

/**
 * Blocca un IP
 */
export async function blockIP(ip: string, reason: string, blockedBy: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Database non disponibile' };
    }
    
    const { error } = await supabase
      .from('blocked_ips')
      .insert({
        ip_address: ip,
        reason: reason.trim() || null,
        blocked_by: blockedBy.trim() || null
      });
    
    if (error) {
      console.error('Error blocking IP:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in blockIP:', error);
    return { success: false, error: 'Errore interno' };
  }
}

/**
 * Sblocca un IP
 */
export async function unblockIP(ip: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Database non disponibile' };
    }
    
    const { error } = await supabase
      .from('blocked_ips')
      .delete()
      .eq('ip_address', ip);
    
    if (error) {
      console.error('Error unblocking IP:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in unblockIP:', error);
    return { success: false, error: 'Errore interno' };
  }
}

/**
 * Ottiene tutti gli IP bloccati
 */
export async function getBlockedIPs(): Promise<{ success: boolean; data?: BlockedIP[]; error?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Database non disponibile' };
    }
    
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('blocked_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching blocked IPs:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getBlockedIPs:', error);
    return { success: false, error: 'Errore interno' };
  }
}