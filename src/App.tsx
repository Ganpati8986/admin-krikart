import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, Bell, Boxes, CircleDollarSign, LayoutDashboard, LogOut, Menu, Package, Search, ShieldCheck, Store, Truck, Users, TicketPercent, Settings, ChartNoAxesCombined, X, MapPin, Megaphone } from 'lucide-react';
import { adminApi, AdminOrder, AdminOrderStatus, Customer, DeliveryPartner, FinancialOverview, logoutAdminSession, Overview, ProductReviewItem, restoreAdminSession, User, Vendor } from './api';
import { PromotionManagement } from './features/promotions/PromotionManagement';
import { DeliveryPricingManagement } from './features/settings/DeliveryPricingManagement';
import { VendorEarningsDashboard } from './features/financials/VendorEarningsDashboard';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { VendorManagementPage } from './features/vendors/VendorManagementPage';
import { VendorApprovalsPage } from './features/vendors/VendorApprovalsPage';
import { ProductApprovalsPage } from './features/products/ProductApprovalsPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { DeliveryPage } from './features/delivery/DeliveryPage';
import { AccountsPage } from './features/accounts/AccountsPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { AdminNotificationsPage } from './features/notifications/AdminNotificationsPage';
import { AdminLoginScreen } from './features/auth/AdminLoginScreen';
import { FinancialsPage } from './features/financials/FinancialsPage';
import { BudgetOffersPage } from './features/offers/BudgetOffersPage';
import { MarketingBannersPage } from './features/marketing/MarketingBannersPage';

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: Package },
  { label: 'Payments & settlements', path: '/financials', icon: CircleDollarSign },
  { label: 'Commission', path: '/vendor-earnings', icon: ChartNoAxesCombined },
  { label: 'Vendors', path: '/vendors', icon: Store },
  { label: 'Vendor approvals', path: '/vendor-approvals', icon: ShieldCheck },
  { label: 'Products', path: '/product-approvals', icon: Package },
  { label: 'Budget offers', path: '/budget-offers', icon: TicketPercent },
  { label: 'Offers & coupons', path: '/promotions', icon: TicketPercent },
  { label: 'Marketing banners', path: '/marketing/banners', icon: Megaphone },
  { label: 'Settings', path: '/settings/delivery-pricing', icon: Settings },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Delivery partners', path: '/delivery', icon: Truck },
  { label: 'Accounts', path: '/accounts', icon: ShieldCheck },
  { label: 'Alerts', path: '/alerts', icon: Bell },
  { label: 'Notifications', path: '/notifications', icon: Bell },
];

const pageTitles: Record<string, string> = {
  '/': 'Operations overview',
  '/orders': 'Order operations',
  '/financials': 'Collections & settlement obligations',
  '/vendor-earnings': 'Vendor earnings & settlements',
  '/vendors': 'Vendor accounts',
  '/vendor-approvals': 'Vendor applications',
  '/product-approvals': 'Product approvals',
  '/budget-offers': 'Budget Offers Management',
  '/promotions': 'Offers, coupons & rewards',
  '/marketing/banners': 'Marketing · Promotional banners',
  '/settings/delivery-pricing': 'Settings · Delivery Pricing',
  '/customers': 'Customer accounts',
  '/delivery': 'Delivery network',
  '/accounts': 'Accounts & access',
  '/alerts': 'Operational alerts',
  '/notifications': 'Notification history',
};

export function App() {
  const [admin, setAdmin] = useState<{ id: string; role: string; token: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [financials, setFinancials] = useState<FinancialOverview | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [delivery, setDelivery] = useState<DeliveryPartner[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductReviewItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyVendor, setBusyVendor] = useState('');
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [notificationError, setNotificationError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('krikart-admin-sidebar-collapsed') === 'true');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void restoreAdminSession().then((identity) => {
      if (!active) return;
      setAdmin(identity);
      setAuthReady(true);
    }).catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : 'Could not restore the admin session.');
        setAuthReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  async function loadData() {
    setError('');
    setLoading(true);
    try {
      const canViewFinancials = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATIONS_ADMIN'].includes(admin?.role ?? '');
      const [overviewData, orderData, vendorData, customerData, deliveryData, userData, productData, financialData] = await Promise.all([
        adminApi.overview(), adminApi.orders(), adminApi.vendors(), adminApi.customers(), adminApi.deliveryPartners(), adminApi.users(), adminApi.products(),
        canViewFinancials ? adminApi.financials() : Promise.resolve(null),
      ]);
      setOverview(overviewData);
      setOrders(orderData);
      setFinancials(financialData);
      setVendors(vendorData);
      setCustomers(customerData);
      setDelivery(deliveryData);
      setUsers(userData);
      setProducts(productData);
      try {
        setUnreadCount((await adminApi.unreadCount(admin?.id ?? '')).count);
        setNotificationError('');
      } catch (caught) {
        setUnreadCount(null);
        setNotificationError(caught instanceof Error ? caught.message : 'Unread notification count is unavailable.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load operations data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (admin) void loadData();
  }, [admin]);

  useEffect(() => {
    if (!admin) return;
    let active = true;
    const refreshUnreadCount = async () => {
      try {
        const result = await adminApi.unreadCount(admin.id);
        if (active) {
          setUnreadCount(result.count);
          setNotificationError('');
        }
      } catch (caught) {
        if (active) {
          setNotificationError(caught instanceof Error ? caught.message : 'Unread notification count is unavailable.');
        }
      }
    };
    const intervalId = window.setInterval(() => void refreshUnreadCount(), 60_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [admin]);

  useEffect(() => {
    if (!admin) return;
    let active = true;
    void adminApi.unreadCount(admin.id).then((result) => {
      if (active) {
        setUnreadCount(result.count);
        setNotificationError('');
      }
    }).catch((caught: unknown) => {
      if (active) setNotificationError(caught instanceof Error ? caught.message : 'Unread notification count is unavailable.');
    });
    return () => { active = false; };
  }, [admin, location.pathname]);

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  async function signIn(phone: string, otp: string) {
    const identity = await adminApi.signIn(phone, otp);
    setAdmin(identity);
  }

  const visibleNavigation = navigation.filter(({ path }) =>
    (!['/vendor-earnings', '/promotions', '/settings/delivery-pricing', '/budget-offers'].includes(path) || admin?.role === 'SUPER_ADMIN')
    && (path !== '/financials' || ['SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATIONS_ADMIN'].includes(admin?.role ?? '')));

  const searchResults = useMemo(() => {
    const query = globalSearch.trim().toLocaleLowerCase();
    if (!query) return [];
    return [
      ...orders.filter((order) => `${order.orderCode} ${order.id}`.toLocaleLowerCase().includes(query)).slice(0, 4)
        .map((order) => ({ title: order.orderCode, detail: `Order · ${order.status}`, path: `/orders?search=${encodeURIComponent(order.orderCode)}` })),
      ...customers.filter((customer) => `${customer.user.fullName ?? ''} ${customer.user.phone ?? ''} ${customer.user.email ?? ''}`.toLocaleLowerCase().includes(query)).slice(0, 3)
        .map((customer) => ({ title: customer.user.fullName || customer.user.phone || 'Customer', detail: 'Customer', path: `/customers?search=${encodeURIComponent(customer.user.phone || customer.user.fullName || '')}` })),
      ...vendors.filter((vendor) => `${vendor.businessName} ${vendor.user.fullName ?? ''} ${vendor.user.phone}`.toLocaleLowerCase().includes(query)).slice(0, 3)
        .map((vendor) => ({ title: vendor.businessName, detail: `Vendor · ${vendor.status}`, path: `/vendors?search=${encodeURIComponent(vendor.businessName)}` })),
      ...products.filter((product) => `${product.name} ${product.vendor.businessName}`.toLocaleLowerCase().includes(query)).slice(0, 3)
        .map((product) => ({ title: product.name, detail: `Product · ${product.vendor.businessName}`, path: `/product-approvals?search=${encodeURIComponent(product.name)}` })),
    ].slice(0, 10);
  }, [globalSearch, orders, customers, vendors, products]);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem('krikart-admin-sidebar-collapsed', String(next));
    } catch (caught) {
      setError(caught instanceof Error ? `Sidebar preference could not be saved: ${caught.message}` : 'Sidebar preference could not be saved.');
    }
  }

  async function reviewVendor(id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', reason?: string) {
    setBusyVendor(id);
    try {
      await adminApi.reviewVendor(id, status, reason);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update vendor application.');
    } finally {
      setBusyVendor('');
    }
  }

  async function reviewDashboardVendor(id: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    await adminApi.reviewVendor(id, status, reason);
    await loadData();
  }

  async function overrideOrderStatus(orderId: string, status: AdminOrderStatus, reason: string, suborderId?: string) {
    await adminApi.overrideOrderStatus(orderId, status, reason, suborderId);
    await loadData();
  }

  async function reviewProduct(id: string, status: 'PUBLISHED' | 'REJECTED', reason?: string) {
    await adminApi.reviewProduct(id, status, reason);
    await loadData();
  }

  if (!admin) return authReady ? <AdminLoginScreen onSignIn={signIn} /> : <div className="grid min-h-screen place-items-center text-sm font-bold text-[#08264A]">Restoring session…</div>;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#202A36]">
      {mobileNavOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-20 bg-[#08264A]/50 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/10 bg-[#08264A] text-white transition-transform duration-200 md:translate-x-0 md:transition-[width] ${sidebarCollapsed ? 'md:w-[76px]' : 'md:w-64'} ${mobileNavOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`flex h-[76px] shrink-0 items-center gap-3 border-b border-white/10 ${sidebarCollapsed && !mobileNavOpen ? 'justify-center px-2' : 'px-5'}`}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FF9800] text-[#08264A]"><Boxes size={21} /></div>
          {(!sidebarCollapsed || mobileNavOpen) && <div><p className="text-lg font-extrabold"><span className="logo-kri-zoom">Kri</span> Kart</p><p className="text-[9px] font-bold tracking-[0.18em] text-white/65">ADMIN OPERATIONS</p></div>}
          <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="ml-auto rounded-lg p-2 text-white/70 hover:bg-white/10 md:hidden"><X size={18} /></button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavigation.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} title={sidebarCollapsed && !mobileNavOpen ? label : undefined} onClick={() => setMobileNavOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-[#FF9800] text-[#08264A] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'} ${sidebarCollapsed && !mobileNavOpen ? 'justify-center px-0' : ''}`}><Icon size={18} className="shrink-0" />{(!sidebarCollapsed || mobileNavOpen) && <span className="truncate">{label}</span>}</NavLink>)}
        </nav>
        {(!sidebarCollapsed || mobileNavOpen) && <div className="shrink-0 border-t border-white/10 px-5 py-4 text-[11px] leading-5 text-white/60"><span className="flex items-center gap-2"><MapPin size={14} className="text-[#FF9800]" /> Simdega, Jharkhand</span><p className="mt-1">Kri Kart Admin</p></div>}
      </aside>

      <main className={`min-h-screen transition-[margin] ${sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-64'}`}>
        <header className="sticky top-0 z-10 flex min-h-[76px] flex-wrap items-center gap-3 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur sm:px-5 lg:px-7">
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="rounded-lg border border-[#E2E8F0] bg-white p-2 text-[#08264A] md:hidden"><Menu size={18} /></button>
            <button type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden rounded-lg border border-[#E2E8F0] bg-white p-2 text-[#08264A] hover:bg-[#FFF1DE] md:grid"><Menu size={18} /></button>
            <div className="hidden sm:block"><p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#FF7900]">Kri Kart / Admin</p><h1 className="mt-0.5 text-base font-extrabold text-[#08264A]">{pageTitles[location.pathname] ?? 'Operations'}</h1></div>
          </div>

          <div className="relative order-3 w-full md:order-none md:min-w-0 md:flex-1">
            <label className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] px-3 py-2 text-sm focus-within:border-[#FF9800] focus-within:bg-white">
              <Search size={16} className="shrink-0 text-[#738078]" />
              <input ref={searchInputRef} value={globalSearch} onFocus={() => setSearchOpen(true)} onChange={(event) => { setGlobalSearch(event.target.value); setSearchOpen(true); }} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); }} placeholder="Search orders, customers, vendors, products…" className="min-w-0 flex-1 bg-transparent text-xs text-[#202A36] outline-none placeholder:text-[#788391]" aria-label="Search orders, customers, vendors and products" />
              {globalSearch && <button type="button" onClick={() => setGlobalSearch('')} aria-label="Clear search" className="text-[#788391]"><X size={15} /></button>}
              <kbd className="hidden rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[9px] text-[#788391] lg:inline">Ctrl K</kbd>
            </label>
            {searchOpen && globalSearch.trim() && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-xl">
              {searchResults.map((result, index) => <NavLink key={`${result.path}-${result.title}-${index}`} to={result.path} onClick={() => { setSearchOpen(false); setGlobalSearch(''); }} className="block rounded-md px-3 py-2.5 hover:bg-[#FFF1DE]"><span className="block truncate text-xs font-bold text-[#08264A]">{result.title}</span><span className="mt-0.5 block text-[10px] text-[#788391]">{result.detail}</span></NavLink>)}
              {!searchResults.length && <p className="px-3 py-4 text-center text-xs text-[#788391]">No matching records found.</p>}
            </div>}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link to="/notifications" title={notificationError || 'Notifications'} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} className="relative grid h-9 w-9 place-items-center rounded-lg border border-[#E2E8F0] bg-white text-[#08264A] hover:bg-[#FFF1DE]">
              <Bell size={17} />
              {typeof unreadCount === 'number' && unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#FF9800] px-1 text-[9px] font-extrabold text-[#08264A]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </Link>
            <button type="button" onClick={() => void loadData()} title="Refresh data" className="grid h-9 w-9 place-items-center rounded-lg border border-[#E2E8F0] bg-white text-[#08264A] hover:bg-[#FFF1DE] disabled:opacity-50" disabled={loading}><Activity size={16} className={loading ? 'animate-pulse' : ''} /><span className="sr-only">Refresh data</span></button>
            <div className="hidden items-center gap-2 border-l border-[#E2E8F0] pl-3 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF1DE] text-xs font-extrabold text-[#08264A]">{adminInitials(users.find((user) => user.id === admin.id)?.name)}</span>
              <div className="hidden lg:block"><p className="max-w-28 truncate text-xs font-bold text-[#08264A]">{users.find((user) => user.id === admin.id)?.name || 'Admin'}</p><p className="text-[9px] text-[#788391]">{admin.role.replace(/_/g, ' ')}</p></div>
            </div>
            <button type="button" onClick={() => { void logoutAdminSession().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not sign out.')).finally(() => setAdmin(null)); }} title="Sign out" className="grid h-9 w-9 place-items-center rounded-lg border border-[#E2E8F0] bg-white text-[#08264A] hover:bg-[#FFF1DE]"><LogOut size={16} /><span className="sr-only">Sign out</span></button>
          </div>
        </header>
        <div className="p-4 sm:p-5 lg:p-7">
          {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => void loadData()} className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-800">Retry</button></div>}
          {notificationError && <div role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">Notification count unavailable: {notificationError}</div>}
          {loading && !overview ? <PageLoadingSkeleton /> : <Routes>
            <Route path="/" element={<DashboardPage
              overview={overview}
              orders={orders}
              financials={financials}
              vendors={vendors}
              customers={customers}
              deliveryPartners={delivery}
              products={products}
              onReviewVendor={reviewDashboardVendor}
              onReviewProduct={reviewProduct}
            />} />
            <Route path="/orders" element={<OrdersPage
              orders={orders}
              canOverride={['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(admin.role)}
              onOverride={overrideOrderStatus}
            />} />
            <Route path="/financials" element={['SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATIONS_ADMIN'].includes(admin.role)
              ? <FinancialsPage
                data={financials}
                canReconcile={['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(admin.role)}
                onReconcileCollection={async (orderId, status, reason) => {
                  await adminApi.reconcileCollection(orderId, status, reason);
                  await loadData();
                }}
                onReconcileOnlinePayment={async (orderId, status, reason, reference) => {
                  await adminApi.reconcileOnlinePaymentSettlement(orderId, status, reason, reference);
                  await loadData();
                }}
                onApprovePayout={async (payoutId) => {
                  await adminApi.approveDeliveryPayout(payoutId);
                  await loadData();
                }}
                onSettlePayout={async (payoutId, reference) => {
                  await adminApi.settleDeliveryPayout(payoutId, reference);
                  await loadData();
                }}
                onUpdateVendorSettlement={async (settlementId, status, payoutReference) => {
                  await adminApi.updateVendorSettlement(settlementId, status, payoutReference ? { payoutReference } : undefined);
                  await loadData();
                }}
              />
              : <Navigate to="/" replace />} />
            <Route path="/vendor-earnings" element={admin.role === 'SUPER_ADMIN' ? <VendorEarningsDashboard /> : <Navigate to="/" replace />} />
            <Route path="/vendors" element={<VendorManagementPage vendors={vendors} />} />
            <Route path="/vendor-approvals" element={<VendorApprovalsPage vendors={vendors} busyVendor={busyVendor} onReview={reviewVendor} />} />
            <Route path="/product-approvals" element={<ProductApprovalsPage />} />
            <Route path="/budget-offers" element={admin.role === 'SUPER_ADMIN' ? <BudgetOffersPage /> : <Navigate to="/" replace />} />
            <Route path="/customers" element={<CustomersPage customers={customers} />} />
            <Route path="/delivery" element={<DeliveryPage partners={delivery} />} />
            <Route path="/accounts" element={<AccountsPage users={users} />} />
            <Route path="/alerts" element={<AlertsPage orders={orders} vendors={vendors} />} />
            <Route path="/notifications" element={<AdminNotificationsPage userId={admin.id} />} />
            <Route path="/promotions" element={admin.role === 'SUPER_ADMIN' ? <PromotionManagement /> : <Navigate to="/" replace />} />
            <Route path="/marketing/banners" element={admin.role === 'SUPER_ADMIN' ? <MarketingBannersPage /> : <Navigate to="/" replace />} />
            <Route path="/settings/delivery-pricing" element={admin.role === 'SUPER_ADMIN' ? <DeliveryPricingManagement /> : <Navigate to="/" replace />} />
          </Routes>}
        </div>
      </main>
    </div>
  );
}

function adminInitials(name?: string) {
  const words = (name ?? 'Admin').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join('');
}

function PageLoadingSkeleton() {
  return <section aria-label="Loading dashboard data" aria-busy="true" className="animate-pulse space-y-5">
    <div className="h-16 max-w-sm rounded-lg bg-white" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 rounded-xl border border-[#E2E8F0] bg-white" />)}</div>
    <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]"><div className="h-72 rounded-xl border border-[#E2E8F0] bg-white" /><div className="h-72 rounded-xl border border-[#E2E8F0] bg-white" /></div>
    <div className="h-56 rounded-xl border border-[#E2E8F0] bg-white" />
  </section>;
}
