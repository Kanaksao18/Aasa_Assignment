'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateLineMetrics, formatINR, formatQuantity, getUnitsByDimension } from '@/lib/units';
import { 
  FlaskConical, 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  Database, 
  Scale, 
  Layers, 
  ShieldCheck, 
  Activity,
  Calculator,
  Lock,
  ChevronRight
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'seller' | 'buyer';
}

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Live Conversion Widget State
  const [testProduct, setTestProduct] = useState({
    name: 'Aspirin USP (Powder)',
    basePrice: 0.15000000, // INR per gram
    dimension: 'weight' as 'weight' | 'volume' | 'count',
    baseUnit: 'g'
  });
  const [testQuantity, setTestQuantity] = useState('2.5');
  const [testUnit, setTestUnit] = useState('kg');

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('Session verify failed:', err);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const handleCTAClick = () => {
    if (user) {
      router.push(`/${user.role}`);
    } else {
      router.push('/login');
    }
  };

  // Live calculation results
  const qtyNum = parseFloat(testQuantity) || 0;
  const metrics = calculateLineMetrics(qtyNum, testUnit, testProduct.basePrice);

  const testProductsList = [
    { name: 'Aspirin USP (Powder)', basePrice: 0.15, dimension: 'weight', baseUnit: 'g' },
    { name: 'Ethanol Anhydrous 99.5%', basePrice: 0.08, dimension: 'volume', baseUnit: 'mL' },
    { name: 'Glass Vials 10mL (Crimped)', basePrice: 15.00, dimension: 'count', baseUnit: 'item' }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <header className="navbar-wrapper">
        <div className="container navbar flex-between">
          <a href="#" className="brand-logo">
            <FlaskConical style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
            🧬 AasaMedChem
          </a>
          <nav className="nav-links">
            <a href="#features" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>Features</a>
            <a href="#playground" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>Playground</a>
            <a href="#tech" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>System Specs</a>
            
            {loading ? (
              <div style={{ width: '80px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
            ) : user ? (
              <button onClick={handleCTAClick} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Go to Dashboard
                <ArrowRight style={{ width: '14px', height: '14px' }} />
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link href="/login" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Sign In
                </Link>
                <Link href="/register" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ 
        padding: '100px 24px 60px', 
        textAlign: 'center', 
        maxWidth: '900px', 
        margin: '0 auto',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <div className="badge badge-admin mb-4" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
          <Activity style={{ width: '12px', height: '12px' }} />
          Next-Generation B2B Chemical Logistics
        </div>
        
        <h1 style={{ 
          fontSize: '3.5rem', 
          lineHeight: '1.15', 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #ffffff 30%, var(--color-primary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '24px'
        }}>
          High-Precision Inventory & <br />Order Management System
        </h1>
        
        <p style={{ 
          fontSize: '1.2rem', 
          color: 'var(--text-secondary)', 
          maxWidth: '650px', 
          margin: '0 auto 40px',
          lineHeight: '1.6'
        }}>
          A transactional database platform for pharmaceutical compound supply chains. Track active ingredients, audit unit conversions, and sign-off quotes in real-time.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button onClick={handleCTAClick} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            {user ? 'Enter Dashboard Portal' : 'Access Secure Portal'}
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </button>
          
          <a href="#playground" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            Try Live Calculations
          </a>
        </div>
      </section>

      {/* Interactive Unit Conversion Playground */}
      <section id="playground" className="container" style={{ padding: '60px 24px', scrollMarginTop: '80px' }}>
        <div className="glass-card" style={{ maxWidth: '850px', margin: '0 auto', border: '1px solid var(--border-hover)' }}>
          <div className="grid-2" style={{ gridTemplateColumns: '1.1fr 0.9fr', gap: '32px' }}>
            
            {/* Left Box: Controls */}
            <div>
              <h2 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.5rem' }}>
                <Calculator style={{ width: '22px', height: '22px', color: 'var(--color-primary)' }} />
                Unit Conversion Playground
              </h2>
              <p className="mb-6" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Test how the backend converts user-facing measurement dimensions to base units, rounds decimal structures, and calculates price points instantly.
              </p>

              <div className="form-group">
                <label className="form-label">Select Chemical Spec</label>
                <select 
                  className="select-field"
                  onChange={(e) => {
                    const prod = testProductsList.find(p => p.name === e.target.value);
                    if (prod) {
                      setTestProduct({
                        name: prod.name,
                        basePrice: prod.basePrice,
                        dimension: prod.dimension as any,
                        baseUnit: prod.baseUnit
                      });
                      // Set default unit based on dimension
                      const units = getUnitsByDimension(prod.dimension as any);
                      setTestUnit(units.includes('kg') ? 'kg' : units.includes('L') ? 'L' : units[0]);
                    }
                  }}
                >
                  {testProductsList.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid-2 mt-4" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Order Quantity</label>
                  <input
                    type="number"
                    step="0.00000001"
                    min="0"
                    className="input-field"
                    value={testQuantity}
                    onChange={(e) => setTestQuantity(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Order Unit</label>
                  <select 
                    className="select-field"
                    value={testUnit}
                    onChange={(e) => setTestUnit(e.target.value)}
                  >
                    {getUnitsByDimension(testProduct.dimension).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Box: Live Calculations Result */}
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: '12px', 
              padding: '24px', 
              border: '1px dashed var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <span className="form-label" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '12px' }}>Real-time Audit Trace</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Selected Formula Rate:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                    {formatINR(testProduct.basePrice)} / {testProduct.baseUnit}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                      {' '}(Base Price)
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calculated Price Rate:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-secondary)', marginTop: '4px' }}>
                    {formatINR(metrics.pricePerUnit)} / {testUnit}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Database Base Quantity:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong>{formatQuantity(metrics.convertedQuantity)} {testProduct.baseUnit}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Stored in SQL)</span>
                  </div>
                </div>

                <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Calculated Price (INR):</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px', textShadow: '0 0 10px rgba(0,242,254,0.1)' }}>
                    {formatINR(metrics.lineTotal)}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container" style={{ padding: '60px 24px', scrollMarginTop: '80px' }}>
        <h2 className="text-center mb-6" style={{ fontSize: '2rem' }}>Platform Architecture Capabilities</h2>
        <p className="text-center mb-6" style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 48px' }}>
          Equipped with transaction safety mechanisms designed for biotechnology, research, and bulk chemical distribution workflows.
        </p>

        <div className="grid-3">
          <div className="glass-card">
            <Scale style={{ width: '28px', height: '28px', color: 'var(--color-primary)', marginBottom: '16px' }} />
            <h3 className="mb-2">High-Decimal Precision</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Stores quantities up to 8 decimal places using PostgreSQL's exact `NUMERIC(20,8)` type. Perfect for milligram dosages or microliter concentrations without floating-point anomalies.
            </p>
          </div>

          <div className="glass-card">
            <Layers style={{ width: '28px', height: '28px', color: 'var(--color-secondary)', marginBottom: '16px' }} />
            <h3 className="mb-2">Three-Tier B2B Pipeline</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Seamless delegation: Sales reps draft quotes, lab buyers sign off, and admins trigger shipping dispatches. Fully scoped roles isolate catalog permissions.
            </p>
          </div>

          <div className="glass-card">
            <Database style={{ width: '28px', height: '28px', color: 'var(--color-success)', marginBottom: '16px' }} />
            <h3 className="mb-2">Atomic Inventory Locking</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Database transactions reserve chemical batches immediately when quotes are issued. If declined or canceled, the system releases the lock and returns the stock.
            </p>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section id="tech" style={{ background: 'rgba(10,12,18,0.5)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '60px 24px' }}>
        <div className="container">
          <h2 className="text-center mb-6" style={{ fontSize: '1.8rem' }}>System Specifications</h2>
          <div className="grid-4 mt-6">
            <div style={{ textAlign: 'center' }}>
              <Cpu style={{ width: '24px', height: '24px', color: 'var(--color-primary)', marginBottom: '12px' }} />
              <strong style={{ display: 'block', color: '#fff', fontSize: '1rem' }}>Next.js App Router</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TypeScript Framework</span>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Database style={{ width: '24px', height: '24px', color: 'var(--color-secondary)', marginBottom: '12px' }} />
              <strong style={{ display: 'block', color: '#fff', fontSize: '1rem' }}>Neon Serverless SQL</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PostgreSQL WebSocket tunnel</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Lock style={{ width: '24px', height: '24px', color: 'var(--color-success)', marginBottom: '12px' }} />
              <strong style={{ display: 'block', color: '#fff', fontSize: '1rem' }}>Signed JWT Security</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>jose HTTP-Only sessions</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <ShieldCheck style={{ width: '24px', height: '24px', color: '#a855f7', marginBottom: '12px' }} />
              <strong style={{ display: 'block', color: '#fff', fontSize: '1rem' }}>Vercel Edge</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Serverless deployment hosting</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '48px', borderColor: 'rgba(0, 242, 254, 0.15)' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '16px' }}>Ready to audit your logistics pipeline?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 32px' }}>
            Access the secure portal using our pre-seeded credentials or create a new representative account.
          </p>
          <button onClick={handleCTAClick} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
            Enter Secure Portal
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '32px 24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <p>&copy; {new Date().getFullYear()} AasaMedChem Inc. All rights reserved. High-decimal precision chemical logistics.</p>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
