import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetMyOrdersQuery, useGetOrdersByEmailQuery } from '../../../store/orderApi';
import { Link } from 'react-router-dom';
import getBaseURL from '../../../../utlis/baseURL';
import toast from 'react-hot-toast';

const UserOrders = () => {
  const { user } = useSelector((state) => state.auth);
  const email = user?.email ? user.email.trim().toLowerCase() : null;

  // ✅ Primary source: server matches by authenticated session
  // (userId first, email fallback) — not dependent on frontend
  // knowing/normalizing the right email.
  const {
    data: myOrdersData,
    error: myOrdersError,
    isLoading: myOrdersLoading,
    isFetching: myOrdersFetching,
    refetch: refetchMyOrders,
  } = useGetMyOrdersQuery(undefined, {
    skip: !user,
    refetchOnMountOrArgChange: true,
  });

  // Fallback: old email-based lookup, only used if /my-orders comes back
  // empty or erroring — helps distinguish "no orders exist" from
  // "auth/session isn't wired to /my-orders yet".
  const {
    data: emailOrdersData,
    error: emailOrdersError,
    isFetching: emailOrdersFetching,
    refetch: refetchByEmail,
  } = useGetOrdersByEmailQuery(email, {
    skip: !email || (myOrdersData?.orders?.length > 0),
    refetchOnMountOrArgChange: true,
  });

  const [manualOrders, setManualOrders] = useState([]);
  const [manualError, setManualError] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  const fetchOrdersManually = async () => {
    if (!email) return;
    setManualLoading(true);
    try {
      const res = await fetch(`${getBaseURL()}/api/orders/${email}`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setManualOrders(data.orders || []);
      setManualError(null);
    } catch (err) {
      setManualError(err.message);
      toast.error('Manual fetch failed');
    } finally {
      setManualLoading(false);
    }
  };

  // Priority: /my-orders > /:email RTK query > manual fetch
  const orders =
    myOrdersData?.orders?.length ? myOrdersData.orders :
    emailOrdersData?.orders?.length ? emailOrdersData.orders :
    manualOrders;

  const hasError = (myOrdersError && emailOrdersError) || manualError;
  const isLoadingState = myOrdersLoading || myOrdersFetching || emailOrdersFetching || manualLoading;

  useEffect(() => {
    console.log('📧 User email (normalized):', email);
    console.log('🔐 /my-orders result:', myOrdersData, myOrdersError);
    console.log('📦 /:email result:', emailOrdersData, emailOrdersError);
    console.log('📋 Final orders:', orders);
  }, [email, myOrdersData, myOrdersError, emailOrdersData, emailOrdersError, orders]);

  const handleRefresh = () => {
    refetchMyOrders();
    refetchByEmail();
    fetchOrdersManually();
  };

  if (!user) return <div className="text-center py-8 text-gray-500">Checking session...</div>;
  if (isLoadingState) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  if (hasError) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load orders.
        <button onClick={handleRefresh} className="ml-3 underline text-blue-600">Retry</button>
      </div>
    );
  }

  if (orders.length === 0) {

console.log('token:', localStorage.getItem('token'));
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You haven't placed any orders yet.</p>
        <Link to="/shop" className="text-blue-600 underline hover:text-blue-800">Start shopping</Link>
        <div className="mt-4">
          <button onClick={fetchOrdersManually} className="text-sm text-blue-500 underline">Check manually</button>
        </div>
      </div>
    );
  }

  // ─── Render orders table ──────────────────────────────────
  return (
    <section className="py-1 bg-blueGray-50">
      <div className="w-full mb-12 xl:mb-0 px-4 mx-auto">
        <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
          <div className="rounded-t mb-0 px-4 py-3 border-0">
            <div className="flex flex-wrap items-center">
              <div className="relative w-full px-4 max-w-full flex-grow flex-1">
                <h3 className="font-semibold text-base text-blueGray-700">Your Orders</h3>
              </div>
              <div className="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                <button
                  onClick={handleRefresh}
                  className="bg-indigo-500 text-white active:bg-indigo-600 text-xs font-bold uppercase px-3 py-1 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
          <div className="block w-full overflow-x-auto">
            <table className="items-center bg-transparent w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">#</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Order ID</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Date</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Status</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Total</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">View</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={order._id || index}>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left text-blueGray-700">{index + 1}</td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">{order?.orderId || 'N/A'}</td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">{order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                      <span className={`p-1 rounded ${order?.orderStatus === 'completed' || order?.status === 'completed' ? 'bg-green-100 text-green-700' : order?.orderStatus === 'processing' || order?.status === 'processing' ? 'bg-blue-100 text-blue-600' : order?.orderStatus === 'confirmed' || order?.status === 'confirmed' ? 'bg-indigo-100 text-indigo-600' : 'bg-red-100 text-red-700'}`}>
                        {order?.orderStatus || order?.status || 'Pending'}
                      </span>
                    </td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">₹{order?.totalAmount || order?.amount || 0}</td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                      <Link to={`/orders/${order?._id}`} className="underline hover:text-primary text-blue-600">view order</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserOrders;