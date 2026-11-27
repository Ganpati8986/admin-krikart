import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, Notification } from '../../api';

export function AdminNotificationsPage({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  async function refresh() {
    try { setNotifications(await adminApi.notifications(userId)); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load notifications.'); }
  }
  useEffect(() => { void refresh(); }, [userId]);
  async function markRead(id: string) {
    try { await adminApi.markNotificationRead(userId, id); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not mark notification read.'); }
  }
  return <section className="border border-[#E2E8F0] bg-white">
    <header className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3"><h2 className="text-sm font-extrabold">Notification history</h2><button onClick={() => void refresh()} className="text-xs font-bold text-[#FF7900]">Refresh · {notifications.filter((item) => !item.isRead).length} unread</button></header>
    {error && <p role="alert" className="bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</p>}
    {notifications.map((item) => <article key={item.id} className={`flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-4 py-4 ${item.isRead ? '' : 'border-l-2 border-l-[#FF9800] bg-[#F5F7FA]'}`}>
      <div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-[#788391]">{item.body}</p><time className="mt-2 block text-[10px] text-[#788391]">{new Date(item.createdAt).toLocaleString()}</time>{item.route && <Link to={item.route} className="mt-2 inline-block text-[11px] font-bold text-[#FF7900]">Open related view</Link>}</div>
      {!item.isRead && <button onClick={() => void markRead(item.id)} className="shrink-0 rounded border border-[#E2E8F0] px-2 py-1.5 text-[10px] font-bold text-[#FF7900]">Mark read</button>}
    </article>)}
    {!notifications.length && !error && <p className="px-4 py-8 text-center text-sm text-[#788391]">No notifications.</p>}
  </section>;
}
