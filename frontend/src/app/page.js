'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { ArrowDownLeft, ArrowUpRight, Wallet, PieChart as PieIcon, Upload } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  useAuth();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [period, setPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, catData, userData] = await Promise.all([
        api.summary({ period }),
        api.getCategories(),
        api.me(),
      ]);
      setSummary(sumData);
      setCategories(catData);
      setUser(userData.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription callback
  useRealtime({
    userId: user?.id,
    onTransaction: () => loadData(),
    onAlert: () => loadData(),
  });

  // Chart configs
  const barChartData = {
    labels: summary?.daily_trend?.map(d => d.date.split('-').slice(1).join('/')) || [],
    datasets: [
      {
        label: 'Spent (₹)',
        data: summary?.daily_trend?.map(d => d.debit) || [],
        backgroundColor: '#7C3AED',
        borderRadius: 6,
      },
    ],
  };

  const donutData = {
    labels: summary?.by_category?.map(c => c.name) || [],
    datasets: [
      {
        data: summary?.by_category?.map(c => c.amount) || [],
        backgroundColor: summary?.by_category?.map(c => c.color) || ['#7C3AED'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="mobile-page" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>VAULT</h1>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>Canara Bank • Real-time</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['daily', 'weekly', 'monthly'].map((p) => (
            <button
              key={p}
              className={`btn ${period === p ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px', textTransform: 'capitalize' }}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '200px' }} />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--debit)', marginBottom: '8px' }}>
                <ArrowDownLeft size={18} />
                <span className="label" style={{ margin: 0 }}>Spent</span>
              </div>
              <div className="amount" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--debit)' }}>
                ₹{summary?.total_debit?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--credit)', marginBottom: '8px' }}>
                <ArrowUpRight size={18} />
                <span className="label" style={{ margin: 0 }}>Received</span>
              </div>
              <div className="amount" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--credit)' }}>
                ₹{summary?.total_credit?.toLocaleString('en-IN') || 0}
              </div>
            </div>
          </div>

          {/* Spending Trend Bar Chart */}
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Spending Trend</h3>
            <div style={{ height: '160px' }}>
              <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>

          {/* Category Breakdown Donut */}
          {summary?.by_category?.length > 0 && (
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Category Breakdown</h3>
              <div style={{ height: '180px', display: 'flex', justifyContent: 'center' }}>
                <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
              </div>
            </div>
          )}
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
