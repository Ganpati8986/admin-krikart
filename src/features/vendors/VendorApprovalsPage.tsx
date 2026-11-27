import { useState } from 'react';
import { Vendor } from '../../api';

export function VendorApprovalsPage({
  vendors,
  busyVendor,
  onReview,
}: {
  vendors: Vendor[];
  busyVendor: string;
  onReview: (id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', reason?: string) => Promise<void>;
}) {
  const pending = vendors.filter((vendor) => vendor.status === 'PENDING');
  return (
    <section className="border border-[#E2E8F0] bg-white">
      <header className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
        <h2 className="text-sm font-extrabold">Vendor applications</h2>
        <span className="text-xs text-[#788391]">{pending.length} awaiting review</span>
      </header>
      <div className="divide-y divide-[#E2E8F0]">
        {vendors.map((vendor) => <VendorApplicationRow key={vendor.id} vendor={vendor} busy={busyVendor === vendor.id} onReview={onReview} />)}
        {!vendors.length && <p className="px-4 py-8 text-center text-sm text-[#788391]">No vendor applications.</p>}
      </div>
    </section>
  );
}

function VendorApplicationRow({
  vendor,
  busy,
  onReview,
}: {
  vendor: Vendor;
  busy: boolean;
  onReview: (id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  return (
    <article className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{vendor.businessName}</h3><span className={`rounded px-2 py-1 text-[9px] font-extrabold ${vendor.status === 'APPROVED' ? 'bg-[#e1f1df] text-[#287043]' : vendor.status === 'PENDING' ? 'bg-[#fff1cf] text-[#8b6520]' : 'bg-[#fbe6e3] text-[#9b493e]'}`}>{vendor.status}</span></div>
        <p className="mt-1 text-xs text-[#788391]">{vendor.category ?? 'Business type not set'} · {vendor.user.fullName ?? 'Contact name missing'} · {vendor.user.phone}</p>
        <p className="mt-1 text-xs text-[#788391]">{vendor.businessAddress ?? 'Address not provided'} · {vendor.products.length} products</p>
        {vendor.rejectionReason && <p className="mt-2 text-xs text-[#a24d3c]">Previous review: {vendor.rejectionReason}</p>}
        {!!vendor.documents.length && <div className="mt-3 flex flex-wrap gap-2">{vendor.documents.map((document) => <a key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer" className="rounded border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold text-[#FF7900]">{document.kind} · submitted {new Date(document.createdAt).toLocaleDateString()}</a>)}</div>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
        {vendor.status !== 'APPROVED' && <button disabled={busy} onClick={() => void onReview(vendor.id, 'APPROVED')} className="rounded bg-[#FF9800] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Approve'}</button>}
        {vendor.status !== 'REJECTED' && <button disabled={busy} onClick={() => setRejecting((current) => !current)} className="rounded border border-[#d9c3be] px-3 py-2 text-xs font-bold text-[#9a4e40] disabled:opacity-50">Reject</button>}
        {vendor.status === 'APPROVED' && <button disabled={busy} onClick={() => void onReview(vendor.id, 'SUSPENDED')} className="rounded border border-[#d9c3be] px-3 py-2 text-xs font-bold text-[#9a4e40] disabled:opacity-50">Suspend</button>}
        {rejecting && <div className="flex min-w-48 flex-col gap-2 sm:flex-row xl:flex-col"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason" className="min-w-0 rounded border border-[#CBD5E1] px-2 py-2 text-xs" /><button disabled={busy || !reason.trim()} onClick={() => void onReview(vendor.id, 'REJECTED', reason.trim())} className="rounded bg-[#a75343] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm</button></div>}
      </div>
    </article>
  );
}
