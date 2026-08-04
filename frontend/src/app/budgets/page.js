'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { RefreshButton } from '@/components/common/RefreshButton';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BudgetsPage() {
  useAuth();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);

  // New budget form state
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [amount, setAmount] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [bData, cData] = await Promise.all([api.getBudgets(), api.getCategories()]);
      setBudgets(bData || []);
      setCategories(cData || []);
    } catch (err) {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateBudget(e) {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;

    try {
      await api.createBudget({
        category_id: categoryId || null,
        period,
        amount: Number(amount),
      });
      toast.success('Budget created');
      setIsAddBudgetOpen(false);
      setAmount('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create budget');
    }
  }

  async function handleDeleteBudget(id) {
    if (!confirm('Delete budget?')) return;
    try {
      await api.deleteBudget(id);
      toast.success('Budget deleted');
      loadData();
    } catch {
      toast.error('Failed to delete budget');
    }
  }

  return (
    <div className="mobile-page">
      <div className="flex-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '2px' }}>Budgets & Targets</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <RefreshButton onRefresh={fetchData} />
          <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '100px' }} onClick={() => setIsAddBudgetOpen(true)}>
            <Plus size={16} /> New Budget
          </button>
        </div>
      </div>

      {isAddBudgetOpen && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Set New Budget</h3>
          <form onSubmit={handleCreateBudget} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="label">Category (Leave empty for Overall)</label>
              <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All Categories (Overall)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Period</label>
              <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="label">Budget Amount (₹)</label>
              <input type="number" className="input" placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              <button type="button" className="btn btn-ghost" onClick={() => setIsAddBudgetOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: '100px' }} />
      ) : budgets.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No active budgets configured.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {budgets.map((b) => {
            const pct = Math.min(100, Math.round(((b.current_spend || 0) / b.amount) * 100));
            const statusClass = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe';

            return (
              <div key={b.id} className="card" style={{ padding: '16px' }}>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600 }}>
                    {b.categories ? `${b.categories.emoji} ${b.categories.name}` : '🌐 Overall Budget'}
                    <span className="pill" style={{ marginLeft: '8px', textTransform: 'capitalize' }}>{b.period}</span>
                  </div>
                  <button onClick={() => handleDeleteBudget(b.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span className="amount">Spent: ₹{b.current_spend?.toLocaleString('en-IN') || 0}</span>
                  <span className="amount text-muted">Limit: ₹{Number(b.amount).toLocaleString('en-IN')}</span>
                </div>

                <div className="progress-track">
                  <div className={`progress-fill ${statusClass}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={loadData}
        categories={categories}
      />

      <BottomNav onOpenManualEntry={() => setIsManualModalOpen(true)} />
    </div>
  );
}
