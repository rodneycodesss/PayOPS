import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, UserPlus, Key } from 'lucide-react';
import { apiRequest } from '../services/api';

export const TeamPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleName, setRoleName] = useState('finance_admin');
  const [tempPassword, setTempPassword] = useState('StaffPass2026!');
  const [message, setMessage] = useState<string | null>(null);

  const fetchUsers = () => {
    apiRequest<any[]>('/tenants/users')
      .then((data) => setUsers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/tenants/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          email,
          full_name: fullName,
          role_name: roleName,
          temp_password: tempPassword,
        }),
      });
      setMessage(`Invited ${fullName} (${email}) as ${roleName}`);
      setShowInviteModal(false);
      setEmail('');
      setFullName('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to invite user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Team & Access Control</h1>
          <p className="text-sm text-slate-400 mt-1">
            Role-Based Access Control (RBAC) with granular permissions across financial modules.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          <span>Invite Staff User</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
          {message}
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E2E48] rounded-xl p-6 text-xs">
            <h2 className="text-base font-bold text-white mb-4">Invite Organization Member</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Assign Role</label>
                <select
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
                >
                  <option value="finance_admin">Finance Administrator</option>
                  <option value="accountant">Accountant</option>
                  <option value="cashier">Cashier</option>
                  <option value="auditor">Auditor (Read-Only)</option>
                  <option value="viewer">Viewer (Dashboard Only)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Temporary Initial Password</label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#11223A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-mono">
            <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Assigned Roles</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">MFA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                    {loading ? 'Querying team members...' : 'Zero team users found.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#11223A]/30 transition">
                    <td className="py-2.5 px-3 font-sans font-semibold text-white">{u.full_name}</td>
                    <td className="py-2.5 px-3 text-slate-300">{u.email}</td>
                    <td className="py-2.5 px-3">
                      {u.roles.map((r: string) => (
                        <span key={r} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] mr-1.5 uppercase">
                          {r}
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${u.mfa_enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {u.mfa_enabled ? 'Enforced' : 'Optional'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
