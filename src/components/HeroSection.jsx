import React, { useState, useRef, useEffect, useCallback } from 'react';
import Trendingproducts from "./shop/Trendingproducts";
import Dealsection from "./shop/Dealsection";
import PromoBanner from "./shop/PromoBanner";
import Categories from "./Categories";
import IndustrialBlogSection from "./IndustrialBlogSection";
import {
    ChevronLeft, ChevronRight, Star, Scale, Weight, Zap, Activity, Ruler,
    ExternalLink, CheckCircle, AlertCircle, Minus, Plus, ShoppingCart,
    Sparkles, Package, Truck, Shield, Eye
} from 'lucide-react';
import axios from 'axios';

// ─── API Service ───────────────────────────────────────────────────────────────
const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

export const getProducts = (params = {}) =>
    api.get('/products', { params });

export const getProduct = (id) =>
    api.get(`/products/${id}`);

// ─── CSS Styles ──────────────────────────────────────────────────────────────
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes zoomIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(0.98); }
  }
  .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
  .animate-fade-in-delay { animation: fadeIn 1s ease-out 0.3s forwards; opacity: 0; }
  .animate-fade-in-delay-2 { animation: fadeIn 1s ease-out 0.6s forwards; opacity: 0; }
  .animate-slide-in { animation: slideIn 0.5s ease-out forwards; }
  .animate-zoom-in { animation: zoomIn 0.3s ease-out forwards; }
  .animate-pulse-slow { animation: pulse 2s ease-in-out infinite; }
  .modal-overlay { backdrop-filter: blur(8px); }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

// ─── Helper ──────────────────────────────────────────────────────────────────
const renderStars = (rating = 0) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
        <div className="flex items-center gap-0.5">
            {[...Array(full)].map((_, i) => (
                <Star key={`full-${i}`} size={14} className="text-yellow-400 fill-current" />
            ))}
            {half === 1 && <Star size={14} className="text-yellow-400 fill-current" />}
            {[...Array(empty)].map((_, i) => (
                <Star key={`empty-${i}`} size={14} className="text-gray-300" />
            ))}
        </div>
    );
};

// ─── Home Component ──────────────────────────────────────────────────────────
const Home = () => {
    // ── Carousel State ──
    const [images] = useState([
        {
            id: 1,
            url: 'https://images.unsplash.com/photo-1583779457094-ab6f77d7f87f?w=1200',
            title: 'Industrial Load Cells',
            subtitle: 'High Precision Weighing Solutions',
            cta: 'Shop Now',
            ctaLink: '/products/load-cells',
            category: 'loadcells'
        },
        {
            id: 2,
            url: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=1200',
            title: 'Digital Weighing Scales',
            subtitle: 'Industrial Grade Precision',
            cta: 'Shop Now',
            ctaLink: '/products/digital-scales',
            category: 'digital'
        },
        {
            id: 3,
            url: 'https://images.unsplash.com/photo-1564069114553-7215e1ff1890?w=1200',
            title: 'Heavy Duty Platform Scales',
            subtitle: 'Built for Industrial Environments',
            cta: 'Shop Now',
            ctaLink: '/products/platform-scales',
            category: 'scales'
        }
    ]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const autoPlayRef = useRef();
    const slideDuration = 5000; // fixed

    // ── Product State (from DB) ──
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // ── Product Modal State ──
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [productQuantity, setProductQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [selectedImage, setSelectedImage] = useState(0);
    const [modalLoading, setModalLoading] = useState(false);

    const limit = 8;

    // ── Fetch Products from DB ──
    const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setIsLoadingMore(true);

            const response = await getProducts({
                page: pageNum,
                limit: limit,
            });

            const data = response.data || {};
            const fetchedProducts = Array.isArray(data.products) ? data.products : [];
            const total = data.totalPages || 1;
            const totalCount = data.totalProducts || 0;

            setProducts(prev => append ? [...prev, ...fetchedProducts] : fetchedProducts);
            setTotalPages(total);
            setTotalProducts(totalCount);
            setHasMore(pageNum < total);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError('Failed to load products. Please try again.');
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    // ── Initial Load ──
    useEffect(() => {
        fetchProducts(1, false);
    }, [fetchProducts]);

    // ── Load More ──
    const loadMoreProducts = () => {
        if (!isLoadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchProducts(nextPage, true);
        }
    };

    // ── Carousel Auto‑play ──
    useEffect(() => {
        if (isAutoPlaying && images.length > 1) {
            autoPlayRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, slideDuration);
        }
        return () => clearInterval(autoPlayRef.current);
    }, [isAutoPlaying, images.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToSlide = (index) => {
        setCurrentIndex(index);
    };

    // ── UI Helpers ──
    const getCategoryIcon = (category) => {
        switch (category?.toLowerCase()) {
            case 'loadcells': return <Scale size={14} />;
            case 'scales': return <Weight size={14} />;
            case 'industrial': return <Zap size={14} />;
            case 'digital': return <Activity size={14} />;
            default: return <Ruler size={14} />;
        }
    };

    const handleShopNow = (link) => {
        if (link) window.location.href = link;
        else alert('Add your product link');
    };

    // ── Product Modal Handlers ──
    const openProductModal = async (productId, defaultTab = 'description') => {
        try {
            setModalLoading(true);
            const response = await getProduct(productId);
            const { product, reviews } = response.data || {};

            if (!product) {
                throw new Error('Product not found');
            }

            const productWithReviews = {
                ...product,
                reviews: reviews?.length || 0,
                rating: product.rating || 0
            };

            setSelectedProduct(productWithReviews);
            setProductQuantity(1);
            setSelectedImage(0);
            setActiveTab(defaultTab);
            setShowProductModal(true);
            document.body.style.overflow = 'hidden';
        } catch (err) {
            console.error('Failed to fetch product details:', err);
            alert('Could not load product details. Please try again.');
        } finally {
            setModalLoading(false);
        }
    };

    const closeProductModal = () => {
        setShowProductModal(false);
        setSelectedProduct(null);
        document.body.style.overflow = 'auto';
    };

    const increaseQuantity = () => {
        if (productQuantity < 100) setProductQuantity(prev => prev + 1);
    };

    const decreaseQuantity = () => {
        if (productQuantity > 1) setProductQuantity(prev => prev - 1);
    };

    const addToCart = () => {
        alert(`✅ Added ${productQuantity} x ${selectedProduct?.name} to cart!\n\nTotal: $${(selectedProduct?.price * productQuantity).toFixed(2)}`);
    };

    const handleProductClick = (productId) => {
        openProductModal(productId, 'description');
    };

    const handleQuickView = (e, productId) => {
        e.stopPropagation();
        openProductModal(productId, 'description');
    };

    // ── Skeleton Loader ──
    const SkeletonCard = () => (
        <div className="bg-white rounded-xl overflow-hidden shadow-md">
            <div className="h-56 sm:h-64 bg-gray-200 skeleton"></div>
            <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded skeleton w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded skeleton w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded skeleton w-1/2"></div>
                <div className="flex gap-2">
                    <div className="h-3 bg-gray-200 rounded skeleton w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded skeleton w-1/4"></div>
                </div>
            </div>
        </div>
    );

    // ── Render ──
    return (
        <>
            <style>{styles}</style>

            <div className="relative w-full bg-gray-100 min-h-screen">
                {/* ─── Hero Carousel ─── */}
                <div className="relative h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px] w-full overflow-hidden bg-black">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-blue-900 to-gray-800"></div>
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)',
                            backgroundSize: '40px 40px'
                        }}></div>
                    </div>

                    {/* Slides */}
                    {images.map((image, index) => (
                        <div
                            key={image.id}
                            className={`absolute top-0 left-0 w-full h-full transition-all duration-1000 ease-in-out ${
                                index === currentIndex ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
                            }`}
                        >
                            <img src={image.url} alt={image.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-white px-4 max-w-4xl mx-auto">
                                    <div className="flex items-center justify-center mb-2 sm:mb-4 space-x-2">
                                        {getCategoryIcon(image.category)}
                                        <span className="text-xs sm:text-sm uppercase tracking-wider text-blue-300">
                                            {image.category || 'Professional'}
                                        </span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-2 sm:mb-4 animate-fade-in drop-shadow-lg">
                                        {image.title}
                                    </h1>
                                    <p className="text-base sm:text-lg md:text-2xl lg:text-3xl mb-4 sm:mb-6 animate-fade-in-delay drop-shadow-md">
                                        {image.subtitle}
                                    </p>
                                    <button
                                        onClick={() => handleShopNow(image.ctaLink)}
                                        className="bg-blue-600 text-white px-6 sm:px-8 md:px-10 py-2 sm:py-3 md:py-4 rounded-full font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 text-sm sm:text-base md:text-lg shadow-lg animate-fade-in-delay-2 flex items-center space-x-2 mx-auto"
                                    >
                                        <ExternalLink size={16} className="sm:w-5 sm:h-5" />
                                        <span>{image.cta}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button onClick={prevSlide} className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all">
                                <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
                            </button>
                            <button onClick={nextSlide} className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all">
                                <ChevronRight size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </>
                    )}

                    {/* Dots */}
                    {images.length > 1 && (
                        <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2 sm:space-x-3">
                            {images.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => goToSlide(idx)}
                                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                                        currentIndex === idx ? 'bg-blue-500 w-6 sm:w-8' : 'bg-white/50 w-1.5 sm:w-2'
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Auto‑play Toggle (optional, keep if you want) */}
                    {images.length > 1 && (
                        <button
                            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                            className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm"
                        >
                            {isAutoPlaying ? '⏸' : '▶'}
                        </button>
                    )}
                </div>

                {/* ─── Products Grid Section ─── */}
                <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-10 md:mb-14">
                            <div className="inline-flex items-center justify-center mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                                Our Products
                            </h2>
                            <div className="w-20 h-1 bg-blue-600 mx-auto mb-4 rounded-full"></div>
                            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
                                Discover our premium collection of handpicked products, specially selected for quality and performance
                            </p>
                            {totalProducts > 0 && (
                                <p className="text-xs text-gray-400 mt-2">
                                    {totalProducts} products available
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-lg">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                    <button
                                        onClick={() => fetchProducts(1, false)}
                                        className="ml-4 bg-red-600 text-white px-4 py-1 rounded-lg hover:bg-red-700 text-sm"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        )}

                        {!loading && !error && (
                            <>
                                {products.length === 0 ? (
                                    <div className="text-center py-16">
                                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500 text-lg">No products found.</p>
                                        <p className="text-gray-400 text-sm">Check back later for new arrivals.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                        {products.map((product) => (
                                            <div
                                                key={product._id}
                                                className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                                                onClick={() => handleProductClick(product._id)}
                                            >
                                                <div className="relative overflow-hidden bg-gray-100 h-56 sm:h-64">
                                                    <img
                                                        src={product.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        onError={(e) => {
                                                            e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                                        }}
                                                    />
                                                    {product.badge && (
                                                        <span className={`absolute top-3 left-3 ${product.badgeColor || 'bg-blue-500'} text-white text-xs font-bold px-2 py-1 rounded-full z-10 shadow-md`}>
                                                            {product.badge}
                                                        </span>
                                                    )}
                                                    {product.oldPrice && product.oldPrice > product.price && (
                                                        <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 shadow-md">
                                                            SAVE {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                                        </span>
                                                    )}
                                                    {!product.inStock && (
                                                        <span className="absolute bottom-3 left-3 bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded-full z-10 shadow-md">
                                                            Out of Stock
                                                        </span>
                                                    )}
                                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 z-20">
                                                        <button
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-lg"
                                                            onClick={(e) => handleQuickView(e, product._id)}
                                                        >
                                                            <Eye size={16} />
                                                            Quick View
                                                        </button>
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 opacity-0 group-hover:opacity-100"></div>
                                                </div>
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                                                            {product.category || 'Uncategorized'}
                                                        </span>
                                                        {renderStars(product.rating || 0)}
                                                    </div>
                                                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[3rem] text-sm sm:text-base">
                                                        {product.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-xl font-bold text-blue-600">
                                                            ${(product.price || 0).toFixed(2)}
                                                        </span>
                                                        {product.oldPrice && product.oldPrice > product.price && (
                                                            <span className="text-sm text-gray-400 line-through">
                                                                ${product.oldPrice.toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                                                        <div className="flex items-center gap-1">
                                                            {product.inStock ? (
                                                                <>
                                                                    <CheckCircle size={12} className="text-green-500" />
                                                                    <span>In Stock</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <AlertCircle size={12} className="text-red-500" />
                                                                    <span>Out of Stock</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Truck size={12} className="text-blue-500" />
                                                            <span>Free Ship</span>
                                                        </div>
                                                        {product.warranty && (
                                                            <div className="flex items-center gap-1">
                                                                <Shield size={12} className="text-purple-500" />
                                                                <span>{product.warranty}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {hasMore && !loading && (
                                    <div className="text-center mt-12">
                                        <button
                                            onClick={loadMoreProducts}
                                            disabled={isLoadingMore}
                                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 mx-auto"
                                        >
                                            {isLoadingMore ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Loading...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={18} />
                                                    <span>Load More Products</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {!hasMore && !loading && products.length > 0 && (
                                    <p className="text-center text-gray-400 text-sm mt-8">
                                        You've seen all {totalProducts} products 🎉
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* ─── Other Components ─── */}
                <div>
                    <Categories onProductClick={handleProductClick} />
                    <Trendingproducts onProductClick={handleProductClick} />
                    <Dealsection onProductClick={handleProductClick} />
                    <PromoBanner />
                    <IndustrialBlogSection />
                </div>

                {/* ─── Product Detail Modal ─── */}
                {showProductModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay bg-black/80 overflow-y-auto" onClick={closeProductModal}>
                        <div className="bg-white rounded-2xl max-w-5xl w-full my-8 animate-zoom-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center z-10">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold">
                                        {modalLoading ? 'Loading...' : selectedProduct?.name}
                                    </h2>
                                    {selectedProduct?.sku && (
                                        <p className="text-xs text-gray-500">SKU: {selectedProduct.sku}</p>
                                    )}
                                </div>
                                <button onClick={closeProductModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>

                            {modalLoading ? (
                                <div className="flex flex-col lg:flex-row p-8">
                                    <div className="lg:w-1/2">
                                        <div className="w-full h-80 bg-gray-200 skeleton rounded-lg"></div>
                                        <div className="flex gap-2 mt-4">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="w-16 h-16 bg-gray-200 skeleton rounded-lg"></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="lg:w-1/2 p-4 space-y-4">
                                        <div className="h-6 bg-gray-200 skeleton rounded w-1/3"></div>
                                        <div className="h-8 bg-gray-200 skeleton rounded w-1/2"></div>
                                        <div className="h-20 bg-gray-200 skeleton rounded"></div>
                                        <div className="h-10 bg-gray-200 skeleton rounded w-2/3"></div>
                                    </div>
                                </div>
                            ) : selectedProduct && (
                                <div className="flex flex-col lg:flex-row">
                                    <div className="lg:w-1/2 p-4 sm:p-6 bg-gray-50">
                                        <img
                                            src={selectedProduct.images?.[selectedImage] || 'https://via.placeholder.com/800x600?text=No+Image'}
                                            alt={selectedProduct.name}
                                            className="w-full h-64 sm:h-80 object-cover rounded-lg mb-4"
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/800x600?text=No+Image';
                                            }}
                                        />
                                        {selectedProduct.images && selectedProduct.images.length > 1 && (
                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                {selectedProduct.images.map((img, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedImage(idx)}
                                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${selectedImage === idx ? 'border-blue-500' : 'border-gray-200'}`}
                                                    >
                                                        <img src={img} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/64x64?text=No+Image'; }} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="lg:w-1/2 p-4 sm:p-6 overflow-y-auto max-h-[70vh]">
                                        <div className="mb-4">
                                            <span className="text-blue-600 text-sm font-semibold">{selectedProduct.category || 'Uncategorized'}</span>
                                            <div className="flex items-center gap-2 mt-2">
                                                {renderStars(selectedProduct.rating || 0)}
                                                <span className="text-sm text-gray-600">
                                                    ({selectedProduct.reviews || 0} reviews)
                                                </span>
                                            </div>
                                            <div className="mt-3">
                                                <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                                                    ${(selectedProduct.price || 0).toFixed(2)}
                                                </span>
                                                {selectedProduct.oldPrice && selectedProduct.oldPrice > selectedProduct.price && (
                                                    <span className="ml-2 text-gray-400 line-through">
                                                        ${selectedProduct.oldPrice.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                {selectedProduct.inStock ? (
                                                    <>
                                                        <CheckCircle className="text-green-600" size={16} />
                                                        <span className="text-green-600 text-sm font-medium">In Stock</span>
                                                        {selectedProduct.stockCount && (
                                                            <span className="text-xs text-gray-500 ml-auto">{selectedProduct.stockCount} units</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle className="text-red-500" size={16} />
                                                        <span className="text-red-500 text-sm font-medium">Out of Stock</span>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                <Truck size={12} className="inline mr-1" />
                                                Free shipping on orders over $500
                                            </p>
                                            {selectedProduct.warranty && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    <Shield size={12} className="inline mr-1" />
                                                    Warranty: {selectedProduct.warranty}
                                                </p>
                                            )}
                                        </div>

                                        <p className="text-gray-600 text-sm mb-4">{selectedProduct.description}</p>

                                        <div className="flex border-b mb-3">
                                            <button
                                                onClick={() => setActiveTab('description')}
                                                className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'description' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Features
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('specifications')}
                                                className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'specifications' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Specs
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            {activeTab === 'description' && selectedProduct.features && selectedProduct.features.length > 0 && (
                                                <ul className="space-y-1">
                                                    {selectedProduct.features.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {activeTab === 'description' && (!selectedProduct.features || selectedProduct.features.length === 0) && (
                                                <p className="text-sm text-gray-500">No features listed.</p>
                                            )}
                                            {activeTab === 'specifications' && selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                                                <div className="space-y-2">
                                                    {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                                                        <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-1">
                                                            <span className="text-gray-600">{k}:</span>
                                                            <span className="font-medium">{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {activeTab === 'specifications' && (!selectedProduct.specifications || Object.keys(selectedProduct.specifications).length === 0) && (
                                                <p className="text-sm text-gray-500">No specifications available.</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mb-4">
                                            <button
                                                onClick={decreaseQuantity}
                                                disabled={!selectedProduct.inStock}
                                                className="w-8 h-8 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-12 text-center font-semibold">{productQuantity}</span>
                                            <button
                                                onClick={increaseQuantity}
                                                disabled={!selectedProduct.inStock}
                                                className="w-8 h-8 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={addToCart}
                                            disabled={!selectedProduct.inStock}
                                            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${selectedProduct.inStock ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                        >
                                            <ShoppingCart size={18} />
                                            {selectedProduct.inStock ? 'Add to Cart' : 'Out of Stock'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
    
};

export default Home;