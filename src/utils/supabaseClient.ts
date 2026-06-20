import { createClient } from '@supabase/supabase-js';
import type { Trade } from '../types';

export function getSupabaseConfig() {
  const url = localStorage.getItem('traders_diary_sb_url') || '';
  const key = localStorage.getItem('traders_diary_sb_key') || '';
  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig();
  return url.trim() !== '' && key.trim() !== '';
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
    if (action === 'insert') {
      const { error } = await client.from(table).insert([trade]);
      if (error) console.error('Supabase Cloud Sync Insert Error:', error);
    } else if (action === 'update') {
      const { error } = await client.from(table).update(trade).eq('id', trade.id);
      if (error) console.error('Supabase Cloud Sync Update Error:', error);
    } else if (action === 'delete') {
      const { error } = await client.from(table).delete().eq('id', trade.id);
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
    const { data, error } = await client
      .from('trades')
      .select('*');
      
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
    const { error } = await client.from(table).upsert({ key, value });
    if (error) console.error(`Supabase Sync Meta Error (${key}):`, error);
  } catch (e) {
    console.error(`Network error during Supabase sync of ${key}:`, e);
  }
}

export async function fetchMetaFromCloud(key: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('traders_diary_meta')
      .select('value')
      .eq('key', key)
      .single();
      
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error(`Supabase Fetch Meta Error (${key}):`, error);
      }
      return null;
    }
    return data?.value || null;
  } catch (e) {
    console.error(`Network error during Supabase fetch of ${key}:`, e);
    return null;
  }
}
