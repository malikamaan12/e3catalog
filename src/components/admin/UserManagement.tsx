"use client";

import React, { useState, useEffect } from "react";
import {
    Users,
    UserPlus,
    Shield,
    User,
    Trash2,
    Mail,
    Phone,
    MoreVertical,
    CheckCircle2,
    XCircle,
    BarChart3
} from "lucide-react";
import { ClientDetailsModal } from "./ClientDetailsModal";

interface UserType {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    role: string;
    createdAt: string;
    status: string;
}

export function UserManagement() {
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserType | null>(null);
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "client", phoneNumber: "" });

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (err) {
            console.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser),
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewUser({ name: "", email: "", role: "client", phoneNumber: "" });
                fetchUsers();
            }
        } catch (err) {
            console.error("Failed to create user");
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (err) {
            console.error("Failed to update role");
        }
    };

    const handleUpdateUser = async (userId: string, data: any) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (err) {
            console.error("Failed to update user");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (err) {
            console.error("Failed to delete user");
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-[var(--color-gold)]" />
                        User Management
                    </h2>
                    <p className="text-sm text-[var(--color-slate)]">Manage admins, site managers, and clients.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-[var(--color-gold)] text-[var(--color-navy)] px-4 py-2 rounded-lg font-bold hover:bg-[var(--color-gold-lighter)] transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Add New User
                </button>
            </div>

            <div className="glass border border-white/10 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-[var(--color-gold)] outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-slate)]" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-[var(--color-slate)]">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-[var(--color-slate)]">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center text-[var(--color-navy)] font-bold shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[var(--color-warm-white)]">{user.name}</p>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <span className="text-xs text-[var(--color-slate)] flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {user.email}
                                                        </span>
                                                        {user.phoneNumber && (
                                                            <span className="text-xs text-[var(--color-slate)] flex items-center gap-1">
                                                                <Phone className="w-3 h-3" /> {user.phoneNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                className={`text-xs font-bold px-2 py-1 rounded border transition-colors outline-none
                                                    ${user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        user.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            'bg-green-500/10 text-green-400 border-green-500/20'}`}
                                                value={user.role}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                            >
                                                <option value="client" className="bg-[#0a0f1e] text-white">Client</option>
                                                <option value="vendor" className="bg-[#0a0f1e] text-white">Vendor</option>
                                                <option value="sales_rep" className="bg-[#0a0f1e] text-white">Sales Rep</option>
                                                <option value="warehouse_manager" className="bg-[#0a0f1e] text-white">Warehouse Mgr</option>
                                                <option value="admin" className="bg-[#0a0f1e] text-white">Admin</option>
                                                <option value="super_admin" className="bg-[#0a0f1e] text-white">Super Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.status || 'active'}
                                                onChange={(e) => handleUpdateUser(user.id, { status: e.target.value })}
                                                className={`text-xs font-bold px-2 py-1 rounded border transition-colors outline-none cursor-pointer
                                                    ${user.status === 'blocked' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        user.status === 'frozen' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            'bg-green-500/10 text-green-400 border-green-500/20'}`}
                                            >
                                                <option value="active" className="bg-[#0a0f1e] text-white">Active</option>
                                                <option value="frozen" className="bg-[#0a0f1e] text-white">Frozen</option>
                                                <option value="blocked" className="bg-[#0a0f1e] text-white">Blocked</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--color-slate)]">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setSelectedUserForDetails(user)}
                                                    className="p-2 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 rounded-lg transition-colors"
                                                    title="View Client Details & History"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newPassword = prompt(`Enter new password for ${user.email}:`);
                                                        if (newPassword) {
                                                            handleUpdateUser(user.id, { passwordReset: newPassword });
                                                            alert("Password reset successfully.");
                                                        }
                                                    }}
                                                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass border border-white/10 rounded-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-[var(--color-gold)]" />
                                Create New User
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-[var(--color-slate)] hover:text-white transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest mb-1.5">Full Name</label>
                                <input
                                    type="text" required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[var(--color-gold)] transition-all"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest mb-1.5">Email Address</label>
                                <input
                                    type="email" required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[var(--color-gold)] transition-all"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest mb-1.5">Phone (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[var(--color-gold)] transition-all"
                                    value={newUser.phoneNumber}
                                    onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest mb-1.5">Initial Role</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {['client', 'vendor', 'sales_rep', 'warehouse_manager', 'admin', 'super_admin'].map(r => (
                                        <button
                                            key={r} type="button"
                                            onClick={() => setNewUser({ ...newUser, role: r })}
                                            className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold border transition-all truncate px-1 ${newUser.role === r ? 'bg-[var(--color-gold)]/20 border-[var(--color-gold)] text-[var(--color-gold)]' : 'bg-white/5 border-white/5 text-[var(--color-slate)]'}`}
                                        >
                                            {r.replace('_', ' ').toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full bg-[var(--color-gold)] text-[var(--color-navy)] py-3 rounded-xl font-bold hover:bg-[var(--color-gold-lighter)] transition-all shadow-lg shadow-gold/10">
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Client Details Modal */}
            {selectedUserForDetails && (
                <ClientDetailsModal
                    user={selectedUserForDetails}
                    onClose={() => setSelectedUserForDetails(null)}
                />
            )}
        </div>
    );
}
