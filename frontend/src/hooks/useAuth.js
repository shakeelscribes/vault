'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function useAuth() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('vault_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    // Verify token is still valid
    api.me().catch(() => {
      localStorage.removeItem('vault_token');
      router.replace('/login');
    });
  }, [router]);

  function logout() {
    api.logout().finally(() => {
      localStorage.removeItem('vault_token');
      router.replace('/login');
    });
  }

  return { logout };
}
