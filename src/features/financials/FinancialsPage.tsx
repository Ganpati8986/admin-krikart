import { FormEvent, ReactNode, useState } from 'react';
import { FinancialOverview } from '../../api';
import { StatusBadge } from '../../components/StatusBadge';

export function FinancialsPage({
  data,
  canReconcile,
  onReconcileCollection,
  onReconcileOnlinePayment,
  onApprovePayout,
  onSettlePayout,
  onUpdateVendorSettlement,
}: {
  data: FinancialOverview | null;
  canReconcile: boolean;
  onReconcileCollection: (orderId: string, status: 'COLLECTED' | 'RECONCILIATION_PENDING', reason: string) => Promise<void>;
  onReconcileOnlinePayment: (orderId: string, status: 'SETTLED' | 'RECONCILIATION_PENDING', reason: string, settlementReference?: string) => Promise<void>;
  onApprovePayout: (payoutId: string) => Promise<void>;
  onSettlePayout: (payoutId: string, payoutReference: string) => Promise<void>;
  onUpdateVendorSettlement: (settlementId: string, status: 'APPROVED' | 'PAID', payoutReference?: string) => Promise<void>;
}) {
  if (!data) return <p className="border border-[#E2E8F0] bg-white p-5 text-sm text-[#788391]">Financial data is not available for this account.</p>;
  const { summary } = data;

  return <div className="space-y-6">
    <MetricSection title="Customer collections" metrics={[
      ['Delivered customer payable', summary.totalCustomerPayable],
      ['Online collected', summary.onlineCollected],
      ['COD collected', summary.codCollected],
      ['Total collected', summary.totalCollected],
      ['Collection pending', summary.collectionPending],
      ['Reconciliation pending', summary.reconciliationPending],
      ['Online gateway settlement pending', summary.onlineGatewaySettlementPending],
      ['Customer delivery charges', summary.customerDeliveryCharges],
      ['Delivery charges collected', summary.deliveryChargesCollected],
    ]} />
    <MetricSection title="Vendor settlements" metrics={[
      ['Total vendor payable', summary.totalVendorPayable],
      ['Pending settlement', summary.vendorSettlementPending],
      ['Approved settlement', summary.vendorSettlementApproved],
      ['Paid settlement', summary.vendorSettlementPaid],
    ]} />
    <MetricSection title="Delivery partner payouts" metrics={[
      ['Total delivery earnings', summary.totalDeliveryPartnerEarnings],
      ['Pending payouts', summary.deliveryPartnerPayable],
      ['Approved payouts', summary.deliveryPartnerPayoutApproved],
      ['Paid payouts', summary.deliveryPartnerPayoutPaid],
    ]} />
    <MetricSection title="Platform financial summary" metrics={[
      ['Gross platform revenue', summary.platformGrossRevenue],
      ['Commission revenue', summary.commissionRevenue],
      ['Gross delivery charge revenue', summary.deliveryChargeRevenue],
      ['Platform-funded product/coupon discounts', summary.platformDiscountExpense],
      ['Free delivery expense', summary.freeDeliveryExpense],
      ['Reward redemption expense', summary.rewardExpense],
      ['Delivery partner expense', summary.deliveryPartnerExpense],
      ['Platform-funded refunds', summary.platformRefundExpense],
      ['Vendor-funded discounts', summary.vendorFundedDiscounts],
      ['Other adjustments', summary.otherAdjustments],
      ['Total completed refunds', summary.totalRefunds],
      ['Refunds pending', summary.refundsPending],
      ['Net platform profit / loss', summary.platformProfitLoss],
      ['Settlement obligations', summary.totalSettlementObligations],
    ]} />
    <p className="border-l-4 border-[#c99c42] bg-[#fff9eb] px-4 py-3 text-xs leading-5 text-[#685428]">
      COD collection is recorded separately from vendor settlement and partner payout. Only the amount actually received is recorded as collected; unresolved balances remain pending with a reason.
    </p>
    <ObligationSection title="Customer collections requiring reconciliation" empty="No COD collections are awaiting reconciliation.">
      {data.collections.map((item) => <article key={item.id} className="grid gap-3 border-b border-[#E2E8F0] p-4 last:border-0 md:grid-cols-[1fr_auto]">
        <div><div className="flex flex-wrap items-center gap-2"><strong>{item.orderCode}</strong><StatusBadge value={item.status} /></div><p className="mt-1 text-sm font-bold">Outstanding: {money(item.amount)}</p><p className="mt-1 text-xs text-[#788391]">Customer payable: {money(item.customerPayable)} · Collected: {money(item.amountCollected)}</p><p className="mt-1 text-xs text-[#788391]">Pending reason: {item.reason}</p></div>
        {canReconcile && <CollectionActions orderId={item.id} onSubmit={onReconcileCollection} />}
      </article>)}
    </ObligationSection>
    <ObligationSection title="Online gateway settlements" empty="No verified online payments are awaiting gateway settlement.">
      {data.onlinePayments.map((item) => <article key={item.id} className="grid gap-3 border-b border-[#E2E8F0] p-4 last:border-0 md:grid-cols-[1fr_auto]">
        <div><div className="flex flex-wrap items-center gap-2"><strong>{item.orderCode}</strong><StatusBadge value={item.status} /></div><p className="mt-1 text-sm font-bold">{money(item.amount)}</p><p className="mt-1 text-xs text-[#788391]">Gateway capture reference: {item.gatewayReference ?? 'Missing'}</p><p className="mt-1 text-xs text-[#788391]">Pending reason: {item.reason}</p></div>
        {canReconcile && <OnlinePaymentAction orderId={item.orderId} onSubmit={onReconcileOnlinePayment} />}
      </article>)}
    </ObligationSection>
    <ObligationSection title="Vendor settlement obligations" empty="No vendor settlement balances are pending.">
      {data.vendorSettlements.map((item) => <article key={item.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] p-4 last:border-0">
        <div><div className="flex flex-wrap items-center gap-2"><strong>{item.vendor}</strong><StatusBadge value={item.status} /></div><p className="mt-1 text-xs text-[#788391]">{item.orderCode}</p><p className="mt-1 text-sm font-bold">{money(item.amount)}</p><p className="mt-1 text-xs text-[#788391]">Pending reason: {item.reason}</p></div>
        {canReconcile && <VendorSettlementAction settlementId={item.id} workflowStatus={item.workflowStatus} onSubmit={onUpdateVendorSettlement} />}
      </article>)}
    </ObligationSection>
    <ObligationSection title="Delivery partner payouts" empty="No delivery partner payouts are pending.">
      {data.deliveryPayouts.map((item) => <article key={item.id} className="grid gap-3 border-b border-[#E2E8F0] p-4 last:border-0 md:grid-cols-[1fr_auto]">
        <div><div className="flex flex-wrap items-center gap-2"><strong>{item.partner}</strong><StatusBadge value={item.status} /></div><p className="mt-1 text-sm font-bold">{money(item.amount)}</p><p className="mt-1 text-xs text-[#788391]">Pending reason: {item.reason}</p></div>
        {canReconcile && <PayoutAction payoutId={item.id} workflowStatus={item.workflowStatus} onApprove={onApprovePayout} onSubmit={onSettlePayout} />}
      </article>)}
    </ObligationSection>
    <ObligationSection title="Refund requests" empty="No refunds are awaiting finance processing.">
      {data.refunds.map((item) => <article key={item.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] p-4 last:border-0">
        <div><div className="flex flex-wrap items-center gap-2"><strong>Order {item.orderId}</strong><StatusBadge value={item.status} /></div><p className="mt-1 text-sm font-bold">{money(item.amount)}</p><p className="mt-1 text-xs text-[#788391]">Pending reason: {item.reason}</p></div>
      </article>)}
    </ObligationSection>
  </div>;
}

function OnlinePaymentAction({
  orderId,
  onSubmit,
}: {
  orderId: string;
  onSubmit: (orderId: string, status: 'SETTLED' | 'RECONCILIATION_PENDING', reason: string, settlementReference?: string) => Promise<void>;
}) {
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(status: 'SETTLED' | 'RECONCILIATION_PENDING') {
    if (reason.trim().length < 3 || (status === 'SETTLED' && reference.trim().length < 3)) {
      setMessage(status === 'SETTLED' ? 'Enter a settlement reference and reason.' : 'Enter a reconciliation reason.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await onSubmit(orderId, status, reason.trim(), status === 'SETTLED' ? reference.trim() : undefined);
      setReference('');
      setReason('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gateway settlement update failed.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-2 md:w-72">
    <input className="w-full rounded border border-[#CBD5E1] px-2 py-1.5 text-xs" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Gateway settlement reference" aria-label="Gateway settlement reference" />
    <input className="w-full rounded border border-[#CBD5E1] px-2 py-1.5 text-xs" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required reconciliation reason" aria-label="Gateway settlement reason" />
    <div className="flex gap-2">
      <button disabled={busy} onClick={() => void submit('SETTLED')} className="rounded bg-[#FF9800] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Record settled</button>
      <button disabled={busy} onClick={() => void submit('RECONCILIATION_PENDING')} className="rounded border border-[#CBD5E1] px-3 py-1.5 text-xs font-bold text-[#08264A] disabled:opacity-50">Needs review</button>
    </div>
    {message && <p role="alert" className="text-xs text-[#9b493e]">{message}</p>}
  </div>;
}

function MetricSection({ title, metrics }: { title: string; metrics: Array<[string, number]> }) {
  return <section>
    <h2 className="mb-2 text-sm font-extrabold">{title}</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, amount]) => <article key={label} className="border border-[#E2E8F0] bg-white p-4">
        <p className="text-xs font-semibold text-[#788391]">{label}</p>
        <p className="mt-3 text-xl font-extrabold text-[#08264A]">{money(amount)}</p>
      </article>)}
    </div>
  </section>;
}

function VendorSettlementAction({
  settlementId,
  workflowStatus,
  onSubmit,
}: {
  settlementId: string;
  workflowStatus: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  onSubmit: (settlementId: string, status: 'APPROVED' | 'PAID', payoutReference?: string) => Promise<void>;
}) {
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(status: 'APPROVED' | 'PAID') {
    if (status === 'PAID' && reference.trim().length < 3) {
      setMessage('A payout reference is required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await onSubmit(settlementId, status, status === 'PAID' ? reference.trim() : undefined);
      setReference('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settlement update failed.');
    } finally {
      setBusy(false);
    }
  }

  if (workflowStatus === 'PENDING') {
    return <div className="md:w-72"><button disabled={busy} onClick={() => void submit('APPROVED')} className="rounded bg-[#FF9800] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Approve settlement'}</button>{message && <p role="alert" className="mt-2 text-xs text-[#9b493e]">{message}</p>}</div>;
  }
  if (workflowStatus !== 'APPROVED') return null;
  return <div className="space-y-2 md:w-72">
    <input className="w-full rounded border border-[#CBD5E1] px-2 py-1.5 text-xs" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Actual bank/UPI payout reference" aria-label="Vendor payout reference" />
    <button disabled={busy} onClick={() => void submit('PAID')} className="rounded bg-[#FF9800] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Record payout as settled'}</button>
    {message && <p role="alert" className="text-xs text-[#9b493e]">{message}</p>}
  </div>;
}

function CollectionActions({
  orderId,
  onSubmit,
}: {
  orderId: string;
  onSubmit: (orderId: string, status: 'COLLECTED' | 'RECONCILIATION_PENDING', reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: Pick<FormEvent, 'preventDefault'>, status: 'COLLECTED' | 'RECONCILIATION_PENDING') {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setMessage('Enter a reconciliation note of at least 3 characters.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await onSubmit(orderId, status, reason.trim());
      setReason('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Collection update failed.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="space-y-2 md:w-72" onSubmit={(event) => void submit(event, 'COLLECTED')}>
    <input className="w-full rounded border border-[#CBD5E1] px-2 py-1.5 text-xs" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required reconciliation reason" aria-label="Collection reconciliation reason" />
    <div className="flex gap-2">
      <button disabled={busy} className="rounded bg-[#FF9800] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Confirm collected'}</button>
      <button type="button" disabled={busy} onClick={(event) => void submit(event, 'RECONCILIATION_PENDING')} className="rounded border border-[#CBD5E1] px-3 py-1.5 text-xs font-bold text-[#08264A] disabled:opacity-50">Needs review</button>
    </div>
    {message && <p role="alert" className="text-xs text-[#9b493e]">{message}</p>}
  </form>;
}

function PayoutAction({
  payoutId,
  workflowStatus,
  onApprove,
  onSubmit,
}: {
  payoutId: string;
  workflowStatus: 'PENDING' | 'APPROVED' | 'PAID';
  onApprove: (payoutId: string) => Promise<void>;
  onSubmit: (payoutId: string, payoutReference: string) => Promise<void>;
}) {
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (workflowStatus === 'PENDING') {
    return <button disabled={busy} onClick={() => {
      setBusy(true);
      void onApprove(payoutId).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Payout approval failed.')).finally(() => setBusy(false));
    }} className="rounded bg-[#FF9800] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Approve payout'}{message && <span role="alert" className="block text-xs">{message}</span>}</button>;
  }
  if (workflowStatus !== 'APPROVED') return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reference.trim().length < 3) {
      setMessage('A payout reference is required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await onSubmit(payoutId, reference.trim());
      setReference('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payout update failed.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="space-y-2 md:w-72" onSubmit={(event) => void submit(event)}>
    <input className="w-full rounded border border-[#CBD5E1] px-2 py-1.5 text-xs" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Actual bank/UPI payout reference" aria-label="Delivery payout reference" />
    <button disabled={busy} className="rounded bg-[#FF9800] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Record payout as settled'}</button>
    {message && <p role="alert" className="text-xs text-[#9b493e]">{message}</p>}
  </form>;
}

function ObligationSection({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return <section className="border border-[#E2E8F0] bg-white">
    <header className="border-b border-[#E2E8F0] px-4 py-3"><h2 className="text-sm font-extrabold">{title}</h2></header>
    {items.length ? items : <p className="p-4 text-sm text-[#788391]">{empty}</p>}
  </section>;
}

function money(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}
