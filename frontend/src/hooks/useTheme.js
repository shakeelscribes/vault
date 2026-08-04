'use client';
import { useEffect } from 'react';

export function useTheme() {
  useEffect(() => {
    const saved = localStorage.getItem('vault_theme') || 'light';
    applyTheme(saved);
  }, []);

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem('vault_theme', mode);
  }

  function toggle() {
    const current = localStorage.getItem('vault_theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  return { toggle };
}
