import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Role, Committee, UserWithRoles } from '../types';
import { PermissionLevel } from '../types';
import api from '../lib/api';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'roles' | 'committees' | 'users'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  // Role assignment modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Role editing modal state
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDescription, setEditRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesRes, committeesRes, usersRes] = await Promise.all([
        api.get('/roles'),
        api.get('/committees'),
        api.get('/users'),
      ]);
      setRoles(rolesRes.data);
      setCommittees(committeesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    const name = prompt('Role name:');
    const description = prompt('Role description (optional):');
    if (!name) return;

    try {
      const orgRes = await api.get('/organizations/me');
      await api.post('/roles', {
        name,
        description: description || undefined,
        organizationId: orgRes.data.id,
      });
      loadData();
    } catch (error) {
      alert('Failed to create role');
    }
  };

  const createCommittee = async () => {
    const name = prompt('Committee name:');
    const description = prompt('Committee description (optional):');
    if (!name) return;

    try {
      const orgRes = await api.get('/organizations/me');
      await api.post('/committees', {
        name,
        description: description || undefined,
        organizationId: orgRes.data.id,
      });
      loadData();
    } catch (error) {
      alert('Failed to create committee');
    }
  };

  const openRoleAssignment = (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRoleId('');
    setShowRoleModal(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleId) return;

    setAssigning(true);
    try {
      await api.post('/roles/assign', {
        userId: selectedUser.id,
        roleId: selectedRoleId
      });
      setShowRoleModal(false);
      setSelectedUser(null);
      setSelectedRoleId('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to assign role');
    } finally {
      setAssigning(false);
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    if (!confirm('Are you sure you want to remove this role from the user?')) {
      return;
    }

    try {
      await api.delete(`/roles/assign/${userId}/${roleId}`);
      loadData();
    } catch (error) {
      alert('Failed to remove role');
    }
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description || '');

    // Build permissions map
    const permMap: Record<string, string> = {};
    committees.forEach((committee) => {
      const permission = role.permissions?.find((p) => p.committeeId === committee.id);
      permMap[committee.id] = permission?.permissionLevel || PermissionLevel.NONE;
    });
    setRolePermissions(permMap);
    setShowEditRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!editingRole || !editRoleName.trim()) return;

    setSavingRole(true);
    try {
      // Update role name and description
      await api.put(`/roles/${editingRole.id}`, {
        name: editRoleName,
        description: editRoleDescription || undefined,
      });

      // Update permissions
      const permissions = Object.entries(rolePermissions).map(([committeeId, permissionLevel]) => ({
        committeeId,
        permissionLevel,
      }));

      await api.post('/roles/permissions', {
        roleId: editingRole.id,
        permissions,
      });

      setShowEditRoleModal(false);
      setEditingRole(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save role');
    } finally {
      setSavingRole(false);
    }
  };

  const handlePermissionChange = (committeeId: string, level: string) => {
    setRolePermissions((prev) => ({
      ...prev,
      [committeeId]: level,
    }));
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This will remove it from all users.')) {
      return;
    }

    try {
      await api.delete(`/roles/${roleId}`);
      loadData();
    } catch (error) {
      alert('Failed to delete role');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Admin Panel</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700'
            }`}
          >
            Roles
          </button>
          <button
            onClick={() => setActiveTab('committees')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'committees'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700'
            }`}
          >
            Committees
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700'
            }`}
          >
            Users
          </button>
        </div>

        {activeTab === 'roles' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Roles</h2>
              <button
                onClick={createRole}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                + Create Role
              </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map((role) => (
                    <tr
                      key={role.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => openEditRole(role)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {role.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {role.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {role.permissions?.length || 0} committees
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRole(role.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'committees' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Committees</h2>
              <button
                onClick={createCommittee}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                + Create Committee
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {committees.map((committee) => (
                <Link
                  key={committee.id}
                  to={`/committees/${committee.id}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer block"
                >
                  <h3 className="font-semibold text-lg">{committee.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {committee.description || 'No description'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Users</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.roles && user.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={role.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs"
                              >
                                {role.name}
                                <button
                                  onClick={() => removeRole(user.id, role.id)}
                                  className="hover:text-indigo-900"
                                  title="Remove role"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No roles</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => openRoleAssignment(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          + Assign Role
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Assign Role</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Assign a role to {selectedUser.name}
                </p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="roleSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <select
                id="roleSelect"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
              >
                <option value="">-- Select a role --</option>
                {roles
                  .filter((role) => !selectedUser.roles?.some((ur) => ur.id === role.id))
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.description ? ` - ${role.description}` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {selectedUser.roles && selectedUser.roles.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-medium text-gray-700 mb-2">Current Roles:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles.map((role) => (
                    <span
                      key={role.id}
                      className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAssignRole}
                disabled={!selectedRoleId || assigning}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Assigning...' : 'Assign Role'}
              </button>
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {showEditRoleModal && editingRole && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowEditRoleModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full p-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Role</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure role permissions and details
                </p>
              </div>
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <input
                  id="roleName"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="roleDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="roleDescription"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editRoleDescription}
                  onChange={(e) => setEditRoleDescription(e.target.value)}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Committee Permissions</h3>
                {committees.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No committees available. Create committees first.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {committees.map((committee) => (
                      <div key={committee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{committee.name}</p>
                          {committee.description && (
                            <p className="text-xs text-gray-500 mt-1">{committee.description}</p>
                          )}
                        </div>
                        <select
                          className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={rolePermissions[committee.id] || PermissionLevel.NONE}
                          onChange={(e) => handlePermissionChange(committee.id, e.target.value)}
                        >
                          <option value={PermissionLevel.NONE}>None</option>
                          <option value={PermissionLevel.MEMBER}>Member</option>
                          <option value={PermissionLevel.LEADER}>Leader</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-900 font-medium mb-1">Permission Levels:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li><strong>None:</strong> No access to the committee</li>
                  <li><strong>Member:</strong> Can view tasks, mark complete, add comments</li>
                  <li><strong>Leader:</strong> All member permissions + create/edit/delete tasks</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveRole}
                disabled={!editRoleName.trim() || savingRole}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingRole ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
