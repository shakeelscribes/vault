'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { Search, Trash2, Tag, Flag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({ search: search || undefined });
      setTransactions(res.transactions || []);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadTransactions();
    api.getCategories().then(setCategories).catch(console.error);
  }, [loadTransactions]);

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.deleteTransaction(id);
      toast.success('Transaction deleted');
      loadTransactions();
    } catch (err) {
      toast.error('Failed to delete transaction');
    }
  }

  return (
    <div className="mobile-page" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Transaction History</h1>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="input"
          placeholder="Search merchant..."
          style={{ paddingLeft: '38px' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="skeleton" style={{ height: '64px' }} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No transactions found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {transactions.map((t) => (
            <div key={t.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>{t.categories?.emoji || '📦'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {t.merchant || 'Transaction'}
                    {t.is_flagged && <Flag size={14} color="var(--warning)" style={{ marginLeft: '6px', display: 'inline' }} />}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t.transaction_date} • {t.payment_mode.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div className={`amount ${t.type === 'debit' ? 'text-debit' : 'text-credit'}`} style={{ fontWeight: 700 }}>
                    {t.type === 'debit' ? '-' : '+'}₹{Number(t.amount).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {t.source}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={loadTransactions}
        categories={categories}
      />

      <BottomNav onOpenManualEntry={() => setIsManualModalOpen(true)} />
    </div>
  );
}
