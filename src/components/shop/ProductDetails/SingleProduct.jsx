import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  useFetchProductByIdQuery,
  useFetchRelatedProductsQuery,
} from '../../store/products/productsApi';
import {
  useGetReviewsByProductIdQuery,
  usePostReviewMutation,
} from '../../store/review/reviewApi';
import { addToCart, selectCartItems } from '../../store/cartSlice';
import { showCartAddedToast } from '../../../utlis/notifications';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// Star Rating
// ─────────────────────────────────────────────
const StarRating = ({ rating, size = 'sm', onRatingChange = null }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`${sz} ${onRatingChange ? 'cursor-pointer transition-all hover:scale-110' : ''} ${
            (onRatingChange ? hoverRating || rating : rating) >= s
              ? 'text-yellow-400'
              : 'text-gray-300'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          onMouseEnter={() => onRatingChange && setHoverRating(s)}
          onMouseLeave={() => onRatingChange && setHoverRating(0)}
          onClick={() => onRatingChange && onRatingChange(s)}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Spec Badge
// ─────────────────────────────────────────────
const SpecBadge = ({ label, value, icon }) => (
  <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-xl p-3 text-center min-w-[80px]">
    <span className="text-xl mb-1">{icon}</span>
    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{label}</span>
    <span className="text-sm font-bold text-gray-800 mt-0.5">{value}</span>
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const SingleProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ── Redux auth ──
  const { user } = useSelector((state) => state.auth);
  const isAuthenticated = !!user;

  // ── Redux cart ──
  const cartItems = useSelector(selectCartItems);
  const cartTotalQuantity = useSelector(
    (state) => state.cart?.products?.reduce((sum, p) => sum + p.quantity, 0) || 0
  );

  // ── Fetch product ──
  const {
    data: productData,
    isLoading: productLoading,
    isError: productError,
  } = useFetchProductByIdQuery(id);
  const product = productData?.product;

  // ── Fetch related ──
  const {
    data: relatedProducts = [],
    isLoading: relatedLoading,
  } = useFetchRelatedProductsQuery(id, { skip: !id });

  // ── Reviews ──
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    isFetching: reviewsFetching,
    isError: reviewsError,
  } = useGetReviewsByProductIdQuery(id);
  const [postReview, { isLoading: isPosting }] = usePostReviewMutation();

  // ── UI state ──
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlist, setWishlist] = useState(false);
  const [imageError, setImageError] = useState(false);

  // review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('reviewerName') || '');
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newCommentImages, setNewCommentImages] = useState([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [filterRating, setFilterRating] = useState(0);
  const [sortBy, setSortBy] = useState('newest');

  // ── Loading ──
  if (productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading product details...</p>
        </div>
      </div>
    );
  }

  // ── Error / Not Found ──
  if (productError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500 mb-2">Product not found</h2>
          <p className="text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/shop')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  // ── Build image gallery ──
  let imageUrls = [];
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    imageUrls = product.images;
  } else if (product.image) {
    imageUrls = [product.image];
  } else {
    imageUrls = [
      `https://picsum.photos/seed/${product._id}/600/500`,
      `https://picsum.photos/seed/${product._id}a/600/500`,
      `https://picsum.photos/seed/${product._id}b/600/500`,
      `https://picsum.photos/seed/${product._id}c/600/500`,
    ];
  }

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : null;

  // ── 🔐 LOGIN GUARD: Centralized auth check ──
  const requireAuth = (redirectTo = `/shop/${id}`) => {
    if (!isAuthenticated) {
      toast.error('Please login to continue');
      navigate('/login', { state: { from: redirectTo } });
      return false;
    }
    return true;
  };

  // ── 🛒 Add to Cart (REQUIRES LOGIN) ──
  const handleAddToCart = () => {
    if (!requireAuth(`/shop/${id}`)) return;

    const thumbnail = imageUrls[0] || '';

    const existingItem = cartItems.find((item) => item._id === product._id);
    const isNew = !existingItem;

    dispatch(
      addToCart({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: thumbnail,
        quantity: quantity,
        category: product.category,
        color: product.color,
      })
    );

    // Backup to localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const idx = cart.findIndex((item) => item._id === product._id);
    if (idx !== -1) {
      cart[idx].quantity = (cart[idx].quantity || 1) + quantity;
    } else {
      cart.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: thumbnail,
        quantity,
        category: product.category,
        color: product.color,
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));

    const newTotal = cartTotalQuantity + quantity;
    showCartAddedToast(product.name, isNew, newTotal);

    window.dispatchEvent(
      new CustomEvent('cartItemAdded', {
        detail: { name: product.name, isNew },
      })
    );

    setAddedToCart(true);
    window.dispatchEvent(new Event('cartUpdated'));
    setTimeout(() => setAddedToCart(false), 2500);
  };

  // ── 🔐 Buy Now – requires login ──
  const handleBuyNow = () => {
    if (!requireAuth(`/shop/${id}`)) return;
    
    handleAddToCart();
    navigate('/checkout');
  };

  // ── 🔐 Quantity Change (REQUIRES LOGIN) ──
  const handleQuantityChange = (newQty) => {
    if (!requireAuth(`/shop/${id}`)) return;
    setQuantity(Math.max(1, Math.min(newQty, 100)));
  };

  // ── Review image upload ──
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          })
      )
    ).then((imgs) => setNewCommentImages((prev) => [...prev, ...imgs]));
  };
  const removeImage = (index) =>
    setNewCommentImages((prev) => prev.filter((_, i) => i !== index));

  // ── Submit review ──
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && newCommentImages.length === 0) {
      alert('Please write a comment or add photos');
      return;
    }
    localStorage.setItem('reviewerName', userName);
    const reviewData = {
      productId: id,
      userId: 'user_placeholder',
      userName: userName || 'Anonymous',
      rating: newRating,
      comment: newComment,
      images: newCommentImages,
      userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'Anonymous')}&background=random`,
      verified: false,
    };
    try {
      await postReview(reviewData).unwrap();
      setNewComment('');
      setNewCommentImages([]);
      setNewRating(5);
      setShowReviewForm(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to post review:', err);
      alert('Failed to submit review. Please try again.');
    }
  };

  const handleHelpful = (reviewId) => console.log('Helpful:', reviewId);

  // ── Filter & Sort reviews ──
  const filteredSortedReviews = (() => {
    let list = filterRating > 0
      ? reviews.filter((r) => r.rating === filterRating)
      : [...reviews];
    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'highest':
        return list.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return list.sort((a, b) => a.rating - b.rating);
      case 'helpful':
        return list.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
      default:
        return list;
    }
  })();

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0';
  const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating]++;
  });

  const specs = [
    { label: 'Category', value: product.category?.replace(/-/g, ' ') || 'N/A', icon: '🏭' },
    { label: 'Color', value: product.color || 'N/A', icon: '🎨' },
    { label: 'Rating', value: product.rating ? `${product.rating}/5` : 'N/A', icon: '⭐' },
    { label: 'Stock', value: 'In Stock', icon: '✅' },
  ];

  const tabs = [
    { key: 'description', label: 'Description' },
    { key: 'specs', label: 'Specifications' },
    { key: 'shipping', label: 'Shipping & Returns' },
    { key: 'reviews', label: `Reviews (${reviews.length})` },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <span className="text-gray-300">/</span>
            <Link to="/shop" className="hover:text-blue-600 transition-colors">Shop</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-400 capitalize">{product.category?.replace(/-/g, ' ')}</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Hero */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image Gallery */}
            <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50/30 border-b lg:border-b-0 lg:border-r border-gray-100">
              <div className="relative rounded-2xl overflow-hidden bg-white shadow-md mb-4 aspect-square max-h-[420px]">
                {discount && (
                  <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    -{discount}% OFF
                  </div>
                )}
                {product.rating >= 4.5 && (
                  <div className="absolute top-4 right-4 z-10 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    ★ Best Seller
                  </div>
                )}
                <img
                  src={imageError ? `https://picsum.photos/seed/${product._id}/600/500` : imageUrls[selectedImage]}
                  alt={product.name}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-contain p-4 transition-all duration-300"
                />
                <button
                  onClick={() => setWishlist(!wishlist)}
                  className={`absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
                    wishlist ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500 border border-gray-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill={wishlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imageUrls.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedImage(i); setImageError(false); }}
                    className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      selectedImage === i ? 'border-blue-500 shadow-md scale-105' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`View ${i + 1}`}
                      onError={(e) => { e.target.src = `https://picsum.photos/seed/${product._id}${i}/200`; }}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="p-6 md:p-8 flex flex-col gap-5">
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider w-fit">
                {product.category?.replace(/-/g, ' ')}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>

              {product.rating && (
                <div className="flex items-center gap-3 flex-wrap">
                  <StarRating rating={product.rating} size="lg" />
                  <span className="text-sm font-semibold text-gray-700">{product.rating}</span>
                  <span className="text-sm text-gray-400">({Math.floor(product.rating * 12)} reviews)</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
                </div>
              )}

              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-3xl md:text-4xl font-extrabold text-blue-600">
                  ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {product.oldPrice && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      ₹{product.oldPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">
                      Save ₹{(product.oldPrice - product.price).toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>

              {product.description && (
                <p className="text-gray-600 text-sm md:text-base leading-relaxed border-l-4 border-blue-200 pl-4 bg-blue-50/40 py-2 rounded-r-lg">
                  {product.description}
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                {specs.map((s) => <SpecBadge key={s.label} {...s} />)}
              </div>

              {product.color && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">Color:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full border-2 border-white shadow-md ring-2 ring-blue-400"
                      style={{ backgroundColor: product.color.toLowerCase() }}
                    />
                    <span className="text-sm text-gray-600 capitalize font-medium">{product.color}</span>
                  </div>
                </div>
              )}

              {/* ── 🔐 Quantity Selector (Disabled for guests) ── */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700">Quantity:</span>
                <div className={`flex items-center border rounded-xl overflow-hidden ${
                  isAuthenticated ? 'border-gray-300' : 'border-gray-200 bg-gray-100'
                }`}>
                  <button 
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={!isAuthenticated}
                    className={`w-10 h-10 flex items-center justify-center text-lg font-bold transition-colors ${
                      isAuthenticated 
                        ? 'text-gray-600 hover:bg-gray-100' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    −
                  </button>
                  <span className={`w-12 text-center text-sm font-bold ${
                    isAuthenticated ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {quantity}
                  </span>
                  <button 
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={!isAuthenticated}
                    className={`w-10 h-10 flex items-center justify-center text-lg font-bold transition-colors ${
                      isAuthenticated 
                        ? 'text-gray-600 hover:bg-gray-100' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-gray-400">Max 100 units</span>
                {!isAuthenticated && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
                    🔒 Login to select quantity
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {/* ── 🔐 Add to Cart (Requires Login) ── */}
                <button
                  onClick={handleAddToCart}
                  disabled={!isAuthenticated}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 ${
                    !isAuthenticated
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : addedToCart
                      ? 'bg-green-500 text-white shadow-lg shadow-green-200 scale-[0.98]'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02]'
                  }`}
                >
                  {!isAuthenticated ? (
                    <>🔒 Login to Add to Cart</>
                  ) : addedToCart ? (
                    <>✓ Added to Cart!</>
                  ) : (
                    <>🛒 Add to Cart</>
                  )}
                </button>

                {/* ── 🔐 Buy Now (Requires Login) ── */}
                <button
                  onClick={handleBuyNow}
                  disabled={!isAuthenticated}
                  className={`flex-1 px-6 py-3.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 ${
                    isAuthenticated
                      ? 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-200 hover:scale-[1.02]'
                      : 'border-2 border-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isAuthenticated ? '⚡ Buy Now' : '🔒 Login to Buy'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                {[
                  { icon: '🚚', label: 'Free Shipping', sub: 'Orders over ₹10,000' },
                  { icon: '🔄', label: 'Easy Returns', sub: '30-day policy' },
                  { icon: '🛡️', label: 'Warranty', sub: '1 Year Guarantee' },
                ].map((b) => (
                  <div key={b.label} className="text-center p-2 bg-gray-50 rounded-xl">
                    <div className="text-xl mb-1">{b.icon}</div>
                    <div className="text-xs font-semibold text-gray-700">{b.label}</div>
                    <div className="text-xs text-gray-400">{b.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="container mx-auto px-4 pb-8 md:pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-5 py-4 text-sm font-semibold transition-all duration-200 border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6 md:p-8">
            {/* Description */}
            {activeTab === 'description' && (
              <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Product Overview</h3>
                <p className="leading-relaxed">
                  {product.description ||
                    `The ${product.name} is a high-precision industrial instrument designed for demanding weighing and measurement applications.`}
                </p>
                <h4 className="text-base font-bold text-gray-900 mt-6">Key Features</h4>
                <ul className="space-y-2">
                  {[
                    'High-precision measurement with ±0.01% accuracy',
                    'Industrial-grade stainless steel construction',
                    'IP67 rated for dust and water resistance',
                    'RS-232/RS-485 communication interfaces',
                    'Temperature compensated for stable readings',
                    'Easy calibration with front-panel controls',
                    'CE and RoHS certified',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specs */}
            {activeTab === 'specs' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Technical Specifications</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {[
                        ['Product Name', product.name],
                        ['Category', product.category?.replace(/-/g, ' ')],
                        ['Color / Finish', product.color || 'N/A'],
                        ['Price (INR)', `₹${product.price.toLocaleString('en-IN')}`],
                        ['Rating', product.rating ? `${product.rating} / 5.0` : 'N/A'],
                        ['Accuracy Class', 'OIML Class III'],
                        ['Operating Temp', '-10°C to +60°C'],
                        ['Protection Rating', 'IP67'],
                        ['Power Supply', '110–240V AC / 12V DC'],
                        ['Communication', 'RS-232 / RS-485 / USB'],
                        ['Display', '6-digit LED / LCD'],
                        ['Certification', 'CE, RoHS, ISO 9001'],
                        ['Warranty', '12 Months'],
                      ].map(([key, val], i) => (
                        <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="py-3 px-4 font-semibold text-gray-700 w-1/3 border border-gray-200">{key}</td>
                          <td className="py-3 px-4 text-gray-600 border border-gray-200 capitalize">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Shipping */}
            {activeTab === 'shipping' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Shipping & Delivery</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: '🚚', title: 'Standard Delivery', desc: '5–7 business days. Free on orders over ₹10,000.', tag: 'FREE' },
                    { icon: '⚡', title: 'Express Delivery', desc: '2–3 business days. Available at additional cost.', tag: '₹499' },
                    { icon: '🏭', title: 'Bulk / Industrial', desc: 'Special freight arrangements for heavy equipment.', tag: 'Custom' },
                    { icon: '🌍', title: 'Pan-India Coverage', desc: 'We deliver to all major cities and industrial zones.', tag: 'All India' },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                      <span className="text-2xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800 text-sm">{item.title}</span>
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{item.tag}</span>
                        </div>
                        <p className="text-xs text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h4 className="font-bold text-amber-800 text-sm mb-1">🔄 Return Policy</h4>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Returns accepted within 30 days of delivery for unused, undamaged items in original packaging.
                    Industrial equipment that has been installed or calibrated is non-returnable unless defective.
                    Contact our support team to initiate a return or exchange.
                  </p>
                </div>
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    Customer Reviews
                    {reviews.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-400">
                        ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => setShowReviewForm((prev) => !prev)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      showReviewForm
                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    }`}
                  >
                    {showReviewForm ? '✕ Cancel' : '✏️ Write a Review'}
                  </button>
                </div>

                {showReviewForm && (
                  <div className="border border-blue-200 rounded-2xl p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                    <h4 className="text-base font-bold text-gray-900 mb-5">Share Your Experience</h4>
                    <form onSubmit={handleSubmitComment} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Rating</label>
                        <div className="flex items-center gap-2">
                          <StarRating rating={newRating} size="lg" onRatingChange={setNewRating} />
                          <span className="text-sm text-gray-500">({newRating}/5)</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Review</label>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows="4"
                          placeholder="Share your experience with this product..."
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm resize-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Upload Photos <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        {newCommentImages.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {newCommentImages.map((img, idx) => (
                              <div key={idx} className="relative">
                                <img src={img} alt="preview" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-600"
                                >×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button
                          type="submit"
                          disabled={isPosting}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                        >
                          {isPosting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Submitting...
                            </>
                          ) : 'Submit Review'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReviewForm(false)}
                          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {submitSuccess && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    ✅ Review submitted successfully!
                  </div>
                )}

                {reviewsLoading && (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Loading reviews...</p>
                  </div>
                )}

                {reviewsError && (
                  <div className="text-center py-10 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-red-500 font-medium">Failed to load reviews.</p>
                    <p className="text-red-400 text-sm mt-1">Please refresh the page and try again.</p>
                  </div>
                )}

                {!reviewsLoading && !reviewsError && reviews.length > 0 && (
                  <>
                    {reviewsFetching && (
                      <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
                        <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Updating reviews...
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                      <div className="text-center lg:text-left flex-shrink-0">
                        <div className="text-6xl font-black text-blue-600 leading-none">{avgRating}</div>
                        <div className="mt-2">
                          <StarRating rating={parseFloat(avgRating)} size="lg" />
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2 flex flex-col justify-center">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = ratingDist[star];
                          const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-3">
                              <button
                                onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                                className="text-sm text-gray-600 w-8 text-right hover:text-blue-600 transition-colors flex-shrink-0"
                              >
                                {star} ★
                              </button>
                              <div
                                className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                                onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                              >
                                <div
                                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-16 flex-shrink-0">
                                {count} ({Math.round(pct)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-gray-200">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setFilterRating(0)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            filterRating === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >All</button>
                        {[5, 4, 3, 2, 1].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              filterRating === star ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {star} ★
                          </button>
                        ))}
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                        <option value="helpful">Most Helpful</option>
                      </select>
                    </div>

                    {filteredSortedReviews.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <div className="text-3xl mb-2">🔍</div>
                        <p className="font-medium">No reviews match this filter.</p>
                        <button
                          onClick={() => setFilterRating(0)}
                          className="mt-3 text-sm text-blue-600 hover:underline"
                        >Clear filter</button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {filteredSortedReviews.map((review) => (
                          <div key={review._id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={review.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}&background=random`}
                                  alt={review.userName}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                                <div>
                                  <div className="font-semibold text-gray-800 text-sm">{review.userName}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <StarRating rating={review.rating} size="sm" />
                                    <span className="text-xs text-gray-400">
                                      {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                        year: 'numeric', month: 'long', day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {review.verified && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed mb-3">{review.comment}</p>
                            {review.images?.length > 0 && (
                              <div className="flex gap-2 mb-3 flex-wrap">
                                {review.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt=""
                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(img, '_blank')}
                                  />
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => handleHelpful(review._id)}
                              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              👍 Helpful ({review.helpful || 0})
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">💬</div>
                    <p className="font-semibold text-gray-600 text-lg">No reviews yet</p>
                    <p className="text-gray-400 text-sm mt-1 mb-5">Be the first to share your experience!</p>
                    {!showReviewForm && (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Write the First Review
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {!relatedLoading && relatedProducts.length > 0 && (
        <section className="container mx-auto px-4 pb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Related Products</h2>
            <Link to="/shop" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((rp) => {
              const thumb = (rp.images && rp.images.length > 0)
                ? rp.images[0]
                : (rp.image || `https://picsum.photos/seed/${rp._id}/400/300`);
              return (
                <Link
                  to={`/shop/${rp._id}`}
                  key={rp._id}
                  className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative bg-gray-50 overflow-hidden">
                    <img
                      src={thumb}
                      alt={rp.name}
                      onError={(e) => { e.target.src = `https://picsum.photos/seed/${rp._id}/400/300`; }}
                      className="w-full h-36 md:h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {rp.rating >= 4.5 && (
                      <span className="absolute top-2 right-2 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">★ Top</span>
                    )}
                  </div>
                  <div className="p-3 md:p-4">
                    <p className="text-xs text-gray-400 capitalize mb-1">{rp.category?.replace(/-/g, ' ')}</p>
                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">{rp.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-blue-600">₹{rp.price.toLocaleString('en-IN')}</span>
                      {rp.rating && (
                        <span className="text-xs text-gray-500 flex items-center gap-0.5">
                          <span className="text-yellow-400">★</span>{rp.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 pb-12">
        <button
          onClick={() => navigate('/shop')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Shop
        </button>
      </div>
    </div>
  );
};

export default SingleProduct;