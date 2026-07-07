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

function prepareTradeForCloud(trade: any, userId: string) {
  const metadata = {
    broker: trade.broker,
    brokerAccountId: trade.brokerAccountId,
    useManualCharges: trade.useManualCharges,
    manualBrokerage: trade.manualBrokerage,
    manualTaxes: trade.manualTaxes,
    exitDate: trade.exitDate
  };

  let cleanNotes = trade.notes || '';
  if (cleanNotes.includes('---METADATA---')) {
    cleanNotes = cleanNotes.split('---METADATA---')[0].trim();
  }

  const syncedNotes = (cleanNotes + '\n---METADATA---\n' + JSON.stringify(metadata)).trim();

  return {
    id: trade.id,
    user_id: userId,
    date: trade.date,
    entrytime: trade.entryTime,
    exittime: trade.exitTime,
    segment: trade.segment,
    product: trade.product,
    action: trade.action,
    symbol: trade.symbol,
    qty: trade.qty,
    entryprice: trade.entryPrice,
    exitprice: trade.exitPrice,
    slippagepoints: trade.slippagePoints,
    stoploss: trade.stopLoss,
    target: trade.target,
    strategy: trade.strategy,
    rulesfollowed: trade.rulesFollowed,
    emotion: trade.emotion,
    mistake: trade.mistake,
    notes: syncedNotes,
    isexpiryday: trade.isExpiryDay,
    durationminutes: trade.durationMinutes,
    grosspnl: trade.grossPnL,
    brokerage: trade.brokerage,
    taxes: trade.taxes,
    netpnl: trade.netPnL,
    roi: trade.roi,
    actualrr: trade.actualRR,
    tags: trade.tags || []
  };
}

function parseTradeFromCloud(dbRow: any): Trade {
  let notes = dbRow.notes || '';
  let metadata: any = {};

  if (notes.includes('---METADATA---')) {
    const parts = notes.split('---METADATA---');
    notes = parts[0].trim();
    try {
      metadata = JSON.parse(parts[1].trim());
    } catch (e) {
      console.warn("Failed to parse trade metadata from notes:", e);
    }
  }

  return {
    id: dbRow.id,
    date: dbRow.date,
    entryTime: dbRow.entrytime || '',
    exitTime: dbRow.exittime || '',
    exitDate: metadata.exitDate || dbRow.exitdate || undefined,
    segment: dbRow.segment,
    product: dbRow.product,
    action: dbRow.action,
    symbol: dbRow.symbol,
    qty: Number(dbRow.qty),
    entryPrice: Number(dbRow.entryprice),
    exitPrice: Number(dbRow.exitprice),
    slippagePoints: Number(dbRow.slippagepoints || 0),
    stopLoss: Number(dbRow.stoploss || 0),
    target: Number(dbRow.target || 0),
    strategy: dbRow.strategy || '',
    rulesFollowed: dbRow.rulesfollowed || [],
    emotion: dbRow.emotion || 'Neutral',
    mistake: dbRow.mistake || 'None',
    notes: notes,
    isExpiryDay: !!dbRow.isexpiryday,
    durationMinutes: Number(dbRow.durationminutes || 0),
    grossPnL: Number(dbRow.grosspnl || 0),
    brokerage: Number(dbRow.brokerage || 0),
    taxes: Number(dbRow.taxes || 0),
    netPnL: Number(dbRow.netpnl || 0),
    roi: Number(dbRow.roi || 0),
    actualRR: Number(dbRow.actualrr || 0),
    tags: dbRow.tags || [],
    broker: metadata.broker || 'Other',
    brokerAccountId: metadata.brokerAccountId || '',
    useManualCharges: !!metadata.useManualCharges,
    manualBrokerage: metadata.manualBrokerage !== undefined ? Number(metadata.manualBrokerage) : 0,
    manualTaxes: metadata.manualTaxes !== undefined ? Number(metadata.manualTaxes) : 0
  };
}

export async function syncTradeToCloud(action: 'insert' | 'update' | 'delete', trade: any) {
  const client = getSupabaseClient();
  if (!client) return;

  const table = 'trades';
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    if (action === 'insert') {
      const dbRow = prepareTradeForCloud(trade, user.id);
      const { error } = await client.from(table).insert([dbRow]);
      if (error) console.error('Supabase Cloud Sync Insert Error:', error);
    } else if (action === 'update') {
      const dbRow = prepareTradeForCloud(trade, user.id);
      const { error } = await client.from(table).update(dbRow).eq('id', trade.id).eq('user_id', user.id);
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
    return (data as any[]).map(parseTradeFromCloud);
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

export async function fetchMetaBatchFromCloud(): Promise<Record<string, any> | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('traders_diary_meta')
      .select('key, value')
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Supabase Fetch Meta Batch Error:', error);
      return null;
    }

    const batch: Record<string, any> = {};
    if (data) {
      data.forEach((row: any) => {
        batch[row.key] = row.value;
      });
    }
    return batch;
  } catch (e) {
    console.error('Network error during Supabase meta batch fetch:', e);
    return null;
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

export async function submitContactQuery(category: string, message: string) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase client not configured') };

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: new Error('User session not found') };

    const { error } = await client.from('contact_submissions').insert([
      {
        user_id: user.id,
        email: user.email || '',
        category,
        message
      }
    ]);

    if (error) {
      console.error('Supabase support submission error:', error);
      return { error };
    }
    return { error: null };
  } catch (e: any) {
    console.error('Network error during support query submission:', e);
    return { error: e };
  }
}

