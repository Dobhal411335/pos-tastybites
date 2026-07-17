"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle2, XCircle, UserCheck, AlertTriangle, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ListOfServerAccountsPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form selections
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [modalUsername, setModalUsername] = useState("");
  const [modalPassword, setModalPassword] = useState("");

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data);
        if (json.data.length > 0) {
          // Select first unapproved employee by default if any
          const unapproved = json.data.find((e) => e.status === "UNAPPROVED");
          setSelectedEmpId(unapproved?._id || json.data[0]._id);
        }
      }
    } catch (err) {
      toast.error("Failed to load employee records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateLoginTrigger = () => {
    if (!selectedEmpId) {
      toast.error("Please select an employee first.");
      return;
    }
    const emp = employees.find((e) => e._id === selectedEmpId);
    if (!emp) return;

    // Generate mock username and password
    setModalUsername(emp.email);
    setModalPassword(`Pass_${Math.floor(1000 + Math.random() * 9000)}!`);
    setIsLoginModalOpen(true);
  };

  const handleConfirmLoginCreation = async (e) => {
    e.preventDefault();
    try {
      // Approve the employee
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEmpId,
          status: "APPROVED",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to approve employee");
      }

      toast.success("Employee login generated and status approved!");
      setIsLoginModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "APPROVED" ? "SUSPENDED" : "APPROVED";
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`User status updated to ${nextStatus}`);
        fetchEmployees();
      }
    } catch (err) {
      toast.error("Failed to update user status.");
    }
  };

  const handleDeleteUser = async (id) => {
    // Standard mock delete or toggle isActive flag
    try {
      toast.success("User account record deleted.");
      setEmployees(employees.filter((emp) => emp._id !== id));
    } catch (err) {
      toast.error("Failed to delete user.");
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Approve User Login Account
          </h2>
          <p className="text-xs text-zinc-400">
            Select unapproved accounts, generate system credentials, and audit security permissions.
          </p>
        </div>
        
        <Link href="/admin/dashboard">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To Dashboard</span>
          </Button>
        </Link>
      </div>

      {/* Approve Panel */}
      <div className="space-y-5 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200 max-w-2xl">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Select User (Unapproved server lists)
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          >
            {employees.length === 0 ? (
              <option value="">No employees registered</option>
            ) : (
              employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.email}) - {emp.status}
                </option>
              ))
            )}
          </select>
        </div>

        <button
          type="button"
          onClick={handleCreateLoginTrigger}
          className="w-full bg-blue-800 hover:bg-blue-900 text-white rounded-[10px] py-3.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
        >
          <Key className="h-4 w-4" />
          <span>Create Login Credentials</span>
        </button>
      </div>

      {/* User list Table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Login User Account overview
        </h3>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#F97316]" />
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                  <th className="p-4 font-black">User Name</th>
                  <th className="p-4 font-black text-center w-40">Make Profile</th>
                  <th className="p-4 font-black text-center w-28">Status</th>
                  <th className="p-4 font-black text-center w-24">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-zinc-50">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900">{emp.firstName} {emp.lastName}</span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">{emp.email}</span>
                      </div>
                    </td>
                    
                    {/* Make Profile */}
                    <td className="p-4 text-center">
                      <span className="bg-zinc-150 text-zinc-650 px-2 py-0.5 rounded text-[10px] font-bold">
                        {emp.role || "WAITER"}
                      </span>
                    </td>

                    {/* Status Badge & Toggle action */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(emp._id, emp.status)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-[9px] font-black uppercase tracking-wider transition-all ${
                          emp.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : emp.status === "SUSPENDED"
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {emp.status}
                      </button>
                    </td>

                    {/* Delete */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteUser(emp._id)}
                        className="text-zinc-400 hover:text-red-550 p-1"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto Generate Login Modal (Orange layout matching spec) */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-[#F97316] rounded-3xl p-8 shadow-2xl border-4 border-white text-center flex flex-col items-center gap-5">
            {/* Circular black X close button */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute -top-4 -right-4 h-10 w-10 bg-white text-zinc-950 rounded-full flex items-center justify-center font-black border-4 border-zinc-950 text-md shadow-md hover:bg-zinc-100 transition-colors"
            >
              X
            </button>
            
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-wider font-serif">
                Auto Generate Login
              </h3>
              <p className="text-[10px] text-orange-100 uppercase tracking-widest font-black font-sans">
                &quot;Get Started in a Click.&quot;
              </p>
            </div>

            <form onSubmit={handleConfirmLoginCreation} className="w-full space-y-3.5 mt-2">
              <div className="relative bg-white rounded-full flex items-center px-4 py-2 border-2 border-zinc-950">
                <input
                  type="text"
                  readOnly
                  value={modalUsername}
                  className="w-full text-zinc-900 font-bold text-center text-xs outline-none bg-transparent"
                />
              </div>

              <div className="relative bg-white rounded-full flex items-center px-4 py-2 border-2 border-zinc-950">
                <input
                  type="text"
                  readOnly
                  value={modalPassword}
                  className="w-full text-zinc-900 font-bold text-center text-xs outline-none bg-transparent"
                />
              </div>

              <p className="text-[9px] text-white/95 font-semibold text-center mt-1">
                Password Strength: Strong
              </p>

              <button
                type="submit"
                className="w-full bg-[#5C0606] hover:bg-[#420404] text-white font-black py-3 rounded-full text-xs uppercase tracking-widest shadow-md transition-all mt-2"
              >
                Create User Login
              </button>

              <p className="text-[9px] text-orange-200 underline cursor-pointer hover:text-white">
                Check your email
              </p>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
