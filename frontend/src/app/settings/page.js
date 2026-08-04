'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { Sun, Moon, Download, Upload, LogOut, Shield, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { logout } = useAuth();
  const { toggle: toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.me().then(res => setUser(res.user)).catch(console.error);
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const token = localStorage.getItem('vault_token');
      const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${BASE}/api/pdf/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Imported ${data.imported} transactions! (${data.duplicates} duplicates skipped)`);
    } catch (err) {
      toast.error(err.message || 'PDF upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleExportCSV() {
    window.open(api.exportCSV(), '_blank');
  }

  return (
    <div className="mobile-page" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Settings</h1>

      {/* User Profile */}
      <div className="card" style={{ padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1.2rem',
          color: '#fff',
        }}>
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>{user?.name || user?.username}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{user?.username}</div>
        </div>
      </div>

      {/* Actions Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Import & Reconciliation</h3>
          <label className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', cursor: 'pointer' }}>
            <Upload size={18} />
            {uploading ? 'Processing PDF...' : 'Upload Canara Bank PDF Statement'}
            <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Data Export</h3>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleExportCSV}>
            <FileSpreadsheet size={18} /> Export as CSV / Excel
          </button>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Preferences</h3>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={toggleTheme}>
            <Sun size={18} /> Toggle Theme (Dark / Light)
          </button>
        </div>

        <button className="btn btn-danger" style={{ width: '100%', marginTop: '8px' }} onClick={logout}>
          <LogOut size={18} /> Sign Out
        </button>
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
