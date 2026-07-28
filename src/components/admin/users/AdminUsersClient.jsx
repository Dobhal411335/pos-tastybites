"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, Loader2, Edit, Shield, User, Clock, Eye, EyeOff, Copy, Check, X, MoreHorizontal, Send } from "lucide-react";
import { toast } from "sonner";
import AdminUserModal from "./AdminUserModal";
import { useAdmin } from "@/context/AdminContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export default function AdminUsersClient() {
  const { adminUser, ready } = useAdmin();
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
  const [showPassword, setShowPassword] = useState(false);

  // Verify Admin State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyingAdmin, setVerifyingAdmin] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const currentUser = adminUser;

  const fetchAdmins = useCallback(async () => {
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
  }, [roleFilter, statusFilter, search]);

  useEffect(() => {
    const loadAdmins = async () => {
      if (!ready) return;

      try {
        setLoading(true);
        const query = new URLSearchParams();
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

    void loadAdmins();
  }, [ready, roleFilter, statusFilter, search]);

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

  const handleViewCredentials = async (admin, knownPassword = null) => {
    setViewingAdmin(admin);
    setAdminPassword(knownPassword || "");
    setShowPassword(false);
    setViewCredsOpen(true);

    if (knownPassword) return;

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

  const openVerifyModal = (admin) => {
    setVerifyingAdmin(admin);
    setVerificationCode("");
    setVerifyModalOpen(true);
  };

  const closeVerifyModal = () => {
    if (verifyLoading) return;
    setVerifyModalOpen(false);
    setVerifyingAdmin(null);
    setVerificationCode("");
  };

  // Send OTP to super admin email, then open verify modal
  const handleRequestVerification = async (admin) => {
    setSendingOtp(true);
    try {
      const res = await fetch("/api/admin/users/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: admin._id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send verification email");

      toast.success("Verification OTP sent to super admin email");
      openVerifyModal(admin);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyAdmin = async (e) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      toast.error("Enter the verification code");
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: verifyingAdmin._id,
          otp: verificationCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to verify admin");

      toast.success(data.message || "Admin verified and activated successfully");
      closeVerifyModal();
      fetchAdmins();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const isSuperAdmin = currentUser?.role === "Super Admin" || currentUser?.role === "ADMIN";

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
            className="bg-orange-500 hover:bg-orange-600 shadow-md text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
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
            <option>Admin</option>
            <option>Super Admin</option>
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
              <th className="px-6 py-4 font-semibold">Verification</th>
              <th className="px-6 py-4 font-semibold">Last Login</th>
              <th className="pr-10 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Loading admins...</p>
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
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
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        admin.role === "Super Admin" || admin.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {admin.role === "Super Admin" || admin.role === "ADMIN" ? (
                        <Shield className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                      {admin.role === "ADMIN" ? "Super Admin" : admin.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        admin.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {admin.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {admin.isVerified === false ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Pending Verification
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Verified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {admin.lastLogin
                        ? new Date(admin.lastLogin).toLocaleDateString()
                        : "Never"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer"
                          disabled={sendingOtp}
                        >
                          {sendingOtp ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white">
                        <DropdownMenuLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1.5">
                          Actions
                        </DropdownMenuLabel>

                        {/* Verify section – only for unverified admins, only super admin can do this */}
                        {isSuperAdmin && admin.isVerified === false && (
                          <>
                            <DropdownMenuItem
                              className="text-[14px] font-medium cursor-pointer text-amber-700 focus:bg-amber-50 focus:text-amber-900"
                              onClick={() => setTimeout(() => handleRequestVerification(admin), 150)}
                            >
                              <Send className="mr-2 h-4 w-4" /> Send OTP &amp; Verify
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}

                        {/* View Credentials – super admin only, and only after admin is verified */}
                        {isSuperAdmin && admin.isVerified === true && (
                          <DropdownMenuItem
                            className="text-[14px] font-medium cursor-pointer"
                            onClick={() => setTimeout(() => handleViewCredentials(admin), 150)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Credentials
                          </DropdownMenuItem>
                        )}

                        {/* Edit – super admin or self */}
                        {(isSuperAdmin || currentUser?._id === admin._id) && (
                          <DropdownMenuItem
                            className="text-[14px] font-medium cursor-pointer"
                            onClick={() => setTimeout(() => handleEdit(admin), 150)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit Admin
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          onViewCredentials={handleViewCredentials}
        />
      )}

      {/* View Credentials Modal */}
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
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Email / Login
                </label>
                <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  {viewingAdmin?.email}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                {credsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <div className="flex-1 text-sm font-mono text-gray-900 min-w-0 truncate">
                      {showPassword ? adminPassword : "•".repeat(adminPassword.length || 8)}
                    </div>
                    <button
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(adminPassword)}
                      className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
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

      {/* OTP Verification Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Verify Admin Account</h2>
                <p className="text-xs text-gray-500 mt-0.5">OTP sent to super admin email</p>
              </div>
              <button
                onClick={closeVerifyModal}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleVerifyAdmin} className="p-5 space-y-4">
              {/* Admin info */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{verifyingAdmin?.name}</p>
                  <p className="text-xs text-gray-500">{verifyingAdmin?.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Enter Verification OTP
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] font-mono tracking-[0.5em] text-center text-lg"
                />
              </div>

              <p className="text-sm text-gray-500">
                Enter the 6-digit OTP sent to the super admin email. Once verified, the admin&apos;s
                status will be set to <span className="font-semibold text-green-600">Active</span>.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeVerifyModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={verifyLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 shadow-md rounded-lg transition-colors flex items-center gap-2"
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Verify &amp; Activate
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
