'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { usePDFUpload } from '@/hooks/usePDFUpload';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/BottomNav';
import { ManualEntryModal } from '@/components/transactions/ManualEntryFAB';
import { RefreshButton } from '@/components/common/RefreshButton';
import { Sun, Upload, LogOut, FileSpreadsheet, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const { logout } = useAuth();
  const { toggle: toggleTheme } = useTheme();
  const { uploading, uploadPhase, uploadProgress, uploadResult, startUpload, cancelUpload } = usePDFUpload();
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    api.me().then(res => setUser(res.user)).catch(console.error);
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    startUpload(file);
    e.target.value = '';
  }

  function handleCancelUpload(e) {
    e.preventDefault();
    e.stopPropagation();
    cancelUpload();
  }

  function handleExportCSV() {
    window.open(api.exportCSV(), '_blank');
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'Please fill out both fields.' });
      return;
    }
    try {
      setChangingPwd(true);
      const res = await api.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: res.message || 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setChangingPwd(false);
    }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{Math.round(uploadProgress)}%</span>
                  {uploading && (
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        background: 'var(--danger-muted)',
                        color: 'var(--debit)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '100px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      aria-label="Cancel PDF import"
                    >
                      <XCircle size={12} />
                      Cancel
                    </button>
                  )}
                </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem' }}>Security & Credentials 🔐</h3>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              {showPasswordForm ? 'Close' : 'Change Password'}
            </button>
          </div>
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-glass-light)', padding: '12px', borderRadius: '10px' }}>
              <div>
                <label className="label" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>CURRENT PASSWORD</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="label" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>NEW PASSWORD</label>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
              {passwordMsg.text && (
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: passwordMsg.type === 'error' ? 'var(--debit)' : '#10B981', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)' }}>
                  {passwordMsg.text}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ height: '38px', fontSize: '0.85rem' }} disabled={changingPwd}>
                {changingPwd ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
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
