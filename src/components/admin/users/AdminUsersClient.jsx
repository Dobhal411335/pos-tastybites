"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Filter, Loader2, Edit, Shield, User, Clock, Eye, Copy, Check, X } from "lucide-react";
import {toast} from "sonner";
import AdminUserModal from "./AdminUserModal";

export default function AdminUsersClient() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  
  // Credentials View State
  const [viewCredsOpen, setViewCredsOpen] = useState(false);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [credsLoading, setCredsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Current logged in user (would ideally be fetched or passed down, assuming role is known)
  // For UI restrictions we might need to know if current user is Super Admin
  const [currentUser, setCurrentUser] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      let query = new URLSearchParams();
      if (search) query.append("search", search);
      if (roleFilter !== "All Roles") query.append("role", roleFilter);
      if (statusFilter !== "All Status") query.append("status", statusFilter);

      const res = await fetch(`/api/admin/users?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch admins");
      const data = await res.json();
      setAdmins(data.data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCurrentUser();
    fetchAdmins();
  }, [roleFilter, statusFilter, search]);


  const handleCreate = () => {
    setEditingAdmin(null);
    setIsModalOpen(true);
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setIsModalOpen(true);
  };

  const handleModalClose = (wasSaved) => {
    setIsModalOpen(false);
    setEditingAdmin(null);
    if (wasSaved) {
      fetchAdmins();
    }
  };

  const handleViewCredentials = async (admin) => {
    setViewingAdmin(admin);
    setAdminPassword("");
    setViewCredsOpen(true);
    setCredsLoading(true);
    
    try {
      const res = await fetch(`/api/admin/users/credentials?id=${admin._id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch credentials");
      
      setAdminPassword(data.data.password);
    } catch (err) {
      toast.error(err.message);
      setViewCredsOpen(false);
    } finally {
      setCredsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Password copied to clipboard");
  };

  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'ADMIN';

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system administrators and permissions</p>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={handleCreate}
            className="bg-[#E3B12F] hover:bg-[#D4AF37] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Admin
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] bg-white text-gray-700"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option>All Roles</option>
            <option>Super Admin</option>
            <option>Admin</option>
          </select>
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] bg-white text-gray-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-gray-200">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 font-semibold">User</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Last Login</th>
              <th className="pr-10 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Loading admins...</p>
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">No admins found</h3>
                  <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{admin.name}</span>
                      <span className="text-xs text-gray-500 mt-0.5">{admin.email}</span>
                      {admin.phone && <span className="text-xs text-gray-400">{admin.phone}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${admin.role === 'Super Admin' || admin.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {admin.role === 'Super Admin' || admin.role === 'ADMIN' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      {admin.role === 'ADMIN' ? 'Super Admin' : admin.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${admin.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {admin.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleViewCredentials(admin)}
                          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 py-1 px-4 gap-2 flex items-center justify-center rounded-md border-2 border-gray-500 transition-colors"
                          title="View Credentials"
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                      )}
                      {(isSuperAdmin || currentUser?._id === admin._id) && (
                        <button
                          onClick={() => handleEdit(admin)}
                          className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 p-2 rounded-md transition-colors"
                          title="Edit Admin"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AdminUserModal 
          admin={editingAdmin} 
          onClose={handleModalClose} 
          currentUser={currentUser}
        />
      )}

      {viewCredsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Admin Credentials</h2>
              <button 
                onClick={() => setViewCredsOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email / Login</label>
                <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  {viewingAdmin?.email}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Password</label>
                {credsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching securely...
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <div className="text-sm font-mono text-gray-900">{adminPassword}</div>
                    <button 
                      onClick={() => copyToClipboard(adminPassword)}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      title="Copy Password"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewCredsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
