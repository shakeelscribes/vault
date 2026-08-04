'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { QUICK_PRESETS } from '../../../../backend/src/utils/constants';

export function ManualEntryModal({ isOpen, onClose, onSuccess, categories }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('debit');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: Number(amount),
        type,
        payment_mode: paymentMode,
        merchant: merchant || 'Cash Spend',
        category_id: categoryId || undefined,
        transaction_date: date,
        note: note || undefined,
      };

      const txn = await api.createManual(payload);
      toast.success('Transaction added!');
      if (onSuccess) onSuccess(txn);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset) {
    setAmount(preset.amount.toString());
    setMerchant(preset.label.replace(/^[^\s]+\s+/, ''));
    setPaymentMode(preset.payment_mode);
    const cat = categories?.find(c => c.name === preset.category);
    if (cat) setCategoryId(cat.id);
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '500px',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        padding: '24px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h2>Add Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: '20px' }}>
          <span className="label">Quick Presets</span>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {QUICK_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-ghost"
                onClick={() => applyPreset(p)}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                {p.label} (₹{p.amount})
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label">Type</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`btn ${type === 'debit' ? 'btn-danger' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setType('debit')}
              >
                Debit (Expense)
              </button>
              <button
                type="button"
                className={`btn ${type === 'credit' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, background: type === 'credit' ? 'var(--credit)' : undefined }}
                onClick={() => setType('credit')}
              >
                Credit (Income)
              </button>
            </div>
          </div>

          <div>
            <label className="label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input amount"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Merchant / Description</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Chai stall, Supermarket"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select Category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Payment Mode</label>
            <select
              className="input"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card_pos">Debit Card</option>
              <option value="atm">ATM Withdrawal</option>
              <option value="neft">NEFT / IMPS</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Note (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="Add extra details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Saving...' : 'Add Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
