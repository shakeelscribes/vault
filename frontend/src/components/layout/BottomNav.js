'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ReceiptText, PieChart, Wallet, Settings, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePDFUpload } from '@/hooks/usePDFUpload';

export function BottomNav({ onOpenManualEntry }) {
  const pathname = usePathname();
  const { uploading } = usePDFUpload();

  function handleBlockedNav(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    toast('PDF statement parsing in progress. Please wait or click Cancel first.', {
      icon: '⏳',
      style: { borderRadius: '10px', background: 'var(--bg-glass)', color: 'var(--text-primary)' },
    });
  }

  function handleAddClick(e) {
    if (uploading || (typeof window !== 'undefined' && window.__VAULT_UPLOADING_PDF__)) {
      return handleBlockedNav(e);
    }
    if (onOpenManualEntry) onOpenManualEntry();
  }

  const navItems = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/transactions', label: 'History', icon: ReceiptText },
    { href: '/analytics', label: 'Analytics', icon: PieChart },
    { href: '/budgets', label: 'Budgets', icon: Wallet },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  function renderNavItem(item) {
    const Icon = item.icon;
    const active = pathname === item.href;
    const isLocked = uploading || (typeof window !== 'undefined' && window.__VAULT_UPLOADING_PDF__);

    const style = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      textDecoration: 'none',
      fontSize: '0.75rem',
      fontWeight: active ? 700 : 500,
      cursor: 'pointer',
      userSelect: 'none',
    };

    if (isLocked && !active) {
      return (
        <div key={item.href} role="button" tabIndex={0} onClick={handleBlockedNav} style={style} aria-label={item.label}>
          <Icon size={22} color="var(--text-secondary)" />
          <span>{item.label}</span>
        </div>
      );
    }

    return (
      <Link key={item.href} href={item.href} style={style}>
        <Icon size={22} color={active ? 'var(--accent)' : 'var(--text-secondary)'} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      minHeight: 'calc(68px + max(20px, env(safe-area-inset-bottom, 20px)))',
      paddingTop: '8px',
      paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
      background: 'var(--bg-secondary)',
      boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.08)',
      borderTop: '1px solid var(--border-glass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 9999,
    }}>
      {navItems.slice(0, 2).map(renderNavItem)}

      {/* Integrated Professional Add Action Button */}
      <button
        type="button"
        onClick={handleAddClick}
        aria-label="Add transaction manually"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <div style={{
          width: '46px',
          height: '32px',
          borderRadius: '16px',
          background: 'var(--accent)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 14px var(--accent-glow)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}>
          <Plus size={20} strokeWidth={2.8} />
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}>
          Add
        </span>
      </button>

      {navItems.slice(2).map(renderNavItem)}
    </nav>
  );
}

