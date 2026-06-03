'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FlaskConical, 
  ArrowLeft, 
  User, 
  Phone, 
  Lock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Phone Form State
  const [phone, setPhone] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light-theme');
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }

        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          setPhone(data.user.phone || '');
        } else {
          router.replace('/login');
        }
      } catch (err) {
        console.error('Profile auth check failed:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.add('light-theme');
    } else {
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.remove('light-theme');
    }
  };

  const handlePhoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneSuccess('');
    setPhoneLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (data.success) {
        setPhoneSuccess('Phone number updated successfully!');
        if (user) {
          setUser({ ...user, phone });
        }
      } else {
        setPhoneError(data.error || 'Failed to update phone number.');
      }
    } catch (err) {
      setPhoneError('Connection error updating phone number.');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      return;
    }

    setPassLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setPassSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setPassError('Connection error updating password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleBack = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role === 'admin') router.push('/admin');
    else if (user.role === 'seller') router.push('/seller');
    else router.push('/buyer');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="navbar-wrapper">
        <div className="container navbar flex-between">
          <a href="#" onClick={(e) => { e.preventDefault(); handleBack(); }} className="brand-logo">
            <FlaskConical style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
            🧬 AasaMedChem 
            <span style={{ fontSize: '0.8rem', opacity: 0.7, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
              Settings
            </span>
          </a>
          <div className="nav-links">
            <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
              {theme === 'dark' ? <Sun style={{ width: '20px', height: '20px' }} /> : <Moon style={{ width: '20px', height: '20px' }} />}
            </button>
            <button onClick={handleBack} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <ArrowLeft style={{ width: '14px', height: '14px' }} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="container animate-fade-in" style={{ flex: 1, padding: '40px 24px', maxWidth: '800px' }}>
        <h1 className="mb-6" style={{ fontSize: '2rem' }}>Account Profile Settings</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Card 1: Account Overview */}
          <section className="glass-card">
            <h2 className="mb-4" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <User style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
              Credentials Profile
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Registered Name</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>{user?.name}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Account Level Role</span>
                <p style={{ marginTop: '4px' }}>
                  <span className={`badge badge-${user?.role}`} style={{ fontSize: '0.75rem' }}>{user?.role}</span>
                </p>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email Login Address</span>
                <p style={{ fontSize: '1.05rem', color: '#fff', marginTop: '4px' }}>{user?.email}</p>
              </div>
            </div>
          </section>

          <div className="grid-2">
            {/* Card 2: Contact Details */}
            <section className="glass-card">
              <h2 className="mb-4" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <Phone style={{ width: '18px', height: '18px', color: 'var(--color-secondary)' }} />
                Contact Settings
              </h2>
              
              {phoneError && (
                <div className="alert alert-error mb-4" style={{ padding: '10px 14px' }}>
                  <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  <span>{phoneError}</span>
                </div>
              )}
              {phoneSuccess && (
                <div className="alert alert-success mb-4" style={{ padding: '10px 14px' }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  <span>{phoneSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePhoneUpdate}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Phone Number</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-full mt-4"
                  disabled={phoneLoading}
                  style={{ fontSize: '0.85rem' }}
                >
                  {phoneLoading ? <Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} /> : 'Update Phone Number'}
                </button>
              </form>
            </section>

            {/* Card 3: Security & Passwords */}
            <section className="glass-card">
              <h2 className="mb-4" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <Lock style={{ width: '18px', height: '18px', color: 'var(--color-warning)' }} />
                Password & Security
              </h2>

              {passError && (
                <div className="alert alert-error mb-4" style={{ padding: '10px 14px' }}>
                  <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  <span>{passError}</span>
                </div>
              )}
              {passSuccess && (
                <div className="alert alert-success mb-4" style={{ padding: '10px 14px' }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  <span>{passSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Current Password</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Verify old password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>New Password</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Confirm New Password</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full mt-4"
                  disabled={passLoading}
                  style={{ fontSize: '0.85rem' }}
                >
                  {passLoading ? <Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} /> : 'Change Security Password'}
                </button>
              </form>
            </section>
          </div>

        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        🛡️ AasaMedChem Encryption Gateway &bull; Session signatures are validated server-side for all profile updates.
      </footer>
    </div>
  );
}
