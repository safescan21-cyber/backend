import './App.css';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileActionButtons from './components/MobileActionButtons';
import Register from './components/Register';
import Home from './components/Home';
import CategoryPage from './components/pages/CategoryPage';
import Searchpage from './components/pages/Searchpage';
import ShopePage from './components/pages/ShopePage';
import Contact from './components/pages/Contact';
import Login from '../src/components/pages/Login';
import CartPage from './components/cart/CartPage';
import CheckoutPage from './components/cart/CheckoutPage';
import SingleProduct from './components/shop/ProductDetails/SingleProduct';
import ForgotPassword from './components/password/ForgotPassword';
import ResetPassword from './components/password/ResetPassword';
import PrivateRoute from './components/pages/PrivateRoute';

import UserDMain from './components/pages/dashboard/user/dashboard/UserDMain';
import UserOrders from './components/pages/dashboard/user/UserOrders';
import OrderDetails from './components/pages/dashboard/user/OrderDetails';
import UserPayments from './components/pages/dashboard/user/UserPayments';
import UserReviews from './components/pages/dashboard/user/UserReviews';
import UserProfile from './components/pages/dashboard/user/UserProfile';

import AdminDMain from './components/pages/dashboard/admin/dashboard/AdminDMain';
import AddProduct from './components/pages/dashboard/admin/addProduct/AddProduct';
import ManageProduct from './components/pages/dashboard/admin/manageProduct/ManageProduct';
import UpdateProduct from './components/pages/dashboard/admin/manageProduct/UpdateProduct';
import ManageUser from './components/pages/dashboard/admin/users/ManageUser';
import ManageOrders from './components/pages/dashboard/admin/manageOrders/ManageOrders';
import Projects from "../src/components/pages/Projects";
import AddJob from './components/pages/dashboard/admin/jobs/AddJob';
import ManageJobs from './components/pages/dashboard/admin/jobs/ManageJobs';
import CareerPage from './components/pages/dashboard/admin/jobs/CareerPage';
import CookieConsent from './components/pages/CookieConsent';
import ProductCategoryPage from "./components/pages/ProductCategoryPage";

const Wishlist = () => (
  <div className="p-8 text-slate-200">
    <h2 className="text-2xl font-bold">Your Wishlist</h2>
    <p className="mt-4 text-slate-400">You haven't added any items yet.</p>
  </div>
);

const GenericPage = () => (
  <div className="p-8 text-slate-200">
    <h2 className="text-2xl font-bold">Category Page</h2>
    <p className="mt-4 text-slate-400">Content will be loaded dynamically.</p>
  </div>
);

function App() {
  return (
    <main className="app-shell flex flex-col min-h-screen">
      <Toaster position="top-right" reverseOrder={false} />
      <Navbar />
      
      <div className="flex-1">
        <Routes>
          {/* ── Public top‑level routes ── */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/categories/:categoriesName" element={<CategoryPage />} />
          <Route path="/search" element={<Searchpage />} />
          <Route path="/shop" element={<ShopePage />} />
          <Route path="/shop/:id" element={<SingleProduct />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/resetpassword/:token" element={<ResetPassword />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/career" element={<CareerPage />} />

          {/* ✅ Product category page (outside dashboard, before wildcards) */}
          <Route path="/products/:category" element={<ProductCategoryPage />} />

          {/* Generic catch‑all routes for static pages */}
          <Route path="/products/*" element={<GenericPage />} />
          <Route path="/solutions/*" element={<GenericPage />} />
          <Route path="/resources/*" element={<GenericPage />} />

          {/* ── Dashboard (protected) ── */}
          <Route path="/dashboard" element={<PrivateRoute />}>
            <Route index element={<UserDMain />} />
            <Route path="orders" element={<UserOrders />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            <Route path="payments" element={<UserPayments />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="reviews" element={<UserReviews />} />

            {/* Admin routes */}
            <Route element={<PrivateRoute role="admin" />}>
              <Route path="admin" element={<AdminDMain />} />
              <Route path="add-product" element={<AddProduct />} />
              <Route path="manage-products" element={<ManageProduct />} />
              <Route path="update-product/:id" element={<UpdateProduct />} />
              <Route path="users" element={<ManageUser />} />
              <Route path="manage-orders" element={<ManageOrders />} />
              <Route path="add-job" element={<AddJob />} />
              <Route path="manage-jobs" element={<ManageJobs />} />
            </Route>
          </Route>
        </Routes>
      </div>
      <MobileActionButtons />
      <Footer />
      <CookieConsent />
    </main>
  );
}

export default App;
