'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, Sparkles, CreditCard as CardIcon, DollarSign, PieChart, ShoppingBag } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const PERIOD_LABELS = {
  daily: 'Today',
  weekly: 'This Week',
  monthly: 'This Month',
  all: 'All Time',
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.analytics({ period });
      setData(res);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
    api.getCategories().then(setCategories).catch(console.error);
  }, [fetchAnalytics]);

  // Real-time synchronization when new transactions arrive via SMS or manual entry
  useRealtime({
    userId: user?.id,
    onTransaction: () => fetchAnalytics(),
  });

  // Chart 1: Payment Medium Breakdown (Credited vs Debited)
  const paymentModeData = {
    labels: data?.by_payment_mode?.map(m => m.label) || [],
    datasets: [
      {
        label: 'Credited (Income) ₹',
        data: data?.by_payment_mode?.map(m => m.credit) || [],
        backgroundColor: '#10B981',
        borderRadius: 6,
      },
      {
        label: 'Debited (Spent) ₹',
        data: data?.by_payment_mode?.map(m => m.debit) || [],
        backgroundColor: '#EF4444',
        borderRadius: 6,
      },
    ],
  };

  // Chart 2: Cash Flow Line Trend (Daily/Monthly)
  const trendLineData = {
    labels: data?.daily_trend?.map(d => d.date.split('-').slice(1).reverse().join('/')) || [],
    datasets: [
      {
        label: 'Spent (₹)',
        data: data?.daily_trend?.map(d => d.debit) || [],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Received (₹)',
        data: data?.daily_trend?.map(d => d.credit) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Chart 3: Category Doughnut
  const categoryData = {
    labels: data?.by_category?.map(c => `${c.emoji} ${c.name}`) || [],
    datasets: [
      {
        data: data?.by_category?.map(c => c.amount) || [],
        backgroundColor: data?.by_category?.map(c => c.color || '#7C3AED') || ['#7C3AED'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptionsWithLegend = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#64748B', font: { size: 12, family: 'Plus Jakarta Sans' }, boxWidth: 12 },
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#F9FAFB',
        bodyColor: '#CBD5E1',
        borderColor: 'rgba(128,128,128,0.2)',
        borderWidth: 1,
      }
    },
    scales: {
      x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(128,128,128,0.1)' } },
      y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(128,128,128,0.1)' } }
    }
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#64748B', font: { size: 11 }, boxWidth: 10 }
      }
    }
  };

  return (
    <div className="mobile-page" style={{ padding: '16px', maxWidth: '650px', margin: '0 auto' }}>
      {/* Header & Time Period Selector */}
      <div className="flex-between" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={24} color="var(--accent)" /> Deep Insights
          </h1>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>Understand where every rupee flows</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`btn ${period === key ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '6px 12px', textTransform: 'capitalize' }}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '240px' }} />
          <div className="skeleton" style={{ height: '240px' }} />
        </div>
      ) : (
        <>
          {/* Section 1: Top Financial Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--credit)', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <ArrowUpRight size={14} /> Credited
              </div>
              <div className="amount" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--credit)' }}>
                ₹{data?.total_credit?.toLocaleString('en-IN') || 0}
              </div>
            </div>
            <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--debit)', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <ArrowDownLeft size={14} /> Debited
              </div>
              <div className="amount" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--debit)' }}>
                ₹{data?.total_debit?.toLocaleString('en-IN') || 0}
              </div>
            </div>
            <div className="card" style={{ padding: '14px', textAlign: 'center', border: '1px solid var(--accent-glow)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Wallet size={14} /> Net Flow
              </div>
              <div className="amount" style={{ fontSize: '1.15rem', fontWeight: 800, color: (data?.net >= 0 ? 'var(--credit)' : 'var(--debit)') }}>
                {data?.net >= 0 ? '+' : '-'}₹{Math.abs(data?.net || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Section 2: Automated AI-Like Financial Insights */}
          {data?.insights && data.insights.length > 0 && (
            <div className="card" style={{ padding: '16px', marginBottom: '20px', borderLeft: '4px solid var(--accent)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <span>🧠</span> Intelligent Summary ({PERIOD_LABELS[period]})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.insights.map((ins, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', background: 'var(--bg-glass-light)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '1.4rem', lineHeight: '1' }}>{ins.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ins.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>{ins.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Credited vs Debited by Payment Medium (The user's primary request!) */}
          <div className="card" style={{ padding: '18px', marginBottom: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💳 Credited & Debited by Medium
              </h3>
              <span className="pill" style={{ background: 'var(--bg-glass-light)', color: 'var(--text-secondary)' }}>
                {data?.by_payment_mode?.length || 0} Modes Used
              </span>
            </div>
            
            {data?.by_payment_mode?.length > 0 ? (
              <>
                <div style={{ height: '220px', marginBottom: '16px' }}>
                  <Bar data={paymentModeData} options={chartOptionsWithLegend} />
                </div>
                {/* Detailed Breakdown List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  {data.by_payment_mode.map((m) => (
                    <div key={m.mode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-glass-light)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>
                          {m.mode === 'upi' ? '⚡' : m.mode === 'card_pos' ? '💳' : m.mode === 'atm' ? '🏧' : m.mode === 'neft' ? '🏦' : '💵'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.count} total transactions</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {m.credit > 0 && (
                          <div className="amount text-credit" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                            +{`₹${m.credit.toLocaleString('en-IN')}`} In
                          </div>
                        )}
                        {m.debit > 0 && (
                          <div className="amount text-debit" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                            -{`₹${m.debit.toLocaleString('en-IN')}`} Out
                          </div>
                        )}
                        {m.credit === 0 && m.debit === 0 && (
                          <div className="text-muted" style={{ fontSize: '0.8rem' }}>₹0</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No payment medium data recorded for {PERIOD_LABELS[period].toLowerCase()}.
              </div>
            )}
          </div>

          {/* Section 4: Cash Flow Trend over Time */}
          <div className="card" style={{ padding: '18px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '14px' }}>📈 Cash Flow Trend ({PERIOD_LABELS[period]})</h3>
            <div style={{ height: '220px' }}>
              <Line data={trendLineData} options={chartOptionsWithLegend} />
            </div>
          </div>

          {/* Section 5: Category & Top Merchants Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Category Breakdown */}
            {data?.by_category?.length > 0 && (
              <div className="card" style={{ padding: '18px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '14px' }}>🍕 Spending by Category</h3>
                <div style={{ height: '200px', marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
                  <Doughnut data={categoryData} options={donutOptions} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.by_category.map((c) => {
                    const pct = Math.round((c.amount / (data.total_debit || 1)) * 100);
                    return (
                      <div key={c.category_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{c.emoji}</span>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="amount text-debit" style={{ fontWeight: 700, marginRight: '8px' }}>₹{c.amount.toLocaleString('en-IN')}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-glass-light)', padding: '2px 6px', borderRadius: '6px' }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Merchants List */}
            {data?.top_merchants?.length > 0 && (
              <div className="card" style={{ padding: '18px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🛍️ Top Merchants by Spend
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.top_merchants.slice(0, 5).map((m, idx) => (
                    <div key={m.merchant} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: 'var(--accent-glow)', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-light)' }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.merchant}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.count} txns • Avg ₹{m.avg.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      <div className="amount text-debit" style={{ fontWeight: 800, fontSize: '1rem' }}>
                        ₹{m.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={fetchAnalytics}
        categories={categories}
      />

      <BottomNav onOpenManualEntry={() => setIsManualModalOpen(true)} />
    </div>
  );
}
