// store/cartSlice.js (unchanged)
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const newItem = action.payload;
      const existing = state.products.find((item) => item._id === newItem._id);
      if (existing) {
        existing.quantity += newItem.quantity || 1;
      } else {
        state.products.push({ ...newItem, quantity: newItem.quantity || 1 });
      }
    },
    increaseQuantity: (state, action) => {
      const item = state.products.find((p) => p._id === action.payload);
      if (item) item.quantity += 1;
    },
    decreaseQuantity: (state, action) => {
      const item = state.products.find((p) => p._id === action.payload);
      if (!item) return;
      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        state.products = state.products.filter((p) => p._id !== action.payload);
      }
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.products.find((p) => p._id === id);
      if (!item) return;
      if (quantity > 0) {
        item.quantity = quantity;
      } else {
        state.products = state.products.filter((p) => p._id !== id);
      }
    },
    removeFromCart: (state, action) => {
      state.products = state.products.filter((p) => p._id !== action.payload);
    },
    clearCart: (state) => {
      state.products = [];
    },
  },
});

export const {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  updateQuantity,
  removeFromCart,
  clearCart,
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart.products;
export const selectCartTotalQuantity = (state) =>
  state.cart.products.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartTotalPrice = (state) =>
  state.cart.products.reduce((sum, item) => sum + item.price * item.quantity, 0);

export default cartSlice.reducer;