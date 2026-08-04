'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ReceiptText, PieChart, Wallet, Settings, Plus } from 'lucide-react';

export function BottomNav({ onOpenManualEntry }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/transactions', label: 'History', icon: ReceiptText },
    { href: '/analytics', label: 'Analytics', icon: PieChart },
    { href: '/budgets', label: 'Budgets', icon: Wallet },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

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
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: active ? 'var(--accent)' : 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: active ? 700 : 500,
          }}>
            <Icon size={22} color={active ? 'var(--accent)' : 'var(--text-secondary)'} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Floating Center FAB */}
      <button
        onClick={onOpenManualEntry}
        aria-label="Add transaction manually"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--accent)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px var(--accent-glow)',
          transform: 'translateY(-14px)',
          cursor: 'pointer',
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {navItems.slice(2).map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: active ? 'var(--accent)' : 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: active ? 700 : 500,
          }}>
            <Icon size={22} color={active ? 'var(--accent)' : 'var(--text-secondary)'} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
