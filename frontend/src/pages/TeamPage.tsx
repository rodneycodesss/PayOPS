import React, { useState } from 'react';
import { Plus, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  twoFactor: 'On' | 'Off';
  status: 'Active' | 'Invited';
}

export const TeamPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Exact members from Page 18
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'm-1',
      name: 'Team member 1',
      role: 'Business Owner',
      twoFactor: 'On',
      status: 'Active',
    },
    {
      id: 'm-2',
      name: 'Team member 2',
      role: 'Finance Administrator',
      twoFactor: 'On',
      status: 'Active',
    },
    {
      id: 'm-3',
      name: 'Team member 3',
      role: 'Cashier',
      twoFactor: 'Off',
      status: 'Active',
    },
    {
      id: 'm-4',
      name: 'Team member 4',
      role: 'Auditor',
      twoFactor: 'Off',
      status: 'Invited',
    },
  ]);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Accountant');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const newM: TeamMember = {
      id: `m-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      role: inviteRole,
      twoFactor: 'Off',
      status: 'Invited',
    };
    setMembers([...members, newM]);
    setIsInviteOpen(false);
    setInviteEmail('');
    setToastMessage(`Invitation sent to ${inviteEmail} with role ${inviteRole}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const ROLES = [
    'Business Owner',
    'Finance Administrator',
    'Accountant',
    'Cashier',
    'Auditor',
    'Read-only User',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Row (Page 18) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Team and Permissions
        </h1>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="px-6 py-3 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-sm transition shadow-md shadow-[#16A6D9]/20 flex items-center space-x-2"
        >
          <span>Invite member</span>
        </button>
      </div>

      {/* Members Table Card (Page 18) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Member</th>
                <th className="pb-4 font-normal">Role</th>
                <th className="pb-4 font-normal">Two-factor</th>
                <th className="pb-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-4 font-medium text-slate-900">{m.name}</td>
                  <td className="py-4 text-slate-700">{m.role}</td>
                  <td className="py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        m.twoFactor === 'On'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.twoFactor}
                    </span>
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        m.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles & Illustrative Data Bar (Page 18 Bottom) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {ROLES.map((role) => (
            <span
              key={role}
              className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium"
            >
              {role}
            </span>
          ))}
        </div>

        {isTestAccount && (
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium shrink-0">
            Illustrative data
          </span>
        )}
      </div>

      {/* Modal: Invite Member */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-950">Invite Team Member</h3>
              <button onClick={() => setIsInviteOpen(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@business.co.ke"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
