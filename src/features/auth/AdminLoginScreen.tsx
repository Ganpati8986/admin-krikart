import { useState } from 'react';

export function AdminLoginScreen({ onSignIn }: { onSignIn: (phone: string, otp: string) => Promise<void> }) {
  const [phone, setPhone] = useState('+919876500001');
  const [otp, setOtp] = useState('123456');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    try { await onSignIn(phone.trim(), otp.trim()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  }

  return <main className="admin-auth-shell">
    <div aria-hidden="true" className="admin-auth-orb admin-auth-orb-blue" />
    <div aria-hidden="true" className="admin-auth-orb admin-auth-orb-orange" />
    <div aria-hidden="true" className="admin-auth-bubbles">
      <span className="admin-auth-bubble admin-auth-bubble-one" />
      <span className="admin-auth-bubble admin-auth-bubble-two" />
      <span className="admin-auth-bubble admin-auth-bubble-three" />
      <span className="admin-auth-bubble admin-auth-bubble-four" />
      <span className="admin-auth-bubble admin-auth-bubble-five" />
      <span className="admin-auth-bubble admin-auth-bubble-six" />
      <span className="admin-auth-bubble admin-auth-bubble-seven" />
    </div>
    <section className="admin-auth-card">
      <div className="admin-auth-brand">
        <div>
          <div className="admin-auth-wordmark"><span>kri</span><strong>Kart</strong></div>
          <p className="admin-auth-brand-caption">OPERATIONS PORTAL</p>
        </div>
      </div>

      <div className="admin-auth-heading">
        <p className="admin-auth-eyebrow"><span /> KRI KART OPERATIONS</p>
        <h1>Welcome back</h1>
        <p>Sign in to manage your Kri Kart operations.</p>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label className="admin-auth-label">
          Phone
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="admin-auth-input"
          />
        </label>
        <label className="admin-auth-label admin-auth-otp-label">
          One-time password
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="admin-auth-input"
          />
        </label>
        {error && <p role="alert" className="admin-auth-error">{error}</p>}
        <button type="submit" disabled={busy || !phone || !otp} className="admin-auth-submit">
          <span>{busy ? 'Signing in...' : 'Sign in'}</span>
          {!busy && <span aria-hidden="true" className="admin-auth-arrow">→</span>}
        </button>
      </form>

      <div className="admin-auth-footer">
        <span className="admin-auth-footer-dot" />
        <p>Use a seeded admin phone for local testing. Demo OTP is configured in the backend environment.</p>
      </div>
    </section>
  </main>;
}
