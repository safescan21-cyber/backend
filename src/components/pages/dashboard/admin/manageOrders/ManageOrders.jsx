import React, { useState } from 'react';
import { useDeleteOrderMutation, useGetAllOrdersQuery } from '../../../../store/orderApi';
import { formatDate } from '../../../../../utlis/formatDate';
import { Link } from 'react-router-dom';
import UpdateOrderModal from './UpdateOrderModal';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':     return 'bg-yellow-500';
    case 'processing':  return 'bg-blue-500';
    case 'shipped':     return 'bg-green-500';
    case 'completed':   return 'bg-gray-500';
    case 'confirmed':   return 'bg-indigo-500';
    default:            return 'bg-gray-300';
  }
};

// ── Order Details Modal ──────────────────────────────────────
const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  const { customerInfo, shippingAddress, items, paymentMethod, paymentStatus, orderStatus, totalAmount, orderId, createdAt } = order;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold">Order Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Customer</h3>
            <p><span className="font-medium">Name:</span> {customerInfo?.firstName} {customerInfo?.lastName}</p>
            <p><span className="font-medium">Email:</span> {customerInfo?.email}</p>
            <p><span className="font-medium">Phone:</span> {customerInfo?.phone}</p>
          </div>

          {/* Order Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Order</h3>
            <p><span className="font-medium">Order ID:</span> {orderId}</p>
            <p><span className="font-medium">Date:</span> {formatDate(createdAt)}</p>
            <p><span className="font-medium">Status:</span> 
              <span className={`ml-2 px-2 py-1 text-xs text-white rounded-full ${getStatusColor(orderStatus)}`}>
                {orderStatus || 'N/A'}
              </span>
            </p>
            <p><span className="font-medium">Payment:</span> {paymentMethod} – {paymentStatus}</p>
            <p><span className="font-medium">Total:</span> ₹{totalAmount}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Shipping Address</h3>
          <p>{shippingAddress?.addressLine1}</p>
          {shippingAddress?.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
          <p>{shippingAddress?.city}, {shippingAddress?.state} – {shippingAddress?.pincode}</p>
          <p>{shippingAddress?.country}</p>
          {shippingAddress?.deliveryInstructions && (
            <p className="mt-1 text-sm text-gray-500">📝 {shippingAddress.deliveryInstructions}</p>
          )}
        </div>

        {/* Items */}
        <div className="mt-4">
          <h3 className="font-semibold text-gray-700 mb-2">Items ({items?.length || 0})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left">Product Name</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3 text-right">Price</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2 px-3">{item.name}</td>
                    <td className="py-2 px-3 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-right">₹{item.price}</td>
                    <td className="py-2 px-3 text-right">₹{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Main ManageOrders ─────────────────────────────────────────
const ManageOrders = () => {
  const { data: orders, error, isLoading, refetch } = useGetAllOrdersQuery();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteOrder] = useDeleteOrderMutation();

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedOrder(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedOrder(null);
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    setDeletingId(orderId);
    try {
      await deleteOrder(orderId).unwrap();
      alert('Order deleted successfully');
      refetch();
    } catch (error) {
      console.error('Failed to delete order:', error);
      alert('Failed to delete order. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) return <div className="section__container p-6">Loading orders...</div>;
  if (error) return <div className="section__container p-6 text-red-500">Failed to load orders.</div>;

  // Helper to get product names
  const getProductNames = (items) => {
    if (!items || items.length === 0) return '—';
    const names = items.map(item => item.name);
    if (names.length <= 3) return names.join(', ');
    return names.slice(0, 3).join(', ') + ` +${names.length - 3} more`;
  };

  return (
    <div className="section__container p-6">
      <h2 className="text-2xl font-semibold mb-4">Manage Orders</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 border-b text-left">Order ID</th>
              <th className="py-3 px-4 border-b text-left">Customer</th>
              <th className="py-3 px-4 border-b text-left">Products</th>
              <th className="py-3 px-4 border-b text-left">Status</th>
              <th className="py-3 px-4 border-b text-left">Date</th>
              <th className="py-3 px-4 border-b text-left">Total</th>
              <th className="py-3 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders && orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order?._id}>
                  <td className="py-3 px-4 border-b">{order?.orderId}</td>
                  <td className="py-3 px-4 border-b">
                    {order?.customerInfo?.firstName} {order?.customerInfo?.lastName}
                    <span className="block text-xs text-gray-500">{order?.customerInfo?.email}</span>
                  </td>
                  <td className="py-3 px-4 border-b text-sm text-gray-600">
                    {getProductNames(order?.items)}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <span className={`inline-block px-3 py-1 text-xs text-white rounded-full ${getStatusColor(order?.orderStatus || order?.status)}`}>
                      {order?.orderStatus || order?.status || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b">{formatDate(order?.createdAt)}</td>
                  <td className="py-3 px-4 border-b font-semibold">₹{order?.totalAmount || 0}</td>
                  <td className="py-3 px-4 border-b flex items-center space-x-3">
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEditOrder(order)}
                      className="text-green-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order?._id)}
                      disabled={deletingId === order?._id}
                      className="text-red-600 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === order?._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-6 px-4 text-center text-gray-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      {isViewModalOpen && selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={handleCloseViewModal} />
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && selectedOrder && (
        <UpdateOrderModal
          order={selectedOrder}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  );
};

export default ManageOrders;