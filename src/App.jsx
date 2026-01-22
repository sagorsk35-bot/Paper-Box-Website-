import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Role hierarchy
const ROLES = {
  SUPERADMIN: 'superadmin',
  MODERATOR: 'moderator',
  USER: 'user'
};

// ============================================
// CONTEXTS
// ============================================
const AuthContext = createContext(null);
const ToastContext = createContext(null);
const CartContext = createContext(null);

// ============================================
// UTILITY FUNCTIONS
// ============================================
const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'paperbox_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ============================================
// SUPABASE API SERVICES
// ============================================

// Portfolio API
const portfolioAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (image) => {
    const { data, error } = await supabase
      .from('portfolio')
      .insert([{
        title: image.title || image.name,
        description: image.description || '',
        image_data: image.data,
        image_name: image.name,
        brand_name: image.brand_name || '',
        order_date: image.order_date || null,
        delivery_date: image.delivery_date || null
      }])
      .select();
    if (error) throw error;
    return data[0];
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('portfolio')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('portfolio')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// Offers API
const offersAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (offer) => {
    const { data, error } = await supabase
      .from('offers')
      .insert([{
        title: offer.title,
        description: offer.description,
        image_data: offer.image_data,
        discount_code: offer.discount_code,
        discount_percentage: offer.discount_percentage,
        valid_until: offer.valid_until,
        is_active: offer.is_active || true
      }])
      .select();
    if (error) throw error;
    return data[0];
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('offers')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// Comparison API
const comparisonAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('comparisons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (comparison) => {
    const { data, error } = await supabase
      .from('comparisons')
      .insert([{
        title: comparison.title,
        good_image_data: comparison.good_image_data,
        bad_image_data: comparison.bad_image_data,
        good_points: comparison.good_points,
        bad_points: comparison.bad_points,
        category: comparison.category || 'pizza_box'
      }])
      .select();
    if (error) throw error;
    return data[0];
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('comparisons')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('comparisons')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// Users API
const usersAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, username, email, role, created_at')
      .neq('role', 'superadmin')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (user) => {
    const hashedPassword = await hashPassword(user.password);
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: user.name,
        username: user.username,
        email: user.email,
        password: hashedPassword,
        role: 'moderator'
      }])
      .select();
    if (error) throw error;
    return data[0];
  },
  update: async (id, updates) => {
    const updateData = { name: updates.name, email: updates.email };
    if (updates.password) {
      updateData.password = await hashPassword(updates.password);
    }
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// Contacts API
const contactsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const contacts = data || [];
    const unread = contacts.filter(c => !c.is_read).length;
    return { contacts, unread };
  },
  create: async (contact) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        message: contact.message,
        is_read: false
      }])
      .select();
    if (error) throw error;
    return data[0];
  },
  markAsRead: async (id) => {
    const { data, error } = await supabase
      .from('contacts')
      .update({ is_read: true })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// Products API
const productsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  getActive: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        image_data: product.image_data,
        is_active: product.is_active || true,
        stock_quantity: product.stock_quantity || 0
      }])
      .select();
    if (error) throw error;
    return data[0];
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// Orders API
const ordersAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  getById: async (id) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  create: async (order) => {
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        customer_address: order.customer_address,
        order_items: order.order_items,
        subtotal: order.subtotal,
        discount_amount: order.discount_amount,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_status: 'pending',
        order_status: 'processing'
      }])
      .select();
    if (error) throw error;
    return data[0];
  },
  updateStatus: async (id, updates) => {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// Cart API
const cartAPI = {
  saveSession: async (sessionId, items) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const { error } = await supabase
      .from('cart_sessions')
      .upsert({
        session_id: sessionId,
        items: items,
        expires_at: expiresAt.toISOString()
      });
    
    if (error) throw error;
    return true;
  },
  getSession: async (sessionId) => {
    const { data, error } = await supabase
      .from('cart_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};

// Auth API
const authAPI = {
  login: async (username, password) => {
    const hashedPassword = await hashPassword(password);
    const { data, error } = await supabase
      .from('users')
      .select('id, name, username, email, role')
      .eq('username', username)
      .eq('password', hashedPassword)
      .single();

    if (error || !data) {
      throw new Error('Invalid username or password');
    }

    const session = { user: data, token: btoa(JSON.stringify({ id: data.id, exp: Date.now() + 86400000 })) };
    localStorage.setItem('paperbox_session', JSON.stringify(session));
    return session;
  },
  logout: async () => {
    localStorage.removeItem('paperbox_session');
  },
  getSession: () => {
    const session = localStorage.getItem('paperbox_session');
    if (!session) return null;
    try {
      const parsed = JSON.parse(session);
      const tokenData = JSON.parse(atob(parsed.token));
      if (tokenData.exp < Date.now()) {
        localStorage.removeItem('paperbox_session');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('paperbox_session');
      return null;
    }
  }
};

// ============================================
// TOAST NOTIFICATION
// ============================================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  return (
    <div className={`fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fadeInUp flex items-center gap-2`}>
      {type === 'success' && <span>✓</span>}
      {type === 'error' && <span>✕</span>}
      {type === 'warning' && <span>⚠</span>}
      {type === 'info' && <span>ℹ</span>}
      {message}
    </div>
  );
};

const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </ToastContext.Provider>
  );
};

const useToast = () => useContext(ToastContext);

// ============================================
// CART PROVIDER
// ============================================
const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  const getSessionId = () => {
    let sessionId = localStorage.getItem('cart_session_id');
    if (!sessionId) {
      sessionId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cart_session_id', sessionId);
    }
    return sessionId;
  };

  const loadCart = async () => {
    try {
      const sessionId = getSessionId();
      const cartData = await cartAPI.getSession(sessionId);
      if (cartData && cartData.items) {
        setCartItems(cartData.items);
        calculateTotal(cartData.items);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setCartTotal(total);
  };

  const addToCart = async (product, quantity = 1) => {
    const sessionId = getSessionId();
    const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
    
    let newItems;
    if (existingItemIndex >= 0) {
      newItems = [...cartItems];
      newItems[existingItemIndex].quantity += quantity;
    } else {
      newItems = [...cartItems, { ...product, quantity }];
    }
    
    setCartItems(newItems);
    calculateTotal(newItems);
    
    try {
      await cartAPI.saveSession(sessionId, newItems);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const removeFromCart = async (productId) => {
    const sessionId = getSessionId();
    const newItems = cartItems.filter(item => item.id !== productId);
    setCartItems(newItems);
    calculateTotal(newItems);
    
    try {
      await cartAPI.saveSession(sessionId, newItems);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    const sessionId = getSessionId();
    const newItems = cartItems.map(item => 
      item.id === productId ? { ...item, quantity } : item
    );
    
    setCartItems(newItems);
    calculateTotal(newItems);
    
    try {
      await cartAPI.saveSession(sessionId, newItems);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const clearCart = async () => {
    const sessionId = getSessionId();
    setCartItems([]);
    setCartTotal(0);
    
    try {
      await cartAPI.saveSession(sessionId, []);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartTotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    }}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => useContext(CartContext);

// ============================================
// AUTH PROVIDER
// ============================================
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = authAPI.getSession();
    if (session) {
      setUser(session.user);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const session = await authAPI.login(username, password);
      setUser(session.user);
      return { success: true, user: session.user };
    } catch (error) {
      return { success: false, error: error.message || 'Invalid username or password' };
    }
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const hasRole = (requiredRole) => {
    if (!user) return false;
    if (user.role === ROLES.SUPERADMIN) return true;
    if (requiredRole === ROLES.MODERATOR && user.role === ROLES.MODERATOR) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// ============================================
// PROTECTED ROUTE
// ============================================
const ProtectedRoute = ({ children, requiredRole = ROLES.MODERATOR }) => {
  const { user, hasRole } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRole(requiredRole)) return <Navigate to="/dashboard" replace />;
  return children;
};

// ============================================
// LOGO COMPONENT
// ============================================
const Logo = ({ size = 'md', showText = true, darkText = false }) => {
  const sizes = {
    sm: { text: 'text-lg', tagline: 'text-[10px]' },
    md: { text: 'text-xl', tagline: 'text-xs' },
    lg: { text: 'text-2xl', tagline: 'text-sm' },
    xl: { text: 'text-4xl', tagline: 'text-base' }
  };
  const { text, tagline } = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <img
        src="/PAPER%20BOX%20(1)-01.svg"
        alt="Paper Box Logo"
        className={`${size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-12 h-12' : size === 'lg' ? 'w-16 h-16' : 'w-20 h-20'}`}
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-black ${text} ${darkText ? 'text-white' : 'text-gray-900'} tracking-tight`}>
            PAPER BOX
          </span>
          <span className={`${tagline} ${darkText ? 'text-gray-300' : 'text-gray-500'} font-light`}>
            Quality You Need. Price You Love
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================
// NAVBAR COMPONENT
// ============================================
const Navbar = ({ variant = 'public' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const adminLinks = user?.role === ROLES.SUPERADMIN ? [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/portfolio-manage', label: 'Portfolio' },
    { to: '/offers-manage', label: 'Offers' },
    { to: '/comparison-manage', label: 'Comparisons' },
    { to: '/contacts', label: 'Messages' },
    { to: '/products-manage', label: 'Products' },
    { to: '/orders-manage', label: 'Orders' },
    { to: '/users', label: 'Users' }
  ] : [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/portfolio-manage', label: 'Portfolio' },
    { to: '/offers-manage', label: 'Offers' },
    { to: '/comparison-manage', label: 'Comparisons' },
    { to: '/contacts', label: 'Messages' },
    { to: '/products-manage', label: 'Products' },
    { to: '/orders-manage', label: 'Orders' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3">
            <Logo size="sm" showText={false} />
            <span className="text-xl font-black tracking-tight hidden md:block text-gray-900">PAPER BOX</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {variant === 'admin' ? (
              <>
                {adminLinks.map(link => (
                  <Link 
                    key={link.to} 
                    to={link.to} 
                    className="text-gray-600 hover:text-orange-500 transition-colors font-medium text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
                  <span className="text-sm text-gray-500">
                    {user?.name} 
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-medium">
                      {user?.role}
                    </span>
                  </span>
                  <button 
                    onClick={handleLogout} 
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <a href="#home" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">HOME</a>
                <a href="#products" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">PRODUCTS</a>
                <Link to="/portfolio" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">PORTFOLIO</Link>
                <a href="#news" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">NEWS</a>
                <a href="#tutorials" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">TUTORIALS</a>
                <a href="#contact" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">CONTACT</a>
                <Link to="/cart" className="text-gray-600 hover:text-orange-500 transition-colors font-medium relative">
                  🛒 Cart
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/login" 
                  className="bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-600 transition text-sm font-medium"
                >
                  LOGIN
                </Link>
              </>
            )}
          </div>

          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="md:hidden p-2 text-gray-600 hover:text-orange-500 transition"
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 bg-white">
            {variant === 'admin' ? (
              <div className="flex flex-col gap-3">
                {adminLinks.map(link => (
                  <Link 
                    key={link.to} 
                    to={link.to} 
                    className="text-gray-600 py-2 px-4 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition" 
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 border-t border-gray-100 mt-2">
                  <p className="text-sm text-gray-500 mb-3 px-4">{user?.name} ({user?.role})</p>
                  <button 
                    onClick={handleLogout} 
                    className="w-full bg-orange-500 text-white px-4 py-3 rounded-lg font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <a 
                  href="#home" 
                  className="text-gray-600 py-3 px-4 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition font-medium" 
                  onClick={() => setIsOpen(false)}
                >
                  HOME
                </a>
                <a 
                  href="#products" 
                  className="text-gray-600 py-3 px-4 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition font-medium" 
                  onClick={() => setIsOpen(false)}
                >
                  PRODUCTS
                </a>
                <Link 
                  to="/portfolio" 
                  className="text-gray-600 py-3 px-4 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition font-medium" 
                  onClick={() => setIsOpen(false)}
                >
                  PORTFOLIO
                </Link>
                <a 
                  href="#news" 
                  className="text-gray-600 py-3 px-4 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition font-medium" 
                  onClick={() => setIsOpen(false)}
                >
                  NEWS
                </a>
                <a 
                  href="#tutorials" 
                  className="text-gray-600 py-3 px-4 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition font-medium" 
                  onClick={() => setIsOpen(false)}
                >
                  TUTORIALS
                </a>
                <a 
                  href="#contact" 
                  className="text-gray-600 py-3 px-4 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition font-medium" 
                  onClick={() => setIsOpen(false)}
                >
                  CONTACT
                </a>
                <Link 
                  to="/cart" 
                  className="text-gray-600 py-3 px-4 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition font-medium flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  🛒 Cart
                  {cartCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/login" 
                  className="mt-4 bg-orange-500 text-white px-4 py-3 rounded-lg font-medium text-center" 
                  onClick={() => setIsOpen(false)}
                >
                  LOGIN
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

// ============================================
// HERO SECTION (UPDATED WITH BANGLA TEXT)
// ============================================
const HeroSection = () => (
  <section id="home" className="pt-20 pb-12 px-4 bg-gradient-to-br from-orange-50 to-white">
    <div className="max-w-7xl mx-auto">
      <div className="text-center animate-fadeInUp">
        <div className="flex justify-center mb-6">
          <Logo size="lg" showText={false} />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tight">
          <span className="gradient-text">PAPER BOX</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 font-light">
          Premium Packaging Solutions for Your Business
        </p>
        
        <div className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-lg shadow-lg mb-8 animate-pulse">
          <div className="text-2xl font-bold">UP TO 25% OFF</div>
          <div className="text-sm mt-1">🎉 প্রথম অর্ডারে ২৫% ছাড়!</div>
        </div>
        
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">LOWER PRICES</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            🎉 <strong>প্রথম অর্ডারে ২৫% ছাড়!</strong> আমাদের প্রিমিয়াম প্যাকেজিং সলিউশন দিয়ে আপনার ব্যবসাকে নতুন উচ্চতায় নিয়ে যান। কাস্টম ডিজাইন, উন্নত মানের উপকরণ এবং অত্যন্ত প্রতিযোগিতামূলক মূল্যে।
          </p>
        </div>
        
        <a 
          href="#offers" 
          className="inline-block bg-black text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          CLICK HERE
        </a>
      </div>
    </div>
  </section>
);

// ============================================
// PRODUCTS SECTION (E-COMMERCE)
// ============================================
const ProductsSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { addToCart } = useCart();
  const showToast = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getActive();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
    setLoading(false);
  };

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'pizza_box', name: 'Pizza Boxes' },
    { id: 'food_packaging', name: 'Food Packaging' },
    { id: 'shipping_box', name: 'Shipping Boxes' },
    { id: 'gift_box', name: 'Gift Boxes' }
  ];

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast(`${product.name} added to cart!`, 'success');
  };

  if (loading) {
    return (
      <section id="products" className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="spinner mx-auto"></div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">OUR PRODUCTS</h2>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-2 rounded-full font-medium transition ${selectedCategory === category.id ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="text-8xl mb-6">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Products Available</h3>
            <p className="text-gray-600">Check back soon for new products!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id} 
                className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fadeInUp delay-${(index % 4) * 100}`}
              >
                {product.image_data ? (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={product.image_data} 
                      alt={product.name}
                      className="w-full h-full object-cover image-hover-zoom"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                    <span className="text-5xl">📦</span>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
                    <span className="bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full">
                      {product.category.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">৳{product.price}</p>
                      <p className="text-xs text-gray-500">Per piece</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      Stock: <span className={`font-bold ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock_quantity > 0 ? `${product.stock_quantity} pcs` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock_quantity <= 0}
                    className={`w-full py-3 rounded-lg font-bold transition ${product.stock_quantity > 0 ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    {product.stock_quantity > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link 
            to="/products" 
            className="inline-block bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
          >
            VIEW ALL PRODUCTS →
          </Link>
        </div>
      </div>
    </section>
  );
};

// ============================================
// CART PAGE
// ============================================
const CartPage = () => {
  const { cartItems, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const showToast = useToast();

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      showToast('Cart is empty!', 'warning');
      return;
    }
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
        <Navbar variant="public" />
        <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-8xl mb-6">🛒</div>
            <h1 className="text-3xl font-bold gradient-text mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">Add some products to get started!</p>
            <Link 
              to="/#products" 
              className="inline-block bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
            >
              SHOP PRODUCTS
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <Navbar variant="public" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold gradient-text mb-8">Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Cart Items ({cartItems.length})</h2>
                <button 
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-700 font-medium text-sm"
                >
                  Clear Cart
                </button>
              </div>
              
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                    {item.image_data ? (
                      <img 
                        src={item.image_data} 
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-lg font-bold text-gray-900">৳{item.price}</p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">৳{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">৳{cartTotal > 1000 ? '0.00' : '100.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (VAT)</span>
                  <span className="font-medium">৳{(cartTotal * 0.05).toFixed(2)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>৳{(cartTotal + (cartTotal > 1000 ? 0 : 100) + (cartTotal * 0.05)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Discount Code</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter code" 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <button className="bg-gray-800 text-white px-4 py-3 rounded-lg font-medium hover:bg-black transition">
                    Apply
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition mb-4"
              >
                PROCEED TO CHECKOUT
              </button>
              
              <Link 
                to="/#products" 
                className="block text-center text-gray-600 hover:text-orange-500 font-medium"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

// ============================================
// CHECKOUT PAGE
// ============================================
const CheckoutPage = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const showToast = useToast();
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    payment_method: 'cod',
    special_instructions: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const orderData = {
        ...form,
        order_items: cartItems,
        subtotal: cartTotal,
        discount_amount: 0,
        total_amount: cartTotal + (cartTotal > 1000 ? 0 : 100) + (cartTotal * 0.05)
      };

      const order = await ordersAPI.create(orderData);
      
      if (form.payment_method === 'online') {
        showToast('Redirecting to payment gateway...', 'info');
        setTimeout(() => {
          window.open('https://secure.citybank.com.bd/payment', '_blank');
        }, 1000);
      } else {
        showToast('Order placed successfully!', 'success');
        clearCart();
        navigate('/');
      }
    } catch (error) {
      showToast(error.message || 'Error placing order', 'error');
    }
    setIsSubmitting(false);
  };

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <Navbar variant="public" />
      <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold gradient-text mb-8">Checkout</h1>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Billing Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-6">Billing Details</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      value={form.customer_name}
                      onChange={(e) => setForm({...form, customer_name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Phone Number *</label>
                    <input 
                      type="tel" 
                      required
                      value={form.customer_phone}
                      onChange={(e) => setForm({...form, customer_phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={form.customer_email}
                    onChange={(e) => setForm({...form, customer_email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Delivery Address *</label>
                  <textarea 
                    rows={4}
                    required
                    value={form.customer_address}
                    onChange={(e) => setForm({...form, customer_address: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                    placeholder="House #, Road #, Area, City"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Special Instructions</label>
                  <textarea 
                    rows={3}
                    value={form.special_instructions}
                    onChange={(e) => setForm({...form, special_instructions: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                    placeholder="Any special delivery instructions..."
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-6">Payment Method</h2>
              
              <div className="space-y-4">
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input 
                    type="radio" 
                    name="payment_method"
                    value="cod"
                    checked={form.payment_method === 'cod'}
                    onChange={(e) => setForm({...form, payment_method: e.target.value})}
                    className="w-5 h-5 text-orange-500"
                  />
                  <div className="ml-4">
                    <span className="font-medium">Cash on Delivery</span>
                    <p className="text-sm text-gray-500 mt-1">Pay when you receive the order</p>
                  </div>
                </label>
                
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input 
                    type="radio" 
                    name="payment_method"
                    value="online"
                    checked={form.payment_method === 'online'}
                    onChange={(e) => setForm({...form, payment_method: e.target.value})}
                    className="w-5 h-5 text-orange-500"
                  />
                  <div className="ml-4">
                    <span className="font-medium">Online Payment (City Bank)</span>
                    <p className="text-sm text-gray-500 mt-1">Secure payment via City Bank gateway</p>
                  </div>
                </label>
                
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input 
                    type="radio" 
                    name="payment_method"
                    value="mobile_banking"
                    checked={form.payment_method === 'mobile_banking'}
                    onChange={(e) => setForm({...form, payment_method: e.target.value})}
                    className="w-5 h-5 text-orange-500"
                  />
                  <div className="ml-4">
                    <span className="font-medium">Mobile Banking</span>
                    <p className="text-sm text-gray-500 mt-1">bKash / Nagad / Rocket</p>
                    <p className="text-xs text-gray-400 mt-1">Send payment to: 09639 99 00 99</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name} × {item.quantity}</p>
                      <p className="text-sm text-gray-500">৳{item.price} each</p>
                    </div>
                    <p className="font-medium">৳{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">৳{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">{cartTotal > 1000 ? 'FREE' : '৳100.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (VAT)</span>
                    <span className="font-medium">৳{(cartTotal * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-orange-600">
                        ৳{(cartTotal + (cartTotal > 1000 ? 0 : 100) + (cartTotal * 0.05)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>🎉 প্রথম অর্ডারে ২৫% ছাড়!</strong> Apply code: <strong>FIRST25</strong>
                </p>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                {isSubmitting ? 'PROCESSING...' : 'PLACE ORDER'}
              </button>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                By placing your order, you agree to our <Link to="/terms" className="text-orange-500 hover:underline">Terms & Conditions</Link>
              </p>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

// ============================================
// ORDERS MANAGEMENT PAGE
// ============================================
const OrdersManagePage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const showToast = useToast();

  const loadOrders = async () => {
    try {
      const data = await ordersAPI.getAll();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, { order_status: newStatus });
      showToast(`Order status updated to ${newStatus}`, 'success');
      loadOrders();
      setSelectedOrder(null);
    } catch (error) {
      showToast(error.message || 'Error updating status', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.order_status === statusFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Orders Management</h1>
            <p className="text-gray-600 mt-2">Manage customer orders and track status</p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-full font-medium ${statusFilter === 'all' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
          >
            All Orders ({orders.length})
          </button>
          {['processing', 'shipped', 'delivered', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full font-medium capitalize ${statusFilter === status ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
            >
              {status} ({orders.filter(o => o.order_status === status).length})
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Order ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Items</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Total</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">#{order.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-gray-500">{order.customer_phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {order.order_items?.length || 0} items
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">৳{order.total_amount}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.order_status)}`}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-500 hover:text-blue-700 font-medium text-sm mr-4"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(order.id, 'delivered')}
                        className="text-green-500 hover:text-green-700 font-medium text-sm"
                      >
                        Mark Delivered
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-8xl mb-6">📦</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No Orders Found</h3>
              <p className="text-gray-600">No orders match the selected filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold">Order Details</h3>
                <p className="text-gray-600">ID: #{selectedOrder.id.slice(0, 8)}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Customer Info */}
              <div>
                <h4 className="text-lg font-bold mb-4">Customer Information</h4>
                <div className="space-y-3">
                  <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customer_phone}</p>
                  <p><strong>Email:</strong> {selectedOrder.customer_email || 'N/A'}</p>
                  <p><strong>Address:</strong> {selectedOrder.customer_address}</p>
                  <p><strong>Payment Method:</strong> {selectedOrder.payment_method.toUpperCase()}</p>
                </div>
              </div>
              
              {/* Order Status */}
              <div>
                <h4 className="text-lg font-bold mb-4">Order Status</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.order_status)}`}>
                      {selectedOrder.order_status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Update Status</label>
                    <div className="flex gap-2">
                      {['processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(selectedOrder.id, status)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm capitalize ${selectedOrder.order_status === status ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Order Items */}
            <div className="mt-8">
              <h4 className="text-lg font-bold mb-4">Order Items</h4>
              <div className="bg-gray-50 rounded-xl p-4">
                {selectedOrder.order_items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity} × ৳{item.price}</p>
                    </div>
                    <p className="font-bold">৳{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                
                <div className="pt-4 mt-4 border-t border-gray-300">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span>৳{selectedOrder.total_amount}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedOrder.special_instructions && (
              <div className="mt-6">
                <h4 className="text-lg font-bold mb-2">Special Instructions</h4>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{selectedOrder.special_instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// PRODUCTS MANAGEMENT PAGE
// ============================================
const ProductsManagePage = () => {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'pizza_box',
    price: '',
    stock_quantity: '',
    is_active: true
  });
  const [imageData, setImageData] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const showToast = useToast();

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleFileUpload = async (file) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Invalid file type', 'error');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large (max 5MB)', 'error');
      return null;
    }
    return await compressImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editProduct) {
        const updates = { ...form, price: parseFloat(form.price), stock_quantity: parseInt(form.stock_quantity) };
        if (imageData) updates.image_data = imageData;
        await productsAPI.update(editProduct.id, updates);
        showToast('Product updated!', 'success');
      } else {
        await productsAPI.create({
          ...form,
          price: parseFloat(form.price),
          stock_quantity: parseInt(form.stock_quantity),
          image_data: imageData
        });
        showToast('Product created!', 'success');
      }
      closeModal();
      loadProducts();
    } catch (error) {
      showToast(error.message || 'Error saving product', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await productsAPI.delete(id);
      setDeleteModal(null);
      showToast('Product deleted!', 'success');
      loadProducts();
    } catch (error) {
      showToast(error.message || 'Error deleting product', 'error');
    }
  };

  const openEditModal = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      stock_quantity: product.stock_quantity,
      is_active: product.is_active
    });
    setImageData(product.image_data || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditProduct(null);
    setForm({
      name: '',
      description: '',
      category: 'pizza_box',
      price: '',
      stock_quantity: '',
      is_active: true
    });
    setImageData('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Products Management</h1>
            <p className="text-gray-600 mt-2">Manage your product catalog</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
          >
            + Add Product
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {product.image_data ? (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={product.image_data} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                  <span className="text-5xl">📦</span>
                </div>
              )}
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xl font-bold text-gray-900">৳{product.price}</p>
                    <p className="text-xs text-gray-500 capitalize">{product.category.replace('_', ' ')}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Stock: <span className="font-bold">{product.stock_quantity}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => openEditModal(product)}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setDeleteModal(product)}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="text-8xl mb-6">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Products Yet</h3>
            <p className="text-gray-600 mb-6">Add your first product to get started</p>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
            >
              Add First Product
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Product Name *</label>
                  <input 
                    type="text" 
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                    placeholder="e.g., Pizza Box (Large)"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Category *</label>
                  <select 
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="pizza_box">Pizza Box</option>
                    <option value="food_packaging">Food Packaging</option>
                    <option value="shipping_box">Shipping Box</option>
                    <option value="gift_box">Gift Box</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Price (৳) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({...form, price: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                    placeholder="25.00"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Stock Quantity *</label>
                  <input 
                    type="number" 
                    min="0"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({...form, stock_quantity: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                    placeholder="100"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Description</label>
                <textarea 
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  placeholder="Describe your product..."
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Product Image</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const data = await handleFileUpload(file);
                      if (data) setImageData(data);
                    }
                  }}
                >
                  {imageData ? (
                    <div className="relative">
                      <img 
                        src={imageData} 
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setImageData('')}
                        className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl mb-3">📁</div>
                      <p className="text-lg font-semibold text-gray-700 mb-2">Drag & drop image here</p>
                      <p className="text-gray-500 mb-4">or click to browse</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const data = await handleFileUpload(file);
                            if (data) setImageData(data);
                          }
                        }} 
                        className="hidden" 
                        id="productImage" 
                      />
                      <label 
                        htmlFor="productImage" 
                        className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium cursor-pointer hover:bg-black transition"
                      >
                        Choose Image
                      </label>
                      <p className="text-sm text-gray-400 mt-4">JPG, PNG, WebP • Max 5MB</p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({...form, is_active: e.target.checked})}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
                <label htmlFor="is_active" className="ml-3 text-gray-700 font-medium">
                  Set as active product
                </label>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition"
                >
                  {editProduct ? 'UPDATE PRODUCT' : 'CREATE PRODUCT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Delete Product?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete "{deleteModal.name}"?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)} 
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteModal.id)} 
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// LEGAL PAGES LAYOUT
// ============================================
const LegalPageLayout = ({ title, children }) => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
    <Navbar variant="public" />
    <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold gradient-text mb-6">{title}</h1>
      {children}
    </div>
    <Footer />
  </div>
);

// ============================================
// TERMS & CONDITIONS PAGE
// ============================================
const TermsPage = () => (
  <LegalPageLayout title="Terms & Conditions">
    <p className="text-lg mb-8">Welcome to <strong className="text-orange-600">Paper Box by RATROVA</strong>. By accessing our website (paperbox.ratrova.com) and placing an order, you agree to the following terms:</p>

    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Order Acceptance</h2>
        <p>All orders are subject to availability and price confirmation. We reserve the right to decline orders in cases of suspicious activity, incomplete information, or insufficient payment.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Pricing</h2>
        <p>While we ensure pricing accuracy, errors may occur. If we discover a pricing error after you place an order, we will inform you immediately and offer the option to proceed at the correct price or cancel without penalty. <strong className="text-orange-600">Bulk orders</strong> may qualify for special pricing.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Customer Responsibility & Approval</h2>
        <p className="mb-3">You are responsible for providing accurate design specifications including dimensions, colors, text, and logos.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Approval Process:</strong> We send photos/videos for your approval before dispatch. Once approved, no further modifications can be made.</li>
          <li><strong>Design Accuracy:</strong> Spelling mistakes or poor-quality images in customer files remain the customer's responsibility.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Delivery Timeline</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Dhaka City:</strong> Standard delivery is 72-96 hours.</li>
          <li><strong>Outside Dhaka:</strong> 7-10 business days.</li>
          <li><strong>Courier Delays:</strong> Paper Box is not liable for delays caused by third-party courier services, though we provide tracking support.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Payment Terms</h2>
        <p className="mb-2">We accept: <strong>bKash, Nagad, Rocket, Bank Transfer, Cash on Delivery (Dhaka only), and Online Payment via SSLCOMMERZ.</strong></p>
        <p className="font-bold text-red-600 bg-red-50 p-4 rounded-xl mt-4">Note: For orders exceeding ৳10,000, a minimum 50% advance payment is required.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Intellectual Property</h2>
        <p><strong>Our Content:</strong> All branding and original designs on this website are the property of RATROVA. <strong>Your Content:</strong> Custom designs and logos you provide remain your property. We use them exclusively for your order.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Dispute Resolution</h2>
        <p>Disputes will be settled under the <strong>laws of Bangladesh</strong>, with jurisdiction in Dhaka. Please contact us directly first to resolve concerns promptly.</p>
      </div>
    </section>

    {/* CONTACT INFORMATION BOX */}
    <div className="mt-12 p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl text-white shadow-xl">
      <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Contact Information</h2>
      <div className="grid md:grid-cols-2 gap-6 text-sm">
        <div className="space-y-2">
          <p><strong className="text-orange-400">Company:</strong> Paper Box by RATROVA</p>
          <p><strong className="text-orange-400">Phone:</strong> 09639 99 00 99</p>
          <p><strong className="text-orange-400">Email:</strong> paperbox@ratrova.com</p>
        </div>
        <div className="space-y-2">
          <p><strong className="text-orange-400">Website:</strong> paperbox.ratrova.com</p>
          <p><strong className="text-orange-400">Office:</strong> House # 07, Zindabahar 1st Lane, Nayabazar, Dhaka-1100.</p>
        </div>
      </div>
    </div>
  </LegalPageLayout>
);

// ============================================
// PRIVACY POLICY PAGE
// ============================================
const PrivacyPolicyPage = () => (
  <LegalPageLayout title="Privacy Policy">
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Information We Collect</h2>
        <p>We collect information you provide directly: name, email, phone, address, and payment details when you place an order.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Process and fulfill your orders</li>
          <li>Communicate about your order status</li>
          <li>Send promotional offers (only with consent)</li>
          <li>Improve our products and services</li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Data Security</h2>
        <p>We use SSL encryption to protect your data during transmission. Payment information is processed securely through certified payment gateways.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Third-Party Services</h2>
        <p>We may share necessary information with trusted third parties (courier services, payment processors) solely for order fulfillment.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Your Rights</h2>
        <p>You can request access to, correction of, or deletion of your personal data by contacting us at privacy@paperbox.ratrova.com.</p>
      </div>
    </section>
  </LegalPageLayout>
);

// ============================================
// REFUND POLICY PAGE
// ============================================
const RefundPolicyPage = () => (
  <LegalPageLayout title="Refund & Return Policy">
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Damaged or Defective Products</h2>
        <p>If you receive a damaged or defective product, notify us within <strong>24 hours</strong> of delivery with clear photos. We will arrange replacement or refund.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Wrong Items Delivered</h2>
        <p>If you receive incorrect items, contact us within 24 hours. We will arrange correct delivery and collect the wrong items.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Custom Orders</h2>
        <p className="font-bold text-red-600 bg-red-50 p-4 rounded-xl">Custom-designed packaging cannot be returned or refunded once production has started, unless there is a manufacturing defect.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Refund Process</h2>
        <p>Approved refunds will be processed within 7-10 business days via the original payment method.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2">Cancellation Policy</h2>
        <p>Orders can be cancelled within 2 hours of placement without penalty. After production starts, cancellation may incur charges.</p>
      </div>
    </section>
  </LegalPageLayout>
);

// ============================================
// DASHBOARD PAGE (UPDATED WITH PORTFOLIO)
// ============================================
const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ 
    images: 0, 
    offers: 0, 
    comparisons: 0, 
    contacts: 0, 
    unread: 0,
    orders: 0,
    products: 0 
  });
  const [portfolioImages, setPortfolioImages] = useState([]);

  const loadStats = async () => {
    try {
      const [portfolio, offers, comparisons, contactsData, ordersData, productsData] = await Promise.all([
        portfolioAPI.getAll(),
        offersAPI.getAll(),
        comparisonAPI.getAll(),
        contactsAPI.getAll(),
        ordersAPI.getAll(),
        productsAPI.getAll()
      ]);
      
      setStats({
        images: portfolio.length,
        offers: offers.length,
        comparisons: comparisons.length,
        contacts: contactsData.contacts.length,
        unread: contactsData.unread,
        orders: ordersData.length,
        products: productsData.length
      });
      
      setPortfolioImages(portfolio.slice(0, 4));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name}! Here's your business overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl mb-2">🖼️</div>
            <h3 className="text-gray-600 text-sm">Portfolio</h3>
            <p className="text-xl font-bold text-gray-800">{stats.images}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl mb-2">🎁</div>
            <h3 className="text-gray-600 text-sm">Offers</h3>
            <p className="text-xl font-bold text-gray-800">{stats.offers}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="text-gray-600 text-sm">Comparisons</h3>
            <p className="text-xl font-bold text-gray-800">{stats.comparisons}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl mb-2">📨</div>
            <h3 className="text-gray-600 text-sm">Messages</h3>
            <p className="text-xl font-bold text-gray-800">{stats.contacts}</p>
            {stats.unread > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">{stats.unread} new</span>
            )}
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl mb-2">📦</div>
            <h3 className="text-gray-600 text-sm">Products</h3>
            <p className="text-xl font-bold text-gray-800">{stats.products}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl mb-2">🛒</div>
            <h3 className="text-gray-600 text-sm">Orders</h3>
            <p className="text-xl font-bold text-gray-800">{stats.orders}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl mb-2">👤</div>
            <h3 className="text-gray-600 text-sm">Role</h3>
            <p className="text-lg font-bold text-orange-600 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Portfolio Preview Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Our Latest Work</h2>
            <Link to="/portfolio-manage" className="text-orange-500 hover:text-orange-700 font-medium text-sm">
              View All →
            </Link>
          </div>
          
          {portfolioImages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-gray-500">No portfolio images yet</p>
              <Link to="/portfolio-manage" className="inline-block mt-4 bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition">
                Upload First Image
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {portfolioImages.map((img) => (
                <div key={img.id} className="rounded-xl overflow-hidden bg-gray-100">
                  <div className="aspect-square">
                    <img 
                      src={img.image_data || img.data} 
                      alt={img.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-gray-800 text-sm font-medium truncate">{img.title}</p>
                    {img.brand_name && <p className="text-orange-600 text-xs font-semibold">{img.brand_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link to="/portfolio-manage" className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition">
              Manage Portfolio
            </Link>
            <Link to="/products-manage" className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition">
              Manage Products
            </Link>
            <Link to="/orders-manage" className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600 transition">
              View Orders
            </Link>
            <Link to="/offers-manage" className="bg-purple-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-600 transition">
              Manage Offers
            </Link>
            <Link to="/contacts" className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition">
              View Messages
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// OFFERS SECTION
// ============================================
const OffersSection = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const data = await offersAPI.getAll();
      const activeOffers = data.filter(offer => offer.is_active);
      setOffers(activeOffers);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section id="offers" className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="spinner mx-auto"></div>
        </div>
      </section>
    );
  }

  if (offers.length === 0) {
    return (
      <section id="offers" className="py-20 px-4 bg-gradient-to-b from-white to-orange-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">CURRENT OFFERS</h2>
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6">🎁</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Active Offers</h3>
            <p className="text-gray-600">Check back later for amazing deals!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="offers" className="py-20 px-4 bg-gradient-to-b from-white to-orange-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">CURRENT OFFERS</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {offers.map((offer, index) => (
            <div 
              key={offer.id} 
              className={`bg-white rounded-2xl shadow-xl overflow-hidden comparison-container animate-fadeInUp delay-${(index % 3) * 100}`}
            >
              {offer.image_data && (
                <div className="h-64 overflow-hidden">
                  <img 
                    src={offer.image_data} 
                    alt={offer.title}
                    className="w-full h-full object-cover image-hover-zoom"
                  />
                </div>
              )}
              
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-gray-800">{offer.title}</h3>
                  <div className="offer-badge bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg">
                    <div className="text-lg font-bold">{offer.discount_percentage}% OFF</div>
                    <div className="text-sm mt-1">🎉 প্রথম অর্ডারে {offer.discount_percentage}% ছাড়!</div>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6">{offer.description}</p>
                
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="bg-gray-100 px-4 py-3 rounded-lg">
                    <span className="text-sm text-gray-500">USE CODE:</span>
                    <span className="ml-2 text-lg font-bold text-orange-600">{offer.discount_code}</span>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Valid until: {new Date(offer.valid_until).toLocaleDateString()}
                  </div>
                </div>
                
                <button className="w-full mt-6 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition">
                  GET OFFER
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// COMPARISON SECTION
// ============================================
const ComparisonSection = () => {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComparisons();
  }, []);

  const loadComparisons = async () => {
    try {
      const data = await comparisonAPI.getAll();
      setComparisons(data);
    } catch (error) {
      console.error('Error loading comparisons:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section id="comparisons" className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="spinner mx-auto"></div>
        </div>
      </section>
    );
  }

  if (comparisons.length === 0) {
    return (
      <section id="comparisons" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">GOOD VS BAD PACKAGING</h2>
          <div className="text-center">
            <div className="text-8xl mb-6">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Comparison Coming Soon</h3>
            <p className="text-gray-600">Admin can upload comparison images.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="comparisons" className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">GOOD VS BAD PACKAGING</h2>
        
        <div className="space-y-12">
          {comparisons.map((comparison, index) => (
            <div key={comparison.id} className="animate-fadeInUp">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">{comparison.title}</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Good Packaging */}
                <div className="relative comparison-container bg-gradient-to-b from-green-50 to-white rounded-2xl p-6">
                  <div className="badge badge-good">GOOD</div>
                  
                  <div className="h-64 mb-6 overflow-hidden rounded-xl">
                    {comparison.good_image_data ? (
                      <img 
                        src={comparison.good_image_data} 
                        alt="Good Packaging"
                        className="w-full h-full object-cover image-hover-zoom"
                      />
                    ) : (
                      <div className="w-full h-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-500 text-6xl">✓</span>
                      </div>
                    )}
                  </div>
                  
                  <h4 className="text-xl font-bold text-green-700 mb-4">Why This is Good:</h4>
                  <ul className="space-y-2">
                    {comparison.good_points?.split(',').map((point, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-gray-700">{point.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bad Packaging */}
                <div className="relative comparison-container bg-gradient-to-b from-red-50 to-white rounded-2xl p-6">
                  <div className="badge badge-bad">BAD</div>
                  
                  <div className="h-64 mb-6 overflow-hidden rounded-xl">
                    {comparison.bad_image_data ? (
                      <img 
                        src={comparison.bad_image_data} 
                        alt="Bad Packaging"
                        className="w-full h-full object-cover image-hover-zoom"
                      />
                    ) : (
                      <div className="w-full h-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-500 text-6xl">✗</span>
                      </div>
                    )}
                  </div>
                  
                  <h4 className="text-xl font-bold text-red-700 mb-4">Why This is Bad:</h4>
                  <ul className="space-y-2">
                    {comparison.bad_points?.split(',').map((point, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-red-500 mr-2">✗</span>
                        <span className="text-gray-700">{point.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// NEWS SECTION
// ============================================
const NewsSection = () => {
  const newsItems = [
    {
      title: "New Packaging Technology",
      description: "Discover our latest eco-friendly packaging solutions that reduce environmental impact.",
      date: "Jan 15, 2024",
      icon: "🌱"
    },
    {
      title: "Bulk Order Discount",
      description: "Special discounts available for orders above 1000 units. Contact us for details.",
      date: "Jan 10, 2024",
      icon: "💰"
    },
    {
      title: "Custom Design Service",
      description: "We now offer custom packaging design services for your unique brand identity.",
      date: "Jan 5, 2024",
      icon: "🎨"
    }
  ];

  return (
    <section id="news" className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">LATEST NEWS</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {newsItems.map((item, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fadeInUp delay-${(index % 3) * 100}`}
            >
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{item.title}</h3>
              <p className="text-gray-600 mb-4">{item.description}</p>
              <div className="text-sm text-gray-400">{item.date}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// TUTORIALS SECTION
// ============================================
const TutorialsSection = () => {
  const tutorials = [
    {
      title: "How to Choose the Right Packaging",
      duration: "5 min read",
      icon: "📦",
      points: ["Material selection", "Size guide", "Cost calculation"]
    },
    {
      title: "Packaging Design Tips",
      duration: "8 min read",
      icon: "✏️",
      points: ["Color psychology", "Brand consistency", "Typography"]
    },
    {
      title: "Shipping Best Practices",
      duration: "6 min read",
      icon: "🚚",
      points: ["Packaging safety", "Labeling", "International shipping"]
    }
  ];

  return (
    <section id="tutorials" className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">TUTORIALS & GUIDES</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tutorials.map((tutorial, index) => (
            <div 
              key={index} 
              className={`bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 animate-fadeInUp delay-${(index % 3) * 100}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">{tutorial.icon}</div>
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">{tutorial.duration}</span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-4">{tutorial.title}</h3>
              
              <ul className="space-y-2 mb-6">
                {tutorial.points.map((point, i) => (
                  <li key={i} className="flex items-center">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
              
              <button className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition">
                READ GUIDE
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// CONTACT SECTION
// ============================================
const ContactSection = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await contactsAPI.create(formData);
      showToast('Message sent successfully!', 'success');
      setFormData({ name: '', phone: '', email: '', message: '' });
    } catch (error) {
      showToast(error.message || 'Failed to send message', 'error');
    }
    setIsSubmitting(false);
  };

  return (
    <section id="contact" className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">CONTACT US</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="animate-slideInLeft">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Get in Touch</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📞</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Phone</h4>
                  <p className="text-gray-600">09639 99 00 99</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✉️</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Email</h4>
                  <p className="text-gray-600">paperbox@ratrova.com</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏢</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Address</h4>
                  <p className="text-gray-600">House #07, Zindabahar 1st Lane, Nayabazar, Dhaka-1100</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="animate-slideInRight">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Your name"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Phone</label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Email</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Message</label>
                <textarea 
                  required 
                  rows={5} 
                  value={formData.message} 
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                  placeholder="Tell us about your packaging needs..."
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                {isSubmitting ? 'SENDING...' : 'SEND MESSAGE'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// PORTFOLIO MANAGEMENT PAGE
// ============================================
const PortfolioManagePage = () => {
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadForm, setUploadForm] = useState({ brand_name: '', order_date: '', delivery_date: '' });
  const showToast = useToast();

  const loadImages = async () => {
    try {
      const data = await portfolioAPI.getAll();
      setImages(data);
    } catch (error) {
      console.error('Error loading images:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(file => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast(`Invalid file type: ${file.name}`, 'error');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`File too large: ${file.name}`, 'error');
        return false;
      }
      return true;
    });
    if (!validFiles.length) return;

    setIsUploading(true);
    try {
      for (const file of validFiles) {
        const compressed = await compressImage(file);
        await portfolioAPI.create({
          data: compressed,
          name: file.name,
          title: file.name.split('.')[0],
          description: '',
          brand_name: uploadForm.brand_name,
          order_date: uploadForm.order_date || null,
          delivery_date: uploadForm.delivery_date || null
        });
      }
      showToast(`${validFiles.length} image(s) uploaded!`, 'success');
      setUploadForm({ brand_name: '', order_date: '', delivery_date: '' });
      loadImages();
    } catch (error) {
      showToast(error.message || 'Error uploading images', 'error');
    }
    setIsUploading(false);
  };

  const handleUpdate = async (id, updates) => {
    try {
      await portfolioAPI.update(id, updates);
      setEditModal(null);
      showToast('Image updated!', 'success');
      loadImages();
    } catch (error) {
      showToast(error.message || 'Error updating image', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await portfolioAPI.delete(id);
      setDeleteModal(null);
      showToast('Image deleted!', 'success');
      loadImages();
    } catch (error) {
      showToast(error.message || 'Error deleting image', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">Portfolio Management</h1>
          <p className="text-gray-600 mt-2">Upload and manage portfolio images</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-bold mb-4">Upload New Images</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Brand Name</label>
              <input 
                type="text" 
                value={uploadForm.brand_name} 
                onChange={(e) => setUploadForm({...uploadForm, brand_name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                placeholder="e.g., Nike, Adidas" 
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Order Date</label>
              <input 
                type="date" 
                value={uploadForm.order_date} 
                onChange={(e) => setUploadForm({...uploadForm, order_date: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Delivery Date</label>
              <input 
                type="date" 
                value={uploadForm.delivery_date} 
                onChange={(e) => setUploadForm({...uploadForm, delivery_date: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
          </div>
          
          <div 
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="spinner mb-4"></div>
                <p className="text-gray-600">Uploading...</p>
              </div>
            ) : (
              <>
                <div className="text-5xl mb-3">📁</div>
                <p className="text-lg font-semibold text-gray-700 mb-2">Drag & drop images here</p>
                <p className="text-gray-500 mb-4">or click to browse</p>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={(e) => handleFiles(e.target.files)} 
                  className="hidden" 
                  id="fileInput" 
                />
                <label 
                  htmlFor="fileInput" 
                  className="inline-block bg-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer hover:bg-gray-800 transition"
                >
                  Choose Files
                </label>
                <p className="text-sm text-gray-400 mt-4">JPG, PNG, WebP • Max 5MB</p>
              </>
            )}
          </div>
        </div>

        {/* Gallery */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-6">Portfolio Gallery ({images.length} images)</h2>
          
          {images.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-8xl mb-6">🖼️</div>
              <p className="text-gray-500">No images uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img) => (
                <div key={img.id} className="group relative rounded-xl overflow-hidden bg-gray-100">
                  <div className="aspect-square">
                    <img 
                      src={img.image_data || img.data} 
                      alt={img.title} 
                      className="w-full h-full object-cover" 
                      onClick={() => setPreviewImage(img)} 
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => setPreviewImage(img)} 
                      className="bg-white text-gray-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => setEditModal(img)} 
                      className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setDeleteModal(img)} 
                      className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-gray-800 text-sm font-medium truncate">{img.title || img.image_name}</p>
                    {img.brand_name && <p className="text-orange-600 text-xs font-semibold">{img.brand_name}</p>}
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      {img.order_date && <span>O: {new Date(img.order_date).toLocaleDateString()}</span>}
                      {img.delivery_date && <span>D: {new Date(img.delivery_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300" onClick={() => setPreviewImage(null)}>×</button>
          <div className="max-w-4xl" onClick={e => e.stopPropagation()}>
            <img 
              src={previewImage.image_data || previewImage.data} 
              alt={previewImage.title} 
              className="max-w-full max-h-[80vh] object-contain rounded-lg" 
            />
            <div className="mt-4 text-white text-center">
              <h3 className="text-xl font-bold">{previewImage.title}</h3>
              {previewImage.description && <p className="text-gray-300 mt-2">{previewImage.description}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit Image</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Title</label>
                <input 
                  type="text" 
                  value={editModal.title || ''} 
                  onChange={(e) => setEditModal({...editModal, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Brand Name</label>
                <input 
                  type="text" 
                  value={editModal.brand_name || ''} 
                  onChange={(e) => setEditModal({...editModal, brand_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="e.g., Nike, Adidas" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Order Date</label>
                  <input 
                    type="date" 
                    value={editModal.order_date || ''} 
                    onChange={(e) => setEditModal({...editModal, order_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Delivery Date</label>
                  <input 
                    type="date" 
                    value={editModal.delivery_date || ''} 
                    onChange={(e) => setEditModal({...editModal, delivery_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Description</label>
                <textarea 
                  rows={3} 
                  value={editModal.description || ''} 
                  onChange={(e) => setEditModal({...editModal, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                />
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => setEditModal(null)} 
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUpdate(editModal.id, { 
                  title: editModal.title, 
                  description: editModal.description, 
                  brand_name: editModal.brand_name, 
                  order_date: editModal.order_date || null, 
                  delivery_date: editModal.delivery_date || null 
                })}
                className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Delete Image?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this image?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)} 
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteModal.id)} 
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// OFFERS MANAGEMENT PAGE
// ============================================
const OffersManagePage = () => {
  const [offers, setOffers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    discount_code: '500FF', 
    discount_percentage: 25, 
    valid_until: '',
    is_active: true 
  });
  const [imageData, setImageData] = useState('');
  const showToast = useToast();

  const loadOffers = async () => {
    try {
      const data = await offersAPI.getAll();
      setOffers(data);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleFileUpload = async (file) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Invalid file type', 'error');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large (max 5MB)', 'error');
      return null;
    }
    return await compressImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageData && !editModal?.image_data) {
      showToast('Please upload an image', 'error');
      return;
    }

    setIsUploading(true);
    try {
      if (editModal) {
        const updates = {
          title: form.title,
          description: form.description,
          discount_code: form.discount_code,
          discount_percentage: form.discount_percentage,
          valid_until: form.valid_until,
          is_active: form.is_active
        };
        if (imageData) {
          updates.image_data = imageData;
        }
        await offersAPI.update(editModal.id, updates);
        showToast('Offer updated!', 'success');
      } else {
        await offersAPI.create({
          title: form.title,
          description: form.description,
          image_data: imageData,
          discount_code: form.discount_code,
          discount_percentage: form.discount_percentage,
          valid_until: form.valid_until,
          is_active: form.is_active
        });
        showToast('Offer created!', 'success');
      }
      closeModal();
      loadOffers();
    } catch (error) {
      showToast(error.message || 'Error saving offer', 'error');
    }
    setIsUploading(false);
  };

  const handleDelete = async (id) => {
    try {
      await offersAPI.delete(id);
      setDeleteModal(null);
      showToast('Offer deleted!', 'success');
      loadOffers();
    } catch (error) {
      showToast(error.message || 'Error deleting offer', 'error');
    }
  };

  const openEditModal = (offer) => {
    setEditModal(offer);
    setForm({
      title: offer.title,
      description: offer.description,
      discount_code: offer.discount_code,
      discount_percentage: offer.discount_percentage,
      valid_until: offer.valid_until.split('T')[0],
      is_active: offer.is_active
    });
    setImageData('');
  };

  const closeModal = () => {
    setEditModal(null);
    setForm({ 
      title: '', 
      description: '', 
      discount_code: '500FF', 
      discount_percentage: 25, 
      valid_until: '',
      is_active: true 
    });
    setImageData('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Manage Offers</h1>
            <p className="text-gray-600 mt-2">Create and manage special offers</p>
          </div>
          <button 
            onClick={() => setEditModal({})}
            className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
          >
            + Add Offer
          </button>
        </div>

        {offers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
            <div className="text-8xl mb-6">🎁</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Offers Yet</h3>
            <p className="text-gray-600 mb-6">Create your first offer to get started</p>
            <button 
              onClick={() => setEditModal({})}
              className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
            >
              Create First Offer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {offer.image_data && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={offer.image_data} 
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{offer.title}</h3>
                    <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
                      {offer.discount_percentage}% OFF
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">{offer.description}</p>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="bg-gray-100 px-3 py-2 rounded">
                      <span className="text-sm text-gray-500">Code:</span>
                      <span className="ml-2 font-bold">{offer.discount_code}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${offer.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => openEditModal(offer)}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setDeleteModal(offer)}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {editModal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{editModal.id ? 'Edit Offer' : 'Add New Offer'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Title *</label>
                  <input 
                    type="text" 
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                    placeholder="e.g., Summer Sale"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Discount Percentage *</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={form.discount_percentage}
                    onChange={(e) => setForm({...form, discount_percentage: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Discount Code *</label>
                  <input 
                    type="text" 
                    value={form.discount_code}
                    onChange={(e) => setForm({...form, discount_code: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                    placeholder="e.g., 500FF"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Valid Until *</label>
                  <input 
                    type="date" 
                    value={form.valid_until}
                    onChange={(e) => setForm({...form, valid_until: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Description *</label>
                <textarea 
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  required
                  placeholder="Describe your offer..."
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Offer Image *</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const data = await handleFileUpload(file);
                      if (data) setImageData(data);
                    }
                  }}
                >
                  {(imageData || editModal?.image_data) ? (
                    <div className="relative">
                      <img 
                        src={imageData || editModal?.image_data} 
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setImageData('')}
                        className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl mb-3">📁</div>
                      <p className="text-lg font-semibold text-gray-700 mb-2">Drag & drop image here</p>
                      <p className="text-gray-500 mb-4">or click to browse</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const data = await handleFileUpload(file);
                            if (data) setImageData(data);
                          }
                        }} 
                        className="hidden" 
                        id="offerImage" 
                      />
                      <label 
                        htmlFor="offerImage" 
                        className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium cursor-pointer hover:bg-black transition"
                      >
                        Choose Image
                      </label>
                      <p className="text-sm text-gray-400 mt-4">JPG, PNG, WebP • Max 5MB</p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({...form, is_active: e.target.checked})}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
                <label htmlFor="is_active" className="ml-3 text-gray-700 font-medium">
                  Set as active offer
                </label>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {isUploading ? 'SAVING...' : (editModal.id ? 'UPDATE OFFER' : 'CREATE OFFER')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Delete Offer?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete "{deleteModal.title}"?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteModal.id)}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPARISON MANAGEMENT PAGE
// ============================================
const ComparisonManagePage = () => {
  const [comparisons, setComparisons] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActiveGood, setDragActiveGood] = useState(false);
  const [dragActiveBad, setDragActiveBad] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    title: '', 
    good_points: '', 
    bad_points: '', 
    category: 'pizza_box' 
  });
  const [goodImageData, setGoodImageData] = useState('');
  const [badImageData, setBadImageData] = useState('');
  const showToast = useToast();

  const loadComparisons = async () => {
    try {
      const data = await comparisonAPI.getAll();
      setComparisons(data);
    } catch (error) {
      console.error('Error loading comparisons:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadComparisons();
  }, []);

  const handleFileUpload = async (file) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Invalid file type', 'error');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large (max 5MB)', 'error');
      return null;
    }
    return await compressImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goodImageData && !editModal?.good_image_data) {
      showToast('Please upload good packaging image', 'error');
      return;
    }
    if (!badImageData && !editModal?.bad_image_data) {
      showToast('Please upload bad packaging image', 'error');
      return;
    }

    setIsUploading(true);
    try {
      if (editModal) {
        const updates = {
          title: form.title,
          good_points: form.good_points,
          bad_points: form.bad_points,
          category: form.category
        };
        if (goodImageData) updates.good_image_data = goodImageData;
        if (badImageData) updates.bad_image_data = badImageData;
        await comparisonAPI.update(editModal.id, updates);
        showToast('Comparison updated!', 'success');
      } else {
        await comparisonAPI.create({
          title: form.title,
          good_image_data: goodImageData,
          bad_image_data: badImageData,
          good_points: form.good_points,
          bad_points: form.bad_points,
          category: form.category
        });
        showToast('Comparison created!', 'success');
      }
      closeModal();
      loadComparisons();
    } catch (error) {
      showToast(error.message || 'Error saving comparison', 'error');
    }
    setIsUploading(false);
  };

  const handleDelete = async (id) => {
    try {
      await comparisonAPI.delete(id);
      setDeleteModal(null);
      showToast('Comparison deleted!', 'success');
      loadComparisons();
    } catch (error) {
      showToast(error.message || 'Error deleting comparison', 'error');
    }
  };

  const openEditModal = (comparison) => {
    setEditModal(comparison);
    setForm({
      title: comparison.title,
      good_points: comparison.good_points,
      bad_points: comparison.bad_points,
      category: comparison.category
    });
    setGoodImageData('');
    setBadImageData('');
  };

  const closeModal = () => {
    setEditModal(null);
    setForm({ 
      title: '', 
      good_points: '', 
      bad_points: '', 
      category: 'pizza_box' 
    });
    setGoodImageData('');
    setBadImageData('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Manage Comparisons</h1>
            <p className="text-gray-600 mt-2">Create and manage good vs bad packaging comparisons</p>
          </div>
          <button 
            onClick={() => setEditModal({})}
            className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
          >
            + Add Comparison
          </button>
        </div>

        {comparisons.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
            <div className="text-8xl mb-6">📊</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Comparisons Yet</h3>
            <p className="text-gray-600 mb-6">Create your first comparison to show good vs bad packaging</p>
            <button 
              onClick={() => setEditModal({})}
              className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
            >
              Create First Comparison
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {comparisons.map((comparison) => (
              <div key={comparison.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">{comparison.title}</h3>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => openEditModal(comparison)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setDeleteModal(comparison)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Good Packaging */}
                    <div className="bg-green-50 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white mr-3">
                          ✓
                        </div>
                        <h4 className="text-lg font-bold text-green-800">Good Packaging</h4>
                      </div>
                      
                      {comparison.good_image_data && (
                        <div className="h-48 mb-4 overflow-hidden rounded-lg">
                          <img 
                            src={comparison.good_image_data} 
                            alt="Good Packaging"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <ul className="space-y-2">
                        {comparison.good_points?.split(',').map((point, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            <span className="text-gray-700">{point.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bad Packaging */}
                    <div className="bg-red-50 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white mr-3">
                          ✗
                        </div>
                        <h4 className="text-lg font-bold text-red-800">Bad Packaging</h4>
                      </div>
                      
                      {comparison.bad_image_data && (
                        <div className="h-48 mb-4 overflow-hidden rounded-lg">
                          <img 
                            src={comparison.bad_image_data} 
                            alt="Bad Packaging"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <ul className="space-y-2">
                        {comparison.bad_points?.split(',').map((point, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-red-500 mr-2">✗</span>
                            <span className="text-gray-700">{point.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {editModal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{editModal.id ? 'Edit Comparison' : 'Add New Comparison'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Title *</label>
                <input 
                  type="text" 
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                  placeholder="e.g., Pizza Box: Good vs Bad"
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Good Packaging */}
                <div>
                  <h4 className="text-lg font-bold text-green-700 mb-4">Good Packaging</h4>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">Good Points *</label>
                    <textarea 
                      rows={4}
                      value={form.good_points}
                      onChange={(e) => setForm({...form, good_points: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                      required
                      placeholder="Enter good points separated by commas
e.g., Sturdy material, Good insulation, Attractive design"
                    />
                    <p className="text-sm text-gray-500 mt-2">Separate points with commas</p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Good Image *</label>
                    <div 
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragActiveGood ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                      onDragOver={(e) => { e.preventDefault(); setDragActiveGood(true); }}
                      onDragLeave={() => setDragActiveGood(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragActiveGood(false);
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          const data = await handleFileUpload(file);
                          if (data) setGoodImageData(data);
                        }
                      }}
                    >
                      {(goodImageData || editModal?.good_image_data) ? (
                        <div className="relative">
                          <img 
                            src={goodImageData || editModal?.good_image_data} 
                            alt="Good Packaging Preview"
                            className="max-h-48 mx-auto rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setGoodImageData('')}
                            className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-4xl mb-3">📸</div>
                          <p className="text-gray-700 mb-2">Drag & drop good packaging image</p>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const data = await handleFileUpload(file);
                                if (data) setGoodImageData(data);
                              }
                            }} 
                            className="hidden" 
                            id="goodImage" 
                          />
                          <label 
                            htmlFor="goodImage" 
                            className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer hover:bg-green-700 transition"
                          >
                            Upload Good Image
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bad Packaging */}
                <div>
                  <h4 className="text-lg font-bold text-red-700 mb-4">Bad Packaging</h4>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">Bad Points *</label>
                    <textarea 
                      rows={4}
                      value={form.bad_points}
                      onChange={(e) => setForm({...form, bad_points: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                      required
                      placeholder="Enter bad points separated by commas
e.g., Flimsy material, Poor insulation, Unattractive design"
                    />
                    <p className="text-sm text-gray-500 mt-2">Separate points with commas</p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Bad Image *</label>
                    <div 
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragActiveBad ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      onDragOver={(e) => { e.preventDefault(); setDragActiveBad(true); }}
                      onDragLeave={() => setDragActiveBad(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragActiveBad(false);
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          const data = await handleFileUpload(file);
                          if (data) setBadImageData(data);
                        }
                      }}
                    >
                      {(badImageData || editModal?.bad_image_data) ? (
                        <div className="relative">
                          <img 
                            src={badImageData || editModal?.bad_image_data} 
                            alt="Bad Packaging Preview"
                            className="max-h-48 mx-auto rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setBadImageData('')}
                            className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-4xl mb-3">📸</div>
                          <p className="text-gray-700 mb-2">Drag & drop bad packaging image</p>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const data = await handleFileUpload(file);
                                if (data) setBadImageData(data);
                              }
                            }} 
                            className="hidden" 
                            id="badImage" 
                          />
                          <label 
                            htmlFor="badImage" 
                            className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer hover:bg-red-700 transition"
                          >
                            Upload Bad Image
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Category</label>
                <select 
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="pizza_box">Pizza Box</option>
                  <option value="food_packaging">Food Packaging</option>
                  <option value="shipping_box">Shipping Box</option>
                  <option value="gift_box">Gift Box</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {isUploading ? 'SAVING...' : (editModal.id ? 'UPDATE COMPARISON' : 'CREATE COMPARISON')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Delete Comparison?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete "{deleteModal.title}"?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteModal.id)}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// CONTACTS PAGE
// ============================================
const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const showToast = useToast();

  const loadContacts = async () => {
    try {
      const data = await contactsAPI.getAll();
      setContacts(data.contacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await contactsAPI.markAsRead(id);
      loadContacts();
    } catch (error) {
      showToast(error.message || 'Error updating', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await contactsAPI.delete(id);
      setDeleteModal(null);
      setSelectedContact(null);
      showToast('Message deleted!', 'success');
      loadContacts();
    } catch (error) {
      showToast(error.message || 'Error deleting', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">Contact Messages</h1>
          <p className="text-gray-600 mt-2">View and manage contact form submissions</p>
        </div>

        {contacts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
            <div className="text-8xl mb-6">📭</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Messages Yet</h3>
            <p className="text-gray-600">No contact messages received.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Messages List */}
            <div className="lg:col-span-1 space-y-4">
              {contacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => { setSelectedContact(contact); handleMarkAsRead(contact.id); }}
                  className={`bg-white rounded-xl p-4 shadow cursor-pointer hover:shadow-lg transition ${selectedContact?.id === contact.id ? 'ring-2 ring-orange-500' : ''} ${!contact.is_read ? 'border-l-4 border-orange-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{contact.name}</h3>
                    {!contact.is_read && <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">New</span>}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{contact.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(contact.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-2">
              {selectedContact ? (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedContact.name}</h2>
                      <p className="text-gray-500">{new Date(selectedContact.created_at).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => setDeleteModal(selectedContact)}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm text-gray-500">Phone</label>
                        <p className="font-medium">{selectedContact.phone}</p>
                      </div>
                      <div className="flex-1">
                        <label className="text-sm text-gray-500">Email</label>
                        <p className="font-medium">{selectedContact.email}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500">Message</label>
                      <p className="font-medium whitespace-pre-wrap bg-gray-50 p-4 rounded-xl mt-2">{selectedContact.message}</p>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <a 
                        href={`tel:${selectedContact.phone}`} 
                        className="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold text-center hover:bg-green-600 transition"
                      >
                        📞 Call
                      </a>
                      <a 
                        href={`https://wa.me/${selectedContact.phone.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-center hover:bg-green-700 transition"
                      >
                        💬 WhatsApp
                      </a>
                      <a 
                        href={`mailto:${selectedContact.email}`} 
                        className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-bold text-center hover:bg-blue-600 transition"
                      >
                        ✉️ Email
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
                  <div className="text-8xl mb-6">👈</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Select a Message</h3>
                  <p className="text-gray-600">Select a message from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Delete Message?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this message?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)} 
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteModal.id)} 
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// USERS MANAGEMENT PAGE
// ============================================
const UsersManagePage = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  const loadUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editUser) {
        const updates = { name: form.name, email: form.email };
        if (form.password) updates.password = form.password;
        await usersAPI.update(editUser.id, updates);
        showToast('User updated!', 'success');
      } else {
        if (!form.password || form.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        await usersAPI.create(form);
        showToast('Moderator created!', 'success');
      }
      closeModal();
      loadUsers();
    } catch (error) {
      setError(error.message || 'An error occurred');
    }
  };

  const handleDelete = async (id) => {
    try {
      await usersAPI.delete(id);
      setDeleteModal(null);
      showToast('User deleted!', 'success');
      loadUsers();
    } catch (error) {
      showToast(error.message || 'Error deleting user', 'error');
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setForm({ name: user.name, username: user.username, email: user.email, password: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditUser(null);
    setForm({ name: '', username: '', email: '', password: '' });
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">User Management</h1>
            <p className="text-gray-600 mt-2">Manage moderators (SuperAdmin only)</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
          >
            + Add Moderator
          </button>
        </div>

        {/* SuperAdmin Info */}
        <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              S
            </div>
            <div>
              <h3 className="font-bold text-lg">Sagor</h3>
              <p className="text-gray-600 text-sm">@sagor • sagor@paperbox.com</p>
              <span className="inline-block mt-1 px-3 py-1 bg-orange-500 text-white text-xs rounded-full font-medium">SUPERADMIN</span>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Moderators ({users.length})</h2>
          </div>
          
          {users.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-8xl mb-6">👥</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No Moderators Yet</h3>
              <p className="text-gray-600 mb-6">Click "Add Moderator" to create one</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Role</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">@{user.username}</td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium capitalize">{user.role}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openEditModal(user)} 
                          className="text-blue-500 hover:text-blue-700 font-medium text-sm mr-4"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteModal(user)} 
                          className="text-red-500 hover:text-red-700 font-medium text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">{editUser ? 'Edit Moderator' : 'Add Moderator'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Name *</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Username *</label>
                <input 
                  type="text" 
                  value={form.username} 
                  onChange={(e) => setForm({...form, username: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  disabled={!!editUser} 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Email *</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Password {editUser && <span className="text-gray-400 font-normal">(leave empty to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  value={form.password} 
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  required={!editUser} 
                  placeholder={editUser ? '••••••••' : 'Min 6 characters'} 
                />
              </div>
              
              {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
              
              <div className="flex gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition"
                >
                  {editUser ? 'UPDATE' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Delete User?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{deleteModal.name}</strong>?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)} 
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteModal.id)} 
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// PUBLIC PORTFOLIO PAGE
// ============================================
const PublicPortfolioPage = () => {
  const [images, setImages] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const data = await portfolioAPI.getAll();
        setImages(data);
      } catch (error) {
        console.error('Error loading portfolio:', error);
      }
      setLoading(false);
    };
    loadImages();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/"><Logo size="sm" /></Link>
          <Link to="/#contact" className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition">
            Contact Us
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">Our Portfolio</h1>
          <p className="text-gray-600 text-lg">Explore our premium packaging designs</p>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">📦</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Portfolio Coming Soon</h2>
            <Link to="/" className="inline-block mt-6 bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition">
              Go to Homepage
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((img) => (
              <div 
                key={img.id} 
                className="group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition cursor-pointer bg-white"
                onClick={() => setPreviewImage(img)}
              >
                <div className="aspect-square relative">
                  <img 
                    src={img.image_data || img.data} 
                    alt={img.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300" 
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800">{img.title}</h3>
                  {img.brand_name && (
                    <p className="text-orange-600 font-semibold text-sm mt-1">{img.brand_name}</p>
                  )}
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    {img.order_date && <span>Order: {new Date(img.order_date).toLocaleDateString()}</span>}
                    {img.delivery_date && <span>Delivery: {new Date(img.delivery_date).toLocaleDateString()}</span>}
                  </div>
                  {img.description && <p className="text-sm text-gray-600 mt-2">{img.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300">×</button>
          <img 
            src={previewImage.image_data || previewImage.data} 
            alt={previewImage.title} 
            className="max-w-full max-h-full object-contain rounded-lg" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
};

// ============================================
// LOGIN PAGE
// ============================================
const LoginPage = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const result = await login(form.username, form.password);
    if (result.success) {
      showToast(`Welcome back, ${result.user.name}!`, 'success');
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="md" showText={false} />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Admin Login</h1>
          <p className="text-gray-500 mt-2">Enter your credentials to access dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Username</label>
            <input 
              type="text" 
              value={form.username} 
              onChange={(e) => setForm({...form, username: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="Enter username" 
              required 
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Password</label>
            <input 
              type="password" 
              value={form.password} 
              onChange={(e) => setForm({...form, password: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="Enter password" 
              required 
            />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {isLoading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-500 hover:text-orange-500 transition text-sm block">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

// ============================================
// HOME PAGE
// ============================================
const HomePage = () => (
  <div className="min-h-screen">
    <Navbar variant="public" />
    <HeroSection />
    <OffersSection />
    <ComparisonSection />
    <ProductsSection />
    <NewsSection />
    <TutorialsSection />
    <ContactSection />
    <Footer />
  </div>
);

// ============================================
// FOOTER
// ============================================
const Footer = () => (
  <footer className="bg-gray-900 text-white">
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Logo size="md" showText={true} darkText={true} />
          <p className="text-gray-400 mt-4 text-sm">
            Premium packaging solutions for businesses. Custom designs, quality materials, competitive prices.
          </p>
          <div className="mt-4">
            <p className="text-sm text-gray-300">A product of <strong>RATROVA</strong></p>
            <p className="text-xs text-gray-400 mt-1">© 2025 RATROVA. All rights reserved.</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-bold text-lg mb-4">Quick Links</h4>
          <ul className="space-y-2">
            <li><Link to="/" className="text-gray-400 hover:text-white transition">Home</Link></li>
            <li><Link to="/portfolio" className="text-gray-400 hover:text-white transition">Portfolio</Link></li>
            <li><Link to="/cart" className="text-gray-400 hover:text-white transition">Cart</Link></li>
            <li><Link to="/terms" className="text-gray-400 hover:text-white transition">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="text-gray-400 hover:text-white transition">Privacy Policy</Link></li>
            <li><Link to="/refund" className="text-gray-400 hover:text-white transition">Refund Policy</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-lg mb-4">Contact RATROVA</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">📞</span>
              <span className="text-gray-400">09639 99 00 99</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">✉️</span>
              <span className="text-gray-400">paperbox@ratrova.com</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">🏢</span>
              <div>
                <p className="text-gray-400 text-sm">RATROVA HQ</p>
                <p className="text-gray-400 text-sm">Al-Modina Tower, 2nd Floor</p>
                <p className="text-gray-400 text-sm">Sonr Bangla Project, Keranigonj</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-lg mb-4">Follow Us</h4>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
              <span className="text-lg">f</span>
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
              <span className="text-lg">📷</span>
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
              <span className="text-lg">in</span>
            </a>
          </div>
          
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-400">Subscribe for updates</p>
            <div className="flex mt-2">
              <input 
                type="email" 
                placeholder="Your email" 
                className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-l-lg outline-none text-sm"
              />
              <button className="bg-orange-500 text-white px-4 py-2 rounded-r-lg text-sm font-medium hover:bg-orange-600 transition">
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} RATROVA - Paper Box. All rights reserved.</p>
        <p className="mt-2">Designed with ❤️ by RATROVA Creative Agency</p>
      </div>
    </div>
  </footer>
);

// ============================================
// MAIN APP ROUTER
// ============================================
const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/portfolio" element={<PublicPortfolioPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/refund" element={<RefundPolicyPage />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/portfolio-manage" element={<ProtectedRoute><PortfolioManagePage /></ProtectedRoute>} />
            <Route path="/offers-manage" element={<ProtectedRoute><OffersManagePage /></ProtectedRoute>} />
            <Route path="/comparison-manage" element={<ProtectedRoute><ComparisonManagePage /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
            <Route path="/products-manage" element={<ProtectedRoute><ProductsManagePage /></ProtectedRoute>} />
            <Route path="/orders-manage" element={<ProtectedRoute><OrdersManagePage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute requiredRole={ROLES.SUPERADMIN}><UsersManagePage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
