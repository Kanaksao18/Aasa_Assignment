'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FlaskConical, 
  Lock, 
  Shield, 
  Briefcase, 
  Users, 
  Database, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seedingText, setSeedingText] = useState('Initialize Database');

  const triggerSuccessAndRedirect = (role: string) => {
    confetti({
      particleCount: 150,
      spread: 85,
      origin: { y: 0.6 },
      colors: ['#00f2fe', '#4facfe', '#10b981', '#ffffff']
    });
    
    setTimeout(() => {
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'seller') {
        router.push('/seller');
      } else {
        router.push('/buyer');
      }
    }, 800);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Successful login, trigger confetti and redirect
      triggerSuccessAndRedirect(data.user.role);
    } catch (err) {
      console.error('Login submit error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'seller' | 'buyer') => {
    setError('');
    setLoading(true);
    let demoEmail = '';
    let demoPass = 'seller123';
    
    if (role === 'admin') {
      demoEmail = 'admin@aasamedchem.com';
      demoPass = 'admin123';
    } else if (role === 'seller') {
      demoEmail = 'seller@aasamedchem.com';
      demoPass = 'seller123';
    } else if (role === 'buyer') {
      demoEmail = 'buyer@aasamedchem.com';
      demoPass = 'buyer123';
    }
    
    setEmail(demoEmail);
    setPassword(demoPass);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: demoPass }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          triggerSuccessAndRedirect(data.user.role);
        } else {
          setError('Demo user not found. Seeding database, please wait...');
          handleSeedDatabase(role);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Connection failed. Verify DATABASE_URL.');
        setLoading(false);
      });
  };

  const handleSeedDatabase = async (autoLoginRole?: 'admin' | 'seller' | 'buyer') => {
    setSeedingText('Seeding...');
    try {
      const res = await fetch('/api/seed?reset=true');
      const data = await res.json();

      if (data.success) {
        setSeedingText('Seeding Successful!');
        setError('Database seeded successfully! Try logging in now.');
        setTimeout(() => setSeedingText('Reset & Seed Database'), 3000);
        
        if (autoLoginRole) {
          let demoEmail = '';
          let demoPass = '';
          if (autoLoginRole === 'admin') {
            demoEmail = 'admin@aasamedchem.com';
            demoPass = 'admin123';
          } else if (autoLoginRole === 'seller') {
            demoEmail = 'seller@aasamedchem.com';
            demoPass = 'seller123';
          } else if (autoLoginRole === 'buyer') {
            demoEmail = 'buyer@aasamedchem.com';
            demoPass = 'buyer123';
          }
          
          setEmail(demoEmail);
          setPassword(demoPass);
          
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: demoEmail, password: demoPass }),
          });
          const loginData = await loginRes.json();
          if (loginData.success) {
            triggerSuccessAndRedirect(loginData.user.role);
            return;
          }
        }
      } else {
        setError(`Seeding failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setError('Database connection error. Ensure your DATABASE_URL environment variable is set.');
    } finally {
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
          Inventory & Order Management System
        </p>
      </div>

      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px' }}>
        <h2 className="mb-6" style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock style={{ width: '18px', height: '18px', color: 'var(--color-primary)' }} />
          Secure Portal Access
        </h2>

        {error && (
          <div className={`alert ${error.includes('successfully') ? 'alert-success' : 'alert-error'} mb-4`}>
            <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
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

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Register Here
          </Link>
        </p>

        <div style={{
          margin: '24px 0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Testing Utilities
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-color)' }}></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => handleQuickLogin('admin')}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '10px 2px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              disabled={loading}
            >
              <Shield style={{ width: '16px', height: '16px', color: 'var(--color-primary)' }} />
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin('seller')}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '10px 2px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              disabled={loading}
            >
              <Briefcase style={{ width: '16px', height: '16px', color: 'var(--color-secondary)' }} />
              Seller
            </button>
            <button
              onClick={() => handleQuickLogin('buyer')}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '10px 2px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              disabled={loading}
            >
              <Users style={{ width: '16px', height: '16px', color: 'var(--color-success)' }} />
              Buyer
            </button>
          </div>
          
          <button
            onClick={() => handleSeedDatabase()}
            className="btn btn-secondary w-full"
            style={{ 
              fontSize: '0.85rem', 
              padding: '10px', 
              borderColor: 'rgba(0, 242, 254, 0.2)',
              color: 'var(--color-primary)'
            }}
            disabled={loading}
          >
            <Database style={{ width: '14px', height: '14px' }} />
            {seedingText}
          </button>
        </div>
      </div>
      
      <p style={{
        marginTop: '24px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        maxWidth: '360px'
      }}>
        Authorized access only. High decimal conversion, stock levels, and order metrics are logged in base units.
      </p>
    </div>
  );
}
