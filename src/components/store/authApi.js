import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import getBaseUrl from "../../utlis/baseURL";

const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${getBaseUrl()}/api/auth`,
    credentials: "include",
  }),
  tagTypes: ["User", "Profile"],
  endpoints: (builder) => ({
    registerUser: builder.mutation({
      query: (newUser) => ({
        url: "/register",
        method: "POST",
        body: newUser,
      }),
    }),

    loginUser: builder.mutation({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Profile"],
    }),

    // ── Google OAuth login ──────────────────────────────────────────
    // Sends { code } — matches backend's googleClient.getToken(code)
    // exchange in Userroute.js's /google route. Call as
    // googleLogin(response.code) from Login.jsx's flow:'auth-code' handler.
    googleLogin: builder.mutation({
      query: (code) => ({
        url: '/google',
        method: 'POST',
        body: { code },
      }),
      invalidatesTags: ["Profile"],
    }),

    logoutUser: builder.mutation({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
      invalidatesTags: ["User", "Profile"],
    }),

    getUser: builder.query({
      query: () => "/users",
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.users)) return response.users;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      },
      providesTags: ["User"],
    }),

    getProfile: builder.query({
      query: () => "/profile",
      transformResponse: (response) => response.user,
      providesTags: ["Profile"],
    }),

    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    updateUserRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/users/${userId}`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: ["User"],
    }),

    editProfile: builder.mutation({
      query: (profileData) => ({
        url: `/edit-profile`,
        method: "PATCH",
        body: profileData,
      }),
      invalidatesTags: ["Profile"],
    }),

    forgotPassword: builder.mutation({
      query: (email) => ({
        url: '/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),

    resetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: `/reset-password/${token}`,
        method: "POST",
        body: { password },
      }),
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useGoogleLoginMutation,
  useLogoutUserMutation,
  useGetUserQuery,
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
  useEditProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;

export default authApi;