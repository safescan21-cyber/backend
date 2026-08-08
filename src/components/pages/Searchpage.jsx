// pages/SearchPage.jsx
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Search, X, Filter, ChevronDown,
  Package, Shield, ArrowRight, Tag, Star, Truck,
  Clock, TrendingUp, Grid, List, ChevronRight, AlertCircle
} from 'lucide-react';
import { useFetchAllProductsQuery } from '../store/products/productsApi';

// ─── Config ────────────────────────────────────────────────────────────────
const CATEGORY_META = {
  'load-cells':      { label: 'Load Cells',     emoji: '⚖️' },
  'controllers':     { label: 'Controllers',     emoji: '🖥️' },
  'weighing-scales': { label: 'Weighing Scales', emoji: '📦' },
  // add more if needed – they will be shown dynamically from data
};

// ✅ This was missing – fixed now
const CATEGORIES = ['All Categories', 'load-cells', 'controllers', 'weighing-scales'];

const SORT_OPTIONS = [
  { label: 'Most Relevant',     value: 'relevant'   },
  { label: 'Price: Low → High', value: 'price_asc'  },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Top Rated',         value: 'rating'     },
  { label: 'Most Reviews',      value: 'reviews'    },
];
const POPULAR_SEARCHES = ['Load Cell', 'Scale', 'Controller', 'Wireless', 'Crane', 'Waterproof', 'PID'];

// ─── Helpers ──────────────────────────────────────────────────────────────
const StarRating = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
    ))}
  </div>
);

const StockBadge = ({ stock }) => {
  const map = {
    'In Stock':      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Low Stock':     'bg-amber-500/20  text-amber-400  border-amber-500/30',
    'Made to Order': 'bg-blue-500/20   text-blue-400   border-blue-500/30',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[stock] || 'bg-slate-700 text-slate-400'}`}>
      {stock}
    </span>
  );
};

const discountPct = (price, oldPrice) =>
  oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;

// ─── Product Card (with Link to product detail) ──────────────────────
const ProductCard = ({ product, view }) => {
  const pct = discountPct(product.price, product.oldPrice);
  const productLink = `/shop/${product._id}`; // adjust if your route is different

  if (view === 'list') {
    return (
      <div className="group bg-slate-800/60 border border-slate-700/50 hover:border-amber-500/40 rounded-xl p-4 flex gap-4 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
        <Link to={productLink} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-slate-700/40 hover:border-amber-400/50 transition-colors">
          <img src={product.image?.[0] || 'https://picsum.photos/seed/1/400/300'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          {pct && <span className="absolute top-1 left-1 text-[9px] font-bold bg-red-500 text-white rounded px-1 py-0.5">-{pct}%</span>}
        </Link>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {product.tag && (
                <span className="inline-block text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5 mb-1 uppercase tracking-wider mr-1">{product.tag}</span>
              )}
              <Link to={productLink} className="hover:text-amber-400 transition-colors">
                <h3 className="font-semibold text-slate-100 group-hover:text-amber-400 transition-colors text-sm leading-snug">{product.name}</h3>
              </Link>
              <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{CATEGORY_META[product.category]?.label || product.category} · {product.color}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold text-amber-400">₹{product.price.toFixed(2)}</div>
              {product.oldPrice && <div className="text-xs text-slate-500 line-through">₹{product.oldPrice.toFixed(2)}</div>}
              <div className="mt-1"><StockBadge stock={product.stock} /></div>
            </div>
          </div>
          <p className="text-xs text-slate-400 line-clamp-1">{product.description}</p>
          <div className="flex items-center justify-between mt-auto pt-1">
            <div className="flex items-center gap-1.5">
              <StarRating rating={product.rating} />
              <span className="text-xs text-slate-500">{product.rating} ({product.reviews || 0})</span>
            </div>
            <Link to={productLink} className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <Link to={productLink} className="block group bg-slate-800/60 border border-slate-700/50 hover:border-amber-500/40 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5 flex flex-col">
      <div className="relative h-44 overflow-hidden bg-slate-700/30">
        <img src={product.image?.[0] || 'https://picsum.photos/seed/1/400/300'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
        {product.tag && (
          <span className="absolute top-2 left-2 text-[9px] font-bold text-amber-400 bg-slate-900/80 border border-amber-400/30 rounded px-1.5 py-0.5 uppercase tracking-wider backdrop-blur-sm">{product.tag}</span>
        )}
        {pct && (
          <span className="absolute top-2 right-2 text-[9px] font-bold bg-red-500 text-white rounded px-1.5 py-0.5">-{pct}%</span>
        )}
        <div className="absolute bottom-2 left-2"><StockBadge stock={product.stock} /></div>
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <p className="text-[10px] text-slate-500 capitalize mb-1">
          {CATEGORY_META[product.category]?.emoji} {CATEGORY_META[product.category]?.label || product.category} · <span className="capitalize">{product.color}</span>
        </p>
        <h3 className="font-semibold text-slate-100 group-hover:text-amber-400 transition-colors text-sm leading-snug line-clamp-2 mb-1.5">{product.name}</h3>
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 flex-1">{product.description}</p>
        <div className="flex items-center gap-1.5 mb-3">
          <StarRating rating={product.rating} />
          <span className="text-xs text-slate-500">({product.reviews || 0})</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-base font-bold text-amber-400">₹{product.price.toFixed(2)}</div>
            {product.oldPrice && <div className="text-[10px] text-slate-500 line-through">₹{product.oldPrice.toFixed(2)}</div>}
          </div>
          <span className="text-xs bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-900 font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
            View <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
};

// ─── Main SearchPage ──────────────────────────────────────────────────────
const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [inputValue,       setInputValue]      = useState('');
  const [activeQuery,      setActiveQuery]      = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy,           setSortBy]           = useState('relevant');
  const [view,             setView]             = useState('grid');
  const [categoryOpen,     setCategoryOpen]     = useState(false);
  const [sortOpen,         setSortOpen]         = useState(false);
  const [hasSearched,      setHasSearched]      = useState(false);
  const inputRef = useRef(null);

  // ── Fetch products ──
  const categoryParam = selectedCategory !== 'All Categories' ? selectedCategory : undefined;
  const { data, isLoading, error } = useFetchAllProductsQuery({
    category: categoryParam,
    limit: 100,
  });
  const products = data?.products || [];

  // ── Sync from URL ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q    = params.get('q')    || '';
    const cat  = params.get('cat')  || 'All Categories';
    const sort = params.get('sort') || 'relevant';
    setInputValue(q);
    setSelectedCategory(cat);
    setSortBy(sort);
    if (q || cat !== 'All Categories') {
      setHasSearched(true);
      setActiveQuery(q);
    } else {
      setHasSearched(false);
      setActiveQuery('');
    }
  }, [location.search]);

  // ── Close dropdowns ──
  useEffect(() => {
    const close = () => { setCategoryOpen(false); setSortOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Local search & sort ──
  const searchProductsLocally = (query, sort) => {
    let results = [...products];
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      results = results.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.color?.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'price_asc':  results.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
      case 'price_desc': results.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case 'rating':     results.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'reviews':    results.sort((a, b) => (b.reviews || 0) - (a.reviews || 0)); break;
      default: break;
    }
    return results;
  };

  const filteredResults = searchProductsLocally(activeQuery, sortBy);

  // ── URL update ──
  const updateURL = (q, cat, sort) => {
    const params = new URLSearchParams();
    if (q)   params.set('q', q);
    if (cat && cat !== 'All Categories') params.set('cat', cat);
    if (sort && sort !== 'relevant')     params.set('sort', sort);
    navigate(`/Search?${params.toString()}`, { replace: true });
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    setActiveQuery(inputValue);
    setHasSearched(true);
    updateURL(inputValue, selectedCategory, sortBy);
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setCategoryOpen(false);
    setHasSearched(true);
    updateURL(activeQuery, cat, sortBy);
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    setSortOpen(false);
    updateURL(activeQuery, selectedCategory, sort);
  };

  const handlePopular = (term) => {
    setInputValue(term);
    setActiveQuery(term);
    setHasSearched(true);
    updateURL(term, selectedCategory, sortBy);
  };

  const handleClear = () => {
    setInputValue('');
    setActiveQuery('');
    setHasSearched(false);
    navigate('/Search');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Most Relevant';
  const featuredProducts = products.filter(p => p.tag);
  const categoriesFromData = ['All Categories', ...new Set(products.map(p => p.category).filter(Boolean))];
  const displayCategories = products.length > 0 ? categoriesFromData : CATEGORIES;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 pt-24 lg:pt-28">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-r from-slate-800/90 to-slate-700/80 border-b border-slate-700/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
            Search <span className="text-amber-400">Products</span>
          </h1>
          <p className="text-slate-400 text-sm mb-5">
            {isLoading ? 'Loading...' : `${products.length} products`} · {displayCategories.length - 1} categories
          </p>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Search by name, category, color…"
                  autoFocus
                  className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-slate-900/70 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 text-sm"
                />
                {inputValue && (
                  <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button type="submit" className="flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 text-sm whitespace-nowrap">
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
          </form>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Popular:</span>
            {POPULAR_SEARCHES.map(term => (
              <button key={term} onClick={() => handlePopular(term)}
                className="text-xs px-3 py-1 rounded-full bg-slate-700/60 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 border border-slate-600/50 hover:border-amber-500/40 transition-all duration-200">
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="border-b border-slate-700/40 bg-slate-800/40 backdrop-blur-sm sticky top-16 lg:top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14 overflow-x-auto scrollbar-none">

            {/* Category */}
            <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setCategoryOpen(!categoryOpen); setSortOpen(false); }}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-amber-400 border border-slate-700 hover:border-amber-500/40 rounded-lg px-3 py-1.5 bg-slate-800/60 transition-colors">
                <Filter className="w-3.5 h-3.5" />
                <span className="max-w-[140px] truncate">
                  {selectedCategory === 'All Categories' ? 'All Categories' : (CATEGORY_META[selectedCategory]?.label || selectedCategory)}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
              </button>
              {categoryOpen && (
                <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 min-w-48 max-h-60 overflow-y-auto">
                  {displayCategories.map(cat => (
                    <button key={cat} onClick={() => handleCategoryChange(cat)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === cat ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300 hover:bg-slate-700/60 hover:text-amber-400'}`}>
                      {cat === 'All Categories' ? 'All Categories' : `${CATEGORY_META[cat]?.emoji || '📦'} ${CATEGORY_META[cat]?.label || cat}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setSortOpen(!sortOpen); setCategoryOpen(false); }}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-amber-400 border border-slate-700 hover:border-amber-500/40 rounded-lg px-3 py-1.5 bg-slate-800/60 transition-colors">
                Sort: <span className="text-amber-400 text-xs">{currentSortLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 min-w-48">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => handleSortChange(opt.value)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === opt.value ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300 hover:bg-slate-700/60 hover:text-amber-400'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Count */}
            {hasSearched && !isLoading && (
              <span className="text-xs text-slate-500 flex-shrink-0">
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}{activeQuery ? ` for "${activeQuery}"` : ''}
              </span>
            )}

            {/* View toggle */}
            <div className="ml-auto flex items-center flex-shrink-0 border border-slate-700 rounded-lg overflow-hidden">
              <button onClick={() => setView('grid')} className={`p-2 transition-colors ${view === 'grid' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'}`}>
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView('list')} className={`p-2 transition-colors ${view === 'list' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        {/* Active chips */}
        {(activeQuery || selectedCategory !== 'All Categories') && !isLoading && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs text-slate-500">Filters:</span>
            {activeQuery && (
              <span className="flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-3 py-1">
                <Search className="w-3 h-3" /> {activeQuery}
                <button onClick={handleClear}><X className="w-3 h-3 ml-1 hover:text-amber-200" /></button>
              </span>
            )}
            {selectedCategory !== 'All Categories' && (
              <span className="flex items-center gap-1.5 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full px-3 py-1">
                <Tag className="w-3 h-3" /> {CATEGORY_META[selectedCategory]?.label || selectedCategory}
                <button onClick={() => handleCategoryChange('All Categories')}><X className="w-3 h-3 ml-1 hover:text-blue-200" /></button>
              </span>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`bg-slate-800/40 rounded-xl animate-pulse ${view === 'list' ? 'h-28' : 'h-72'}`} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-red-500/30">
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Failed to load products</h3>
            <p className="text-slate-400 text-sm">Please try again later.</p>
          </div>
        )}

        {/* Results grid / list */}
        {!isLoading && !error && hasSearched && (
          filteredResults.length > 0 ? (
            <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredResults.map(p => <ProductCard key={p._id} product={p} view={view} />)}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/30">
              <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No products found</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                No results for <span className="text-amber-400">"{activeQuery}"</span>. Try a different keyword.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {POPULAR_SEARCHES.map(term => (
                  <button key={term} onClick={() => handlePopular(term)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-amber-400 hover:bg-slate-600 transition-colors">
                    {term}
                  </button>
                ))}
              </div>
              <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 font-medium">
                View all products <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )
        )}

        {/* Initial / browse state (no search yet) */}
        {!isLoading && !error && !hasSearched && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" /> Browse by Category
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {displayCategories.filter(c => c !== 'All Categories').map(cat => {
                const count = products.filter(p => p.category === cat).length;
                const meta = CATEGORY_META[cat] || { label: cat, emoji: '📦' };
                return (
                  <button key={cat} onClick={() => handleCategoryChange(cat)}
                    className="group flex items-center gap-4 p-5 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/40 hover:border-amber-500/40 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 text-left">
                    <span className="text-4xl">{meta.emoji}</span>
                    <div>
                      <div className="font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">{meta.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{count} products</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 ml-auto transition-colors" />
                  </button>
                );
              })}
            </div>

            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" /> Featured Products
            </h2>
            {featuredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {featuredProducts.slice(0, 8).map(p => <ProductCard key={p._id} product={p} view="grid" />)}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No featured products at the moment.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Trust bar ── */}
      <div className="border-t border-slate-700/40 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Truck,   title: 'Free Shipping',  sub: 'On orders ₹1000+' },
              { icon: Clock,   title: '24/7 Support',   sub: '9773910846' },
              { icon: Shield,  title: 'ISO 9001:2024',  sub: 'Certified supplier' },
              { icon: Package, title: 'Bulk Discounts', sub: 'Volume pricing' },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30">
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">{title}</div>
                  <div className="text-[10px] text-slate-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;