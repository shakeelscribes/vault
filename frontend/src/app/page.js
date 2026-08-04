'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { ArrowDownLeft, ArrowUpRight, Wallet, Sparkles, CreditCard, PieChart as PieIcon } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import Link from 'next/link';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const PERIOD_LABELS = {
  daily: 'Today',
  weekly: 'Week',
  monthly: 'Month',
  all: 'All Time',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [period, setPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, catData] = await Promise.all([
        api.summary({ period }),
        api.getCategories(),
      ]);
      setSummary(sumData);
      setCategories(catData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription callback for upcoming SMS & manual entries
  useRealtime({
    userId: user?.id,
    onTransaction: () => loadData(),
    onAlert: () => loadData(),
  });

  // Chart configs
  const barChartData = {
    labels: summary?.daily_trend?.map(d => d.date.split('-').slice(1).reverse().join('/')) || [],
    datasets: [
      {
        label: 'Spent (₹)',
        data: summary?.daily_trend?.map(d => d.debit) || [],
        backgroundColor: '#EF4444',
        borderRadius: 6,
      },
      {
        label: 'Received (₹)',
        data: summary?.daily_trend?.map(d => d.credit) || [],
        backgroundColor: '#10B981',
        borderRadius: 6,
      },
    ],
  };

  const donutData = {
    labels: summary?.by_category?.map(c => `${c.emoji} ${c.name}`) || [],
    datasets: [
      {
        data: summary?.by_category?.map(c => c.amount) || [],
        backgroundColor: summary?.by_category?.map(c => c.color || '#7C3AED') || ['#7C3AED'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="mobile-page" style={{ padding: '16px', maxWidth: '650px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)' }}>⚡ VAULT</span>
          </h1>
          <p className="text-muted" style={{ fontSize: '0.82rem' }}>Canara Bank • Live SMS Intelligence</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`btn ${period === key ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '5px 10px', textTransform: 'capitalize' }}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '200px' }} />
          <div className="skeleton" style={{ height: '200px' }} />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--debit)', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                <ArrowDownLeft size={15} /> Spent
              </div>
              <div className="amount" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--debit)' }}>
                ₹{summary?.total_debit?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--credit)', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                <ArrowUpRight size={15} /> Received
              </div>
              <div className="amount" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--credit)' }}>
                ₹{summary?.total_credit?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '14px', textAlign: 'center', border: '1px solid var(--accent-glow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--accent-light)', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                <Wallet size={15} /> Net Balance
              </div>
              <div className="amount" style={{ fontSize: '1.2rem', fontWeight: 800, color: summary?.net >= 0 ? 'var(--credit)' : 'var(--debit)' }}>
                {summary?.net >= 0 ? '+' : '-'}₹{Math.abs(summary?.net || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Quick AI Insight Banner */}
          {summary?.insights && summary.insights[0] && (
            <div className="card" style={{ padding: '14px', marginBottom: '16px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>{summary.insights[0].icon || '💡'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{summary.insights[0].title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{summary.insights[0].text}</div>
                </div>
              </div>
              <Link href="/analytics" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                All Insights ➔
              </Link>
            </div>
          )}

          {/* Spending Trend Bar Chart */}
          <div className="card" style={{ padding: '18px', marginBottom: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Cash Flow Activity ({PERIOD_LABELS[period]})
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{summary?.transaction_count || 0} Txns</span>
            </div>
            <div style={{ height: '180px' }}>
              <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#9CA3AF', font: { size: 11 } } } }, scales: { x: { ticks: { color: '#9CA3AF' } }, y: { ticks: { color: '#9CA3AF' } } } }} />
            </div>
          </div>

          {/* Category Breakdown Donut */}
          {summary?.by_category?.length > 0 && (
            <div className="card" style={{ padding: '18px', marginBottom: '16px' }}>
              <div className="flex-between" style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🍕 Expense Category Share
                </h3>
              </div>
              <div style={{ height: '190px', display: 'flex', justifyContent: 'center' }}>
                <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#F9FAFB', font: { size: 11 } } } } }} />
              </div>
            </div>
          )}

          {/* Quick navigation hint */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <Link href="/transactions" className="card" style={{ flex: 1, padding: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>📜 View All History</span>
              <span style={{ color: 'var(--accent)' }}>➔</span>
            </Link>
            <Link href="/analytics" className="card" style={{ flex: 1, padding: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>📈 Deep Analytics</span>
              <span style={{ color: 'var(--accent)' }}>➔</span>
            </Link>
          </div>
        </>
      )}

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={loadData}
        categories={categories}
      />

      {/* Floating Bottom Nav */}
      <BottomNav onOpenManualEntry={() => setIsManualModalOpen(true)} />
    </div>
  );
}
