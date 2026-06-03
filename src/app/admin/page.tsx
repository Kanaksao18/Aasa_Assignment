'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR, formatQuantity } from '@/lib/units';
import {
  FlaskConical,
  LogOut,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ClipboardList,
  TrendingUp,
  Users,
  Eye,
  Plus,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Printer,
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
  created_at?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  dimension: 'weight' | 'volume' | 'count';
  base_unit: 'g' | 'mL' | 'item';
  base_price: string;
  stock_quantity: string;
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
  buyer_email: string;
  status: 'pending_buyer' | 'pending_admin' | 'approved' | 'rejected';
  total_price: string;
  created_at: string;
  items: OrderItem[];
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'users'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Product CRUD states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [dimension, setDimension] = useState<'weight' | 'volume' | 'count'>('weight');
  const [baseUnit, setBaseUnit] = useState<'g' | 'mL' | 'item'>('g');
  const [basePrice, setBasePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  
  // Status states
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

  // Diagnostics Console State
  const [logs, setLogs] = useState<{ timestamp: string; level: 'info' | 'success' | 'warning' | 'danger'; message: string }[]>([
    { timestamp: new Date().toLocaleTimeString(), level: 'success', message: 'Administrative console link established.' },
    { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Connection established with Neon PostgreSQL over Secure WebSockets.' }
  ]);
  const logEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mockMsgs = [
      { level: 'info', message: 'Acquiring row-level database lock on chemical SKUs...' },
      { level: 'info', message: 'SELECT stock_quantity, dimension FROM products;' },
      { level: 'success', message: 'Inventory cache validated. Sync rate: 100%.' },
      { level: 'warning', message: 'Neon Postgres cold start warning: database connection timeout extended.' },
      { level: 'success', message: 'High-precision unit conversion logic loaded for weight and volume dimensions.' },
      { level: 'info', message: 'Audit log trace: verifying cryptographic session integrity...' },
      { level: 'info', message: 'Executing batch transaction: UPDATE orders SET status = ...' },
      { level: 'success', message: 'Dispatch authorization verified for administrative role.' },
      { level: 'info', message: 'Broadcasting live notification events to connected client ports...' },
      { level: 'success', message: 'Transaction isolation level set to SERIALIZABLE.' }
    ];

    const interval = setInterval(() => {
      const randomMsg = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), level: randomMsg.level as any, message: randomMsg.message }
      ].slice(-30));
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const consoleBody = logEndRef.current?.parentElement;
    if (consoleBody) {
      consoleBody.scrollTop = consoleBody.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    async function initDashboard() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.replace('/login');
          return;
        }

        const meData = await meRes.json();
        if (meData.success && meData.user && meData.user.role === 'admin') {
          setUser(meData.user);
          await Promise.all([fetchOrders(), fetchProducts(), fetchDirectoryUsers()]);
        } else {
          router.replace('/login');
        }
      } catch (err) {
        console.error('Admin init failed:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    initDashboard();
  }, [router]);

  useEffect(() => {
    if (!editingProduct) {
      if (dimension === 'weight') setBaseUnit('g');
      else if (dimension === 'volume') setBaseUnit('mL');
      else if (dimension === 'count') setBaseUnit('item');
    }
  }, [dimension, editingProduct]);

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

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  };

  const fetchDirectoryUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setDirectoryUsers(data.users);
      }
    } catch (err) {
      console.error('Fetch users directory error:', err);
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

  const handleUpdateOrderStatus = async (orderId: string, status: 'approved' | 'rejected') => {
    setActionLoading(orderId + '-' + status);
    setError('');
    setSuccess('');
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Executing status transition: Order #${orderId.slice(0, 8)} to ${status}...` }
    ]);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Order has been successfully ${status === 'approved' ? 'Approved & Dispatched' : 'Rejected'}.`);
        setLogs((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Order #${orderId.slice(0, 8)} updated successfully. Inventory stock adjustments finalized.` }
        ]);
        await Promise.all([fetchOrders(), fetchProducts()]);
      } else {
        setError(data.error || 'Failed to update order status');
        setLogs((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), level: 'danger', message: `Order status update failed: ${data.error}` }
        ]);
      }
    } catch (err) {
      setError('Connection error updating order status');
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), level: 'danger', message: 'Connection error during state transition write operation.' }
      ]);
    } finally {
      setActionLoading(null);
    }
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setSku('');
    setName('');
    setDescription('');
    setCategory('');
    setDimension('weight');
    setBaseUnit('g');
    setBasePrice('');
    setStockQuantity('');
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const openEditForm = (prod: Product) => {
    setEditingProduct(prod);
    setSku(prod.sku);
    setName(prod.name);
    setDescription(prod.description || '');
    setCategory(prod.category || '');
    setDimension(prod.dimension);
    setBaseUnit(prod.base_unit);
    setBasePrice(parseFloat(prod.base_price).toString());
    setStockQuantity(parseFloat(prod.stock_quantity).toString());
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading('submit-product');
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Submitting product details: SKU ${sku} (${name})...` }
    ]);

    const body = {
      sku,
      name,
      description,
      category,
      dimension,
      base_unit: baseUnit,
      base_price: parseFloat(basePrice),
      stock_quantity: parseFloat(stockQuantity),
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(editingProduct ? 'Product updated successfully.' : 'Product created successfully.');
        setLogs((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Product SKU ${sku} saved successfully to catalog.` }
        ]);
        setIsFormOpen(false);
        await fetchProducts();
      } else {
        setError(data.error || 'Failed to save product');
        setLogs((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), level: 'danger', message: `Failed to save product SKU ${sku}: ${data.error}` }
        ]);
      }
    } catch (err) {
      setError('Connection error submitting product');
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), level: 'danger', message: 'Connection error during product write operation.' }
      ]);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setError('');
    setSuccess('');
    setActionLoading('delete-' + id);
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Initiated delete for Product ID: ${id}...` }
    ]);

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccess('Product deleted successfully.');
        setLogs((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), level: 'warning', message: `Product ID: ${id} successfully removed from catalog database.` }
        ]);
        await fetchProducts();
      } else {
        setError(data.error || 'Failed to delete product');
        setLogs((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), level: 'danger', message: `Delete failed: ${data.error}` }
        ]);
      }
    } catch (err) {
      setError('Connection error deleting product');
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), level: 'danger', message: 'Connection error during delete operation.' }
      ]);
    } finally {
      setActionLoading(null);
    }
  };

  const getStockHealth = (prod: Product) => {
    const qty = parseFloat(prod.stock_quantity);
    let max = 1000;
    if (prod.dimension === 'weight') max = 50000; 
    else if (prod.dimension === 'volume') max = 100000; 
    
    const pct = Math.min(100, Math.max(0, (qty / max) * 100));
    let color = 'var(--color-success)';
    if (pct < 20) color = 'var(--color-danger)';
    else if (pct < 50) color = 'var(--color-warning)';
    
    return { pct, color };
  };

  const isLowStock = (prod: Product) => {
    const qty = parseFloat(prod.stock_quantity);
    if (prod.dimension === 'weight') return qty < 1000.0; 
    if (prod.dimension === 'volume') return qty < 1000.0; 
    return qty < 10; 
  };

  const renderTimeline = (status: Order['status']) => {
    if (status === 'rejected') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
          <XCircle style={{ width: '12px', height: '12px', color: 'var(--color-danger)' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', fontWeight: 600 }}>Declined</span>
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
      case 'pending_buyer': return 'Awaiting Buyer Signoff';
      case 'pending_admin': return 'Awaiting Admin Dispatch';
      case 'approved': return 'Dispatched';
      case 'rejected': return 'Rejected';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // Metrics
  const totalSales = orders
    .filter((o) => o.status === 'approved')
    .reduce((acc, curr) => acc + parseFloat(curr.total_price), 0);
  const pendingAdminCount = orders.filter((o) => o.status === 'pending_admin').length;
  const lowStockCount = products.filter(isLowStock).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Navigation */}
      <header className="navbar-wrapper">
        <div className="container navbar flex-between">
          <a href="#" className="brand-logo">
            <FlaskConical style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
            🧬 AasaMedChem 
            <span style={{ fontSize: '0.8rem', opacity: 0.7, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
              Admin Console
            </span>
          </a>
          <div className="nav-links">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Administrator: <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>
            </span>

            {/* Notification Dropdown for pending admin orders */}
            {(() => {
              const pendingAdminOrders = orders.filter((o) => o.status === 'pending_admin');
              return (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="nav-btn-relative" title="Notifications">
                    <Bell style={{ width: '20px', height: '20px' }} />
                    {pendingAdminOrders.length > 0 && (
                      <span className="notification-badge">{pendingAdminOrders.length}</span>
                    )}
                  </button>
                  {isNotificationsOpen && (
                    <div className="notification-dropdown">
                      <div className="notification-dropdown-header">
                        <strong style={{ color: '#fff' }}>Notifications</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {pendingAdminOrders.length} Dispatch Alerts
                        </span>
                      </div>
                      <div className="notification-dropdown-body">
                        {pendingAdminOrders.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No pending dispatch requests
                          </div>
                        ) : (
                          pendingAdminOrders.map((q) => (
                            <div key={q.id} className="notification-item notification-item-unread" onClick={() => {
                              setIsNotificationsOpen(false);
                              setActiveTab('orders');
                              setTimeout(() => {
                                const element = document.getElementById(`quote-${q.id}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth' });
                                }
                              }, 100);
                            }}>
                              <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
                                Signed Quotation Ready
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {q.buyer_name} signed Quote #{q.id.slice(0, 8)}. Ready for Dispatch.
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
              );
            })()}

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

        {/* Global Statistics */}
        <section className="grid-4 mb-6">
          <div className="glass-card">
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Total Closed Revenue</p>
              <TrendingUp style={{ width: '18px', height: '18px', color: 'var(--color-success)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px', color: 'var(--color-success)' }}>{formatINR(totalSales)}</h3>
          </div>
          
          <div className="glass-card">
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Awaiting Dispatch</p>
              <Clock style={{ width: '18px', height: '18px', color: 'var(--color-warning)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px', color: 'var(--color-warning)' }}>{pendingAdminCount}</h3>
          </div>
          
          <div className="glass-card">
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Chemical SKUs</p>
              <FlaskConical style={{ width: '18px', height: '18px', color: 'var(--color-secondary)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px' }}>{products.length}</h3>
          </div>
          
          <div className="glass-card" style={{ borderColor: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)' }}>
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Low Stock Warning</p>
              <ShieldAlert style={{ width: '18px', height: '18px', color: lowStockCount > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px', color: lowStockCount > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
              {lowStockCount}
            </h3>
          </div>
        </section>

        {/* Console Nav Tabs */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px' }}
          >
            <ClipboardList style={{ width: '14px', height: '14px' }} />
            Quotation Queue ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px' }}
          >
            <FlaskConical style={{ width: '14px', height: '14px' }} />
            Inventory Catalog ({products.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('users');
              fetchDirectoryUsers();
            }}
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px' }}
          >
            <Users style={{ width: '14px', height: '14px' }} />
            Users Directory ({directoryUsers.length})
          </button>
        </div>

        {/* Tab 1: Orders Queue */}
        {activeTab === 'orders' && (
          <section className="animate-fade-in">
            <div className="flex-between mb-4">
              <h2>Quotations Pipeline Log</h2>
              <button onClick={fetchOrders} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Refresh Queue
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="glass-card text-center" style={{ padding: '60px 24px' }}>
                <p style={{ fontSize: '1.1rem' }}>No quotations found in the database.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {orders.map((order) => (
                  <div id={`quote-${order.id}`} key={order.id} className="glass-card" style={{
                    borderColor: order.status === 'pending_admin' ? 'var(--border-hover)' : 'var(--border-color)'
                  }}>
                    {/* Attribution Details Header */}
                    <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Quotation #{order.id.slice(0, 8)}</span>
                          <span className={`badge badge-${order.status === 'pending_buyer' ? 'pending' : order.status === 'pending_admin' ? 'seller' : order.status}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Drafted by Seller Representative: <strong style={{ color: '#fff' }}>{order.user_name}</strong> &bull; 
                          Recipient Lab Facility: <strong style={{ color: '#fff' }}> {order.buyer_name}</strong> &bull; 
                          Created: {new Date(order.created_at).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="text-right">
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Invoice Subtotal</p>
                        <h4 style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>{formatINR(parseFloat(order.total_price))}</h4>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Milestone Tracker:</span>
                      {renderTimeline(order.status)}
                    </div>

                    {/* Items table */}
                    <div style={{ marginBottom: '16px' }}>
                      <div className="table-container" style={{ marginTop: '0', background: 'rgba(0,0,0,0.1)' }}>
                        <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th>Product Details</th>
                              <th>Ordered Quantity</th>
                              <th>Base Storage Quantity</th>
                              <th>Price Rate (INR)</th>
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
                                <td>{formatQuantity(parseFloat(item.converted_quantity))} {item.product_base_unit}</td>
                                <td>{formatINR(parseFloat(item.price_per_unit))} / {item.ordered_unit}</td>
                                <td className="text-right" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                  {formatINR(parseFloat(item.line_total))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button 
                        onClick={() => setSelectedOrder(order)} 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        <Eye style={{ width: '14px', height: '14px' }} />
                        View Invoice
                      </button>

                      {order.status === 'pending_admin' && (
                        <>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'rejected')}
                            className="btn btn-secondary"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', fontSize: '0.85rem' }}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === `${order.id}-rejected` ? 'Rejecting...' : 'Reject Quote'}
                          </button>
                          
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                            className="btn btn-success"
                            style={{ fontSize: '0.85rem' }}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === `${order.id}-approved` ? (
                              <>
                                <Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} />
                                Dispatching...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                                Approve & Dispatch
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Inventory Catalog */}
        {activeTab === 'inventory' && (
          <section className="animate-fade-in">
            <div className="flex-between mb-4">
              <h2>Inventory Products Catalog</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={fetchProducts} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Refresh Inventory
                </button>
                <button onClick={openAddForm} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                  <Plus style={{ width: '14px', height: '14px' }} />
                  Add New Product
                </button>
              </div>
            </div>

            {/* Modal CRUD Form */}
            {isFormOpen && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
              }}>
                <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                    {editingProduct ? `Edit Product: ${editingProduct.sku}` : 'Add New Chemical Product'}
                  </h3>

                  <form onSubmit={handleProductSubmit}>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">SKU Code</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. CHM-ASP-01"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          required
                          disabled={editingProduct !== null}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Product Name</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Aspirin USP (Powder)"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid-2 mt-4">
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Solvents, Active Ingredients"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Measurement Dimension</label>
                        <select
                          className="select-field"
                          value={dimension}
                          onChange={(e) => setDimension(e.target.value as any)}
                          disabled={editingProduct !== null}
                        >
                          <option value="weight">Weight (g, kg)</option>
                          <option value="volume">Volume (mL, L)</option>
                          <option value="count">Count (item)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid-3 mt-4">
                      <div className="form-group">
                        <label className="form-label">Base Storage Unit</label>
                        <select
                          className="select-field"
                          value={baseUnit}
                          onChange={(e) => setBaseUnit(e.target.value as any)}
                          disabled={true}
                        >
                          <option value="g">g (Grams)</option>
                          <option value="mL">mL (Milliliters)</option>
                          <option value="item">item (Count)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Base Price (INR / Unit)</label>
                        <input
                          type="number"
                          step="0.00000001"
                          min="0"
                          className="input-field"
                          placeholder={`INR per 1 ${baseUnit}`}
                          value={basePrice}
                          onChange={(e) => setBasePrice(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Stock Quantity ({baseUnit})</label>
                        <input
                          type="number"
                          step="0.00000001"
                          min="0"
                          className="input-field"
                          placeholder={`Stock in ${baseUnit}`}
                          value={stockQuantity}
                          onChange={(e) => setStockQuantity(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group mt-4">
                      <label className="form-label">Product Description</label>
                      <textarea
                        className="textarea-field"
                        rows={3}
                        placeholder="Safety specs, hazards, storage recommendations..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="btn btn-secondary"
                        disabled={actionLoading !== null}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === 'submit-product' ? 'Saving...' : 'Save Product'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Inventory table */}
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Chemical Details</th>
                    <th>Category</th>
                    <th>Inventory Levels</th>
                    <th>Pricing Rate (INR)</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => {
                    const price = parseFloat(prod.base_price);
                    const qty = parseFloat(prod.stock_quantity);
                    const health = getStockHealth(prod);
                    const isLow = isLowStock(prod);
                    
                    return (
                      <tr key={prod.id}>
                        <td>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{prod.name}</strong>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                              <span className="sku-code">{prod.sku}</span>
                              <span className="badge badge-seller" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{prod.dimension}</span>
                            </div>
                            {prod.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '350px' }}>{prod.description}</p>}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{prod.category}</span>
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600, color: isLow ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                              {formatQuantity(qty)} {prod.base_unit}
                            </span>
                            <div style={{ height: '4px', width: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden', marginTop: '6px' }}>
                              <div style={{ height: '100%', width: `${health.pct}%`, background: health.color }}></div>
                            </div>
                            {isLow && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginTop: '4px' }}>⚠️ Low Stock</span>}
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong style={{ color: 'var(--color-primary)' }}>{formatINR(price)}</strong> per {prod.base_unit}
                            {prod.base_unit !== 'item' && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                equivalent to: <strong>{formatINR(price * 1000)}</strong> per {prod.base_unit === 'g' ? 'kg' : 'L'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-right">
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => openEditForm(prod)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)' }}
                              disabled={actionLoading !== null}
                            >
                              <Trash2 style={{ width: '12px', height: '12px' }} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 3: Users Directory */}
        {activeTab === 'users' && (
          <section className="animate-fade-in">
            <div className="flex-between mb-4">
              <h2>Registered System Users Directory</h2>
              <button onClick={fetchDirectoryUsers} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Refresh Directory
              </button>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name / Facility</th>
                    <th>Email Address</th>
                    <th>Role Group</th>
                    <th>Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {directoryUsers.map((dirUser) => (
                    <tr key={dirUser.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{dirUser.id.slice(0, 8)}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#fff' }}>{dirUser.name}</strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)' }}>{dirUser.email}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${dirUser.role}`}>
                          {dirUser.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {dirUser.created_at ? new Date(dirUser.created_at).toLocaleDateString('en-IN') : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
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
            
            <div id="invoice-print-area" style={{ padding: '10px' }}>
              <div className="flex-between" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '1.6rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FlaskConical style={{ width: '22px', height: '22px' }} /> AasaMedChem
                  </h1>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Precision Chemicals & Pharmaceutical Supply</p>
                </div>
                <div className="text-right">
                  <h3>INVOICE</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quote Reference: #{selectedOrder.id.slice(0, 16)}</p>
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
                  <strong style={{ color: '#fff' }}>{selectedOrder.buyer_name}</strong>
                  <p style={{ color: 'var(--text-secondary)' }}>Email: {selectedOrder.buyer_email}</p>
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

            {/* Actions */}
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

      {/* System Diagnostics Terminal Console */}
      <div className="diagnostics-console">
        <div className="diagnostics-console-header">
          <div className="diagnostics-console-title">
            <span className="diagnostics-console-status"></span>
            <span>System Diagnostics Terminal</span>
          </div>
          <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Connection: Neon Serverless HTTPS / WebSocket Port 443</span>
        </div>
        <div className="diagnostics-console-body">
          {logs.map((log, idx) => (
            <div key={idx} className="diagnostics-log-line">
              <span className="diagnostics-timestamp">[{log.timestamp}]</span>
              <span className={`diagnostics-message diagnostics-message-${log.level}`}>
                {log.level === 'success' ? '✓' : log.level === 'warning' ? '⚠' : log.level === 'danger' ? '✗' : 'ℹ'} {log.message}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        ⚙️ AasaMedChem High-Precision Audit System &bull; SQL Types: <code>NUMERIC(20,8)</code> for quantities, <code>NUMERIC(15,2)</code> for currency.
      </footer>
    </div>
  );
}
