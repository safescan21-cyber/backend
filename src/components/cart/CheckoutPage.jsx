import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { selectCartItems, selectCartTotalPrice, clearCart } from '../store/cartSlice';
import getBaseURL from '../../utlis/baseURL';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Stripe payment form ──
const StripePaymentForm = ({ total, isProcessing, setIsProcessing, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + '/payment-success' },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        onError?.(error);
      } else if (paymentIntent?.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      toast.error('Something went wrong');
      onError?.(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : `Pay ₹${total}`}
      </button>
    </form>
  );
};

// ── Main Checkout Page ──
const CheckoutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();   // ✅ for redirect back after login

  const cartItems = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartTotalPrice);

  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  // Stripe states
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');

  // ── Form & address state ──
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '', country: 'India',
    deliveryInstructions: '', saveAddress: false,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // ── Saved addresses ──
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // ── 🔐 Login Guard ──
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  useEffect(() => {
    if (!isLoggedIn) {
      // Save current path so we can redirect back after login
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [isLoggedIn, navigate, location]);

  // If not logged in, render nothing (redirect will happen)
  if (!isLoggedIn) {
    return null;
  }

  const shippingCost = subtotal >= 10000 ? 0 : 99;
  const discount = 0;
  const total = subtotal - discount + shippingCost;

  // ── Fetch saved addresses ──
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const res = await fetch(`${getBaseURL()}/api/users/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch addresses');
        const data = await res.json();
        setSavedAddresses(data.addresses || []);
        const defaultAddr = data.addresses?.find(addr => addr.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr._id);
          fillFormFromAddress(defaultAddr);
        }
      } catch (err) {
        console.error(err);
        toast.error('Could not load saved addresses');
      } finally {
        setLoadingAddresses(false);
      }
    };
    fetchAddresses();
  }, [isLoggedIn, token]);

  const fillFormFromAddress = (addr) => {
    setFormData({
      firstName: addr.firstName || '',
      lastName: addr.lastName || '',
      email: addr.email || '',
      phone: addr.phone || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      country: addr.country || 'India',
      deliveryInstructions: addr.deliveryInstructions || '',
      saveAddress: false,
    });
    setErrors({});
    setTouched({});
  };

  const handleAddressSelect = (addrId) => {
    const addr = savedAddresses.find(a => a._id === addrId);
    if (addr) {
      setSelectedAddressId(addrId);
      fillFormFromAddress(addr);
    }
  };

  // ── Validation ──
  const validators = {
    firstName: v => !v.trim() ? 'First name is required' : '',
    lastName: v => !v.trim() ? 'Last name is required' : '',
    email: v => !v.trim() ? 'Email is required' : !/\S+@\S+\.\S+/.test(v) ? 'Invalid email' : '',
    phone: v => !v.trim() ? 'Phone is required' : !/^\d{10}$/.test(v) ? 'Must be 10 digits' : '',
    addressLine1: v => !v.trim() ? 'Address is required' : '',
    city: v => !v.trim() ? 'City is required' : '',
    state: v => !v.trim() ? 'State is required' : '',
    pincode: v => !v.trim() ? 'Pincode is required' : !/^\d{6}$/.test(v) ? 'Must be 6 digits' : '',
  };

  const validateField = (name, val = formData[name]) => {
    const err = validators[name]?.(val) ?? '';
    setErrors(p => ({ ...p, [name]: err }));
    return !err;
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {};
    const newTouched = {};
    Object.keys(validators).forEach(k => {
      newTouched[k] = true;
      newErrors[k] = validators[k](formData[k]);
      if (newErrors[k]) valid = false;
    });
    setErrors(newErrors);
    setTouched(newTouched);
    return valid;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(p => ({ ...p, [name]: val }));
    if (errors[name]) validateField(name, val);
    if (selectedAddressId) {
      const addr = savedAddresses.find(a => a._id === selectedAddressId);
      if (addr && addr[name] !== val) setSelectedAddressId(null);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(p => ({ ...p, [name]: true }));
    validateField(name);
  };

  const handleNextStep = () => {
    if (validateForm()) {
      setCurrentStep(2);
      window.scrollTo(0, 0);
      if (paymentMethod === 'stripe') {
        createPaymentIntent();
      }
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
    setClientSecret(null);
    setPaymentIntentId(null);
    window.scrollTo(0, 0);
  };

  const inputCls = (name) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      errors[name] && touched[name] ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
    }`;

  // ── Create Stripe Payment Intent ──
  const createPaymentIntent = async () => {
    setIsCreatingIntent(true);
    setIntentError('');
    try {
      const res = await fetch(`${getBaseURL()}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: total, currency: 'inr' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create payment intent');
      }
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    } catch (err) {
      setIntentError(err.message);
      toast.error(err.message);
    } finally {
      setIsCreatingIntent(false);
    }
  };

  // ── Save address ──
  const saveUserAddress = async (addressData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${getBaseURL()}/api/users/address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address: addressData, label: 'Home' }),
      });
      if (!res.ok) throw new Error('Failed to save address');
      toast.success('Address saved for future orders');
    } catch (err) {
      console.error(err);
      toast.error('Could not save address, but order is confirmed');
    }
  };

  // ── Save order ──
  // If the token is invalid/expired, the order will retry as guest
  const saveOrder = async (paymentDetails = null) => {
    if (!cartItems || cartItems.length === 0) {
      toast.error('Your cart is empty. Add items before checkout.');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    const generatedOrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const email = formData.email.trim().toLowerCase();

    const orderData = {
      orderId: generatedOrderId,
      customerInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email,
        phone: formData.phone,
      },
      shippingAddress: {
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
        deliveryInstructions: formData.deliveryInstructions,
      },
      items: cartItems.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        category: item.category,
      })),
      paymentMethod,
      paymentStatus: paymentDetails ? 'paid' : 'pending',
      paymentIntentId: paymentDetails?.id || null,
      orderStatus: 'confirmed',
      subtotal,
      shippingCost,
      discount,
      totalAmount: total,
      email,
      amount: total,
      orderDate: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const attemptSave = async (withAuth) => {
      const headers = { 'Content-Type': 'application/json' };
      const storedToken = localStorage.getItem('token');
      if (withAuth && storedToken) {
        headers.Authorization = `Bearer ${storedToken}`;
      }

      const res = await fetch(`${getBaseURL()}/api/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData),
      });

      const responseText = await res.text();
      console.log('Order save response:', res.status, responseText);

      return { res, responseText };
    };

    try {
      let { res, responseText } = await attemptSave(true);

      // Auto-retry as guest if token was rejected
      if (!res.ok && res.status === 401) {
        console.log('Auth token rejected — retrying order as guest checkout');
        toast('Session expired — placing order as guest', { icon: 'ℹ️' });
        ({ res, responseText } = await attemptSave(false));
      }

      if (!res.ok) {
        let errorMessage = 'Order save failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      setOrderId(data.orderId || generatedOrderId);

      dispatch(clearCart());
      localStorage.removeItem('cart');
      setOrderPlaced(true);
      setCurrentStep(3);

      if (formData.saveAddress) {
        const addressData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email,
          phone: formData.phone,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country,
          deliveryInstructions: formData.deliveryInstructions,
        };
        await saveUserAddress(addressData);
      }

      // Send confirmation email (fire-and-forget)
      fetch(`${getBaseURL()}/api/orders/send-order-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData, userEmail: email }),
      }).catch(() => {});

    } catch (err) {
      console.error('Order failed:', err);
      const errorMsg = err.message || 'Order save failed';
      toast.error(`Order failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripeSuccess = (paymentIntent) => {
    if (!cartItems || cartItems.length === 0) {
      toast.error('Your cart is empty. Add items before checkout.');
      return;
    }
    saveOrder(paymentIntent);
  };

  const handleCODOrder = () => {
    if (!cartItems || cartItems.length === 0) {
      toast.error('Your cart is empty. Add items before checkout.');
      return;
    }
    saveOrder(null);
  };

  const stripeOptions = useMemo(() => clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        borderRadius: '8px',
      },
      rules: {
        '.Input': { border: '1px solid #d1d5db', boxShadow: 'none' },
        '.Input:focus': { border: '1px solid #2563eb', boxShadow: '0 0 0 3px rgba(37,99,235,0.1)' },
        '.Tab': { border: '1px solid #e5e7eb', boxShadow: 'none' },
        '.Tab--selected': { borderColor: '#2563eb', color: '#2563eb' },
      },
    },
  } : null, [clientSecret]);

  // ── Step 3: Order Confirmed ──
  if (orderPlaced && currentStep === 3) {
    return (
      <div className="bg-gray-50 min-h-screen pt-20 flex items-start justify-center">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Order Placed Successfully!</h2>
            <p className="text-gray-500 mb-1">Thank you, {formData.firstName}!</p>
            <p className="text-gray-500 mb-6 text-sm">
              Order ID: <span className="font-bold text-blue-600">{orderId}</span>
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-1.5">
              <p className="text-sm text-gray-600">📧 Confirmation sent to: <span className="font-medium">{formData.email}</span></p>
              <p className="text-sm text-gray-600">💳 Payment: <span className="font-medium capitalize">{paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid via Stripe'}</span></p>
              <p className="text-sm text-gray-600">🚚 Estimated delivery: <span className="font-medium">{new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</span></p>
              {formData.saveAddress && <p className="text-sm text-green-600 mt-2">✅ Your address has been saved for future orders.</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate('/shop')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">Continue Shopping</button>
              <button 
                onClick={() => navigate('/dashboard/orders')} 
                className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors"
              >
                View Order History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Steps 1 & 2 ──
  return (
    <div className="bg-gray-50 min-h-screen pt-20">
      <div className="container mx-auto px-4 py-8">

        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center">
            {['Shipping Details', 'Payment Method', 'Confirmation'].map((label, i) => {
              const n = i + 1;
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      currentStep > n ? 'bg-blue-600 text-white' : currentStep === n ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {currentStep > n ? '✓' : n}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${currentStep >= n ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-1.5 rounded-full mx-2 mb-5 transition-all ${currentStep > n ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">

          {/* Left: Form */}
          <div className="lg:w-2/3">

            {/* STEP 1: Shipping */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Shipping Information</h2>

                {isLoggedIn && savedAddresses.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm font-medium text-blue-700 mb-3">Select a saved address</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr._id}
                          onClick={() => handleAddressSelect(addr._id)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedAddressId === addr._id ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-200' : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{addr.firstName} {addr.lastName}</p>
                              <p className="text-xs text-gray-500">{addr.addressLine1}</p>
                              <p className="text-xs text-gray-500">{addr.city}, {addr.state} - {addr.pincode}</p>
                              <p className="text-xs text-gray-400 mt-1">{addr.phone}</p>
                            </div>
                            {addr.isDefault && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Default</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-2">Or fill in a new address below</p>
                  </div>
                )}

                {loadingAddresses && <div className="mb-4 text-sm text-gray-500">Loading your saved addresses...</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                    <input name="firstName" value={formData.firstName} onChange={handleInputChange} onBlur={handleBlur} className={inputCls('firstName')} placeholder="Sonu" />
                    {errors.firstName && touched.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                    <input name="lastName" value={formData.lastName} onChange={handleInputChange} onBlur={handleBlur} className={inputCls('lastName')} placeholder="Kumar" />
                    {errors.lastName && touched.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} className={inputCls('email')} placeholder="you@email.com" />
                    {errors.email && touched.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} onBlur={handleBlur} className={inputCls('phone')} placeholder="10-digit mobile number" maxLength={10} />
                    {errors.phone && touched.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 1 <span className="text-red-500">*</span></label>
                    <input name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} onBlur={handleBlur} className={inputCls('addressLine1')} placeholder="House number, building, street" />
                    {errors.addressLine1 && touched.addressLine1 && <p className="text-red-500 text-xs mt-1">{errors.addressLine1}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 2 <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Apartment, suite, landmark" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City <span className="text-red-500">*</span></label>
                    <input name="city" value={formData.city} onChange={handleInputChange} onBlur={handleBlur} className={inputCls('city')} placeholder="Dehradun" />
                    {errors.city && touched.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">State <span className="text-red-500">*</span></label>
                    <input name="state" value={formData.state} onChange={handleInputChange} onBlur={handleBlur} className={inputCls('state')} placeholder="Uttarakhand" />
                    {errors.state && touched.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode <span className="text-red-500">*</span></label>
                    <input name="pincode" value={formData.pincode} onChange={handleInputChange} onBlur={handleBlur} className={inputCls('pincode')} placeholder="6-digit pincode" maxLength={6} />
                    {errors.pincode && touched.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                    <select name="country" value={formData.country} onChange={handleInputChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="India">India</option>
                      <option value="USA">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Instructions <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <textarea name="deliveryInstructions" value={formData.deliveryInstructions} onChange={handleInputChange} rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Gate code, landmark, special instructions..." />
                  </div>
                </div>

                <div className="mt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                    <input type="checkbox" name="saveAddress" checked={formData.saveAddress} onChange={handleInputChange} className="accent-blue-600 w-4 h-4 rounded" />
                    Save this address for future orders
                  </label>
                </div>

                <div className="mt-8 flex justify-end">
                  <button onClick={handleNextStep} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                    Continue to Payment
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Payment Method */}
            {currentStep === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment Method</h2>

                <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4">
                  <button
                    onClick={() => {
                      setPaymentMethod('cod');
                      setClientSecret(null);
                      setIntentError('');
                    }}
                    className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      paymentMethod === 'cod'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Cash on Delivery
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('stripe');
                      createPaymentIntent();
                    }}
                    className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      paymentMethod === 'stripe'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Pay with Card (Stripe)
                  </button>
                </div>

                {paymentMethod === 'cod' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-gray-600 text-sm">
                      <p>You will pay in cash when your order is delivered.</p>
                      <p className="mt-1 text-xs text-gray-400">No additional charges.</p>
                    </div>
                    <button
                      onClick={handleCODOrder}
                      disabled={isProcessing}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {isProcessing ? 'Placing Order...' : `Place Order (Pay ₹${total} on delivery)`}
                    </button>
                  </div>
                )}

                {paymentMethod === 'stripe' && (
                  <div>
                    {isCreatingIntent && (
                      <div className="text-center py-8 text-gray-500">Preparing payment...</div>
                    )}
                    {intentError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 mb-4">
                        {intentError}
                        <button onClick={createPaymentIntent} className="ml-3 text-sm underline hover:no-underline">Retry</button>
                      </div>
                    )}
                    {clientSecret && !isCreatingIntent && (
                      <Elements stripe={stripePromise} options={stripeOptions}>
                        <StripePaymentForm
                          total={total}
                          isProcessing={isProcessing}
                          setIsProcessing={setIsProcessing}
                          onSuccess={handleStripeSuccess}
                          onError={(err) => toast.error(err.message || 'Payment failed')}
                        />
                      </Elements>
                    )}
                    {!clientSecret && !isCreatingIntent && !intentError && (
                      <button
                        onClick={createPaymentIntent}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                      >
                        Initialize Payment
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <button onClick={handlePrevStep} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Shipping
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Order Summary Sidebar ── */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                {cartItems.map(item => (
                  <div key={item._id} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-800">₹{item.price * item.quantity}</p>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-3 space-y-1.5">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>{shippingCost === 0 ? 'Free' : `₹${shippingCost}`}</span></div>
                  <div className="flex justify-between"><span>Discount</span><span>₹{discount}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span className="text-blue-600">₹{total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;