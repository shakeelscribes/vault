'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { RefreshButton } from '@/components/common/RefreshButton';
import { Search, Trash2, Flag, Filter, Download, Calendar, CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_MODES = [
  { value: 'upi', label: 'UPI ⚡' },
  { value: 'card_pos', label: 'Debit Card (POS) 💳' },
  { value: 'atm', label: 'ATM Cash 🏧' },
  { value: 'neft', label: 'NEFT Transfer 🏦' },
  { value: 'imps', label: 'IMPS Transfer ⚡' },
  { value: 'rtgs', label: 'RTGS Transfer 🏦' },
  { value: 'cash', label: 'Cash 💵' },
  { value: 'other', label: 'Other 📌' },
];

function formatDateHeader(dateStr) {
  if (!dateStr) return 'Past Transactions';
  const today = new Date().toISOString().split('T')[0];
  const yestDate = new Date();
  yestDate.setDate(yestDate.getDate() - 1);
  const yesterday = yestDate.toISOString().split('T')[0];

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(year, Number(month) - 1, day);
  return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TransactionsPage() {
  const { user } = useAuth();
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
      // Build clean params — strip empty/undefined values so URLSearchParams
      // doesn't serialize them as the literal string "undefined"
      const rawParams = {
        limit: 1000,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== '')
        ),
      };
      if (search && search.trim()) {
        rawParams.search = search.trim();
      }
      // Remove any remaining undefined/null/empty values
      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([, v]) => v != null && v !== '')
      );
      const res = await api.getTransactions(params);
      setTransactions(res.transactions || []);
    } catch (err) {
      toast.error('Failed to load transaction history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    loadTransactions();
    api.getCategories().then(setCategories).catch(console.error);
  }, [loadTransactions]);

  // Listen for real-time upcoming transactions from Canara Bank SMS or manual entry
  useRealtime({
    userId: user?.id,
    onTransaction: () => {
      toast.success('New transaction recorded in real-time!');
      loadTransactions();
    },
  });

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this transaction from history?')) return;
    try {
      await api.deleteTransaction(id);
      toast.success('Transaction removed');
      setTransactions(prev => prev.filter(t => t.id !== id));
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

  // Calculate summary stats for whatever is visible in history right now
  const summaryStats = useMemo(() => {
    let debited = 0;
    let credited = 0;
    for (const t of transactions) {
      if (t.type === 'debit') debited += Number(t.amount);
      if (t.type === 'credit') credited += Number(t.amount);
    }
    return { count: transactions.length, debited, credited, net: credited - debited };
  }, [transactions]);

  // Group transactions cleanly by Date (Today, Yesterday, Date string)
  const groupedTransactions = useMemo(() => {
    const map = {};
    const sorted = [...transactions];
    // Keep grouping stable with date_desc as primary grouping key
    for (const t of sorted) {
      const d = t.transaction_date || 'Unknown Date';
      if (!map[d]) map[d] = [];
      map[d].push(t);
    }
    // Sort date keys descending
    const sortedKeys = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map(dateKey => ({
      dateKey,
      label: formatDateHeader(dateKey),
      items: map[dateKey]
    }));
  }, [transactions]);

  function getModeBadge(mode) {
    const m = PAYMENT_MODES.find(p => p.value === mode);
    return m ? m.label : (mode ? mode.toUpperCase() : 'OTHER');
  }

  return (
    <div className="mobile-page">
      <div className="flex-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            📜 Transaction History
          </h1>
          <p className="text-muted" style={{ fontSize: '0.82rem' }}>Live stream of previous & upcoming activities</p>
        </div>
        <RefreshButton onRefresh={loadTransactions} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button
          className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowFilters(!showFilters)}
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
        >
          <Filter size={16} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
        <button className="btn btn-ghost" onClick={handleExport} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
          <Download size={16} /> Export CSV
        </button>
      </div>
      </div>

      {/* Summary Bar for current history selection */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid var(--accent-glow)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--text-primary)' }}>{summaryStats.count}</span> <span className="text-muted">Records</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--credit)' }}>
            <ArrowUpRight size={14} /> +₹{summaryStats.credited.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--debit)' }}>
            <ArrowDownLeft size={14} /> -₹{summaryStats.debited.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="input"
          placeholder="Search merchant, notes, or bank details..."
          style={{ paddingLeft: '42px', fontSize: '0.95rem' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters Drawer */}
      {showFilters && (
        <div className="card" style={{ padding: '16px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '3px solid var(--accent)' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>🎛️ Filter History</h3>
            {activeFilterCount > 0 && (
              <button className="btn btn-ghost" onClick={clearFilters} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>Reset All</button>
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
              <label className="label">Payment Medium</label>
              <select className="input" value={filters.payment_mode} onChange={(e) => setFilters(p => ({ ...p, payment_mode: e.target.value }))}>
                <option value="">All Mediums (UPI, POS, ATM...)</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Transaction Type</label>
              <select className="input" value={filters.type} onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}>
                <option value="">All (Income & Expenses)</option>
                <option value="debit">Only Debits (Expenses)</option>
                <option value="credit">Only Credits (Income)</option>
              </select>
            </div>
            <div>
              <label className="label">Sort Order</label>
              <select className="input" value={filters.sort} onChange={(e) => setFilters(p => ({ ...p, sort: e.target.value }))}>
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
                <option value="amount_desc">Amount: Highest First</option>
                <option value="amount_asc">Amount: Lowest First</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton" style={{ height: '76px' }} />
          ))}
        </div>
      ) : groupedTransactions.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📫</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No transactions found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeFilterCount > 0 || search ? 'Try resetting your filters or search terms.' : 'Send a bank SMS or tap + to record your first expense!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedTransactions.map((group) => (
            <div key={group.dateKey}>
              {/* Date Group Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingLeft: '4px' }}>
                <Calendar size={14} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {group.label}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)', marginLeft: '6px' }} />
              </div>

              {/* Transactions List for this Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.items.map((t) => (
                  <div key={t.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.15s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '1.75rem', background: 'var(--bg-glass-light)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {t.categories?.emoji || '📦'}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="truncate" style={{ maxWidth: '180px' }}>{t.merchant || 'Unknown Transaction'}</span>
                          {t.is_flagged && <Flag size={13} color="var(--warning)" />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                          <span className="pill" style={{ background: 'var(--bg-tertiary)', fontSize: '0.68rem', padding: '2px 8px' }}>
                            {getModeBadge(t.payment_mode)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {t.categories?.name || 'General'}
                          </span>
                          {t.source === 'sms' && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--accent-light)', background: 'var(--accent-glow-sm)', padding: '2px 6px', borderRadius: '6px' }}>
                              SMS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                      <div>
                        <div className={`amount ${t.type === 'debit' ? 'text-debit' : 'text-credit'}`} style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                          {t.type === 'debit' ? '-' : '+'}₹{Number(t.amount).toLocaleString('en-IN')}
                        </div>
                        {t.balance_after && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Bal: ₹{Number(t.balance_after).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(t.id)}
                        style={{ background: 'var(--bg-glass-light)', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', cursor: 'pointer', padding: '7px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Remove transaction"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
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
