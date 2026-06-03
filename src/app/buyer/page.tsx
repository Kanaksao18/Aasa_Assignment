'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR, formatQuantity } from '@/lib/units';
import { 
  FlaskConical, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  FileText, 
  ClipboardCheck, 
  Clock, 
  TrendingDown,
  ArrowRight,
  Bell,
  X,
  User,
  Sun,
  Moon
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_dimension: string;
  product_base_unit: string;
  ordered_quantity: string;
  ordered_unit: string;
  converted_quantity: string;
  price_per_unit: string;
  line_total: string;
}

interface Order {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  buyer_id: string;
  buyer_name: string;
  status: 'pending_buyer' | 'pending_admin' | 'approved' | 'rejected';
  total_price: string;
  created_at: string;
  items: OrderItem[];
}

export default function BuyerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light-theme');
    }

    const handleOutsideClick = () => {
      setIsProfileOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

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

  useEffect(() => {
    async function initBuyer() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.replace('/login');
          return;
        }

        const meData = await meRes.json();
        if (meData.success && meData.user && meData.user.role === 'buyer') {
          setUser(meData.user);
          await fetchOrders();
        } else {
          router.replace('/login');
        }
      } catch (err) {
        console.error('Buyer init failed:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    initBuyer();
  }, [router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleStatusTransition = async (orderId: string, status: 'pending_admin' | 'rejected') => {
    setActionLoading(orderId + '-' + status);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Quotation has been successfully ${status === 'pending_admin' ? 'Accepted & Signed' : 'Declined'}.`);
        await fetchOrders();
      } else {
        setError(data.error || 'Failed to update order status');
      }
    } catch (err) {
      setError('Connection error updating order status');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // Calculate Metrics
  const pendingQuotes = orders.filter((o) => o.status === 'pending_buyer');
  const signedOrdersCount = orders.filter((o) => o.status === 'pending_admin' || o.status === 'approved').length;
  const approvedTotalCost = orders
    .filter((o) => o.status === 'approved')
    .reduce((acc, curr) => acc + parseFloat(curr.total_price), 0);

  // Helper to render visual progression timeline
  const renderTimeline = (status: Order['status']) => {
    if (status === 'rejected') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
          <XCircle style={{ width: '14px', height: '14px', color: 'var(--color-danger)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>Declined</span>
        </div>
      );
    }

    const steps = [
      { key: 'created', label: 'Quote Proposal', active: true },
      { key: 'signed', label: 'Lab Signed', active: status === 'pending_admin' || status === 'approved' },
      { key: 'dispatched', label: 'Dispatched', active: status === 'approved' },
    ];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 style={{ 
                width: '12px', 
                height: '12px', 
                color: step.active ? 'var(--color-success)' : 'var(--text-muted)' 
              }} />
              <span style={{ 
                fontSize: '0.7rem', 
                color: step.active ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: step.active ? 600 : 400
              }}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <ArrowRight style={{ width: '10px', height: '10px', color: steps[idx + 1].active ? 'var(--color-success)' : 'var(--text-muted)' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending_buyer': return 'Review Required';
      case 'pending_admin': return 'Awaiting Dispatch';
      case 'approved': return 'Completed';
      case 'rejected': return 'Rejected';
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <header className="navbar-wrapper">
        <div className="container navbar flex-between">
          <a href="#" className="brand-logo">
            <FlaskConical style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
            🧬 AasaMedChem 
            <span style={{ fontSize: '0.8rem', opacity: 0.7, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
              Buyer Portal
            </span>
          </a>
          <div className="nav-links">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Lab Facility: <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>
            </span>
            
            <div style={{ position: 'relative' }}>
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="nav-btn-relative" title="Notifications">
                <Bell style={{ width: '20px', height: '20px' }} />
                {pendingQuotes.length > 0 && (
                  <span className="notification-badge">{pendingQuotes.length}</span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <strong style={{ color: '#fff' }}>Notifications</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {pendingQuotes.length} Unread
                    </span>
                  </div>
                  <div className="notification-dropdown-body">
                    {pendingQuotes.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No new notifications
                      </div>
                    ) : (
                      pendingQuotes.map((q) => (
                        <div key={q.id} className="notification-item notification-item-unread" onClick={() => {
                          setIsNotificationsOpen(false);
                          const element = document.getElementById(`quote-${q.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}>
                          <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
                            New Quote Proposal
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {q.user_name} (Seller) sent Quote Proposal #{q.id.slice(0, 8)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                            {new Date(q.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
              {theme === 'dark' ? <Sun style={{ width: '20px', height: '20px' }} /> : <Moon style={{ width: '20px', height: '20px' }} />}
            </button>

            {/* Profile Menu Dropdown */}
            <div className="profile-menu-container">
              <div 
                className="profile-dropdown-trigger" 
                title="User Settings"
                onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); }}
              >
                <User style={{ width: '18px', height: '18px' }} />
              </div>
              {isProfileOpen && (
                <div className="profile-dropdown" style={{ display: 'block' }}>
                  <button onClick={() => router.push('/profile')} className="profile-dropdown-item">
                    <User style={{ width: '14px', height: '14px' }} />
                    Profile Details
                  </button>
                  <div className="profile-dropdown-divider"></div>
                  <button onClick={handleLogout} className="profile-dropdown-item" style={{ color: 'var(--color-danger)' }}>
                    <LogOut style={{ width: '14px', height: '14px' }} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, padding: '32px 24px' }}>
        {error && <div className="alert alert-error mb-6">{error}</div>}
        {success && <div className="alert alert-success mb-6">{success}</div>}

        {/* Metrics Grid */}
        <section className="grid-3 mb-6">
          <div className="glass-card" style={{ borderColor: pendingQuotes.length > 0 ? 'var(--border-hover)' : 'var(--border-color)' }}>
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Pending Proposal Review</p>
              <ClipboardCheck style={{ width: '18px', height: '18px', color: 'var(--color-warning)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px', color: pendingQuotes.length > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
              {pendingQuotes.length}
            </h3>
          </div>
          
          <div className="glass-card">
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Signed Orders</p>
              <FileText style={{ width: '18px', height: '18px', color: 'var(--color-secondary)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px', color: 'var(--color-secondary)' }}>
              {signedOrdersCount}
            </h3>
          </div>
          
          <div className="glass-card">
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Approved Expenses</p>
              <TrendingDown style={{ width: '18px', height: '18px', color: 'var(--color-success)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px', color: 'var(--color-success)' }}>
              {formatINR(approvedTotalCost)}
            </h3>
          </div>
        </section>

        {/* Active Quotations Pending Signoff */}
        <section className="mb-6 animate-fade-in">
          <h2 className="mb-4">Quotations Awaiting Your Confirmation</h2>
          
          {pendingQuotes.length === 0 ? (
            <div className="glass-card text-center" style={{ padding: '40px 24px' }}>
              <p style={{ fontSize: '1.1rem' }}>No quotations are currently awaiting your sign-off.</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>Your chemical sales representative can build and submit quotations to your laboratory.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {pendingQuotes.map((order) => (
                <div id={`quote-${order.id}`} key={order.id} className="glass-card" style={{ borderColor: 'var(--border-hover)' }}>
                  <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Proposal Quote #{order.id.slice(0, 8)}</span>
                        <span className="badge badge-pending">
                          <Clock style={{ width: '11px', height: '11px' }} />
                          Needs Signature
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Drafted by Seller Representative: <strong style={{ color: '#fff' }}>{order.user_name}</strong> &bull; Received: {new Date(order.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="text-right">
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Quoted Total</p>
                      <h4 style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>{formatINR(parseFloat(order.total_price))}</h4>
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div style={{ marginBottom: '16px' }}>
                    <div className="table-container" style={{ marginTop: '0', background: 'rgba(0,0,0,0.1)' }}>
                      <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Item Specs</th>
                            <th>Quoted Quantity</th>
                            <th>Base Storage Conversion</th>
                            <th>Price Rate</th>
                            <th className="text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <div>
                                  <strong style={{ color: '#fff' }}>{item.product_name}</strong>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <span className="sku-code" style={{ fontSize: '0.75rem' }}>{item.product_sku}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dimension: {item.product_dimension}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--color-secondary)' }}>{formatQuantity(parseFloat(item.ordered_quantity))} {item.ordered_unit}</strong>
                              </td>
                              <td>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {formatQuantity(parseFloat(item.converted_quantity))} {item.product_base_unit}
                                </span>
                              </td>
                              <td>
                                <span>{formatINR(parseFloat(item.price_per_unit))} / {item.ordered_unit}</span>
                              </td>
                              <td className="text-right" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                {formatINR(parseFloat(item.line_total))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Accept / Decline actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      onClick={() => handleStatusTransition(order.id, 'rejected')}
                      className="btn btn-secondary"
                      style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', fontSize: '0.85rem' }}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === `${order.id}-rejected` ? 'Declining...' : 'Decline'}
                    </button>
                    
                    <button
                      onClick={() => handleStatusTransition(order.id, 'pending_admin')}
                      className="btn btn-success"
                      style={{ fontSize: '0.85rem' }}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === `${order.id}-pending_admin` ? (
                        <>
                          <Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} />
                          Signing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                          Confirm & Accept Quote
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Previous Orders Ledger */}
        <section className="animate-fade-in">
          <div className="glass-card">
            <h2 className="mb-4">Historical Orders Ledger</h2>
            
            {orders.length === 0 ? (
              <div className="text-center" style={{ padding: '32px 0' }}>
                <p style={{ color: 'var(--text-muted)' }}>No historical logs available.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Creation Date</th>
                      <th>Contents</th>
                      <th>Total cost</th>
                      <th>Milestones Tracker</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: '#fff' }}>#{ord.id.slice(0, 8)}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Representative: {ord.user_name}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {new Date(ord.created_at).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {ord.items.map((it) => (
                              <span key={it.id} style={{ fontSize: '0.8rem' }}>
                                &bull; {it.product_name} &mdash; <strong>{formatQuantity(parseFloat(it.ordered_quantity))} {it.ordered_unit}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-primary)' }}>{formatINR(parseFloat(ord.total_price))}</strong>
                        </td>
                        <td>
                          <div>
                            <span className={`badge badge-${ord.status === 'pending_buyer' ? 'pending' : ord.status === 'pending_admin' ? 'seller' : ord.status}`}>
                              {getStatusLabel(ord.status)}
                            </span>
                            {renderTimeline(ord.status)}
                          </div>
                        </td>
                        <td className="text-right">
                          <button 
                            onClick={() => setSelectedOrder(ord)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            <FileText style={{ width: '12px', height: '12px' }} />
                            Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Invoice Modal Overlay */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '650px', background: 'var(--bg-dark-gray)', border: '1px solid var(--border-hover)' }}>
            
            {/* Printable Area */}
            <div id="invoice-print-area" style={{ padding: '10px' }}>
              <div className="flex-between" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '1.6rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FlaskConical style={{ width: '22px', height: '22px' }} /> AasaMedChem
                  </h1>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Precision Chemical & Pharmaceutical Supply</p>
                </div>
                <div className="text-right">
                  <h3>INVOICE</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quote Ref: #{selectedOrder.id.slice(0, 16)}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date: {new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="grid-2 mb-6" style={{ fontSize: '0.85rem' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Supplier Agent:</p>
                  <strong style={{ color: '#fff' }}>{selectedOrder.user_name}</strong>
                  <p style={{ color: 'var(--text-secondary)' }}>Email: {selectedOrder.user_email}</p>
                  {selectedOrder.user_phone && (
                    <p style={{ color: 'var(--text-secondary)' }}>Phone: {selectedOrder.user_phone}</p>
                  )}
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Client Facility:</p>
                  <strong style={{ color: '#fff' }}>{selectedOrder.buyer_name || user?.name}</strong>
                  <p style={{ color: 'var(--text-secondary)' }}>Account Ref: {selectedOrder.buyer_id.slice(0, 8)}</p>
                </div>
              </div>

              <div className="table-container" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Chemical Description</th>
                      <th>Ordered Quantity</th>
                      <th>Converted Base</th>
                      <th>Price Rate</th>
                      <th className="text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <strong>{item.product_name}</strong>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {item.product_sku}</div>
                          </div>
                        </td>
                        <td>{formatQuantity(parseFloat(item.ordered_quantity))} {item.ordered_unit}</td>
                        <td>{formatQuantity(parseFloat(item.converted_quantity))} {item.product_base_unit}</td>
                        <td>{formatINR(parseFloat(item.price_per_unit))} / {item.ordered_unit}</td>
                        <td className="text-right">{formatINR(parseFloat(item.line_total))}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 'bold' }}>
                      <td colSpan={3} style={{ border: 'none' }}></td>
                      <td style={{ border: 'none', color: 'var(--text-secondary)' }}>Grand Total:</td>
                      <td className="text-right" style={{ border: 'none', color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                        {formatINR(parseFloat(selectedOrder.total_price))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ borderTop: '1px dashed var(--text-muted)', width: '150px', textAlign: 'center', paddingTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Supplier Signature
                </div>
                <div style={{ borderTop: '1px dashed var(--text-muted)', width: '150px', textAlign: 'center', paddingTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Authorized Receiver
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button onClick={() => window.print()} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <Printer style={{ width: '14px', height: '14px' }} />
                Print Document
              </button>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        ⚖️ AasaMedChem High-Precision Audit System &bull; SQL Types: <code>NUMERIC(20,8)</code> for quantities, <code>NUMERIC(15,2)</code> for currency.
      </footer>
    </div>
  );
}
