'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  formatINR, 
  formatQuantity, 
  calculateLineMetrics, 
  getUnitsByDimension,
  DimensionType,
  SupportedUnit
} from '@/lib/units';
import {
  FlaskConical,
  LogOut,
  Loader2,
  Search,
  ShoppingCart,
  Trash2,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  DollarSign,
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

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  dimension: DimensionType;
  base_unit: SupportedUnit;
  base_price: string;
  stock_quantity: string;
}

interface CartItem {
  product: Product;
  quantity: string;
  unit: SupportedUnit;
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
  status: 'pending_buyer' | 'pending_admin' | 'approved' | 'rejected';
  total_price: string;
  created_at: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  items: OrderItem[];
}

export default function SellerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [buyers, setBuyers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Cart & Submission State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
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

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Page Loading States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function initSeller() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.replace('/login');
          return;
        }

        const meData = await meRes.json();
        if (meData.success && meData.user && meData.user.role === 'seller') {
          setUser(meData.user);
          await Promise.all([fetchProducts(), fetchBuyers(), fetchOrders()]);
        } else {
          router.replace('/login');
        }
      } catch (err) {
        console.error('Seller init failed:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    initSeller();
  }, [router]);

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

  const fetchBuyers = async () => {
    try {
      const res = await fetch('/api/users?role=buyer');
      const data = await res.json();
      if (data.success) {
        setBuyers(data.users);
      }
    } catch (err) {
      console.error('Fetch buyers error:', err);
    }
  };

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

  const addToCart = (product: Product) => {
    setError('');
    setSuccess('');
    const exists = cart.find((item) => item.product.id === product.id);
    if (exists) {
      setError(`Product "${product.name}" is already in your quotation builder.`);
      return;
    }

    const allowedUnits = getUnitsByDimension(product.dimension);
    const defaultUnit = allowedUnits.includes('kg') ? 'kg' : allowedUnits.includes('L') ? 'L' : allowedUnits[0];

    setCart([...cart, { product, quantity: '1', unit: defaultUnit }]);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const updateCartItem = (productId: string, key: 'quantity' | 'unit', value: string) => {
    setCart(
      cart.map((item) => {
        if (item.product.id === productId) {
          return { ...item, [key]: value };
        }
        return item;
      })
    );
  };

  const handleSubmitQuotation = async () => {
    setError('');
    setSuccess('');

    if (!selectedBuyerId) {
      setError('Please select a Lab Buyer for this quotation.');
      return;
    }
    
    if (cart.length === 0) {
      setError('Quotation builder is empty. Add products first.');
      return;
    }

    for (const item of cart) {
      const q = parseFloat(item.quantity);
      if (isNaN(q) || q <= 0) {
        setError(`Please enter a valid quantity for "${item.product.name}".`);
        return;
      }
      
      const metrics = calculateLineMetrics(q, item.unit, parseFloat(item.product.base_price));
      const currentStock = parseFloat(item.product.stock_quantity);
      
      if (metrics.convertedQuantity > currentStock) {
        setError(
          `Insufficient stock for "${item.product.name}". ` +
          `Available stock is ${formatQuantity(currentStock)} ${item.product.base_unit}. ` +
          `Requested: ${formatQuantity(metrics.convertedQuantity)} ${item.product.base_unit} (equivalent to ${q} ${item.unit}).`
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const formattedItems = cart.map((item) => ({
        product_id: item.product.id,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: formattedItems, buyer_id: selectedBuyerId }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Quotation successfully sent to Buyer for sign-off!');
        setCart([]);
        setSelectedBuyerId('');
        setIsCartOpen(false);
        await Promise.all([fetchProducts(), fetchOrders()]);
      } else {
        setError(data.error || 'Failed to submit quotation');
      }
    } catch (err) {
      setError('Connection error submitting quotation');
    } finally {
      setSubmitting(false);
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
      case 'pending_buyer': return 'Sent to Buyer';
      case 'pending_admin': return 'Awaiting Dispatch';
      case 'approved': return 'Dispatched';
      case 'rejected': return 'Rejected';
    }
  };

  const categories = Array.from(new Set(products.map((p) => p.category || 'Uncategorized')));
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesCategory = selectedCategory === '' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartLines = cart.map((item) => {
    const qVal = parseFloat(item.quantity) || 0;
    const basePrice = parseFloat(item.product.base_price);
    const metrics = calculateLineMetrics(qVal, item.unit, basePrice);
    const currentStock = parseFloat(item.product.stock_quantity);
    const isExceeded = metrics.convertedQuantity > currentStock;
    
    return {
      ...item,
      metrics,
      currentStock,
      isExceeded,
    };
  });

  const cartTotal = cartLines.reduce((acc, curr) => acc + curr.metrics.lineTotal, 0);

  // Performance metrics calculation
  const totalSent = orders.length;
  const pendingBuyerSig = orders.filter((o) => o.status === 'pending_buyer').length;
  const approvedClosed = orders.filter((o) => o.status === 'approved').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar Header */}
      <header className="navbar-wrapper">
        <div className="container navbar flex-between">
          <a href="#" className="brand-logo">
            <FlaskConical style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
            🧬 AasaMedChem 
            <span style={{ fontSize: '0.8rem', opacity: 0.7, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
              Seller Portal
            </span>
          </a>
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Representative: <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>
            </span>
            
            <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
              {theme === 'dark' ? <Sun style={{ width: '20px', height: '20px' }} /> : <Moon style={{ width: '20px', height: '20px' }} />}
            </button>

            <button onClick={() => setIsCartOpen(true)} className="nav-btn-relative" title="Open Quotation Cart">
              <ShoppingCart style={{ width: '20px', height: '20px' }} />
              {cart.length > 0 && (
                <span className="notification-badge">{cart.length}</span>
              )}
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

      {/* Main Content */}
      <main className="container" style={{ flex: 1, padding: '32px 24px' }}>
        {error && <div className="alert alert-error mb-6">{error}</div>}
        {success && <div className="alert alert-success mb-6">{success}</div>}

        {/* KPI Tiles */}
        <section className="grid-3 mb-6">
          <div className="glass-card">
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Total Quotes Issued</p>
              <FileText style={{ width: '18px', height: '18px', color: 'var(--color-secondary)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px' }}>{totalSent}</h3>
          </div>
          
          <div className="glass-card">
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Pending Buyer Signoff</p>
              <Clock style={{ width: '18px', height: '18px', color: 'var(--color-warning)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px', color: 'var(--color-warning)' }}>{pendingBuyerSig}</h3>
          </div>
          
          <div className="glass-card">
            <div className="flex-between">
              <p className="form-label" style={{ fontSize: '0.75rem' }}>Dispatched Deals</p>
              <CheckCircle2 style={{ width: '18px', height: '18px', color: 'var(--color-success)' }} />
            </div>
            <h3 style={{ fontSize: '1.8rem', marginTop: '8px', color: 'var(--color-success)' }}>{approvedClosed}</h3>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          {/* Product Directory */}
          <section className="animate-fade-in">
            <div className="glass-card mb-6">
              <h2 className="mb-4" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
                Chemical Inventory Catalog
              </h2>
              
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Search SKU or Keyword</label>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: '40px' }}
                      placeholder="e.g. Aspirin, ACS ethanol..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Filter by Category</label>
                  <select
                    className="select-field"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid-2" style={{ gap: '20px' }}>
              {filteredProducts.length === 0 ? (
                <div className="glass-card text-center" style={{ padding: '40px', gridColumn: 'span 2' }}>
                  <p>No products match your search criteria.</p>
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const qty = parseFloat(prod.stock_quantity);
                  const isOutOfStock = qty <= 0;
                  const displayPrice = parseFloat(prod.base_price);
                  const unitLabel = prod.base_unit;
                  const health = getStockHealth(prod);

                  return (
                    <div key={prod.id} className="glass-card glass-card-interactive" style={{ padding: '20px' }}>
                      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ fontSize: '1.15rem' }}>{prod.name}</h3>
                            <span className="sku-code" style={{ fontSize: '0.75rem' }}>{prod.sku}</span>
                          </div>
                          
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Category: <span style={{ color: 'var(--text-secondary)' }}>{prod.category}</span> &bull; Dimension: <span style={{ color: 'var(--text-secondary)' }}>{prod.dimension}</span>
                          </p>
                          
                          {prod.description && (
                            <p style={{ fontSize: '0.85rem', marginTop: '10px', color: 'var(--text-secondary)' }}>
                              {prod.description}
                            </p>
                          )}

                          {/* Visual stock levels gauge */}
                          <div style={{ marginTop: '16px', maxWidth: '350px' }}>
                            <div className="flex-between mb-2" style={{ fontSize: '0.75rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Stock Levels Gauge:</span>
                              <strong style={{ color: health.pct < 20 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                                {isOutOfStock ? 'Out of Stock' : `${formatQuantity(qty)} ${prod.base_unit}`}
                              </strong>
                            </div>
                            <div style={{ height: '5px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${health.pct}%`, background: health.color, borderRadius: '9999px' }}></div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Price Rate</span>
                              <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>
                                {formatINR(displayPrice)} / {unitLabel}
                              </strong>
                              {prod.base_unit !== 'item' && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {' '}({formatINR(displayPrice * 1000)} / {prod.base_unit === 'g' ? 'kg' : 'L'})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => addToCart(prod)}
                          className="btn btn-primary"
                          style={{ padding: '10px 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                          disabled={isOutOfStock}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Cart Drawer Slide-Over */}
        {isCartOpen && (
          <>
            <div className="cart-drawer-backdrop" onClick={() => setIsCartOpen(false)} />
            <div className="cart-drawer">
              <div className="cart-drawer-header">
                <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
                  Quotation Cart
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="nav-btn-relative" title="Close Cart">
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>

              <div className="cart-drawer-body">
                {cart.length === 0 ? (
                  <div className="text-center" style={{ padding: '40px 0' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Select chemical compounds from the catalog to construct a quote proposal.</p>
                  </div>
                ) : (
                  <div>
                    {/* Select Buyer */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Recipient Lab Buyer</label>
                      <select
                        className="select-field"
                        value={selectedBuyerId}
                        onChange={(e) => setSelectedBuyerId(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Registered Buyer --</option>
                        {buyers.map((b) => (
                          <option key={b.id} value={b.id}>{b.name} ({b.email})</option>
                        ))}
                      </select>
                    </div>

                    {/* Cart Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                      {cartLines.map((item) => {
                        const { product, quantity, unit, metrics, currentStock, isExceeded } = item;
                        const allowedUnits = getUnitsByDimension(product.dimension);
                        
                        return (
                          <div key={product.id} style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            padding: '16px',
                            background: isExceeded ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.15)',
                            borderColor: isExceeded ? 'var(--color-danger)' : 'var(--border-color)',
                          }}>
                            <div className="flex-between mb-2">
                              <div>
                                <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{product.name}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  SKU: {product.sku} &bull; Stock: {formatQuantity(currentStock)} {product.base_unit}
                                </div>
                              </div>
                              <button
                                onClick={() => removeFromCart(product.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-danger)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.85rem'
                                }}
                              >
                                <Trash2 style={{ width: '12px', height: '12px' }} />
                                Remove
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: '10px', marginTop: '12px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Qty</label>
                                <input
                                  type="number"
                                  step="0.00000001"
                                  min="0"
                                  className="input-field"
                                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                  value={quantity}
                                  onChange={(e) => updateCartItem(product.id, 'quantity', e.target.value)}
                                />
                              </div>
                              
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Unit</label>
                                <select
                                  className="select-field"
                                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                  value={unit}
                                  onChange={(e) => updateCartItem(product.id, 'unit', e.target.value as SupportedUnit)}
                                >
                                  {allowedUnits.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.05)' }}>
                              <div className="flex-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Rate:</span>
                                <strong>{formatINR(metrics.pricePerUnit)} / {unit}</strong>
                              </div>
                              
                              <div className="flex-between" style={{ marginTop: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Storage Equivalent:</span>
                                <strong>{formatQuantity(metrics.convertedQuantity)} {product.base_unit}</strong>
                              </div>
                              
                              {isExceeded && (
                                <div style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.75rem', marginTop: '6px', textAlign: 'center' }}>
                                  ⚠️ Request exceeds available stock!
                                </div>
                              )}

                              <div className="flex-between" style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Subtotal:</span>
                                <strong style={{ color: 'var(--color-primary)' }}>{formatINR(metrics.lineTotal)}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="cart-drawer-footer">
                <div className="flex-between mb-4">
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total Quotation:</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '1.4rem' }}>{formatINR(cartTotal)}</strong>
                </div>

                <button
                  onClick={handleSubmitQuotation}
                  className="btn btn-primary w-full"
                  disabled={submitting || cartLines.some((item) => item.isExceeded) || !selectedBuyerId}
                  style={{ padding: '14px' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} />
                      Submitting...
                    </>
                  ) : (
                    'Issue Quote to Buyer'
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Bottom Section: Order History */}
        <section className="animate-fade-in mt-6">
          <div className="glass-card">
            <h2 className="mb-4" style={{ fontSize: '1.4rem' }}>Drafted Quotations Log</h2>
            
            {orders.length === 0 ? (
              <div className="text-center" style={{ padding: '32px 0' }}>
                <p style={{ color: 'var(--text-muted)' }}>You haven't submitted any quotes yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Quote ID</th>
                      <th>Creation Date</th>
                      <th>Recipient Buyer</th>
                      <th>Order Contents</th>
                      <th>Quoted Total</th>
                      <th>Status Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: '#fff' }}>#{ord.id.slice(0, 8)}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {new Date(ord.created_at).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{ord.buyer_name}</strong>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{ord.buyer_email}</p>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {ord.items.map((item) => (
                              <div key={item.id} style={{ fontSize: '0.8rem' }}>
                                &bull; {item.product_name} &mdash; 
                                <strong style={{ color: 'var(--color-secondary)' }}> {formatQuantity(parseFloat(item.ordered_quantity))} {item.ordered_unit}</strong>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> (stored as {formatQuantity(parseFloat(item.converted_quantity))} {item.product_base_unit})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>{formatINR(parseFloat(ord.total_price))}</strong>
                        </td>
                        <td>
                          <div>
                            <span className={`badge badge-${ord.status === 'pending_buyer' ? 'pending' : ord.status === 'pending_admin' ? 'seller' : ord.status}`}>
                              {getStatusLabel(ord.status)}
                            </span>
                            {renderTimeline(ord.status)}
                          </div>
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

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        ⚖️ AasaMedChem Quotation System &bull; All calculations processed dynamically with high float precision.
      </footer>
    </div>
  );
}
