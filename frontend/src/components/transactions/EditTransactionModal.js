'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Check, Save } from 'lucide-react';

export function EditTransactionModal({ isOpen, onClose, onSuccess, transaction, categories }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('debit');
  const [paymentMode, setPaymentMode] = useState('upi');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction && isOpen) {
      setAmount(transaction.amount !== undefined && transaction.amount !== null ? transaction.amount.toString() : '');
      setType(transaction.type || 'debit');
      setPaymentMode(transaction.payment_mode || 'upi');
      setMerchant(transaction.merchant || '');
      setCategoryId(transaction.category_id || (transaction.categories ? transaction.categories.id : '') || '');
      
      // Format transaction_date for standard YYYY-MM-DD html input
      if (transaction.transaction_date) {
        const d = new Date(transaction.transaction_date);
        if (!isNaN(d.getTime())) {
          setDate(d.toISOString().split('T')[0]);
        } else {
          setDate(transaction.transaction_date.toString().substring(0, 10));
        }
      } else {
        setDate(new Date().toISOString().split('T')[0]);
      }
      
      setNote(transaction.note || '');
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: Number(amount),
        type,
        payment_mode: paymentMode,
        merchant: merchant || 'Unknown Merchant',
        category_id: categoryId || undefined,
        transaction_date: date,
        note: note || undefined,
      };

      const updatedTxn = await api.updateTransaction(transaction.id, payload);
      toast.success('Transaction updated successfully!');
      if (onSuccess) onSuccess(updatedTxn);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update transaction');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 250,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '24px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
      }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Edit Transaction</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Changes will update AI merchant classification memory.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label">Transaction Type</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`btn ${type === 'debit' ? 'btn-danger' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setType('debit')}
              >
                Debit (Expense)
              </button>
              <button
                type="button"
                className={`btn ${type === 'credit' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '10px', background: type === 'credit' ? 'var(--credit)' : undefined }}
                onClick={() => setType('credit')}
              >
                Credit (Income)
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Merchant / Narration</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. RSA SHANK, Zomato"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
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
            <label className="label">Payment Medium</label>
            <select
              className="select"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="upi">UPI ⚡</option>
              <option value="card_pos">Debit / Credit Card 💳</option>
              <option value="atm">ATM Withdrawal 🏧</option>
              <option value="neft">NEFT / IMPS / RTGS 🏦</option>
              <option value="cash">Cash 💵</option>
              <option value="other">Other 📦</option>
            </select>
          </div>

          <div>
            <label className="label">Note (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="Add personal remark or memo..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{ flex: 1 }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
