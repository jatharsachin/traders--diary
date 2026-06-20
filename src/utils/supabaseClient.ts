import { createClient } from '@supabase/supabase-js';
import type { Trade } from '../types';

export function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig();
  return url.trim() !== '' && 
         key.trim() !== '' && 
         !url.includes('your-supabase') && 
         !key.includes('your-supabase');
}

let supabaseClientInstance: any = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClientInstance) {
    const { url, key } = getSupabaseConfig();
    try {
      supabaseClientInstance = createClient(url, key);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }
  return supabaseClientInstance;
}

export function clearSupabaseClientInstance() {
  supabaseClientInstance = null;
}

export async function syncTradeToCloud(action: 'insert' | 'update' | 'delete', trade: any) {
  const client = getSupabaseClient();
  if (!client) return;

  const table = 'trades';
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    if (action === 'insert') {
      const { error } = await client.from(table).insert([{ ...trade, user_id: user.id }]);
      if (error) console.error('Supabase Cloud Sync Insert Error:', error);
    } else if (action === 'update') {
      const { error } = await client.from(table).update(trade).eq('id', trade.id).eq('user_id', user.id);
      if (error) console.error('Supabase Cloud Sync Update Error:', error);
    } else if (action === 'delete') {
      const { error } = await client.from(table).delete().eq('id', trade.id).eq('user_id', user.id);
      if (error) console.error('Supabase Cloud Sync Delete Error:', error);
    }
  } catch (e) {
    console.error('Network error during Supabase sync:', e);
  }
}

export async function fetchTradesFromCloud(): Promise<Trade[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('trades')
      .select('*')
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Supabase Cloud Fetch Error:', error);
      return null;
    }
    return data as Trade[];
  } catch (e) {
    console.error('Network error during Supabase fetch:', e);
    return null;
  }
}

export async function syncMetaToCloud(key: string, value: any) {
  const client = getSupabaseClient();
  if (!client) return;

  const table = 'traders_diary_meta';
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const { error } = await client.from(table).upsert({ user_id: user.id, key, value });
    if (error) console.error(`Supabase Sync Meta Error (${key}):`, error);
  } catch (e) {
    console.error(`Network error during Supabase sync of ${key}:`, e);
  }
}

export async function fetchMetaFromCloud(key: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('traders_diary_meta')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle();
      
    if (error) {
      console.error(`Supabase Fetch Meta Error (${key}):`, error);
      return null;
    }
    return data?.value || null;
  } catch (e) {
    console.error(`Network error during Supabase fetch of ${key}:`, e);
    return null;
  }
}
