import { DeliveryPartner } from '../../api';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusBadge } from '../../components/StatusBadge';

export function DeliveryPage({ partners }: { partners: DeliveryPartner[] }) {
  return <section className="border border-[#E2E8F0] bg-white"><SectionHeader title="Delivery partners" count={partners.length} /><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-[#F5F7FA] text-[10px] uppercase text-[#788391]"><tr><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Approval</th><th className="px-4 py-3">Availability</th><th className="px-4 py-3">Assignments</th></tr></thead><tbody className="divide-y divide-[#E2E8F0]">{partners.map((partner) => <tr key={partner.id}><td className="px-4 py-3 font-bold">{partner.fullName}</td><td className="px-4 py-3">{partner.user.phone}</td><td className="px-4 py-3"><StatusBadge value={partner.approvalStatus} /></td><td className="px-4 py-3">{partner.isOnline ? 'Online' : 'Offline'}</td><td className="px-4 py-3">{partner.assignments.length}</td></tr>)}</tbody></table></div></section>;
}
