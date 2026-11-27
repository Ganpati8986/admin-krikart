import { useSearchParams } from 'react-router-dom';
import { Customer } from '../../api';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusBadge } from '../../components/StatusBadge';

export function CustomersPage({ customers }: { customers: Customer[] }) {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('search') ?? '').trim().toLocaleLowerCase();
  const visibleCustomers = query ? customers.filter((customer) =>
    `${customer.user.fullName ?? ''} ${customer.user.phone ?? ''} ${customer.user.email ?? ''} ${customer.id}`
      .toLocaleLowerCase().includes(query)) : customers;
  return <section className="border border-[#E2E8F0] bg-white">
    <SectionHeader title={query ? `Customer search · ${searchParams.get('search')}` : 'Customers'} count={visibleCustomers.length} />
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead className="bg-[#F5F7FA] text-[10px] uppercase text-[#788391]"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Loyalty</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-[#E2E8F0]">{visibleCustomers.map((customer) => <tr key={customer.id}>
          <td className="px-4 py-3 font-bold">{customer.user.fullName?.trim() || customer.user.email?.split('@')[0] || 'Customer'}</td>
          <td className="px-4 py-3"><div className="space-y-1">{customer.user.phone && <div>{customer.user.phone}</div>}{customer.user.email && <div className="text-[#788391]">{customer.user.email}</div>}{!customer.user.phone && !customer.user.email && <span className="text-[#788391]">Contact not provided</span>}</div></td>
          <td className="px-4 py-3">{customer._count.orders}</td><td className="px-4 py-3">{customer.loyaltyPoints} pts</td><td className="px-4 py-3"><StatusBadge value={customer.isBlocked ? 'BLOCKED' : customer.user.status} /></td>
        </tr>)}</tbody>
      </table>
      {!visibleCustomers.length && <p className="px-4 py-8 text-center text-sm text-[#788391]">No customers match this search.</p>}
    </div>
  </section>;
}
