'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { RefreshButton } from '@/components/common/RefreshButton';
import { Sun, Upload, LogOut, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { logout } = useAuth();
  const { toggle: toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // PDF Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(''); // 'reading' | 'parsing' | 'saving' | 'done' | 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    api.me().then(res => setUser(res.user)).catch(console.error);
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Reset state
    setUploadResult(null);
    setUploading(true);
    setUploadPhase('reading');
    setUploadProgress(5);

    const formData = new FormData();
    formData.append('file', file);

    // Animate progress smoothly
    if (intervalRef.current) clearInterval(intervalRef.current);
    let currentProgress = 5;
    intervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 2.5 + 0.5;
      if (currentProgress >= 90) currentProgress = 90;
      setUploadProgress(currentProgress);
    }, 250);

    // Phase transitions based on estimated timing
    setTimeout(() => setUploadPhase('parsing'), 800);
    setTimeout(() => setUploadPhase('saving'), 3000);

    try {
      const token = localStorage.getItem('vault_token');
      const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${BASE}/api/pdf/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      clearInterval(intervalRef.current);
      intervalRef.current = null;
      const data = await res.json();

      if (!res.ok) {
        setUploadPhase('error');
        setUploadProgress(100);
        setUploadResult({ error: data.error || 'Upload failed' });
        toast.error(data.error || 'PDF upload failed');
      } else {
        setUploadPhase('done');
        setUploadProgress(100);
        setUploadResult(data);
        toast.success(`Imported ${data.imported} transactions!`);
      }
    } catch (err) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setUploadPhase('error');
      setUploadProgress(100);
      setUploadResult({ error: err.message || 'PDF upload failed' });
      toast.error(err.message || 'PDF upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleExportCSV() {
    window.open(api.exportCSV(), '_blank');
  }

  const phaseLabels = {
    reading: 'Reading PDF file...',
    parsing: 'Parsing transactions...',
    saving: 'Saving to database...',
    done: 'Import complete!',
    error: 'Import failed',
  };

  const showProgress = uploading || uploadPhase === 'done' || uploadPhase === 'error';

  return (
    <div className="mobile-page">
      <div className="flex-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '2px' }}>Settings</h1>
        <RefreshButton />
      </div>

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

          {/* Upload Button */}
          <label
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <Upload size={18} />
            {uploading ? phaseLabels[uploadPhase] || 'Processing...' : 'Upload Canara Bank PDF Statement'}
            <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>

          {/* Green Progress Bar */}
          {showProgress && (
            <div style={{ marginTop: '12px' }}>
              {/* Progress Track */}
              <div style={{
                width: '100%',
                height: '8px',
                borderRadius: '100px',
                background: 'var(--bg-glass-light)',
                overflow: 'hidden',
              }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '100px',
                    width: `${uploadProgress}%`,
                    background: uploadPhase === 'error'
                      ? 'var(--debit)'
                      : uploadPhase === 'done'
                        ? '#10B981'
                        : 'linear-gradient(90deg, #10B981, #34D399)',
                    transition: 'width 0.4s ease',
                    boxShadow: uploadPhase === 'error'
                      ? '0 0 8px rgba(239, 68, 68, 0.4)'
                      : '0 0 8px rgba(16, 185, 129, 0.4)',
                  }}
                />
              </div>

              {/* Phase Label */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '6px',
                fontSize: '0.75rem',
                color: uploadPhase === 'error' ? 'var(--debit)' : uploadPhase === 'done' ? '#10B981' : 'var(--text-secondary)',
                fontWeight: 600,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {uploadPhase === 'done' && <CheckCircle size={13} />}
                  {uploadPhase === 'error' && <AlertCircle size={13} />}
                  {phaseLabels[uploadPhase] || 'Processing...'}
                </span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
            </div>
          )}

          {/* Result Summary Card */}
          {uploadResult && !uploadResult.error && (
            <div style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.8rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Rows found</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{uploadResult.total_rows}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Imported</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>{uploadResult.imported}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Duplicates skipped</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{uploadResult.duplicates}</span>
              </div>
              {uploadResult.flagged > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Flagged</span>
                  <span style={{ fontWeight: 700, color: 'var(--debit)' }}>{uploadResult.flagged}</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {uploadResult?.error && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--danger-muted)',
              border: '1px solid var(--debit)',
              fontSize: '0.8rem',
              color: 'var(--debit)',
              fontWeight: 600,
            }}>
              {uploadResult.error}
            </div>
          )}
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
