'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, UserPlus, Shield, Trash2, Mail, Calendar, Check, X } from 'lucide-react';
import { UserRole } from '@cargoflow/shared-types';
import { useAuthStore } from '@/store/authStore';

interface Member {
  id: string;
  role: UserRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  };
}

const ROLES: UserRole[] = [
  UserRole.ORG_ADMIN,
  UserRole.PLANNER,
  UserRole.DISPATCHER,
  UserRole.LOADER,
  UserRole.DRIVER,
  UserRole.VIEWER,
];

export default function TeamManagementPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PLANNER);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => api.get<Member[]>('/organization/members'),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; firstName: string; lastName: string; role: UserRole }) =>
      api.post('/organization/members/invite', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      setIsInviteOpen(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to invite team member');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      api.patch(`/organization/members/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/organization/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });

  const isOrgAdmin =
    currentUser?.role === UserRole.ORG_ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team & Organization</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage organization members, assign operational roles, and invite collaborators.
          </p>
        </div>
        {isOrgAdmin && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-apple-md hover:bg-blue-700 transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white shadow-apple-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-6">Member</th>
                <th className="py-3 px-6">Role</th>
                <th className="py-3 px-6">Joined Date</th>
                {isOrgAdmin && <th className="py-3 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Loading team members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isSelf = m.user.id === currentUser?.sub;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs">
                            {m.user.firstName?.[0] || 'U'}
                            {m.user.lastName?.[0] || ''}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {m.user.firstName} {m.user.lastName} {isSelf && '(You)'}
                            </p>
                            <span className="text-[11px] text-slate-500">{m.user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {isOrgAdmin && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              updateRoleMutation.mutate({
                                id: m.id,
                                role: e.target.value as UserRole,
                              })
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-100">
                            <Shield className="h-3 w-3" />
                            {m.role}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-slate-500 font-medium">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>

                      {isOrgAdmin && (
                        <td className="py-4 px-6 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${m.user.firstName} from organization?`)) {
                                  removeMemberMutation.mutate(m.id);
                                }
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Remove Member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Invite Member</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {errorMsg}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate({ email, firstName, lastName, role });
              }}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Morgan"
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-apple-sm disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
