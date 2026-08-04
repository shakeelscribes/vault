'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Copy, Check, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vault-backend.up.railway.app';
  const apiKey = 'vault_sk_demo12345678'; // Shown as example in wizard

  function copyText(text, type) {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
    toast.success('Copied to clipboard!');
  }

  async function handleFinish() {
    try {
      await api.setupComplete();
      toast.success('Setup completed!');
      router.push('/');
    } catch {
      router.push('/');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-primary)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: s <= step ? 'var(--accent)' : 'var(--border-glass)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2>Welcome to VAULT 🚀</h2>
            <p className="text-muted" style={{ margin: '16px 0 24px' }}>
              VAULT tracks your expenses automatically using Canara Bank SMS via iOS Shortcuts.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(2)}>
              Configure iOS Automation <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>iOS 26 Automation Setup</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: '8px 0 16px' }}>
              Follow these steps in your iPhone Shortcuts App:
            </p>
            <ol style={{ paddingLeft: '20px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
              <li>Open <b>Shortcuts</b> app → <b>Automation</b> tab → <b>New Automation</b>.</li>
              <li>Select <b>"When I receive a message"</b>.</li>
              <li>Set Ask Before Running to <b>OFF</b> (iOS 26).</li>
              <li>Add action: <b>Get Contents of URL</b> (POST).</li>
            </ol>

            <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Endpoint URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="input" value={`${backendUrl}/api/sms`} readOnly style={{ fontSize: '0.8rem' }} />
                  <button className="btn btn-ghost" onClick={() => copyText(`${backendUrl}/api/sms`, 'url')}>
                    {copiedUrl ? <Check size={16} color="var(--credit)" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Header: X-Vault-API-Key</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="input" value={apiKey} readOnly style={{ fontSize: '0.8rem' }} />
                  <button className="btn btn-ghost" onClick={() => copyText(apiKey, 'key')}>
                    {copiedKey ? <Check size={16} color="var(--credit)" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(3)}>
              Next Step <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2>You&apos;re All Set! 🎉</h2>
            <p className="text-muted" style={{ margin: '16px 0 24px' }}>
              Your default categories and parameters are initialized. Whenever Canara Bank sends you an SMS, VAULT will capture and display it instantly.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleFinish}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
