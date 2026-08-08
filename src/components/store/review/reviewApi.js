import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import getBaseUrl from '../../../utlis/baseURL';

export const reviewApi = createApi({
  reducerPath: 'reviewApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${getBaseUrl()}/api/reviews`,
    credentials: 'include',
  }),
  tagTypes: ["Reviews"],
  endpoints: (builder) => ({
    postReview: builder.mutation({
      query: (reviewData) => ({
        url: "/post-review",
        method: "POST",
        body: reviewData,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "Reviews", id: productId },
      ],
    }),
    getReviewsCount: builder.query({
      query: () => "/total-reviews",
    }),
    getReviewsByProductId: builder.query({
      query: (productId) => `/product/${productId}`,
      providesTags: (result, error, productId) =>
        result ? [{ type: "Reviews", id: productId }] : [],
    }),
    getReviewsByUserId: builder.query({
      query: (userId) => `/${userId}`,
      providesTags: (result) =>
        result ? [{ type: "Reviews", id: result[0]?.email }] : [],
    }),
  }),
});

export const {
  usePostReviewMutation,
  useGetReviewsCountQuery,
  useGetReviewsByProductIdQuery,
  useGetReviewsByUserIdQuery,
} = reviewApi;

export default reviewApi;