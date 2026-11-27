import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { User } from '../../api';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusBadge } from '../../components/StatusBadge';

function formatRole(role: string) {
  return role.replace(/_/g, ' ').toLocaleLowerCase().replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

export function AccountsPage({ users }: { users: User[] }) {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const roles = useMemo(() => [...new Set(users.map((user) => user.role))].sort(), [users]);
  const visibleUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const matchesSearch = !query || `${user.name} ${user.phone ?? ''} ${user.role} ${user.status}`
        .toLocaleLowerCase().includes(query);
      return matchesSearch && (selectedRole === 'all' || user.role === selectedRole);
    });
  }, [users, search, selectedRole]);

  return <section className="border border-[#E2E8F0] bg-white">
    <SectionHeader title="Application accounts" count={visibleUsers.length} />
    <div className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4 sm:flex-row">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm focus-within:border-[#08264A]">
        <Search size={16} className="shrink-0 text-[#788391]" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, phone, or role..."
          aria-label="Search accounts by name, phone, or role"
          className="min-w-0 flex-1 outline-none"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-bold text-[#788391]">
        <span>Role</span>
        <select
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value)}
          aria-label="Filter accounts by role"
          className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-medium text-[#202A36]"
        >
          <option value="all">All roles</option>
          {roles.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}
        </select>
      </label>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead className="bg-[#F5F7FA] text-[10px] uppercase text-[#788391]"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-[#E2E8F0]">{visibleUsers.map((user) => <tr key={user.id}>
          <td className="px-4 py-3 font-bold">{user.name || 'Unnamed account'}</td>
          <td className="px-4 py-3">{user.phone || '—'}</td>
          <td className="px-4 py-3">{formatRole(user.role)}</td>
          <td className="px-4 py-3"><StatusBadge value={user.status} /></td>
        </tr>)}</tbody>
      </table>
      {!visibleUsers.length && <p className="px-4 py-8 text-center text-sm text-[#788391]">No accounts match your search and role filter.</p>}
    </div>
  </section>;
}
