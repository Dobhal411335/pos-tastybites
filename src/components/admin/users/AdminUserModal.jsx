"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save, Eye, EyeOff } from "lucide-react";
import {toast} from "sonner";

export default function AdminUserModal({ admin, onClose, currentUser, onViewCredentials }) {
  const isEdit = !!admin;
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'ADMIN';
  const isEditingSelf = currentUser?._id === admin?._id;
  const canEditPassword = isSuperAdmin || isEditingSelf;

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [originalPassword, setOriginalPassword] = useState("");
  
  const [formData, setFormData] = useState({
    name: admin?.name || "",
    email: admin?.email || "",
    phone: admin?.phone || "",
    role: admin?.role === 'ADMIN' ? 'Super Admin' : (admin?.role || "Admin"),
    status: admin?.status || "Active",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (!isEdit || !admin?._id || !canEditPassword) return;

    const fetchPassword = async () => {
      setPasswordLoading(true);
      try {
        const res = await fetch(`/api/admin/users/credentials?id=${admin._id}`);
        const data = await res.json();
        if (res.ok && data.data?.password) {
          setFormData((prev) => ({
            ...prev,
            password: data.data.password,
            confirmPassword: data.data.password,
          }));
          setOriginalPassword(data.data.password);
        }
      } catch {
        // Legacy admins may not have plainPassword stored
      } finally {
        setPasswordLoading(false);
      }
    };

    fetchPassword();
  }, [isEdit, admin?._id, canEditPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const passwordChanged = isEdit && formData.password !== originalPassword;

  const validate = () => {
    if (!formData.name.trim()) return "Full Name is required";
    if (!isEdit && !formData.email.trim()) return "Email is required";
    if (!isEdit && formData.password.length < 8) return "Password must be at least 8 characters";
    if (!isEdit && formData.password !== formData.confirmPassword) return "Passwords do not match";
    if (passwordChanged && formData.password.length < 8) return "Password must be at least 8 characters";
    if (passwordChanged && formData.password !== formData.confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    
    try {
      const url = isEdit ? `/api/admin/users/${admin._id}` : `/api/admin/users`;
      const method = isEdit ? "PUT" : "POST";
      
      const payload = { ...formData };
      if (isEdit) {
        delete payload.email;
        delete payload.confirmPassword;
        if (!passwordChanged) {
          delete payload.password;
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      
      toast.success(data.message || (isEdit ? "Admin updated successfully" : "Admin created successfully"));
      onClose(true);
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Admin User" : "Create Admin User"}
          </h2>
          <button 
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F]"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] disabled:bg-gray-100 disabled:text-gray-500"
                  required
                  disabled={isEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F]"
                />
              </div>
            </div>

            {(!isEdit || canEditPassword) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!isEdit && "*"}
                  </label>
                  {isEdit && passwordLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading password...
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        style={{ WebkitTextSecurity: showPassword ? "none" : "disc" }}
                        className="no-native-password-reveal w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] font-mono"
                        required={!isEdit}
                        minLength={isEdit ? undefined : 8}
                        placeholder={isEdit && !originalPassword ? "Enter new password" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                  {isEdit && !passwordLoading && !originalPassword && (
                    <p className="text-xs text-gray-500 mt-1">No password on file. Enter a new one to set it.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password {!isEdit && "*"}
                  </label>
                  {isEdit && passwordLoading ? (
                    <div className="px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 h-[42px]" />
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        style={{ WebkitTextSecurity: showConfirmPassword ? "none" : "disc" }}
                        className="no-native-password-reveal w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] font-mono"
                        required={!isEdit}
                        minLength={isEdit ? undefined : 8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] disabled:bg-gray-100"
                  disabled={!isSuperAdmin}
                >
                  <option value="Admin">Admin</option>
                </select>
                {!isSuperAdmin && (
                  <p className="text-xs text-gray-500 mt-1">Only Super Admins can change roles.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E3B12F]/50 focus:border-[#E3B12F] disabled:bg-gray-100"
                  disabled={!isSuperAdmin || (isEdit && isEditingSelf)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {isEdit && isEditingSelf && (
                  <p className="text-xs text-orange-500 mt-1">You cannot disable your own account.</p>
                )}
              </div>
            </div>
            
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 shadow-md rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEdit ? "Save Changes" : "Create Admin"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
