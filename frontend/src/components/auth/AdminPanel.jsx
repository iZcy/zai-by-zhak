import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import api from '../../services/api';

function AdminPanel() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('user');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/admin/users');
      setUsers(response.data.data || []);
      setLoading(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await api.put(`/auth/users/${userId}/role`, { role: newRole });
      setMessage({ type: 'success', text: `User role updated to ${newRole}` });
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <iconify-icon icon="solar:shield-cross-linear" width="48" className="text-red-400 mx-auto mb-4"></iconify-icon>
          <h2 className="text-lg font-medium text-stone-100 mb-2">Access Denied</h2>
          <p className="text-sm text-stone-500">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const getInitials = (email) => {
    return email?.slice(0, 2).toUpperCase() || 'US';
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full border text-[10px] font-semibold text-stone-500 uppercase tracking-wide bg-stone-900 border-stone-800">
              Admin Mode
            </span>
          </div>
          <h1 className="text-xl font-medium tracking-tight mt-1 text-stone-100">System Users</h1>
        </div>
        <div className="flex gap-3">
          <button className="h-9 px-4 rounded-md border text-xs font-medium shadow-sm transition-all flex items-center gap-2 border-stone-800 bg-black text-stone-400 hover:bg-stone-950">
            <iconify-icon icon="solar:export-linear" width="14"></iconify-icon>
            Export
          </button>
          <button className="h-9 px-4 rounded-md text-xs font-medium shadow-sm transition-all flex items-center gap-2 bg-stone-100 text-black hover:bg-emerald-100">
            <iconify-icon icon="solar:user-plus-linear" width="14"></iconify-icon>
            Add User
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border text-sm ${
          message.type === 'success'
            ? 'border-emerald-900 bg-emerald-950/50 text-emerald-300'
            : 'border-red-900 bg-red-950/50 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            <iconify-icon
              icon={message.type === 'success' ? 'solar:check-circle-linear' : 'solar:close-circle-linear'}
              width="18"
            ></iconify-icon>
            {message.text}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border p-4 rounded-lg shadow-sm bg-black border-stone-800">
          <span className="text-xs font-medium text-stone-600">Total Users</span>
          <div className="text-lg font-semibold mt-1 text-stone-200">{users.length}</div>
        </div>
        <div className="border p-4 rounded-lg shadow-sm bg-black border-stone-800">
          <span className="text-xs font-medium text-stone-600">Admins</span>
          <div className="text-lg font-semibold mt-1 text-stone-200">
            {users.filter(u => u.role === 'admin').length}
          </div>
        </div>
        <div className="border p-4 rounded-lg shadow-sm bg-black border-stone-800">
          <span className="text-xs font-medium text-stone-600">Regular Users</span>
          <div className="text-lg font-semibold mt-1 text-stone-200">
            {users.filter(u => u.role === 'user').length}
          </div>
        </div>
        <div className="border p-4 rounded-lg shadow-sm bg-black border-stone-800">
          <span className="text-xs font-medium text-stone-600">Active Now</span>
          <div className="text-lg font-semibold mt-1 text-emerald-400">{users.length}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col bg-black border-stone-800">
        {/* Table Toolbar */}
        <div className="px-5 py-4 border-b flex items-center justify-between border-stone-900">
          <div className="relative w-64">
            <iconify-icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" width="16"></iconify-icon>
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 text-xs border-none rounded-md focus:ring-1 focus:ring-stone-200 outline-none placeholder:text-stone-400 bg-stone-950 text-stone-300"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 transition-colors text-stone-600 hover:text-stone-400">
              <iconify-icon icon="solar:filter-linear" width="18"></iconify-icon>
            </button>
            <button className="p-2 transition-colors text-stone-600 hover:text-stone-400">
              <iconify-icon icon="solar:settings-linear" width="18"></iconify-icon>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-medium border-b text-stone-600 border-stone-900">
                <th className="pl-5 pr-2 py-3 w-10">
                  <label className="flex items-center cursor-pointer relative">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="w-4 h-4 border rounded peer-checked:bg-stone-800 peer-checked:border-stone-800 transition-all flex items-center justify-center border-stone-700">
                      <iconify-icon icon="solar:check-read-linear" className="opacity-0 peer-checked:opacity-100 text-black" width="12"></iconify-icon>
                    </div>
                  </label>
                </th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-stone-950">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-stone-500">
                      <iconify-icon icon="solar:loader-linear" width="20" className="animate-spin"></iconify-icon>
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center">
                    <iconify-icon icon="solar:users-group-rounded-linear" width="48" className="mx-auto text-stone-800 mb-4"></iconify-icon>
                    <p className="text-stone-500 mb-1">No users found</p>
                    <p className="text-xs text-stone-600">Users will appear here once they sign in</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="group transition-colors hover:bg-stone-950/80">
                    <td className="pl-5 pr-2 py-4">
                      <label className="flex items-center cursor-pointer relative">
                        <input type="checkbox" className="peer sr-only" />
                        <div className="w-4 h-4 border rounded peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition-all flex items-center justify-center border-stone-700">
                          <iconify-icon icon="solar:check-read-linear" className="opacity-0 peer-checked:opacity-100 text-black" width="12"></iconify-icon>
                        </div>
                      </label>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br border flex items-center justify-center text-xs font-semibold from-stone-900 to-stone-800 border-stone-900 text-stone-400">
                          {getInitials(u.email)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-stone-300">{u.displayName || u.email?.split('@')[0]}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-stone-500">{u.email}</span>
                    </td>
                    <td className="px-4 py-4">
                      {u._id !== user?.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => updateUserRole(u._id, e.target.value)}
                            className="text-xs px-2 py-1 rounded border border-stone-700 bg-stone-900 text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-stone-900 text-stone-400 border-stone-800">
                          {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-950/50 text-emerald-300 border-emerald-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="transition-colors text-stone-600 hover:text-stone-200">
                        <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t flex items-center justify-between text-xs text-stone-500 border-stone-900">
          <span>Showing {users.length} user{users.length !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded border-stone-800 hover:bg-stone-950">Previous</button>
            <button className="px-3 py-1 border rounded border-stone-800 hover:bg-stone-950">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
