'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  async function handleResetSubmit(e) {
    e.preventDefault();
    setResetting(true);
    try {
      const res = await api.resetPassword({
        username: forgotUser,
        recoveryKey,
        newPassword: newResetPassword,
      });
      toast.success(res.message || 'Password reset successfully! Please sign in.');
      setShowForgot(false);
      setForgotUser('');
      setRecoveryKey('');
      setNewResetPassword('');
      setPassword('');
    } catch (err) {
      toast.error(err.message || 'Password reset failed.');
    } finally {
      setResetting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({ username, password, name: name || undefined });
        localStorage.setItem('vault_token', res.token);
        toast.success('Account created!');
        router.push('/onboarding');
      } else {
        const res = await api.login({ username, password });
        localStorage.setItem('vault_token', res.token);
        toast.success('Welcome back!');
        if (res.user.setup_complete) {
          router.push('/');
        } else {
          router.push('/onboarding');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at top, #2A1B4E 0%, var(--bg-primary) 70%)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ color: 'var(--accent)', fontSize: '2.5rem', marginBottom: '4px' }}>Vault</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Real-time expenditure tracking</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label">Username</label>
            <input
              type="text"
              className="input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isRegister && (
            <div style={{ textAlign: 'right', marginTop: '-6px' }}>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem' }}>
          <span className="text-muted">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          </span>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>
      </div>

      {/* Master Recovery Modal */}
      {showForgot && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '28px', borderLeft: '3px solid var(--accent)' }}>
            <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>🔐 Reset Credentials</h3>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: '18px', lineHeight: '1.4' }}>
              Enter your account Username along with your Master Recovery Key (<code style={{ background: 'var(--bg-glass-light)', padding: '2px 4px', borderRadius: '4px' }}>VAULT_API_KEY</code>) to override and reset your forgotten password.
            </p>
            <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your username"
                  value={forgotUser}
                  onChange={(e) => setForgotUser(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Master Recovery Key (API Key)</label>
                <input
                  type="password"
                  className="input"
                  placeholder="e.g. vault_sk_..."
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="New secret password (min 6 chars)"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setShowForgot(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={resetting}
                >
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
