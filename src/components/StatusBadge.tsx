export function StatusBadge({ value }: { value: string }) {
  const positive = ['ACTIVE', 'APPROVED', 'PUBLISHED', 'DELIVERED', 'SUCCESS', 'READY_FOR_PICKUP', 'COLLECTED', 'SETTLED', 'REFUNDED'].includes(value);
  const warning = [
    'PENDING', 'PLACED', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'ASSIGNED', 'OUT_FOR_DELIVERY',
    'NOT_COLLECTED', 'COLLECTION_PENDING', 'RECONCILIATION_PENDING', 'SETTLEMENT_PENDING', 'REFUND_PENDING',
  ].includes(value);
  return <span className={`inline-flex rounded px-2 py-1 text-[9px] font-extrabold ${positive ? 'bg-[#e1f1df] text-[#287043]' : warning ? 'bg-[#fff1cf] text-[#8b6520]' : 'bg-[#fbe6e3] text-[#9b493e]'}`}>{value.replace(/_/g, ' ')}</span>;
}
