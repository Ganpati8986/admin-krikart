import { AdminOrder, Vendor } from '../../api';
import { SectionHeader } from '../../components/SectionHeader';

export function AlertsPage({ orders, vendors }: { orders: AdminOrder[]; vendors: Vendor[] }) {
  const cancelled = orders.filter((order) => ['CANCELLED', 'REFUNDED'].includes(order.status));
  const pending = vendors.filter((vendor) => vendor.status === 'PENDING');
  return <div className="grid gap-4 lg:grid-cols-2"><AlertSection title="Orders requiring review" items={cancelled.map((order) => `${order.orderCode} · ${order.status}`)} /><AlertSection title="Vendor approvals" items={pending.map((vendor) => `${vendor.businessName} · waiting for approval`)} /></div>;
}

function AlertSection({ title, items }: { title: string; items: string[] }) {
  return <section className="border border-[#E2E8F0] bg-white"><SectionHeader title={title} count={items.length} />{items.length ? items.map((item) => <p key={item} className="border-b border-[#E2E8F0] px-4 py-3 text-sm">{item}</p>) : <p className="px-4 py-8 text-center text-sm text-[#788391]">No outstanding alerts.</p>}</section>;
}
