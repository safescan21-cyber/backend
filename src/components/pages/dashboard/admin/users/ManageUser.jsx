import React, { useState } from 'react';
import { useDeleteUserMutation, useGetUserQuery, useUpdateUserRoleMutation } from '../../../../store/authApi';
import UpdateUserModal from './UpdateUserModal';

const ManageUser = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null); // track which user is updating
  const { data: usersData, error, isLoading, refetch } = useGetUserQuery();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUserRole] = useUpdateUserRoleMutation();

  // Ensure users is always an array
  const users = Array.isArray(usersData) ? usersData : [];

  // ─── Delete user ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await deleteUser(id).unwrap();
      alert('User deleted');
      refetch();
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  // ─── Toggle role (admin ↔ user) ────────────────────────────
  const handleToggleRole = async (user) => {
    if (!user?._id) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';

    // Prevent double‑click while updating
    if (updatingUserId === user._id) return;
    setUpdatingUserId(user._id);

    try {
      await updateUserRole({ userId: user._id, role: newRole }).unwrap();
      refetch(); // refresh the list
    } catch (err) {
      console.error('Role update failed:', err);
      alert('Failed to update role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ─── Edit (open modal) ──────────────────────────────────────
  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  // ─── Loading / error states ────────────────────────────────
  if (isLoading) return <div className="text-center py-8">Loading users...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Failed to load users.</div>;

  return (
    <section className="py-1 bg-blueGray-50">
      <div className="w-full mb-12 xl:mb-0 px-4 mx-auto">
        <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
          <div className="rounded-t mb-0 px-4 py-3 border-0">
            <div className="flex flex-wrap items-center">
              <div className="relative w-full px-4 max-w-full flex-grow flex-1">
                <h3 className="font-semibold text-base text-blueGray-700">All Users</h3>
              </div>
              <div className="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                <button className="bg-indigo-500 text-white active:bg-indigo-600 text-xs font-bold uppercase px-3 py-1 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button">
                  See all
                </button>
              </div>
            </div>
          </div>

          <div className="block w-full overflow-x-auto">
            <table className="items-center bg-transparent w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">No.</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">User email</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Role</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Toggle Role</th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const isUpdating = updatingUserId === user._id;
                  return (
                    <tr key={user._id || index}>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left text-blueGray-700">
                        {index + 1}
                      </td>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        {user?.email || 'N/A'}
                      </td>
                      <td className="border-t-0 px-6 align-center border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        <span
                          className={`rounded-full py-[2px] px-3 ${
                            user?.role === 'admin' ? 'bg-indigo-500 text-white' : 'bg-amber-300'
                          }`}
                        >
                          {user?.role}
                        </span>
                      </td>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        {/* Toggle Switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user?.role === 'admin'}
                            onChange={() => handleToggleRole(user)}
                            disabled={isUpdating}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          {isUpdating && (
                            <span className="ml-2 text-xs text-gray-500">Updating...</span>
                          )}
                        </label>
                      </td>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-blue-500 text-white px-3 py-1 rounded mr-2 hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user?._id)}
                          className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <UpdateUserModal
          user={selectedUser}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
          onRoleUpdate={refetch}
        />
      )}
    </section>
  );
};

export default ManageUser;