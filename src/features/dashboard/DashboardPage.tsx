import { Activity, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, MapPin, Package, ShieldCheck, Store, TicketCheck, Truck } from 'lucide-react';
import { AdminOrder, AdminOrderStatus, Customer, DeliveryPartner, FinancialOverview, Overview, ProductReviewItem, Vendor } from '../../api';
import { StatusBadge } from '../../components/StatusBadge';
import { FormEvent, ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { OrderDetailModal } from '../orders/OrderDetailModal';

type DashboardRange = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export function DashboardPage({
  overview,
  orders,
  financials,
  vendors,
  customers,
  deliveryPartners,
  products,
  onReviewVendor,
  onReviewProduct,
}: {
  overview: Overview | null;
  orders: AdminOrder[];
  financials: FinancialOverview | null;
  vendors: Vendor[];
  customers: Customer[];
  deliveryPartners: DeliveryPartner[];
  products: ProductReviewItem[];
  onReviewVendor: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => Promise<void>;
  onReviewProduct: (id: string, status: 'PUBLISHED' | 'REJECTED', reason?: string) => Promise<void>;
}) {
  const [range, setRange] = useState<DashboardRange>('last30');
  const [customStart, setCustomStart] = useState(toDateInputValue(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
  const [customEnd, setCustomEnd] = useState(toDateInputValue(new Date()));
  const [metric, setMetric] = useState<'revenue' | 'orders' | 'customers'>('revenue');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState('');
  const [busyApproval, setBusyApproval] = useState('');
  const recentOrders = [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const dateRange = getDateRange(range, customStart, customEnd);
  const filteredOrders = recentOrders.filter((order) => {
    const date = new Date(order.createdAt);
    return date >= dateRange.start && date < dateRange.end;
  });
  const pendingVendors = vendors.filter((vendor) => vendor.status === 'PENDING');
  const pendingDeliveryPartners = deliveryPartners.filter((partner) => partner.approvalStatus === 'PENDING');
  const pendingProducts = products.filter((product) => product.status === 'PENDING' || Boolean(product.pendingChanges));
  const totalPendingApprovals = pendingVendors.length + pendingDeliveryPartners.length + pendingProducts.length;
  const stats = [
    { label: 'Total orders', value: overview?.totalOrders ?? '—', icon: Package, accent: 'bg-[#08264A] text-white' },
    { label: "Today's revenue", value: overview ? `₹${overview.todayRevenue.toLocaleString('en-IN')}` : '—', icon: CircleDollarSign, accent: 'bg-[#FF9800] text-[#08264A]' },
    { label: 'Platform earnings', value: financials ? `₹${financials.summary.platformRevenue.toLocaleString('en-IN')}` : '—', icon: CircleDollarSign, accent: 'bg-[#08264A] text-white' },
    { label: 'Active vendors', value: overview?.activeVendors ?? '—', icon: Store, accent: 'bg-[#FF9800] text-[#08264A]' },
    { label: 'Active delivery partners', value: overview?.activeDeliveryPartners ?? '—', icon: Truck, accent: 'bg-[#08264A] text-white' },
    { label: 'Pending approvals', value: overview ? totalPendingApprovals : '—', icon: ShieldCheck, accent: 'bg-[#FF9800] text-[#08264A]' },
  ];
  const operationalStats = overview ? [
    { label: 'Order rejection rate', value: `${overview.orderRejectionRate.toFixed(1)}%`, detail: 'Vendor suborders', icon: TicketCheck },
    { label: 'Order cancellation rate', value: `${overview.orderCancellationRate.toFixed(1)}%`, detail: 'Vendor suborders', icon: TicketCheck },
    { label: 'Out-of-stock products', value: overview.outOfStockProducts.toLocaleString('en-IN'), detail: 'Published products', icon: Package },
    { label: 'Delivery cost per order', value: overview.deliveryCostPerOrder === null ? '—' : `₹${Math.round(overview.deliveryCostPerOrder).toLocaleString('en-IN')}`, detail: 'Delivered orders', icon: Truck },
    { label: 'Open customer complaints', value: overview.customerComplaints.toLocaleString('en-IN'), detail: 'Support tickets', icon: ShieldCheck },
    { label: 'Vendor response time', value: overview.averageVendorResponseMinutes === null ? '—' : formatDuration(overview.averageVendorResponseMinutes), detail: 'Average first response', icon: Clock3 },
    { label: 'New customer acquisition cost', value: overview.newCustomerAcquisitionCost === null ? 'Not tracked' : `₹${overview.newCustomerAcquisitionCost.toLocaleString('en-IN')}`, detail: overview.newCustomerAcquisitionCost === null ? 'Marketing spend data is not configured' : 'Last 30 days', icon: CircleDollarSign },
  ] : [];
  const vendorRankings = getVendorRankings(filteredOrders, vendors);
  const orderStatusSummary = getOrderStatusSummary(filteredOrders);
  async function approveVendor(vendor: Vendor) {
    if (!window.confirm(`Approve ${vendor.businessName}?`)) return;
    await runApproval(vendor.id, () => onReviewVendor(vendor.id, 'APPROVED'));
  }

  async function rejectVendor(vendor: Vendor) {
    const reason = window.prompt(`Enter a rejection reason for ${vendor.businessName}:`);
    if (!reason?.trim()) return;
    await runApproval(vendor.id, () => onReviewVendor(vendor.id, 'REJECTED', reason.trim()));
  }

  async function approveProduct(product: ProductReviewItem) {
    if (!window.confirm(`Approve and publish ${product.name}?`)) return;
    await runApproval(product.id, () => onReviewProduct(product.id, 'PUBLISHED'));
  }

  async function rejectProduct(product: ProductReviewItem) {
    const reason = window.prompt(`Enter a rejection reason for ${product.name}:`);
    if (!reason?.trim()) return;
    await runApproval(product.id, () => onReviewProduct(product.id, 'REJECTED', reason.trim()));
  }

  async function runApproval(id: string, action: () => Promise<void>) {
    setBusyApproval(id);
    setApprovalError('');
    try {
      await action();
    } catch (caught) {
      setApprovalError(caught instanceof Error ? caught.message : 'Could not update this approval.');
    } finally {
      setBusyApproval('');
    }
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#FF7900]">Kri Kart operations</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#08264A]">Dashboard</h2>
        <p className="mt-1 text-sm text-[#788391]">Welcome back! Here’s what’s happening with your store today.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-bold text-[#08264A]">
          <CalendarDays size={15} className="text-[#FF7900]" />
          <span className="sr-only">Date range</span>
          <select value={range} onChange={(event) => setRange(event.target.value as DashboardRange)} className="max-w-36 bg-transparent outline-none">
            <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="last7">Last 7 days</option><option value="last30">Last 30 days</option><option value="custom">Custom date</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-bold text-[#08264A]">
          <MapPin size={15} className="text-[#FF7900]" />
          <span className="sr-only">Service area</span>
          <select defaultValue="Simdega" aria-label="Service area" className="bg-transparent outline-none"><option>Simdega</option></select>
        </label>
      </div>
    </header>

    {range === 'custom' && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3 text-xs">
      <label className="font-semibold text-[#788391]">From <input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} className="ml-2 rounded-md border border-[#E2E8F0] px-2 py-1.5 text-[#08264A]" /></label>
      <label className="font-semibold text-[#788391]">To <input type="date" value={customEnd} min={customStart} max={toDateInputValue(new Date())} onChange={(event) => setCustomEnd(event.target.value)} className="ml-2 rounded-md border border-[#E2E8F0] px-2 py-1.5 text-[#08264A]" /></label>
    </div>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {stats.map(({ label, value, icon: Icon, accent }) => <section key={label} className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(8,38,74,0.04)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#788391]">{label}</span>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${accent}`}><Icon size={17} /></span>
        </div>
        <p className="mt-3 truncate text-2xl font-extrabold tracking-tight text-[#08264A]">{value}</p>
      </section>)}
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
      <OrderValueChart
        orders={filteredOrders}
        previousOrders={recentOrders.filter((order) => {
          const date = new Date(order.createdAt);
          const previousStart = new Date(dateRange.start.getTime() - (dateRange.end.getTime() - dateRange.start.getTime()));
          return date >= previousStart && date < dateRange.start;
        })}
        metric={metric}
        onMetricChange={setMetric}
        dateRange={dateRange}
      />
      <OrderStatistics summary={orderStatusSummary} />
    </div>
    <p className="-mt-3 text-[10px] text-[#788391]">Summary cards show live backend totals. Charts, order status and vendor rankings follow the selected date range.</p>

    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="text-sm font-extrabold text-[#08264A]">Pending approvals</h2><p className="mt-1 text-[11px] text-[#788391]">Review new applications and product submissions.</p></div>
        {approvalError && <p role="alert" className="text-xs font-semibold text-rose-700">{approvalError}</p>}
      </header>
      <div className="grid gap-3 lg:grid-cols-3">
        <ApprovalQueue title="Vendor applications" count={pendingVendors.length} href="/vendor-approvals" empty="No vendor applications waiting.">
          {pendingVendors.slice(0, 3).map((vendor) => <div key={vendor.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] py-3">
            <div className="min-w-0"><p className="truncate text-xs font-bold text-[#202A36]">{vendor.businessName}</p><p className="text-[10px] text-[#788391]">{vendor.category ?? 'Business type not set'} · {vendor.user.fullName ?? vendor.user.phone}</p></div>
            <div className="flex gap-1.5">
              <button type="button" disabled={busyApproval === vendor.id} onClick={() => void approveVendor(vendor)} className="rounded-md bg-[#FF9800] px-2.5 py-1.5 text-[10px] font-bold text-[#08264A] disabled:opacity-50">Approve</button>
              <button type="button" disabled={busyApproval === vendor.id} onClick={() => void rejectVendor(vendor)} className="rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[10px] font-bold text-[#788391] disabled:opacity-50">Reject</button>
            </div>
          </div>)}
        </ApprovalQueue>
        <ApprovalQueue title="Delivery partner applications" count={pendingDeliveryPartners.length} href="/delivery" empty="No delivery partner applications waiting.">
          {pendingDeliveryPartners.slice(0, 3).map((partner) => <div key={partner.id} className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] py-3">
            <div className="min-w-0"><p className="truncate text-xs font-bold text-[#202A36]">{partner.fullName}</p><p className="text-[10px] text-[#788391]">{partner.user.phone} · Pending review</p></div>
            <Link to="/delivery" className="shrink-0 rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[10px] font-bold text-[#08264A]">Review</Link>
          </div>)}
          <p className="mt-2 text-[10px] leading-4 text-[#788391]">Approval actions aren’t available in the current delivery-partner API.</p>
        </ApprovalQueue>
        <ApprovalQueue title="Product submissions" count={pendingProducts.length} href="/product-approvals" empty="No products waiting for review.">
          {pendingProducts.slice(0, 3).map((product) => <div key={product.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] py-3">
            <div className="min-w-0"><p className="truncate text-xs font-bold text-[#202A36]">{product.name}</p><p className="text-[10px] text-[#788391]">{product.vendor.businessName} · {product.type}</p></div>
            {product.status === 'PENDING' && !product.pendingChanges
              ? <div className="flex gap-1.5">
                <button type="button" disabled={busyApproval === product.id} onClick={() => void approveProduct(product)} className="rounded-md bg-[#FF9800] px-2.5 py-1.5 text-[10px] font-bold text-[#08264A] disabled:opacity-50">Approve</button>
                <button type="button" disabled={busyApproval === product.id} onClick={() => void rejectProduct(product)} className="rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[10px] font-bold text-[#788391] disabled:opacity-50">Reject</button>
              </div>
              : <Link to="/product-approvals" className="shrink-0 rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[10px] font-bold text-[#08264A]">Review changes</Link>}
          </div>)}
        </ApprovalQueue>
      </div>
    </section>

    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-extrabold text-[#08264A]">Operations health</h2>
        <p className="text-[11px] text-[#788391]">Rolling {overview?.reportingWindowDays ?? 30}-day performance, except current stock levels.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {operationalStats.map(({ label, value, detail, icon: Icon }) => <section key={label} className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(8,38,74,0.04)]">
          <div className="flex items-start justify-between gap-2 text-xs font-semibold text-[#788391]"><span>{label}</span><Icon size={16} className="shrink-0 text-[#FF9800]" /></div>
          <p className={`mt-4 break-words font-extrabold text-[#08264A] ${value === 'Not tracked' ? 'text-base' : 'text-2xl'}`}>{value}</p>
          <p className="mt-1 text-[10px] text-[#788391]">{detail}</p>
        </section>)}
      </div>
    </section>
    {financials && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['COD collection pending', financials.summary.collectionPending],
        ['Vendor settlement pending', financials.summary.vendorSettlementPending],
        ['Delivery partner payable', financials.summary.deliveryPartnerPayable],
        ['Platform-funded expenses', financials.summary.platformFundedExpenses],
      ].map(([label, amount]) => <section key={label} className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(8,38,74,0.04)]">
        <p className="text-xs font-semibold text-[#788391]">{label}</p>
        <p className="mt-3 text-xl font-extrabold text-[#08264A]">₹{Number(amount).toLocaleString('en-IN')}</p>
      </section>)}
    </section>}

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_2px_8px_rgba(8,38,74,0.04)]">
        <header className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
          <div><h2 className="text-sm font-extrabold text-[#08264A]">Recent orders</h2><p className="mt-0.5 text-[10px] text-[#788391]">Latest order activity</p></div>
          <Link to="/orders" className="flex items-center gap-1 text-xs font-bold text-[#FF7900] hover:text-[#08264A]">View all <ArrowUpRight size={14} /></Link>
        </header>
        <RecentOrdersTable
          orders={filteredOrders.slice(0, 6)}
          customers={customers}
          onViewDetails={setSelectedOrderId}
        />
      </section>

      <div className="space-y-4">
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(8,38,74,0.04)]">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#08264A]">Top vendors</h2>
            <Link to="/vendors" className="flex items-center gap-1 text-xs font-bold text-[#FF7900] hover:text-[#08264A]">View all <ArrowUpRight size={14} /></Link>
          </header>
          {vendorRankings.length > 0 ? <ol className="space-y-3">
            {vendorRankings.slice(0, 4).map((vendor, index) => <li key={vendor.name} className="flex items-center gap-3">
              <span className="w-4 text-xs font-bold text-[#788391]">{index + 1}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FFF1DE] text-[#08264A]"><Store size={15} /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#202A36]">{vendor.name}</p><p className="text-[10px] text-[#788391]">{vendor.type} · {vendor.orders} orders</p></div>
              <span className="text-xs font-extrabold text-[#08264A]">₹{Math.round(vendor.sales).toLocaleString('en-IN')}</span>
            </li>)}
          </ol> : <p className="py-4 text-center text-xs text-[#788391]">Vendor order data will appear here.</p>}
        </section>

        <section className="rounded-xl bg-[#08264A] p-4 text-white shadow-[0_4px_14px_rgba(6,27,53,0.14)]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-bold text-white/70">Pending approvals</p><p className="mt-1 text-3xl font-extrabold">{overview ? totalPendingApprovals : '—'}</p><p className="mt-1 text-[11px] text-white/70">Items awaiting admin review</p></div>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#FF9800] text-[#08264A]"><ShieldCheck size={19} /></span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/vendor-approvals" className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-[11px] font-bold hover:bg-white/15">Vendors <ChevronRight size={14} /></Link>
            <Link to="/product-approvals" className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-[11px] font-bold hover:bg-white/15">Products <ChevronRight size={14} /></Link>
          </div>
        </section>
      </div>
    </div>
    {selectedOrderId && <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
  </div>;
}

function RecentOrdersTable({ orders, customers, onViewDetails }: { orders: AdminOrder[]; customers: Customer[]; onViewDetails: (id: string) => void }) {
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.user.fullName || customer.user.phone || 'Customer']));
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[900px] text-left text-xs">
      <thead className="bg-[#F5F7FA] text-[10px] uppercase tracking-wide text-[#788391]">
        <tr><th className="px-4 py-3">Order ID</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Vendors</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Order time</th><th className="px-4 py-3">Details</th></tr>
      </thead>
      <tbody className="divide-y divide-[#E2E8F0]">
        {orders.map((order) => {
          const items = order.suborders.flatMap((suborder) => suborder.orderItems ?? []);
          const quantity = items.reduce((total, item) => total + item.quantity, 0);
          const itemSummary = items.slice(0, 2).map((item) => item.product.name).join(', ');
          return <tr key={order.id} className="hover:bg-[#F8FAF8]">
            <td className="whitespace-nowrap px-4 py-3 font-bold text-[#08264A]">{order.orderCode}</td>
            <td className="px-4 py-3">{customerNames.get(order.customerId ?? '') ?? 'Customer'}</td>
            <td className="max-w-40 px-4 py-3"><span className="font-semibold">{quantity || items.length} item{quantity === 1 ? '' : 's'}</span><p className="truncate text-[10px] text-[#788391]">{itemSummary || 'Item details unavailable'}</p></td>
            <td className="px-4 py-3">{order.suborders.length}</td>
            <td className="px-4 py-3">{order.paymentMethod ?? '—'}</td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-bold">₹{Number(order.total).toLocaleString('en-IN')}</td>
            <td className="px-4 py-3"><StatusBadge value={order.status} /></td>
            <td className="whitespace-nowrap px-4 py-3 text-[#788391]">{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            <td className="px-4 py-3"><button type="button" onClick={() => onViewDetails(order.id)} className="whitespace-nowrap font-bold text-[#FF7900] hover:underline">View details</button></td>
          </tr>;
        })}
      </tbody>
    </table>
    {orders.length === 0 && <p className="px-4 py-10 text-center text-sm text-[#788391]">No orders found for this date range.</p>}
  </div>;
}

function ApprovalQueue({ title, count, href, empty, children }: { title: string; count: number; href: string; empty: string; children: ReactNode }) {
  return <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(8,38,74,0.04)]">
    <header className="mb-1 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2"><h3 className="truncate text-xs font-extrabold text-[#08264A]">{title}</h3><span className="rounded-full bg-[#FFF1DE] px-2 py-0.5 text-[10px] font-extrabold text-[#08264A]">{count}</span></div>
      <Link to={href} className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#FF7900]">View all <ChevronRight size={13} /></Link>
    </header>
    {count === 0 ? <p className="py-5 text-center text-xs text-[#788391]">{empty}</p> : <div>{children}</div>}
  </section>;
}

function OrderValueChart({
  orders,
  previousOrders,
  metric,
  onMetricChange,
  dateRange,
}: {
  orders: AdminOrder[];
  previousOrders: AdminOrder[];
  metric: 'revenue' | 'orders' | 'customers';
  onMetricChange: (metric: 'revenue' | 'orders' | 'customers') => void;
  dateRange: { start: Date; end: Date };
}) {
  const days = Array.from({ length: Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000))) }, (_, index) => {
    const date = new Date(dateRange.start.getTime() + index * 24 * 60 * 60 * 1000);
    const dailyOrders = orders.filter((order) => isSameDay(new Date(order.createdAt), date));
    const value = metric === 'revenue'
      ? dailyOrders.filter(isRevenueEligible).reduce((total, order) => total + Number(order.total), 0)
      : metric === 'orders' ? dailyOrders.length : new Set(dailyOrders.map((order) => order.customerId).filter(Boolean)).size;
    return { key: toDateInputValue(date), date, value };
  });
  const values = days.map(({ value }) => value);
  const maxValue = Math.max(...values, 1);
  const chartWidth = Math.max(560, days.length * 38);
  const chartHeight = 150;
  const xFor = (index: number) => 24 + (days.length < 2 ? 0 : index * (chartWidth - 48) / (days.length - 1));
  const yFor = (value: number) => 112 - value / maxValue * 88;
  const points = days.map(({ value }, index) => ({ x: xFor(index), y: yFor(value) }));
  const line = points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${line} L ${points[points.length - 1].x} 122 L ${points[0].x} 122 Z`;
  const periodValue = metric === 'revenue'
    ? orders.filter(isRevenueEligible).reduce((total, order) => total + Number(order.total), 0)
    : metric === 'orders' ? orders.length : new Set(orders.map((order) => order.customerId).filter(Boolean)).size;
  const previousValue = metric === 'revenue'
    ? previousOrders.filter(isRevenueEligible).reduce((total, order) => total + Number(order.total), 0)
    : metric === 'orders' ? previousOrders.length : new Set(previousOrders.map((order) => order.customerId).filter(Boolean)).size;
  const difference = previousValue ? (periodValue - previousValue) / previousValue * 100 : null;
  const label = metric === 'revenue' ? `₹${Math.round(periodValue).toLocaleString('en-IN')}` : periodValue.toLocaleString('en-IN');

  return <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(8,38,74,0.04)] sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Activity size={17} className="text-[#FF7900]" /><h2 className="text-sm font-extrabold text-[#08264A]">Revenue overview</h2></div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#08264A]">{label}</p>
        <p className="text-[10px] text-[#788391]">{difference === null ? 'No previous-period data to compare' : `${difference >= 0 ? '+' : ''}${difference.toFixed(1)}% vs previous period`} · order value, excluding cancelled/failed orders</p>
      </div>
      <div className="flex rounded-lg bg-[#F5F7FA] p-1" role="group" aria-label="Revenue chart metric">
        {(['revenue', 'orders', 'customers'] as const).map((item) => <button key={item} type="button" onClick={() => onMetricChange(item)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold capitalize ${metric === item ? 'bg-[#FF9800] text-[#08264A]' : 'text-[#788391]'}`}>{item}</button>)}
      </div>
    </header>
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${metric} trend for selected date range`} className="h-36 min-w-full sm:h-40" style={{ width: `${chartWidth}px` }}>
        {[24, 68, 112].map((y) => <line key={y} x1="20" x2={chartWidth - 8} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 5" />)}
        {days.length > 1 && <path d={area} fill="#FF9800" fillOpacity="0.14" />}
        {line && <path d={line} fill="none" stroke="#FF9800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map(({ x, y }, index) => <g key={days[index].key}>
          <circle cx={x} cy={y} r="3.5" fill="white" stroke="#FF9800" strokeWidth="2" />
          {days.length <= 8 || index % Math.ceil(days.length / 8) === 0 || index === days.length - 1
            ? <text x={x} y="143" textAnchor="middle" fill="#788391" fontSize="9">{days[index].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</text>
            : null}
        </g>)}
      </svg>
    </div>
    {!orders.length && <p className="py-2 text-center text-xs text-[#788391]">No orders found for this date range.</p>}
  </section>;
}

function OrderStatistics({ summary }: { summary: ReturnType<typeof getOrderStatusSummary> }) {
  const deliveredPercent = summary.total ? summary.delivered / summary.total * 100 : 0;
  const chartStyle = {
    background: `conic-gradient(#FF9800 0% ${deliveredPercent}%, #E2E8F0 ${deliveredPercent}% 100%)`,
  };
  const statusItems = [
    ['Grocery orders', summary.grocery],
    ['Food orders', summary.food],
    ['Pending', summary.pending],
    ['Accepted', summary.accepted],
    ['Preparing', summary.preparing],
    ['Ready for pickup', summary.ready],
    ['Out for delivery', summary.outForDelivery],
    ['Delivered', summary.delivered],
    ['Cancelled', summary.cancelled],
  ] as const;
  return <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(8,38,74,0.04)] sm:p-5">
    <header className="flex items-center gap-2"><Activity size={17} className="text-[#FF7900]" /><h2 className="text-sm font-extrabold text-[#08264A]">Order statistics</h2></header>
    <div className="mt-4 flex items-center justify-center gap-5">
      <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full p-2.5" style={chartStyle}>
        <div className="grid h-full w-full place-content-center rounded-full bg-white text-center">
          <span className="text-xl font-extrabold text-[#08264A]">{summary.total.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-[#788391]">Total orders</span>
        </div>
      </div>
      <p className="max-w-32 text-xs leading-5 text-[#788391]"><span className="font-extrabold text-[#FF7900]">{summary.delivered}</span> orders delivered in the selected period.</p>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#E2E8F0] pt-3">
      {statusItems.map(([label, count]) => <div key={label} className="flex items-center justify-between gap-2 text-[10px]"><span className="text-[#788391]">{label}</span><strong className="text-[#08264A]">{count}</strong></div>)}
    </div>
    <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-[10px] text-[#788391]"><span>Based on loaded order records</span><CheckCircle2 size={14} className="text-[#FF7900]" /></div>
  </section>;
}

function getOrderStatusSummary(orders: AdminOrder[]) {
  const delivered = orders.filter(({ status }) => status === 'DELIVERED').length;
  const hasProductType = (type: string) => orders.filter((order) => order.suborders.some((suborder) => suborder.orderItems?.some((item) => item.product.type === type))).length;
  return {
    delivered,
    grocery: hasProductType('GROCERY'),
    food: hasProductType('FOOD'),
    pending: orders.filter(({ status }) => ['PLACED', 'PENDING'].includes(status)).length,
    accepted: orders.filter(({ status }) => ['CONFIRMED', 'ACCEPTED'].includes(status)).length,
    preparing: orders.filter(({ status }) => ['PROCESSING', 'PREPARING'].includes(status)).length,
    ready: orders.filter(({ status }) => ['READY_FOR_PICKUP', 'READY'].includes(status)).length,
    outForDelivery: orders.filter(({ status }) => ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(status)).length,
    cancelled: orders.filter(({ status }) => ['CANCELLED', 'REJECTED', 'REFUNDED'].includes(status)).length,
    total: orders.length,
  };
}

function getVendorRankings(orders: AdminOrder[], vendors: Vendor[]) {
  const vendorTypes = new Map(vendors.map((vendor) => [vendor.id, vendor.category ?? 'Vendor']));
  const totals = new Map<string, { orders: number; sales: number; type: string }>();
  orders.forEach((order) => order.suborders.forEach((suborder) => {
    const current = totals.get(suborder.vendor.businessName) ?? { orders: 0, sales: 0, type: vendorTypes.get(suborder.vendorId) ?? 'Vendor' };
    current.orders += 1;
    current.sales += suborder.orderItems?.length
      ? suborder.orderItems.reduce((sum, item) => sum + Number(item.total), 0)
      : Number(suborder.total);
    totals.set(suborder.vendor.businessName, current);
  }));
  return Array.from(totals, ([name, values]) => ({ name, ...values })).sort((a, b) => b.sales - a.sales);
}

function getDateRange(range: DashboardRange, customStart: string, customEnd: string) {
  const today = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const todayStart = startOfDay(today);
  if (range === 'today') return { start: todayStart, end: endOfDay(today) };
  if (range === 'yesterday') {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: yesterday, end: todayStart };
  }
  if (range === 'last7' || range === 'last30') {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - (range === 'last7' ? 6 : 29));
    return { start, end: endOfDay(today) };
  }
  const startDate = new Date(`${customStart}T00:00:00`);
  const endDate = new Date(`${customEnd}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return { start: todayStart, end: endOfDay(today) };
  }
  return { start: startOfDay(startDate), end: endOfDay(endDate) };
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isRevenueEligible(order: AdminOrder) {
  return !['CANCELLED', 'REJECTED', 'PAYMENT_FAILED', 'REFUNDED'].includes(order.status);
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function OrdersTable({
  orders,
  canOverride = false,
  showSuborderStatuses = false,
  onOverride,
  onViewDetails,
}: {
  orders: AdminOrder[];
  canOverride?: boolean;
  showSuborderStatuses?: boolean;
  onOverride?: (orderId: string, status: AdminOrderStatus, reason: string, suborderId?: string) => Promise<void>;
  onViewDetails?: (orderId: string) => void;
}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs">
    <thead className="bg-[#F5F7FA] text-[10px] uppercase tracking-wide text-[#788391]"><tr>
      <th className="px-4 py-3">Order</th><th className="px-4 py-3">Vendors</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th>
      {canOverride && <th className="px-4 py-3">Admin override</th>}
    </tr></thead>
    <tbody className="divide-y divide-[#E2E8F0]">{orders.map((order) => <tr key={order.id}>
      <td className="px-4 py-3 font-bold">{onViewDetails ? <button type="button" onClick={() => onViewDetails(order.id)} className="text-left text-[#FF7900] underline decoration-[#E2E8F0] underline-offset-2">{order.orderCode}</button> : order.orderCode}<div className="mt-1 text-[10px] font-normal text-[#788391]">{new Date(order.createdAt).toLocaleString()}</div>{onViewDetails && <button type="button" onClick={() => onViewDetails(order.id)} className="mt-1 block text-[10px] font-bold text-[#FF7900]">View complete details →</button>}</td>
      <td className="px-4 py-3 text-[#788391]">{showSuborderStatuses
        ? <div className="space-y-1">{order.suborders.map((suborder) => <div key={suborder.id} className="flex flex-wrap items-center gap-2">
          <span>{suborder.vendor?.businessName ?? 'Vendor'} · ₹{suborder.total}</span><StatusBadge value={suborder.status} />
        </div>)}</div>
        : order.suborders.map((suborder) => suborder.vendor?.businessName ?? 'Vendor').join(', ')}</td>
      <td className="px-4 py-3"><StatusBadge value={order.status} /></td><td className="px-4 py-3 text-[#788391]">{order.paymentStatus}</td><td className="px-4 py-3 text-right font-bold">₹{order.total}</td>
      {canOverride && onOverride && <td className="min-w-64 px-4 py-3"><OrderOverrideForm order={order} onOverride={onOverride} /></td>}
    </tr>)}</tbody>
  </table>{orders.length === 0 && <p className="px-4 py-8 text-center text-sm text-[#788391]">No orders found.</p>}</div>;
}

const overrideStatuses: AdminOrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'PAYMENT_FAILED',
  'REFUND_PENDING',
  'REJECTED',
  'CANCELLED',
  'REFUNDED',
];

function OrderOverrideForm({
  order,
  onOverride,
}: {
  order: AdminOrder;
  onOverride: (orderId: string, status: AdminOrderStatus, reason: string, suborderId?: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<AdminOrderStatus>('CONFIRMED');
  const [reason, setReason] = useState('');
  const [suborderId, setSuborderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setMessage('Enter a reason with at least 3 characters.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await onOverride(order.id, status, reason.trim(), suborderId || undefined);
      setReason('');
      setMessage('Override saved and audit-logged.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not override order status.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="space-y-2" onSubmit={(event) => void submit(event)}>
    <select aria-label={`Override target for ${order.orderCode}`} className="w-full rounded border border-[#CBD5E1] bg-white px-2 py-1.5" value={suborderId} onChange={(event) => setSuborderId(event.target.value)}>
      <option value="">Entire parent order</option>
      {order.suborders.map((suborder) => <option key={suborder.id} value={suborder.id}>{suborder.vendor.businessName} suborder</option>)}
    </select>
    <select aria-label={`Override status for ${order.orderCode}`} className="w-full rounded border border-[#CBD5E1] bg-white px-2 py-1.5" value={status} onChange={(event) => setStatus(event.target.value as AdminOrderStatus)}>
      {overrideStatuses.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
    </select>
    <input aria-label={`Override reason for ${order.orderCode}`} className="w-full rounded border border-[#CBD5E1] px-2 py-1.5" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} placeholder="Required audit reason" />
    <button disabled={busy} className="rounded bg-[#FF9800] px-3 py-1.5 font-bold text-[#08264A] disabled:opacity-50">{busy ? 'Saving…' : 'Apply override'}</button>
    <p className="text-[10px] text-[#788391]">Delivery completion is OTP-gated and cannot be manually overridden.</p>
    {message && <p role="status" className="text-[10px] text-[#FF7900]">{message}</p>}
  </form>;
}
