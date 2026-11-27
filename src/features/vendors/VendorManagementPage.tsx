import { useSearchParams } from 'react-router-dom';
import { Vendor } from '../../api';

export function VendorManagementPage({ vendors }: { vendors: Vendor[] }) {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('search') ?? '').trim().toLocaleLowerCase();
  const visibleVendors = query ? vendors.filter((vendor) =>
    `${vendor.businessName} ${vendor.category ?? ''} ${vendor.user.fullName ?? ''} ${vendor.user.phone}`
      .toLocaleLowerCase().includes(query)) : vendors;
  return <section className="border border-[#E2E8F0] bg-white">
    <header className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3"><h2 className="text-sm font-extrabold">{query ? `Vendor search · ${searchParams.get('search')}` : 'Vendor accounts'}</h2><span className="text-xs text-[#788391]">{visibleVendors.length} records</span></header>
    <div className="divide-y divide-[#E2E8F0]">{visibleVendors.map((vendor) => <article key={vendor.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-bold">{vendor.businessName}</p><p className="mt-1 text-xs text-[#788391]">{vendor.category ?? 'Uncategorized'} · {vendor.user.fullName ?? vendor.user.phone} · {vendor.products.length} products</p><p className="mt-1 text-[11px] text-[#788391]">{vendor.businessAddress ?? 'No address on file'}</p></div><Status value={vendor.status} /></article>)}
      {!visibleVendors.length && <p className="px-4 py-8 text-center text-sm text-[#788391]">No vendors match this search.</p>}
    </div>
  </section>;
}

function Status({ value }: { value: string }) {
  const approved = value === 'APPROVED';
  const pending = value === 'PENDING';
  return <span className={`inline-flex rounded px-2 py-1 text-[9px] font-extrabold ${approved ? 'bg-[#e1f1df] text-[#287043]' : pending ? 'bg-[#fff1cf] text-[#8b6520]' : 'bg-[#fbe6e3] text-[#9b493e]'}`}>{value}</span>;
}
