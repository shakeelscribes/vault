'use client';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function useRealtime({ userId, onTransaction, onAlert }) {
  useEffect(() => {
    if (!userId) return;

    // Subscribe to new/updated transactions
    const txnChannel = supabase
      .channel('vault-transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          const txn = payload.new;
          const sign = txn.type === 'debit' ? '-' : '+';
          const color = txn.type === 'debit' ? '#EF4444' : '#10B981';
          toast(
            `${sign}₹${Number(txn.amount).toLocaleString('en-IN')} ${txn.merchant || ''}`,
            { style: { background: '#16213E', color: '#F9FAFB', borderLeft: `4px solid ${color}` }, duration: 5000 }
          );
          if (onTransaction) onTransaction(txn, 'insert');
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (onTransaction) onTransaction(payload.new, 'update');
        }
      )
      .subscribe();

    // Subscribe to budget alerts
    const alertChannel = supabase
      .channel('vault-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'budget_alerts', filter: `user_id=eq.${userId}` },
        (payload) => {
          const alert = payload.new;
          const icon = alert.threshold === 100 ? '🚨' : '⚠️';
          toast(`${icon} Budget ${alert.threshold}% reached!`, {
            style: { background: '#16213E', color: '#F9FAFB', borderLeft: `4px solid ${alert.threshold === 100 ? '#EF4444' : '#F59E0B'}` },
            duration: 8000,
          });
          if (onAlert) onAlert(alert);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txnChannel);
      supabase.removeChannel(alertChannel);
    };
  }, [userId, onTransaction, onAlert]);
}
