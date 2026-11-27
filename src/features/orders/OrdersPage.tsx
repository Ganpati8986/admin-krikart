import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminOrder, AdminOrderStatus } from '../../api';
import { SectionHeader } from '../../components/SectionHeader';
import { OrdersTable } from '../dashboard/DashboardPage';
import { OrderDetailModal } from './OrderDetailModal';

export function OrdersPage({
  orders,
  canOverride,
  onOverride,
}: {
  orders: AdminOrder[];
  canOverride: boolean;
  onOverride: (orderId: string, status: AdminOrderStatus, reason: string, suborderId?: string) => Promise<void>;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const search = (searchParams.get('search') ?? '').trim().toLocaleLowerCase();
  const visibleOrders = search ? orders.filter((order) =>
    `${order.orderCode} ${order.id} ${order.status} ${order.paymentStatus} ${order.suborders.map((suborder) => suborder.vendor.businessName).join(' ')}`
      .toLocaleLowerCase().includes(search)) : orders;
  return <section className="border border-[#E2E8F0] bg-white">
    <SectionHeader title={search ? `Search results · ${searchParams.get('search')}` : 'All orders'} count={visibleOrders.length} />
    <OrdersTable orders={visibleOrders} canOverride={canOverride} showSuborderStatuses onOverride={onOverride} onViewDetails={setSelectedOrderId} />
    {selectedOrderId && <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
  </section>;
}
