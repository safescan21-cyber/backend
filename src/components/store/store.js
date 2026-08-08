import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';
import authReducer from './authSlice';
import authApi from './authApi';
import productsApi from './products/productsApi';
import { reviewApi } from './review/reviewApi';
import statsApi from "./stats/statsApi";
import orderApi from "./orderApi";
// ─── NEW ──
import { jobsApi } from '../pages/dashboard/admin/jobs/jobsApi';   // or './jobs/jobsApi' – adjust path to your actual file

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [productsApi.reducerPath]: productsApi.reducer,
    [reviewApi.reducerPath]: reviewApi.reducer,
    [statsApi.reducerPath]: statsApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    // ─── ADD JOBS API ──
    [jobsApi.reducerPath]: jobsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      productsApi.middleware,
      reviewApi.middleware,
      statsApi.middleware,
      orderApi.middleware,
      // ─── ADD JOBS API MIDDLEWARE ──
      jobsApi.middleware,
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;