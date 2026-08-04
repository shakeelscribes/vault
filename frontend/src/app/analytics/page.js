'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

export default function AnalyticsPage() {
  useAuth();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  useEffect(() => {
    api.summary({ period }).then(setSummary).catch(console.error);
    api.getCategories().then(setCategories).catch(console.error);
  }, [period]);

  const trendLineData = {
    labels: summary?.daily_trend?.map(d => d.date.split('-').slice(1).join('/')) || [],
    datasets: [
      {
        label: 'Debit (Spent)',
        data: summary?.daily_trend?.map(d => d.debit) || [],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Credit (Income)',
        data: summary?.daily_trend?.map(d => d.credit) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const paymentModeData = {
    labels: summary?.by_payment_mode?.map(m => m.mode.toUpperCase()) || [],
    datasets: [
      {
        label: 'Amount (₹)',
        data: summary?.by_payment_mode?.map(m => m.amount) || [],
        backgroundColor: ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#6B7280'],
      },
    ],
  };

  return (
    <div className="mobile-page" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Analytics & Insights</h1>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['weekly', 'monthly'].map((p) => (
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

      {/* Income vs Expense Trend Line Chart */}
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Cash Flow Trend</h3>
        <div style={{ height: '180px' }}>
          <Line data={trendLineData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      {/* Payment Mode Distribution Bar Chart */}
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Payment Mode Split</h3>
        <div style={{ height: '180px' }}>
          <Bar data={paymentModeData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => {}}
        categories={categories}
      />

      <BottomNav onOpenManualEntry={() => setIsManualModalOpen(true)} />
    </div>
  );
}
