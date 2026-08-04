'use client';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export function RefreshButton({ onRefresh }) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    setSpinning(true);
    toast.success('Refreshing Vault...', { duration: 1200 });
    if (onRefresh) {
      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.error(err);
      } finally {
        setSpinning(false);
      }
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 250);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Refresh application data"
      className="btn btn-ghost"
      style={{
        padding: '8px 14px',
        borderRadius: '100px',
        fontSize: '0.8rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        border: '1px solid var(--border-glass)',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      }}
    >
      <RotateCcw
        size={15}
        style={{
          transition: 'transform 0.5s ease',
          transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
          color: 'var(--accent)',
        }}
      />
      <span>Refresh</span>
    </button>
  );
}
