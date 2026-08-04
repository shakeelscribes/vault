'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vault_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    // Verify token & fetch user details
    api.me()
      .then((res) => {
        setUser(res.user);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('vault_token');
        router.replace('/login');
        setLoading(false);
      });
  }, [router]);

  function logout() {
    api.logout().finally(() => {
      localStorage.removeItem('vault_token');
      router.replace('/login');
    });
  }

  return { user, loading, logout };
}
