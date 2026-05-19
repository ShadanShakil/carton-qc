"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS, CAN_MANAGE_ADMINS, hasRole } from "@/lib/roles";
import { createUser, updateUser, deleteUser } from "./actions";

// Types
type UserWithNoPassword = Omit<User, "hashedPassword">;

interface UserTableProps {
  users: UserWithNoPassword[];
  currentUserRole: string;
  currentUserEmail: string;
}

const ROLE_TONE: Record<string, "brand" | "warning" | "success" | "danger" | "info" | "purple" | "neutral"> = {
  SUPERADMIN: "danger",
  ADMIN: "purple",
  REVIEWER: "brand",
  QC_INSPECTOR: "info",
  OPERATOR: "neutral",
};

export function UserTable({ users, currentUserRole, currentUserEmail }: UserTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithNoPassword | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("OPERATOR");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canManageAdmins = hasRole(currentUserRole as any, CAN_MANAGE_ADMINS);

  const availableRoles = Object.keys(ROLE_LABELS).filter(r => {
    if (r === "SUPERADMIN") return false; // Usually don't create superadmins from UI
    if (r === "ADMIN" && !canManageAdmins) return false;
    return true;
  });

  const initials = (name: string | null, email: string) =>
    (name ?? email)
      .split(/[\s@.]/)
      .filter(Boolean)
      .map((s) => s[0]!)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const openModal = (user?: UserWithNoPassword) => {
    setError("");
    if (user) {
      setEditingUser(user);
      setName(user.name ?? "");
      setEmail(user.email);
      setRole(user.role);
      setPassword("");
    } else {
      setEditingUser(null);
      setName("");
      setEmail("");
      setRole("OPERATOR");
      setPassword("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (editingUser) {
        const res = await updateUser(editingUser.id, {
          name,
          email,
          role: role as any,
          ...(password ? { password } : {})
        });
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await createUser({
          name,
          email,
          role: role as any,
          password
        });
        if (!res.success) throw new Error(res.error);
      }
      closeModal();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setLoading(true);
    try {
      const res = await deleteUser(id);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">All users</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">{users.length} record{users.length === 1 ? "" : "s"}</span>
          <button
            onClick={() => openModal()}
            className="rounded bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            style={{ backgroundColor: "var(--color-brand-600)" }}
          >
            Add User
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Employee</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-left">Created</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = u.email === currentUserEmail;
              const isTargetAdmin = u.role === "ADMIN" || u.role === "SUPERADMIN";
              const canEdit = canManageAdmins || !isTargetAdmin;
              
              return (
                <tr key={u.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                        {initials(u.name, u.email)}
                      </div>
                      <div className="font-medium text-slate-900">
                        {u.name ?? "—"} {isSelf && <span className="text-slate-400 font-normal">(You)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-700">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge tone={ROLE_TONE[u.role] ?? "neutral"}>
                      {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(u.createdAt).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(u)}
                          className="text-brand-600 hover:underline text-xs"
                          style={{ color: "var(--color-brand-600)" }}
                        >
                          Edit
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingUser ? "Edit User" : "Add New User"}
            </h3>
            {error && (
              <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  disabled={!!editingUser} // Disallow changing email for simplicity
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={editingUser?.id === currentUserEmail} // Cannot change own role
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</option>
                  ))}
                  {/* If editing a SUPERADMIN as SUPERADMIN, preserve option */}
                  {editingUser?.role === "SUPERADMIN" && <option value="SUPERADMIN">Super Administrator</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-brand-600)" }}
                >
                  {loading ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
