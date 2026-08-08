import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import getBaseUrl from '../../utlis/baseURL';

const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${getBaseUrl()}/api/orders`,
    credentials: 'include',
    // ✅ NEW: attaches the JWT from localStorage to every request's
    // Authorization header. Without this, any route that checks
    // req.headers.authorization (like /my-orders) always sees no token.
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Order'],
  endpoints: (builder) => ({
    getMyOrders: builder.query({
      query: () => '/my-orders',
      transformResponse: (response) => {
        if (Array.isArray(response)) return { orders: response };
        if (response && typeof response === 'object' && 'orders' in response) {
          return response;
        }
        return { orders: [] };
      },
      providesTags: ['Order'],
    }),

    getOrdersByEmail: builder.query({
      query: (email) => `/${email}`,
      transformResponse: (response) => {
        if (Array.isArray(response)) return { orders: response };
        if (response && typeof response === 'object' && 'orders' in response) {
          return response;
        }
        return { orders: [] };
      },
      providesTags: ['Order'],
    }),
    getOrderById: builder.query({
      query: (orderId) => `/order/${orderId}`,
      providesTags: ['Order'],
    }),
    getAllOrders: builder.query({
      query: () => '',
      providesTags: ['Order'],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/update-order-status/${id}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Order'],
    }),
    deleteOrder: builder.mutation({
      query: (id) => ({
        url: `/delete-order/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Order'],
    }),
    
  }),
});

export const {
  useGetMyOrdersQuery,
  useGetOrdersByEmailQuery,
  useGetOrderByIdQuery,
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
  useDeleteOrderMutation,
} = orderApi;

export default orderApi;