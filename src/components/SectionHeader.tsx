export function SectionHeader({ title, count }: { title: string; count: number }) {
  return <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3"><h2 className="text-sm font-extrabold">{title}</h2><span className="text-xs text-[#788391]">{count} records</span></div>;
}
