'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { Search, Trash2, Tag, Flag, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['upi', 'card_pos', 'atm', 'neft', 'imps', 'rtgs', 'cash', 'other'];

export default function TransactionsPage() {
  useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    category_id: '',
    payment_mode: '',
    type: '',
    is_flagged: '',
    sort: 'date_desc',
  });

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search || undefined,
        limit: 100,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== '')
        ),
      };
      const res = await api.getTransactions(params);
      setTransactions(res.transactions || []);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

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

  function handleExport() {
    const url = api.exportCSV({
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
      search: search || undefined,
    });
    window.open(url, '_blank');
  }

  function clearFilters() {
    setFilters({
      start_date: '',
      end_date: '',
      category_id: '',
      payment_mode: '',
      type: '',
      is_flagged: '',
      sort: 'date_desc',
    });
  }

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== 'date_desc').length;

  return (
    <div className="mobile-page" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Transaction History</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowFilters(!showFilters)}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <Filter size={16} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <button className="btn btn-ghost" onClick={handleExport} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '0.9rem' }}>Filter Transactions</h3>
            {activeFilterCount > 0 && (
              <button className="btn btn-ghost" onClick={clearFilters} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>Clear</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={filters.start_date} onChange={(e) => setFilters(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={filters.end_date} onChange={(e) => setFilters(p => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Category</label>
              <select className="input" value={filters.category_id} onChange={(e) => setFilters(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select className="input" value={filters.payment_mode} onChange={(e) => setFilters(p => ({ ...p, payment_mode: e.target.value }))}>
                <option value="">All Modes</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Type</label>
              <select className="input" value={filters.type} onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}>
                <option value="">All Types</option>
                <option value="debit">Debit (Expense)</option>
                <option value="credit">Credit (Income)</option>
              </select>
            </div>
            <div>
              <label className="label">Sort By</label>
              <select className="input" value={filters.sort} onChange={(e) => setFilters(p => ({ ...p, sort: e.target.value }))}>
                <option value="date_desc">Date (Newest First)</option>
                <option value="date_asc">Date (Oldest First)</option>
                <option value="amount_desc">Amount (Highest First)</option>
                <option value="amount_asc">Amount (Lowest First)</option>
              </select>
            </div>
          </div>
        </div>
      )}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '1.5rem' }}>{t.categories?.emoji || '📦'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="truncate">{t.merchant || 'Transaction'}</span>
                    {t.is_flagged && <Flag size={14} color="var(--warning)" />}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t.transaction_date} • {t.payment_mode?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
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
