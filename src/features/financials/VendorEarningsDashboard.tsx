import { useEffect, useState } from 'react';
import { AdminEarningsFilters, AdminSettlement, AdminVendorEarnings, platformAdminApi } from '../../platformApi';
import './VendorEarningsDashboard.css';

type Period = NonNullable<AdminEarningsFilters['period']>;
type SettlementFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

export function VendorEarningsDashboard() {
  const [period, setPeriod] = useState<Period>('today');
  const [applied, setApplied] = useState<AdminEarningsFilters>({
    period: 'today',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  });
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [settlementStatus, setSettlementStatus] = useState<SettlementFilter>('ALL');
  const [vendorPage, setVendorPage] = useState(1);
  const [settlementPageNumber, setSettlementPageNumber] = useState(1);
  const [vendors, setVendors] = useState<AdminVendorEarnings[]>([]);
  const [settlements, setSettlements] = useState<AdminSettlement[]>([]);
  const [vendorCount, setVendorCount] = useState(0);
  const [settlementCount, setSettlementCount] = useState(0);
  const [totals, setTotals] = useState<{ grossRevenue: number; customerProductAmount: number; customerRefundAmount: number; platformMargin: number; vendorDiscounts: number; platformDiscounts: number; commission: number; refundAdjustments: number; netEarnings: number; completedOrders: number } | null>(null);
  const [commissionInputs, setCommissionInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      setError('');
      const filters = {
        ...applied,
        ...(settlementStatus !== 'ALL' ? { status: settlementStatus } : {}),
      };
      const [earnings, settlementPage] = await Promise.all([
          platformAdminApi.vendorEarnings({ ...applied, page: vendorPage, pageSize: 25 }),
          platformAdminApi.vendorSettlements({ ...filters, page: settlementPageNumber, pageSize: 25 }),
      ]);
      setVendors(earnings.vendors);
      setTotals(earnings.totals);
      setSettlements(settlementPage.transactions);
      setVendorCount(earnings.total);
      setSettlementCount(settlementPage.total);
      setCommissionInputs((previous) => {
        const next = { ...previous };
        for (const vendor of earnings.vendors) next[vendor.vendorId] ??= String(vendor.commissionRateBps);
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load vendor earnings.');
    }
  }

  useEffect(() => { void load();   }, [applied, settlementStatus, vendorPage, settlementPageNumber]);

  function applyPeriod() {
    if (period === 'custom' && (!startDate || !endDate)) {
      setError('Select both a start date and an end date.');
      return;
    }
    setVendorPage(1);
    setSettlementPageNumber(1);
    setApplied({
      period,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      ...(period === 'monthly' ? { month, year } : {}),
      ...(period === 'yearly' ? { year } : {}),
      ...(period === 'custom' ? { startDate, endDate } : {}),
    });
  }

  async function exportReport() {
    setBusy('export');
    try {
      const firstPage = await platformAdminApi.vendorEarnings({ ...applied, page: 1, pageSize: 100 });
      const allRows = [...firstPage.vendors];
      for (let page = 2; page <= Math.ceil(firstPage.total / firstPage.pageSize); page += 1) {
        const nextPage = await platformAdminApi.vendorEarnings({ ...applied, page, pageSize: firstPage.pageSize });
        allRows.push(...nextPage.vendors);
      }
      const columns = ['Vendor', 'Completed orders', 'Vendor eligible revenue', 'Customer product sales', 'Customer refunds', 'Vendor discounts', 'Platform discounts', 'Commission', 'Vendor refund adjustments', 'Platform margin', 'Net vendor earnings', 'Commission rate (bps)'];
      const rows = allRows.map((vendor) => [
        vendor.businessName,
        vendor.completedOrders,
        vendor.grossRevenue,
        vendor.customerProductAmount,
        vendor.customerRefundAmount,
        vendor.vendorDiscounts,
        vendor.platformDiscounts,
        vendor.commission,
        vendor.refundAdjustments,
        vendor.platformMargin,
        vendor.netEarnings,
        vendor.commissionRateBps,
      ]);
      const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const download = document.createElement('a');
      download.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      download.download = `vendor-earnings-${applied.startDate ?? applied.period ?? 'all'}.csv`;
      download.click();
      URL.revokeObjectURL(download.href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not export vendor earnings.');
    } finally { setBusy(''); }
  }

  async function saveCommission(vendorId: string) {
    const value = Number(commissionInputs[vendorId]);
    if (!Number.isInteger(value) || value < 0 || value > 10_000) {
      setError('Commission must be a whole number of basis points from 0 to 10,000.');
      return;
    }
    setBusy(vendorId);
    try {
      await platformAdminApi.updateVendorCommission(vendorId, value);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update vendor commission.');
    } finally { setBusy(''); }
  }

  async function updateSettlement(row: AdminSettlement, status: 'APPROVED' | 'REJECTED' | 'PAID') {
    const details = status === 'PAID'
      ? { payoutReference: window.prompt('Enter payout transaction reference')?.trim() }
      : status === 'REJECTED'
        ? { rejectionReason: window.prompt('Enter the reason for rejecting this settlement')?.trim() }
        : {};
    if (status !== 'APPROVED' && !Object.values(details)[0]) return;
    setBusy(row.id);
    try {
      await platformAdminApi.updateSettlement(row.id, status, details);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update settlement.');
    } finally { setBusy(''); }
  }

  return <div className="vendor-earnings"><section className="finance-panel">
    <header className="finance-heading"><div><p className="eyebrow">VENDOR FINANCE</p><h2>Earnings & settlements</h2><p className="muted">Order-level financial snapshots, commissions and payout controls.</p></div><div className="finance-heading-actions"><button disabled={busy === 'export'} onClick={() => void exportReport()}>{busy === 'export' ? 'Exporting…' : 'Export CSV'}</button><button onClick={() => void load()}>Refresh</button></div></header>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="finance-filters">
      <div className="filter-buttons">{(['today', 'monthly', 'yearly', 'custom'] as Period[]).map((value) => <button key={value} className={period === value ? 'selected' : ''} onClick={() => setPeriod(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      {period === 'monthly' && <div className="filter-inputs"><label>Month<input value={month} onChange={(event) => setMonth(event.target.value)} type="number" min="1" max="12" /></label><label>Year<input value={year} onChange={(event) => setYear(event.target.value)} type="number" /></label></div>}
      {period === 'yearly' && <div className="filter-inputs"><label>Year<input value={year} onChange={(event) => setYear(event.target.value)} type="number" /></label></div>}
      {period === 'custom' && <div className="filter-inputs"><label>Start date<input value={startDate} onChange={(event) => setStartDate(event.target.value)} type="date" /></label><label>End date<input value={endDate} onChange={(event) => setEndDate(event.target.value)} type="date" /></label></div>}
      <button className="apply-filter" onClick={applyPeriod}>Apply filter</button>
    </div>
    {totals && <div className="finance-metrics">
      <FinanceMetric label="Gross eligible revenue" amount={totals.grossRevenue} />
      <FinanceMetric label="Platform commission" amount={totals.commission} />
      <FinanceMetric label="Vendor-funded discounts" amount={totals.vendorDiscounts} />
      <FinanceMetric label="Platform-funded discounts" amount={totals.platformDiscounts} />
      <FinanceMetric label="Refund adjustments" amount={totals.refundAdjustments} />
      <FinanceMetric label="Net vendor earnings" amount={totals.netEarnings} />
      <FinanceMetric label="Platform gross margin" amount={totals.platformMargin} />
      <FinanceMetric label="Completed orders" amount={totals.completedOrders} currency={false} />
    </div>}

    <section className="finance-table">
      <header><h3>Vendor-wise summary</h3><span>{vendors.length} vendors</span></header>
      {vendors.map((vendor) => <article key={vendor.vendorId}>
        <div className="vendor-summary"><strong>{vendor.businessName}</strong><p>{vendor.completedOrders} completed · Vendor-eligible {money(vendor.grossRevenue)} · Customer product sales {money(vendor.customerProductAmount)} · Net {money(vendor.netEarnings)}</p><p>Commission {money(vendor.commission)} · Vendor discounts {money(vendor.vendorDiscounts)} · Refunds {money(vendor.refundAdjustments)} · Platform margin {money(vendor.platformMargin)}</p></div>
        <div className="commission-control"><label>Commission bps<input aria-label={`Commission basis points for ${vendor.businessName}`} value={commissionInputs[vendor.vendorId] ?? ''} onChange={(event) => setCommissionInputs((current) => ({ ...current, [vendor.vendorId]: event.target.value }))} type="number" min="0" max="10000" /></label><button disabled={busy === vendor.vendorId} onClick={() => void saveCommission(vendor.vendorId)}>{busy === vendor.vendorId ? 'Saving…' : 'Save rate'}</button></div>
      </article>)}
      <Pagination page={vendorPage} total={vendorCount} pageSize={25} onChange={setVendorPage} />
      {!vendors.length && <p className="empty">No vendor earnings in this period.</p>}
    </section>

    <section className="finance-table">
    <header><h3>Settlement queue</h3><div className="filter-buttons">{(['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'] as SettlementFilter[]).map((status) => <button key={status} className={settlementStatus === status ? 'selected' : ''} onClick={() => { setSettlementStatus(status); setSettlementPageNumber(1); }}>{status === 'ALL' ? 'All' : status === 'APPROVED' ? 'Available' : status}</button>)}</div></header>
      {settlements.map((row) => <article key={row.id}>
        <div className="vendor-summary"><strong>{row.vendor.businessName} · {row.suborder?.parentOrder.orderCode ?? row.id}</strong><p>{new Date(row.suborder?.parentOrder.createdAt ?? row.createdAt).toLocaleString()} · {row.paymentMethod ?? '—'} · {row.status}</p><p>Customer sales {money(row.customerProductAmount)} · Customer refunds {money(row.customerRefundAmount)} · Gross {money(row.grossEligibleAmount)} · Commission {money(row.commissionAmount)} · Vendor discount {money(row.vendorDiscountAmount)} · Refund adjustment {money(row.refundAdjustment)} · Net {money(row.amount)}{row.status === 'PAID' ? ` · Paid ${money(row.paidAmount)}` : ''}</p>{row.payoutReference && <p>Reference: {row.payoutReference}</p>}{row.rejectionReason && <p>Rejection: {row.rejectionReason}</p>}</div>
        <div className="actions">
          {row.status === 'PENDING' && <button disabled={busy === row.id} onClick={() => void updateSettlement(row, 'APPROVED')}>Approve</button>}
          {row.status === 'APPROVED' && <button disabled={busy === row.id} onClick={() => void updateSettlement(row, 'PAID')}>Record payout</button>}
          {['PENDING', 'APPROVED'].includes(row.status) && <button className="danger" disabled={busy === row.id} onClick={() => void updateSettlement(row, 'REJECTED')}>Reject</button>}
        </div>
      </article>)}
      <Pagination page={settlementPageNumber} total={settlementCount} pageSize={25} onChange={setSettlementPageNumber} />
      {!settlements.length && <p className="empty">No settlements match this filter.</p>}
    </section>
  </section></div>;
}

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return <div className="pagination"><span>Page {page} of {pages} · {total} records</span><div><button disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><button disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
}

function FinanceMetric({ label, amount, currency = true }: { label: string; amount: number; currency?: boolean }) {
  return <div className="finance-metric"><span>{label}</span><strong>{currency ? money(amount) : amount}</strong></div>;
}

function money(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}
