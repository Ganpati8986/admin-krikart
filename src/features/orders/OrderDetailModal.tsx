import { X, Printer, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adminApi, OrderAuditRecord, OrderDetail } from '../../api';
import { StatusBadge } from '../../components/StatusBadge';

const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('en-IN') : '—';
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const jsonNumber = (value: unknown, key: string) => {
  const amount = record(value)[key];
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
};
const auditReason = (event: OrderAuditRecord) => {
  const value = record(event.newValue);
  return typeof value.reason === 'string' ? value.reason : event.action.replace(/_/g, ' ');
};

export function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminApi.orderDetails(orderId).then((details) => {
      if (active) setOrder(details);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Could not load order details.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderId]);

  const totals = useMemo(() => {
    if (!order) return null;
    const ledgerAmount = (type: string) => order.financialLedger
      .filter((entry) => entry.type === type)
      .reduce((sum, entry) => sum + (entry.direction === 'DEBIT' ? -entry.amount : entry.amount), 0);
    const platformRevenue = ledgerAmount('PLATFORM_REVENUE') + ledgerAmount('PLATFORM_COMMISSION');
    const promotionExpenses = ['PLATFORM_FUNDED_DISCOUNT', 'FREE_DELIVERY_EXPENSE', 'REWARD_REDEMPTION']
      .reduce((sum, type) => sum + Math.max(-ledgerAmount(type), 0), 0);
    const platformExpenses = ['PLATFORM_FUNDED_EXPENSE', 'PLATFORM_FUNDED_DISCOUNT', 'FREE_DELIVERY_EXPENSE', 'REWARD_REDEMPTION']
      .reduce((sum, type) => sum + Math.max(-ledgerAmount(type), 0), 0);
    const otherAdjustments = ledgerAmount('OTHER_ADJUSTMENT');
    return {
      vendorPayable: order.suborders.reduce((sum, item) => sum + (item.settlement?.amount ?? 0), 0),
      deliveryEarnings: order.deliveryLedger
        .filter((entry) => ['PARTNER_EARNING', 'PARTNER_EARNING_ADJUSTMENT'].includes(entry.type))
        .reduce((sum, entry) => sum + entry.amount, 0),
      platformCommission: ledgerAmount('PLATFORM_COMMISSION'),
      platformRevenue,
      promotionExpenses,
      refunds: order.suborders.reduce((sum, item) => sum + item.refunds.reduce((value, refund) => value + refund.amount, 0), 0),
      otherAdjustments,
      platformProfitLoss: platformRevenue - platformExpenses + otherAdjustments,
    };
  }, [order]);

  function printInvoice() {
    if (!order) return;
    const previousTitle = document.title;
    document.title = `Invoice-${order.orderCode}`;
    window.addEventListener('afterprint', () => { document.title = previousTitle; }, { once: true });
    window.print();
  }

  return <div className="fixed inset-0 z-30 bg-[#202A36]/55 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label="Order details">
    <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden border border-[#E2E8F0] bg-[#F5F7FA] shadow-2xl">
      <header className="no-print flex shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3 sm:px-6">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#788391]">Order file</p><h2 className="text-lg font-extrabold text-[#08264A]">{order?.orderCode ?? 'Order details'}</h2></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={printInvoice} disabled={!order} className="flex items-center gap-2 rounded border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#08264A] disabled:opacity-50"><Printer size={15} /> Print</button>
          <button type="button" onClick={printInvoice} disabled={!order} title="Choose Save as PDF in the print dialog" className="flex items-center gap-2 rounded bg-[#FF9800] px-3 py-2 text-xs font-bold text-[#08264A] disabled:opacity-50"><Download size={15} /> Download PDF</button>
          <button type="button" onClick={onClose} aria-label="Close order details" className="rounded p-2 text-[#788391] hover:bg-[#F5F7FA]"><X size={18} /></button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
        {loading && <p className="rounded border border-[#E2E8F0] bg-white p-6 text-sm text-[#788391]">Loading order snapshots and financial history…</p>}
        {error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        {order && totals && <>
          <article id="order-invoice" className="space-y-5">
            <section className="rounded border border-[#E2E8F0] bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#788391]">Kri Kart · Order invoice</p><h1 className="mt-2 text-2xl font-black text-[#08264A]">{order.orderCode}</h1><p className="mt-1 text-xs text-[#788391]">Parent Order ID · {order.id}</p></div>
                <div className="text-right text-xs text-[#788391]"><p>Order date · {dateTime(order.createdAt)}</p><p className="mt-1">Completion · {dateTime(latestDeliveryTime(order))}</p><div className="mt-2 flex justify-end gap-2"><StatusBadge value={order.status} /><StatusBadge value={order.collectionStatus} /></div></div>
              </div>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <InfoBlock title="Customer" lines={[
                  stringValue(order.deliveryAddressSnapshot, 'fullName') ?? order.customer.user.fullName ?? 'Customer name unavailable',
                  stringValue(order.deliveryAddressSnapshot, 'phone') ?? order.customer.user.phone,
                  snapshotAddress(order.deliveryAddressSnapshot),
                ]} />
                <InfoBlock title="Payment & collection" lines={[
                  `Method · ${order.paymentMethod}`,
                  `Payment · ${order.paymentStatus}`,
                  `Collection · ${order.collectionStatus}`,
                  order.collectionReason || 'No collection note recorded',
                ]} />
                <InfoBlock title="Customer payable" lines={[
                  `Final payable · ${money(order.total)}`,
                  `Paid online · ${money(order.customerAmountPaid)}`,
                  `Collected · ${money(order.customerAmountCollected)}`,
                  `Pending · ${money(order.customerAmountPending)}`,
                ]} />
              </div>
            </section>

            <section className="rounded border border-[#E2E8F0] bg-white p-5 sm:p-7">
              <SectionTitle title="Vendor suborders & delivery" />
              <div className="mt-4 space-y-4">
                {order.suborders.map((suborder) => {
                  const vendorSnapshot = suborder.vendorSnapshot;
                  return <div key={suborder.id} className="rounded border border-[#E2E8F0] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h3 className="font-extrabold">{stringValue(vendorSnapshot, 'businessName') ?? suborder.vendor.businessName}</h3>
                        <p className="text-xs text-[#788391]">Vendor Suborder ID · {suborder.id}</p>
                        <p className="mt-1 text-xs text-[#788391]">{stringValue(vendorSnapshot, 'phone') ?? suborder.vendor.user.phone} · Pickup · {stringValue(vendorSnapshot, 'pickupAddress') ?? suborder.vendor.businessAddress ?? 'Address not captured'}</p></div>
                      <StatusBadge value={suborder.status} />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {suborder.assignments.map((assignment) => <div key={assignment.id} className="rounded bg-[#F5F7FA] p-3 text-xs">
                        <p className="font-bold">{assignment.partner.user.fullName || 'Delivery partner'} · {assignment.partner.user.phone}</p>
                        <p className="mt-1 text-[#788391]">Assigned {dateTime(assignment.createdAt)}</p>
                        <p className="text-[#788391]">Picked up {dateTime(assignment.pickedUpAt)} · Delivered {dateTime(assignment.deliveredAt)}</p>
                      </div>)}
                      {!suborder.assignments.length && <p className="text-xs text-[#788391]">No delivery assignment recorded.</p>}
                    </div>
                  </div>;
                })}
              </div>
            </section>

            <section className="rounded border border-[#E2E8F0] bg-white p-5 sm:p-7">
              <SectionTitle title="Products" />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-[#F5F7FA] text-[10px] uppercase tracking-wide text-[#788391]"><tr>
                    <th className="px-3 py-2">Product</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Vendor agreed</th><th className="px-3 py-2 text-right">Customer price</th><th className="px-3 py-2 text-right">Original</th><th className="px-3 py-2 text-right">Discount</th><th className="px-3 py-2 text-right">Final</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#E2E8F0]">{order.suborders.flatMap((suborder) => suborder.orderItems.map((item) => {
                    const snapshot = item.productSnapshot;
                    const snapshotMissing = !snapshot;
                    const title = stringValue(snapshot, 'name') ?? item.product.name;
                    const image = stringValue(snapshot, 'imageUrl') ?? item.product.imageUrl;
                    const original = jsonNumber(snapshot, 'originalAmount') || item.unitPrice * item.quantity;
                    const vendorAgreed = jsonNumber(snapshot, 'vendorAgreedUnitPrice') || item.vendorEligibleAmount / Math.max(item.quantity, 1);
                    const customerPrice = jsonNumber(snapshot, 'customerSellingUnitPrice') || item.unitPrice;
                    const discount = jsonNumber(snapshot, 'productDiscount') || Math.max(original - item.total, 0);
                    return <tr key={item.id}>
                      <td className="px-3 py-3"><div className="flex items-center gap-3">{image ? <img src={image} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-[#F5F7FA]" />}<div className="font-bold">{title}{snapshotMissing && <span className="ml-1 text-[9px] font-normal text-[#9a6a22]">legacy product details</span>}<p className="font-normal text-[#788391]">{suborder.vendorSnapshot ? stringValue(suborder.vendorSnapshot, 'businessName') : suborder.vendor.businessName}</p></div></div></td>
                      <td className="px-3 py-3 text-right">{item.quantity}</td><td className="px-3 py-3 text-right">{money(vendorAgreed)}</td><td className="px-3 py-3 text-right">{money(customerPrice)}</td><td className="px-3 py-3 text-right">{money(original)}</td><td className="px-3 py-3 text-right">{money(discount)}</td><td className="px-3 py-3 text-right font-bold">{money(item.total)}</td>
                    </tr>;
                  }))}</tbody>
                </table>
              </div>
            </section>

            <section className="rounded border border-[#E2E8F0] bg-white p-5 sm:p-7">
              <SectionTitle title="Financial breakdown" />
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div className="divide-y divide-[#E2E8F0]">
                  <FinancialRow label="Product subtotal" amount={order.listedProductSubtotal || order.subtotal} />
                  <FinancialRow label="Product discount" amount={-order.productDiscount} />
                  <FinancialRow label="Coupon discount" amount={-order.couponDiscount} />
                  <FinancialRow label="Promotion discount" amount={-order.promotionDiscount} />
                  <FinancialRow label="Reward coin discount" amount={-order.rewardDiscount} />
                  <FinancialRow label="Delivery charge" amount={order.customerDeliveryCharge} />
                  <FinancialRow label="Free delivery discount" amount={-order.freeDeliveryDiscount} />
                  <FinancialRow label="Packaging charge" amount={order.packagingFee} />
                  <FinancialRow label="Handling charge" amount={order.handlingFee} />
                  <FinancialRow label="Customer final payable" amount={order.total} strong />
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  <FinancialRow label="Customer amount collected" amount={order.customerAmountPaid + order.customerAmountCollected} />
                  <FinancialRow label="Vendor payable" amount={totals.vendorPayable} />
                  <FinancialRow label="Delivery partner earnings" amount={totals.deliveryEarnings} />
                  <FinancialRow label="Platform commission" amount={totals.platformCommission} />
                  <FinancialRow label="Platform-funded promotion expenses" amount={totals.promotionExpenses} />
                  <FinancialRow label="Platform gross revenue" amount={totals.platformRevenue} />
                  <FinancialRow label="Platform profit / loss" amount={totals.platformProfitLoss} strong />
                  <FinancialRow label="Refunds" amount={totals.refunds} />
                  <FinancialRow label="Other ledger adjustments" amount={totals.otherAdjustments} />
                  <FinancialRow label="Settlement status" text={order.suborders.map((item) => item.settlement?.financialStatus ?? 'NOT_CREATED').join(' · ') || 'No vendor settlement'} />
                  <FinancialRow label="Partner payout status" text={order.payouts.map((item) => `${item.financialStatus} · ${money(item.amount)}`).join(' · ') || 'No payout recorded'} />
                </div>
              </div>
            </section>
          </article>

          <section className="no-print mt-5 grid gap-4 xl:grid-cols-2">
            <HistoryCard title="Payment history" rows={[
              ...order.payments.map((payment) => ({
              id: payment.id,
              title: `${payment.method} · ${payment.status} · ${money(payment.amount)}`,
              detail: [payment.gatewayRef && `Gateway ${payment.gatewayRef}`, payment.settlementReference && `Settlement ${payment.settlementReference}`, payment.gatewaySettlementStatus, payment.gatewaySettlementReason].filter(Boolean).join(' · '),
              createdAt: payment.paidAt ?? payment.createdAt,
              })),
              ...order.history.orderAudit.filter((event) => event.module === 'ORDER_FINANCIALS' && event.action.includes('PAYMENT_SETTLEMENT')).map((event) => ({
                id: event.id,
                title: event.action.replace(/_/g, ' '),
                detail: auditReason(event),
                createdAt: event.createdAt,
              })),
            ]} />
            <HistoryCard title="Collection history" rows={[
              ...order.financialLedger.filter((entry) => ['CUSTOMER_COLLECTION', 'COD_COLLECTION', 'ONLINE_PAYMENT_RECEIVED', 'DELIVERY_CHARGE_COLLECTED'].includes(entry.type)).map((entry) => ({
              id: entry.id,
              title: `${entry.type.replace(/_/g, ' ')} · ${entry.financialStatus ?? entry.direction} · ${money(entry.amount)}`,
              detail: `${entry.paymentMethod ?? '—'}${entry.referenceId ? ` · Ref ${entry.referenceId}` : ''} · ${describeDetails(entry.details)}`,
              createdAt: entry.createdAt,
              })),
              ...order.history.orderAudit.filter((event) => event.module === 'ORDER_FINANCIALS' && event.action.includes('COLLECTION')).map((event) => ({
                id: event.id,
                title: event.action.replace(/_/g, ' '),
                detail: auditReason(event),
                createdAt: event.createdAt,
              })),
            ]} />
            <HistoryCard title="Settlement history" rows={[
              ...order.financialLedger.filter((entry) => ['VENDOR_PAYABLE', 'VENDOR_SETTLEMENT', 'DELIVERY_PARTNER_PAYABLE', 'PARTNER_PAYOUT'].includes(entry.type)).map((entry) => ({
                id: entry.id,
                title: `${entry.type.replace(/_/g, ' ')} · ${entry.financialStatus ?? entry.direction} · ${money(entry.amount)}`,
                detail: `${entry.vendorId ? `Vendor ${entry.vendorId}` : ''}${entry.partnerId ? `Partner ${entry.partnerId}` : ''}${entry.referenceId ? ` · Ref ${entry.referenceId}` : ''}`,
                createdAt: entry.createdAt,
              })),
              ...order.history.settlementAudit.map((event) => ({ id: event.id, title: event.action.replace(/_/g, ' '), detail: auditReason(event), createdAt: event.createdAt })),
              ...order.history.payoutAudit.map((event) => ({ id: event.id, title: event.action.replace(/_/g, ' '), detail: auditReason(event), createdAt: event.createdAt })),
              ...order.history.orderAudit.filter((event) => event.module === 'ORDER_FINANCIALS' && event.action.includes('PAYMENT_SETTLEMENT')).map((event) => ({
                id: event.id,
                title: event.action.replace(/_/g, ' '),
                detail: auditReason(event),
                createdAt: event.createdAt,
              })),
            ]} />
            <HistoryCard title="Order status history" rows={[
              ...order.statusHistory.map((event) => ({
                id: event.id,
                title: `${event.status.replace(/_/g, ' ')} · ${event.actorRole}`,
                detail: [event.suborderId && `Suborder ${event.suborderId}`, event.reason].filter(Boolean).join(' · '),
                createdAt: event.createdAt,
              })),
              ...order.history.orderAudit.filter((event) => event.module === 'ORDERS').map((event) => ({ id: event.id, title: event.action.replace(/_/g, ' '), detail: auditReason(event), createdAt: event.createdAt })),
            ]} />
          </section>
        </>}
      </div>
      <p className="no-print shrink-0 border-t border-[#E2E8F0] bg-white px-4 py-2 text-[10px] text-[#788391]">PDF uses the browser print dialog; select “Save as PDF” to download an invoice file.</p>
    </div>
  </div>;
}

function snapshotAddress(value: Record<string, unknown> | null) {
  if (!value) return 'Delivery address snapshot unavailable for this legacy order';
  return [
    stringValue(value, 'fullName'),
    stringValue(value, 'phone'),
    stringValue(value, 'houseNumber'),
    stringValue(value, 'street'),
    stringValue(value, 'addressLine'),
    stringValue(value, 'area'),
    stringValue(value, 'landmark') && `Landmark: ${stringValue(value, 'landmark')}`,
    [stringValue(value, 'city'), stringValue(value, 'state'), stringValue(value, 'pincode')].filter(Boolean).join(', '),
    stringValue(value, 'deliveryInstructions') && `Instructions: ${stringValue(value, 'deliveryInstructions')}`,
  ].filter(Boolean).join(' · ');
}

function latestDeliveryTime(order: OrderDetail) {
  const times = order.suborders.flatMap((item) => item.assignments)
    .map((assignment) => assignment.deliveredAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left));
  return times[0] ?? null;
}

function stringValue(value: unknown, key: string) {
  const result = record(value)[key];
  return typeof result === 'string' && result.trim() ? result : null;
}

function describeDetails(value: unknown) {
  const details = record(value);
  const reason = typeof details.reason === 'string' ? details.reason : '';
  const shortfall = typeof details.shortfall === 'number' && details.shortfall > 0 ? `Shortfall ${money(details.shortfall)}` : '';
  return [reason, shortfall].filter(Boolean).join(' · ') || 'Ledger record';
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#202A36]">{title}</h2>;
}

function InfoBlock({ title, lines }: { title: string; lines: string[] }) {
  return <div><h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[#788391]">{title}</h3>{lines.map((line, index) => <p key={`${index}-${line}`} className={`mt-1 text-xs ${index === 0 ? 'font-bold text-[#202A36]' : 'text-[#788391]'}`}>{line}</p>)}</div>;
}

function FinancialRow({ label, amount, text, strong = false }: { label: string; amount?: number; text?: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 py-2 text-xs ${strong ? 'font-extrabold text-[#08264A]' : 'text-[#788391]'}`}><span>{label}</span><span className="text-right">{text ?? money(amount ?? 0)}</span></div>;
}

function HistoryCard({ title, rows }: { title: string; rows: Array<{ id: string; title: string; detail: string; createdAt: string }> }) {
  return <section className="rounded border border-[#E2E8F0] bg-white p-4">
    <h2 className="text-sm font-extrabold text-[#202A36]">{title}</h2>
    {rows.length ? <ol className="mt-3 divide-y divide-[#E2E8F0]">{rows.map((row) => <li key={row.id} className="py-2 text-xs">
      <div className="flex flex-wrap justify-between gap-2"><span className="font-bold text-[#202A36]">{row.title}</span><time className="text-[10px] text-[#788391]">{dateTime(row.createdAt)}</time></div>
      {row.detail && <p className="mt-1 break-words text-[#788391]">{row.detail}</p>}
    </li>)}</ol> : <p className="mt-3 text-xs text-[#788391]">No history records are available.</p>}
  </section>;
}
