'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FlaskConical, 
  Briefcase, 
  Users, 
  Loader2, 
  Key, 
  AlertCircle 
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'seller' | 'buyer'>('seller');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, phone }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully! Redirecting to login portal...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      console.error('Registration submit error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '28px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <h1 className="brand-logo glow-text" style={{ fontSize: '2.4rem', justifyContent: 'center' }}>
          <FlaskConical style={{ width: '36px', height: '36px', color: 'var(--color-primary)' }} />
          🧬 AasaMedChem
        </h1>
        <p className="mt-4" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
          Create Portal Account
        </p>
      </div>

      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px' }}>
        <h2 className="mb-6" style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key style={{ width: '18px', height: '18px', color: 'var(--color-primary)' }} />
          Register Account
        </h2>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {success && <div className="alert alert-success mb-4">{success}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Full Name / Organization</label>
            <input
              type="text"
              className="input-field"
              placeholder="Apex Diagnostics Lab or Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="user@aasamedchem.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (Optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password (Min. 6 chars)</label>
            <input
              type="password"
              className="input-field"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {/* Interactive Role Selection */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Account Role</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <div 
                onClick={() => setRole('seller')}
                style={{
                  border: '2px solid',
                  borderColor: role === 'seller' ? 'var(--color-primary)' : 'var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: role === 'seller' ? 'rgba(0, 242, 254, 0.04)' : 'rgba(0,0,0,0.2)',
                  transition: 'var(--transition-all)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <Briefcase style={{ width: '28px', height: '28px', color: role === 'seller' ? 'var(--color-primary)' : 'var(--text-secondary)', marginBottom: '8px' }} />
                <strong style={{ color: role === 'seller' ? '#fff' : 'var(--text-secondary)', fontSize: '0.95rem' }}>Seller</strong>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Draft quotations & select buyer clinics</p>
              </div>

              <div 
                onClick={() => setRole('buyer')}
                style={{
                  border: '2px solid',
                  borderColor: role === 'buyer' ? 'var(--color-secondary)' : 'var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: role === 'buyer' ? 'rgba(79, 172, 254, 0.04)' : 'rgba(0,0,0,0.2)',
                  transition: 'var(--transition-all)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <Users style={{ width: '28px', height: '28px', color: role === 'buyer' ? 'var(--color-secondary)' : 'var(--text-secondary)', marginBottom: '8px' }} />
                <strong style={{ color: role === 'buyer' ? '#fff' : 'var(--text-secondary)', fontSize: '0.95rem' }}>Buyer</strong>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Review, sign-off and confirm quote costs</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ padding: '14px' }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} />
                Registering Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
}
