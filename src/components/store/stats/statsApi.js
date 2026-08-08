import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import getBaseUrl from "../../../utlis/baseURL";

const getToken = () => localStorage.getItem("token");

const statsApi = createApi({
  reducerPath: "statsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${getBaseUrl()}/api/stats`,
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Stats"],
  endpoints: (builder) => ({
    getUserStats: builder.query({
      query: (email) => `/user-stats/${email}`, // adjust if needed
      providesTags: ["Stats"],
    }),
    getAdminStats: builder.query({
      query: () => `/admin-stats`,
      providesTags: ["Stats"],
    }),
  }),
});

export const { useGetUserStatsQuery, useGetAdminStatsQuery } = statsApi;
export default statsApi;