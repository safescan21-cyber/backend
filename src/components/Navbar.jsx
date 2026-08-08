import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Menu, X, ChevronDown, Package,
  Truck, Shield, Users, FileText, Phone,
  BarChart3, BookOpen, Download, Mail,
  Wind, Gauge, Zap, HardHat, Award,
  Search, Heart, ShoppingCart, LogOut,
  LayoutDashboard, User, CreditCard, ShoppingBag, PlusCircle, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import avatarImg from "../assets/avatar.png";
import PharmaLogo from "./pages/PharmaLogo";
import { useLogoutUserMutation } from '../components/store/authApi';
import { logout } from '../components/store/authSlice';
import { selectCartTotalQuantity, clearCart } from '../components/store/cartSlice';
import { useFetchAllProductsQuery } from '../components/store/products/productsApi';

// ─── Dropdown menus ──────────────────────────────────────────────────────
const adminDropDownMenus = [
  { label: "Dashboard",    path: "/dashboard/admin",           icon: LayoutDashboard },
  { label: "Manage Items", path: "/dashboard/manage-products", icon: Package },
  { label: "All Orders",   path: "/dashboard/manage-orders",   icon: Truck },
  { label: "Add Product",  path: "/dashboard/add-product",     icon: PlusCircle },
  { label: "Manage Jobs",  path: "/dashboard/manage-jobs",     icon: FileText },
  { label: "Post Job",     path: "/dashboard/add-job",         icon: PlusCircle },
  { label: "Users",        path: "/dashboard/users",           icon: Users },
];

const userDropDownMenus = [
  { label: "Dashboard", path: "/dashboard",          icon: LayoutDashboard },
  { label: "Profile",   path: "/dashboard/profile",  icon: User },
  { label: "Payments",  path: "/dashboard/payments", icon: CreditCard },
  { label: "Orders",    path: "/dashboard/orders",   icon: ShoppingBag },
  { label: "Reviews",   path: "/dashboard/reviews",  icon: MessageSquare },
];

const solutionsLinks = [
  { name: 'Factory Automation',     path: '/solutions/automation',   icon: Package,   description: 'End-to-end automation solutions' },
  { name: 'Predictive Maintenance', path: '/solutions/maintenance',  icon: BarChart3, description: 'AI-powered equipment monitoring' },
  { name: 'HVAC Systems',           path: '/solutions/hvac',         icon: Wind,      description: 'Industrial climate control' },
  { name: 'Energy Management',      path: '/solutions/energy',       icon: Zap,       description: 'Optimize power consumption' },
  { name: 'Industrial Safety',      path: '/solutions/safety',       icon: Shield,    description: 'Comprehensive safety programs' },
  { name: 'Supply Chain',           path: '/solutions/supply-chain', icon: Truck,     description: 'Logistics optimization' },
];

const resourcesLinks = [
  { name: 'Technical Library', path: '/resources/technical',    icon: BookOpen,  description: 'Manuals and documentation' },
  { name: 'Product Catalogs',  path: '/resources/catalogs',     icon: FileText,  description: 'Download PDF catalogs' },
  { name: 'CAD Drawings',      path: '/resources/cad',          icon: Gauge,     description: '2D/3D models' },
  { name: 'Case Studies',      path: '/resources/case-studies', icon: Users,     description: 'Success stories' },
  { name: 'White Papers',      path: '/resources/white-papers', icon: FileText,  description: 'Industry research' },
  { name: 'SDS Sheets',        path: '/resources/sds',          icon: Shield,    description: 'Safety data sheets' },
];

// ─── Helper: makeHover (moved outside Navbar) ──────────────────────────
const makeHover = (setFn, ref) => ({
  onMouseEnter: () => {
    clearTimeout(ref.current);
    setFn(true);
  },
  onMouseLeave: () => {
    ref.current = setTimeout(() => setFn(false), 300);
  },
});

// ─── Reusable Dropdown Component with ARIA ─────────────────────────────
const HoverDropdown = ({ label, open, setOpen, timeoutRef, children, wide, id }) => {
  const buttonId = `dropdown-${id || label.toLowerCase().replace(/\s+/g, '-')}`;
  const contentId = `${buttonId}-content`;

  return (
    <li className="relative" {...makeHover(setOpen, timeoutRef)}>
      <button
        id={buttonId}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={contentId}
        className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
      >
        <span>{label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div
        id={contentId}
        role="menu"
        aria-labelledby={buttonId}
        // 🔁 RESPONSIVE: dropdown width now adapts
        className={`absolute left-0 mt-2 ${
          wide 
            ? 'min-w-[300px] max-w-[90vw] sm:max-w-[600px] lg:max-w-[700px]' 
            : 'w-80'
        } bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-4 z-50 transition-all duration-300 transform ${
          open ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'
        }`}
      >
        {children}
      </div>
    </li>
  );
};

// ─── StockBadge ──────────────────────────────────────────────────────────
const StockBadge = ({ stock }) => {
  if (stock === 0) return <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded-full">Out</span>;
  if (stock < 10) return <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded-full">Low: {stock}</span>;
  return <span className="text-[10px] bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded-full">In: {stock}</span>;
};

// ─── Main Navbar ─────────────────────────────────────────────────────────
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // ── Redux ──
  const { user } = useSelector((state) => state.auth ?? {});
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const [logoutUser, { isLoading: logoutLoading }] = useLogoutUserMutation();

  // ── Fetch products ──
  const { data: apiData, isLoading: productsLoading } = useFetchAllProductsQuery({
    page: 1,
    limit: 1000,
  });
  const allProducts = apiData?.products || [];

  // ── Build dynamic category groups ──
  const categoryGroups = (() => {
    const groups = {};
    allProducts.forEach(p => {
      const cat = p.category || 'uncategorized';
      const [main, sub] = cat.split('-');
      const mainKey = main || 'other';
      const subKey = sub || 'general';
      
      if (!groups[mainKey]) {
        groups[mainKey] = { label: mainKey.replace(/-/g, ' '), categories: {}, totalItems: 0, totalStock: 0 };
      }
      if (!groups[mainKey].categories[subKey]) {
        groups[mainKey].categories[subKey] = { 
          name: subKey.replace(/-/g, ' '), 
          path: `/shop?category=${cat}`,
          items: 0,
          stock: 0 
        };
      }
      groups[mainKey].categories[subKey].items += 1;
      groups[mainKey].categories[subKey].stock += (p.stock || 0);
      groups[mainKey].totalItems += 1;
      groups[mainKey].totalStock += (p.stock || 0);
    });
    return groups;
  })();

  const productCategories = Object.entries(categoryGroups).map(([key, group]) => ({
    name: group.label.charAt(0).toUpperCase() + group.label.slice(1),
    path: `/shop?category=${key}`,
    items: group.totalItems,
    stock: group.totalStock,
    subCategories: Object.values(group.categories).map(sub => ({
      name: sub.name.charAt(0).toUpperCase() + sub.name.slice(1),
      path: sub.path,
      items: sub.items,
      stock: sub.stock,
    })),
  }));

  // ── UI state ──
  const [isOpen, setIsOpen] = useState(false);
  const [productsDropdown, setProductsDropdown] = useState(false);
  const [solutionsDropdown, setSolutionsDropdown] = useState(false);
  const [resourcesDropdown, setResourcesDropdown] = useState(false);
  const [isUserDropOpen, setIsUserDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [cartNotification, setCartNotification] = useState(false);
  const [prevCount, setPrevCount] = useState(cartTotalQuantity);

  const productsTimeoutRef = useRef(null);
  const solutionsTimeoutRef = useRef(null);
  const resourcesTimeoutRef = useRef(null);
  const userDropRef = useRef(null);
  const searchInputRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // ── Effects ──
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 20 && currentScrollY > lastScrollY) {
        setScrolled(true);
      } else if (currentScrollY === 0) {
        setScrolled(false);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (userDropRef.current && !userDropRef.current.contains(e.target)) {
        setIsUserDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(productsTimeoutRef.current);
      clearTimeout(solutionsTimeoutRef.current);
      clearTimeout(resourcesTimeoutRef.current);
    };
  }, []);

  // ── Auth ──
  const dropdownMenus = user?.role === 'admin' ? adminDropDownMenus : userDropDownMenus;

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      dispatch(logout());
      dispatch(clearCart());
      setIsUserDropOpen(false);
      navigate('/');
      toast.success('Logged out successfully');
    } catch (err) {
      console.error('Logout failed:', err);
      toast.error('Logout failed. Please try again.');
    }
  };

  // ── Search ──
  const handleSearchSubmit = (e, query) => {
    e.preventDefault();
    const trimmed = query?.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setSearchQuery('');
      setMobileSearchQuery('');
      setIsOpen(false);
    }
  };

  const handleLinkClick = () => {
    setIsOpen(false);
    setProductsDropdown(false);
    setSolutionsDropdown(false);
    setResourcesDropdown(false);
    setIsUserDropOpen(false);
  };

  // ── Cart animation ──
  useEffect(() => {
    const handleCartItemAdded = () => {
      setCartNotification(true);
      setTimeout(() => setCartNotification(false), 1500);
    };
    window.addEventListener('cartItemAdded', handleCartItemAdded);
    return () => window.removeEventListener('cartItemAdded', handleCartItemAdded);
  }, []);

  useEffect(() => {
    if (cartTotalQuantity !== prevCount) {
      setPrevCount(cartTotalQuantity);
    }
  }, [cartTotalQuantity, prevCount]);

  // ── Utility: active link ──
  const isActive = (path) => location.pathname === path;

  // ── Render ──
  return (
    <>
      <nav
        className={`fixed w-full top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-gradient-to-r from-slate-900 to-slate-800 shadow-2xl'
            : 'bg-gradient-to-r from-slate-800 to-slate-700'
        }`}
        aria-label="Main navigation"
      >
        {/* ── Top bar ── */}
        <div className="hidden lg:block border-b border-slate-600/50 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-12 text-xs">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Phone className="w-3 h-3" aria-hidden="true" />
                  <span className="font-mono">24/7 Support: 9773910846</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Mail className="w-3 h-3" aria-hidden="true" />
                  <span>support@pharmamachine.com</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Truck className="w-3 h-3" aria-hidden="true" />
                  <span className="font-semibold">Free Shipping on Orders ₹1000+</span>
                </div>
                <div className="h-4 w-px bg-slate-600" aria-hidden="true" />
                <div className="flex items-center space-x-1 text-slate-300">
                  <HardHat className="w-3 h-3" aria-hidden="true" />
                  <span>ISO 9001:2024 Certified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main row ── */}
        <div className="border-b border-slate-600/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 lg:h-20">

              {/* Logo */}
              <div className="flex-shrink-0 group">
                <Link to="/" className="flex items-center space-x-2 md:space-x-3" onClick={handleLinkClick} aria-label="Homepage">
                  {location.pathname === '/' ? (
                    <h1 className="flex items-center space-x-2 md:space-x-3 text-lg md:text-2xl font-bold tracking-tight">
                      <PharmaLogo className="w-8 h-8 md:w-10 md:h-10 transform group-hover:rotate-6 transition-transform duration-300" />
                      {/* 🔁 RESPONSIVE: hide text on very small screens, show on sm+ */}
                      <span className="hidden xs:flex items-center space-x-1 md:space-x-2">
                        <span className="text-white">Pharma</span>
                        <span className="text-amber-400">Machine</span>
                        <span className="text-slate-400 hidden sm:inline">.com</span>
                      </span>
                    </h1>
                  ) : (
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <PharmaLogo className="w-8 h-8 md:w-10 md:h-10 transform group-hover:rotate-6 transition-transform duration-300" />
                      <span className="hidden xs:flex items-center text-lg md:text-2xl font-bold tracking-tight">
                        <span className="text-white">Pharma</span>
                        <span className="text-amber-400">Machine</span>
                        <span className="text-slate-400 hidden sm:inline">.com</span>
                      </span>
                    </div>
                  )}
                </Link>
              </div>

              {/* ── Desktop Navigation ── */}
              <ul className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 flex-1 justify-start px-2 xl:px-4" role="menubar">
                <li>
                  <Link
                    to="/"
                    onClick={handleLinkClick}
                    aria-current={isActive('/') ? 'page' : undefined}
                    className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop"
                    onClick={handleLinkClick}
                    aria-current={isActive('/shop') ? 'page' : undefined}
                    className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    Shop
                  </Link>
                </li>

                {/* Products Dropdown */}
                <HoverDropdown
                  label="Products"
                  open={productsDropdown}
                  setOpen={setProductsDropdown}
                  timeoutRef={productsTimeoutRef}
                  wide
                  id="products"
                >
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-slate-400">Loading categories...</span>
                    </div>
                  ) : productCategories.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">No products available</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {productCategories.map((cat) => (
                        <div key={cat.name} className="group/p">
                          <Link
                            to={cat.path}
                            onClick={handleLinkClick}
                            className="block p-3 hover:bg-slate-700/70 rounded-lg transition-all border border-transparent hover:border-slate-600"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-200 group-hover/p:text-amber-400 text-sm">{cat.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-400 group-hover/p:bg-amber-400/20 group-hover/p:text-amber-400">
                                  {cat.items}
                                </span>
                                <StockBadge stock={cat.stock} />
                              </div>
                            </div>
                            <div className="mt-1.5 space-y-1">
                              {cat.subCategories.slice(0, 3).map((sub) => (
                                <div key={sub.name} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400 group-hover/p:text-slate-300 truncate max-w-[140px]">
                                    • {sub.name}
                                  </span>
                                  <StockBadge stock={sub.stock} />
                                </div>
                              ))}
                              {cat.subCategories.length > 3 && (
                                <span className="text-xs text-amber-500/70">+{cat.subCategories.length - 3} more...</span>
                              )}
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-slate-700 mt-2 pt-3 px-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {allProducts.length} total products in inventory
                    </span>
                    <Link to="/shop" onClick={handleLinkClick} className="text-xs text-amber-400 hover:text-amber-300">
                      Browse Full Catalog →
                    </Link>
                  </div>
                </HoverDropdown>

                {/* Solutions Dropdown */}
                <HoverDropdown
                  label="Solutions"
                  open={solutionsDropdown}
                  setOpen={setSolutionsDropdown}
                  timeoutRef={solutionsTimeoutRef}
                  id="solutions"
                >
                  {solutionsLinks.map((s) => {
                    const Icon = s.icon;
                    return (
                      <Link
                        key={s.path}
                        to={s.path}
                        onClick={handleLinkClick}
                        className="group/s flex items-start space-x-3 px-4 py-3 hover:bg-slate-700/70 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                      >
                        <Icon className="w-5 h-5 text-amber-400 mt-0.5" aria-hidden="true" />
                        <div>
                          <div className="font-medium text-slate-200 group-hover/s:text-amber-400">{s.name}</div>
                          <p className="text-xs text-slate-400">{s.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </HoverDropdown>

                {/* Resources Dropdown */}
                <HoverDropdown
                  label="Resources"
                  open={resourcesDropdown}
                  setOpen={setResourcesDropdown}
                  timeoutRef={resourcesTimeoutRef}
                  id="resources"
                >
                  {resourcesLinks.map((r) => {
                    const Icon = r.icon;
                    return (
                      <Link
                        key={r.path}
                        to={r.path}
                        onClick={handleLinkClick}
                        className="group/r flex items-start space-x-3 px-4 py-3 hover:bg-slate-700/70 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                      >
                        <Icon className="w-5 h-5 text-amber-400 mt-0.5" aria-hidden="true" />
                        <div>
                          <div className="font-medium text-slate-200 group-hover/r:text-amber-400">{r.name}</div>
                          <p className="text-xs text-slate-400">{r.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                  <div className="border-t border-slate-700 mt-2 pt-3 px-4 flex flex-col sm:flex-row gap-2 sm:gap-6">
                    <button className="text-xs text-slate-400 hover:text-amber-400 flex items-center space-x-1">
                      <Download className="w-3 h-3" aria-hidden="true" />
                      <span>Downloads</span>
                    </button>
                    <button className="text-xs text-slate-400 hover:text-amber-400 flex items-center space-x-1">
                      <Award className="w-3 h-3" aria-hidden="true" />
                      <span>Certifications</span>
                    </button>
                  </div>
                </HoverDropdown>

                <li>
                  <Link
                    to="/projects"
                    onClick={handleLinkClick}
                    aria-current={isActive('/projects') ? 'page' : undefined}
                    className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    Projects
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    onClick={handleLinkClick}
                    aria-current={isActive('/contact') ? 'page' : undefined}
                    className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    Contact
                  </Link>
                </li>
              </ul>

              {/* ── Desktop actions ── */}
              <div className="hidden lg:flex items-center space-x-2 xl:space-x-3">
                <Link
                  to="/wishlist"
                  onClick={handleLinkClick}
                  aria-label="Wishlist"
                  className="p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                >
                  <Heart className="w-5 h-5" aria-hidden="true" />
                </Link>

                <Link
                  to="/cart"
                  onClick={handleLinkClick}
                  aria-label={`Shopping cart, ${cartTotalQuantity} items`}
                  className={`flex items-center gap-1 xl:gap-2 px-2 xl:px-4 py-2 text-slate-300 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all relative ${
                    cartNotification ? 'animate-pulse-cart' : ''
                  } focus:outline-none focus:ring-2 focus:ring-amber-400/50`}
                >
                  <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                  {cartTotalQuantity > 0 ? (
                    <>
                      <span className="font-medium text-sm hidden xl:inline">
                        {cartTotalQuantity} {cartTotalQuantity === 1 ? 'item' : 'items'}
                      </span>
                      <span className="absolute -top-1 -right-0 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cartTotalQuantity}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400 hidden xl:inline">Cart</span>
                  )}
                </Link>

                <div className="flex items-center space-x-2 xl:space-x-3 ml-2 xl:ml-4 pl-2 xl:pl-4 border-l border-slate-600">
                  {user ? (
                    <div className="relative" ref={userDropRef}>
                      <button
                        onClick={() => setIsUserDropOpen(!isUserDropOpen)}
                        aria-haspopup="true"
                        aria-expanded={isUserDropOpen}
                        aria-controls="user-menu"
                        className="flex items-center gap-1 xl:gap-2 focus:outline-none focus:ring-2 focus:ring-amber-400/50 rounded-full"
                        aria-label="User menu"
                      >
                        <img
                          src={user?.profileImage || avatarImg}
                          alt={user?.username || 'User'}
                          className="size-8 rounded-full object-cover border-2 border-slate-600 hover:border-amber-400 transition-colors"
                        />
                        <span className={`hidden xl:inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                          user?.role === 'admin'
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                            : 'bg-green-900/60 text-green-300 border border-green-700'
                        }`}>
                          {user?.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </button>

                      {isUserDropOpen && (
                        <div
                          id="user-menu"
                          role="menu"
                          aria-labelledby="user-menu-button"
                          className="absolute right-0 mt-3 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                            <p className="text-sm font-medium text-slate-100 truncate">
                              {user?.username || user?.name || 'User'}
                            </p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email || ''}</p>
                          </div>
                          <ul className="py-1">
                            {dropdownMenus.map((menu) => {
                              const Icon = menu.icon;
                              return (
                                <li key={menu.path}>
                                  <Link
                                    to={menu.path}
                                    onClick={handleLinkClick}
                                    role="menuitem"
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-amber-400 hover:bg-slate-700/60 transition-colors focus:outline-none focus:bg-slate-700/60"
                                  >
                                    <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                                    {menu.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                          <div className="border-t border-slate-700 py-1">
                            <button
                              onClick={handleLogout}
                              disabled={logoutLoading}
                              role="menuitem"
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors disabled:opacity-50 focus:outline-none focus:bg-red-900/20"
                            >
                              <LogOut className="w-4 h-4" aria-hidden="true" />
                              {logoutLoading ? 'Logging out…' : 'Logout'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={handleLinkClick}
                        className="px-3 xl:px-5 py-2 text-sm font-medium text-slate-200 hover:text-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50 rounded-lg"
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        onClick={handleLinkClick}
                        className="px-4 xl:px-6 py-2 text-sm font-semibold text-slate-900 bg-amber-400 rounded-lg hover:bg-amber-300 hover:scale-105 transform transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-amber-400/50"
                      >
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* ── Mobile actions ── */}
              <div className="lg:hidden flex items-center space-x-2">
                <button
                  onClick={() => { navigate('/search'); setIsOpen(false); }}
                  className="p-2 text-slate-200 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 rounded-lg"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" aria-hidden="true" />
                </button>
                <Link
                  to="/cart"
                  onClick={handleLinkClick}
                  aria-label={`Shopping cart, ${cartTotalQuantity} items`}
                  className={`p-2 text-slate-200 hover:text-amber-400 relative ${
                    cartNotification ? 'animate-pulse-cart' : ''
                  } focus:outline-none focus:ring-2 focus:ring-amber-400/50 rounded-lg`}
                >
                  <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                  {cartTotalQuantity > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartTotalQuantity}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  aria-expanded={isOpen}
                  aria-controls="mobile-menu"
                  className="p-2 rounded-lg text-slate-200 hover:text-amber-400 hover:bg-slate-700/50 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  aria-label={isOpen ? 'Close menu' : 'Open menu'}
                >
                  {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search Row (desktop) ── */}
        <div className="hidden lg:block bg-slate-800/50 backdrop-blur-sm py-4 border-b border-slate-600/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <form onSubmit={(e) => handleSearchSubmit(e, searchQuery)} className="flex gap-4 items-center" role="search">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍  Search for machines, categories, brands, SKU…"
                  aria-label="Search products"
                  className="w-full px-4 pl-10 pr-16 md:pl-14 md:pr-24 py-3 md:py-4 rounded-2xl bg-slate-700/60 border-2 border-slate-600 focus:border-amber-400 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-400/20 transition-all duration-300 text-base md:text-lg font-medium shadow-lg"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 md:px-6 py-1.5 md:py-2.5 text-sm md:text-base font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-amber-400/50"
                  aria-label="Submit search"
                >
                  Search
                </button>
              </div>
              <div className="flex-shrink-0 flex gap-2">
                <span className="text-sm text-slate-400 flex items-center hidden xl:inline">Popular:</span>
                {['Tablet Press', 'Capsule Filler', 'Lyophilizer'].map(term => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term);
                      handleSearchSubmit(new Event('submit'), term);
                    }}
                    className="text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 rounded-full bg-slate-700/60 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 border border-slate-600/50 hover:border-amber-400/50 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {isOpen && (
          <div
            id="mobile-menu"
            role="navigation"
            aria-label="Mobile navigation"
            className="lg:hidden bg-slate-800 border-t border-slate-700 max-h-[calc(100vh-4rem)] overflow-y-auto"
            ref={mobileMenuRef}
          >
            <div className="px-4 py-3 space-y-1">
              {/* Mobile search */}
              <div className="px-3 py-4 border-b border-slate-700 mb-2">
                <form onSubmit={(e) => handleSearchSubmit(e, mobileSearchQuery)} role="search">
                  <div className="relative">
                    <input
                      type="search"
                      value={mobileSearchQuery}
                      onChange={(e) => setMobileSearchQuery(e.target.value)}
                      placeholder="Search machines…"
                      aria-label="Search"
                      className="w-full px-4 py-3 pl-10 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-400"
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" aria-hidden="true" />
                    <button type="submit" className="absolute right-2 top-2 px-3 py-1 text-sm bg-amber-500 text-slate-900 font-semibold rounded-md">Go</button>
                  </div>
                </form>
              </div>

              {user ? (
                <div className="px-3 py-3 mb-2 bg-slate-700/40 rounded-lg border border-slate-600">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={user?.profileImage || avatarImg} alt={user?.username || 'User avatar'} className="size-9 rounded-full object-cover border-2 border-amber-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{user?.username || user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <span className={`ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      user?.role === 'admin' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'
                    }`}>
                      {user?.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {dropdownMenus.map((menu) => {
                      const Icon = menu.icon;
                      return (
                        <li key={menu.path}>
                          <Link
                            to={menu.path}
                            onClick={handleLinkClick}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                            {menu.label}
                          </Link>
                        </li>
                      );
                    })}
                    <li>
                      <button
                        onClick={handleLogout}
                        disabled={logoutLoading}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors border-t border-slate-600 mt-1 pt-3 disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        {logoutLoading ? 'Logging out…' : 'Logout'}
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="flex gap-2 px-3 mb-3">
                  <Link to="/login" onClick={handleLinkClick} className="flex-1 py-2.5 text-center text-sm font-medium text-slate-200 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">Login</Link>
                  <Link to="/register" onClick={handleLinkClick} className="flex-1 py-2.5 text-center text-sm font-semibold text-slate-900 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors">Register</Link>
                </div>
              )}

              <ul className="space-y-1">
                <li>
                  <Link
                    to="/"
                    onClick={handleLinkClick}
                    aria-current={isActive('/') ? 'page' : undefined}
                    className="block px-3 py-4 text-base font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop"
                    onClick={handleLinkClick}
                    aria-current={isActive('/shop') ? 'page' : undefined}
                    className="block px-3 py-4 text-base font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Shop
                  </Link>
                </li>

                {/* Mobile Products */}
                <li>
                  <button
                    onClick={() => setProductsDropdown(!productsDropdown)}
                    aria-expanded={productsDropdown}
                    aria-haspopup="true"
                    aria-controls="mobile-products"
                    className="w-full flex items-center justify-between px-3 py-4 text-base font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    <span>Products</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${productsDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {productsDropdown && (
                    <ul id="mobile-products" className="pl-4 space-y-1 mt-1 mb-2">
                      {productsLoading ? (
                        <li className="px-3 py-4 text-sm text-slate-400 flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          Loading...
                        </li>
                      ) : (
                        productCategories.map((cat) => (
                          <li key={cat.name}>
                            <Link
                              to={cat.path}
                              onClick={handleLinkClick}
                              className="flex items-center justify-between px-3 py-3 text-sm text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <span className="font-medium">{cat.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{cat.items}</span>
                                <StockBadge stock={cat.stock} />
                              </div>
                            </Link>
                            {cat.subCategories.map((sub) => (
                              <Link
                                key={sub.name}
                                to={sub.path}
                                onClick={handleLinkClick}
                                className="flex items-center justify-between pl-6 pr-3 py-2 text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <span>• {sub.name}</span>
                                <StockBadge stock={sub.stock} />
                              </Link>
                            ))}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </li>

                {/* Mobile Solutions */}
                <li>
                  <button
                    onClick={() => setSolutionsDropdown(!solutionsDropdown)}
                    aria-expanded={solutionsDropdown}
                    aria-haspopup="true"
                    aria-controls="mobile-solutions"
                    className="w-full flex items-center justify-between px-3 py-4 text-base font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    <span>Solutions</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${solutionsDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {solutionsDropdown && (
                    <ul id="mobile-solutions" className="pl-4 space-y-1 mt-1 mb-2">
                      {solutionsLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              onClick={handleLinkClick}
                              className="flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <Icon className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                              <div>
                                <div>{item.name}</div>
                                <p className="text-xs text-slate-400">{item.description}</p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>

                {/* Mobile Resources */}
                <li>
                  <button
                    onClick={() => setResourcesDropdown(!resourcesDropdown)}
                    aria-expanded={resourcesDropdown}
                    aria-haspopup="true"
                    aria-controls="mobile-resources"
                    className="w-full flex items-center justify-between px-3 py-4 text-base font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    <span>Resources</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${resourcesDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {resourcesDropdown && (
                    <ul id="mobile-resources" className="pl-4 space-y-1 mt-1 mb-2">
                      {resourcesLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              onClick={handleLinkClick}
                              className="flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <Icon className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                              <div>
                                <div>{item.name}</div>
                                <p className="text-xs text-slate-400">{item.description}</p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>

                <li>
                  <Link
                    to="/projects"
                    onClick={handleLinkClick}
                    aria-current={isActive('/projects') ? 'page' : undefined}
                    className="block px-3 py-4 text-base font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Projects
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    onClick={handleLinkClick}
                    aria-current={isActive('/contact') ? 'page' : undefined}
                    className="block px-3 py-4 text-base font-medium text-slate-200 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>

              <div className="mt-4 px-3 py-4 bg-slate-700/50 rounded-lg space-y-3">
                <div className="flex items-center space-x-3 text-sm text-slate-300">
                  <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                  <span>24/7 Support: 9773910846</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-300">
                  <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                  <span>support@pharmamachine.com</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-300">
                  <Truck className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                  <span>Free Shipping ₹1000+</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── SPACER – responsive ──────────────────────────────── */}
      <div className="h-20 md:h-28 lg:h-44" aria-hidden="true" />

      <style>{`
        @keyframes pulseCart {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); color: #4ade80; }
          100% { transform: scale(1); }
        }
        .animate-pulse-cart {
          animation: pulseCart 0.6s ease-in-out 2;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        /* Extra small screen ( < 480px ) helper */
        @media (min-width: 480px) {
          .xs\\:flex {
            display: flex !important;
          }
        }
        .xs\\:flex {
          display: none;
        }
      `}</style>
    </>
  );
};

export default Navbar;