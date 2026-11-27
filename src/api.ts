// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4100';
const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://krikart-backend.onrender.com';
let accessToken = '';

export function setAccessToken(token: string) {
  accessToken = token;
}

export type Overview = {
  totalOrders: number;
  todayRevenue: number;
  activeVendors: number;
  pendingApprovals: number;
  activeDeliveryPartners: number;
  pendingRefunds: number;
  reportingWindowDays: number;
  orderRejectionRate: number;
  orderCancellationRate: number;
  outOfStockProducts: number;
  deliveryCostPerOrder: number | null;
  customerComplaints: number;
  averageVendorResponseMinutes: number | null;
  newCustomerAcquisitionCost: number | null;
};

export type FinancialOverview = {
  summary: {
    totalCustomerPayable: number;
    onlineCollected: number;
    codCollected: number;
    totalCollected: number;
    collectionPending: number;
    reconciliationPending: number;
    customerDeliveryCharges: number;
    onlineGatewaySettlementPending: number;
    deliveryChargesCollected: number;
    totalVendorPayable: number;
    vendorSettlementPending: number;
    vendorSettlementApproved: number;
    vendorSettlementPaid: number;
    totalDeliveryPartnerEarnings: number;
    deliveryPartnerPayable: number;
    deliveryPartnerPayoutApproved: number;
    deliveryPartnerPayoutPaid: number;
    refundsPending: number;
    totalRefunds: number;
    commissionRevenue: number;
    deliveryChargeRevenue: number;
    platformGrossRevenue: number;
    platformRevenue: number;
    platformDiscountExpense: number;
    freeDeliveryExpense: number;
    rewardExpense: number;
    deliveryPartnerExpense: number;
    platformRefundExpense: number;
    vendorFundedDiscounts: number;
    otherAdjustments: number;
    platformFundedExpenses: number;
    platformProfitLoss: number;
    totalSettlementObligations: number;
    collectionStatuses: Array<{ status: string; count: number; amount: number }>;
    vendorSettlementStatuses: Array<{ status: string; count: number; amount: number }>;
    deliveryPayoutStatuses: Array<{ status: string; count: number; amount: number }>;
  };
  collections: Array<{ id: string; orderCode: string; amount: number; customerPayable: number; amountCollected: number; status: string; reason: string; createdAt: string }>;
  vendorSettlements: Array<{ id: string; orderCode: string; vendor: string; amount: number; status: string; workflowStatus: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'; reason: string; createdAt: string }>;
  deliveryPayouts: Array<{ id: string; partnerId: string; partner: string; amount: number; status: string; workflowStatus: 'PENDING' | 'APPROVED' | 'PAID'; reason: string; createdAt: string }>;
  refunds: Array<{ id: string; orderId: string; amount: number; status: string; reason: string; createdAt: string }>;
  onlinePayments: Array<{ id: string; orderId: string; orderCode: string; amount: number; gatewayReference: string | null; status: string; reason: string; createdAt: string }>;
};

export type User = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
};

export type Vendor = {
  id: string;
  businessName: string;
  category: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason: string | null;
  kycVerified: boolean;
  businessAddress: string | null;
  user: { fullName: string | null; phone: string };
  products: Array<{ id: string }>;
  documents: Array<{ id: string; kind: string; fileUrl: string; createdAt: string }>;
};

export type ProductReviewItem = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  type: 'GROCERY' | 'FOOD';
  basePrice: number;
  customerSellingPrice?: number | null;
  discountPrice: number | null;
  vendorFundedDiscount?: number;
  vendorFundedDiscountAgreed?: boolean;
  isActive: boolean;
  status: string;
  rejectionReason: string | null;
  pendingChanges: Record<string, unknown> | null;
  imageUrl: string | null;
  vendor: { id: string; businessName: string; user: { fullName: string | null; phone: string } };
  category: { id: string; name: string };
  budgetOffer?: {
    id: string;
    categoryId: string;
    offerPrice: number;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
    category: { id: string; name: string; maxDisplayPrice: number };
  } | null;
  inventory: Array<{ available: number; reserved: number; sold: number; lowStockAt: number }>;
  variants: Array<{ stock: number; reserved: number; sold: number }>;
};

export type BudgetOfferCategory = {
  id: string;
  name: string;
  maxDisplayPrice: number;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  _count?: { productOffers: number };
};

export type MarketingBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaText: string;
  destination: 'GROCERY' | 'FOOD' | 'BUDGET_OFFERS' | 'PRODUCT' | 'CATEGORY' | 'CUSTOM';
  destinationId: string | null;
  customPath: string | null;
  surface: 'CAROUSEL' | 'STRIP' | 'LIMITED_TIME';
  priority: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  showCountdown: boolean;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  route: string | null;
  isRead: boolean;
  createdAt: string;
};

export type AdminOrder = {
  id: string;
  orderCode: string;
  status: string;
  total: number;
  paymentStatus: string;
  createdAt: string;
  customerId?: string;
  paymentMethod?: string;
  suborders: Array<{
    id: string;
    vendorId: string;
    status: string;
    total: number;
    vendor: { businessName: string };
    orderItems?: Array<{ quantity: number; total: number; product: { name: string; type?: string } }>;
  }>;
};

export type OrderAuditRecord = {
  id: string;
  action: string;
  module: string;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
  admin: { user: { fullName: string | null } };
};

export type OrderDetail = Omit<AdminOrder, 'suborders'> & {
  collectionStatus: string;
  collectionReason: string | null;
  collectionConfirmedAt: string | null;
  listedProductSubtotal: number;
  subtotal: number;
  productDiscount: number;
  couponDiscount: number;
  promotionDiscount: number;
  rewardDiscount: number;
  freeDeliveryDiscount: number;
  redeemedRewardCoins: number;
  deliveryFee: number;
  customerDeliveryCharge: number;
  packagingFee: number;
  handlingFee: number;
  customerAmountPaid: number;
  customerAmountCollected: number;
  customerAmountPending: number;
  paymentMethod: string;
  pricingSnapshot: Record<string, unknown> | null;
  deliveryAddressSnapshot: Record<string, unknown> | null;
  customer: { user: { fullName: string | null; phone: string } };
  payments: Array<{
    id: string;
    method: string;
    status: string;
    amount: number;
    gatewayRef: string | null;
    settlementReference: string | null;
    gatewaySettlementStatus: string;
    gatewaySettlementReason: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
  statusHistory: Array<{
    id: string;
    suborderId: string | null;
    assignmentId: string | null;
    status: string;
    actorUserId: string | null;
    actorRole: string;
    reason: string | null;
    createdAt: string;
  }>;
  suborders: Array<{
    id: string;
    vendorId: string;
    status: string;
    subtotal: number;
    customerPayable: number;
    customerAmountCollected: number;
    deliveryFee: number;
    deliveryPartnerEarning: number;
    total: number;
    createdAt: string;
    deliveryPricingSnapshot: Record<string, unknown> | null;
    vendorSnapshot: Record<string, unknown> | null;
    vendor: { businessName: string; businessAddress: string | null; user: { fullName: string | null; phone: string } };
    orderItems: Array<{
      id: string;
      suborderId: string;
      quantity: number;
      unitPrice: number;
      total: number;
      vendorEligibleAmount: number;
      vendorDiscountAmount: number;
      platformDiscountAmount: number;
      platformCommission: number;
      productSnapshot: Record<string, unknown> | null;
      product: { id: string; name: string; imageUrl: string | null };
    }>;
    assignments: Array<{
      id: string;
      status: string;
      partnerId: string;
      createdAt: string;
      pickedUpAt: string | null;
      deliveredAt: string | null;
      earningBreakdown: Record<string, unknown> | null;
      partner: { user: { fullName: string | null; phone: string } };
    }>;
    settlement: null | {
      id: string;
      amount: number;
      paidAmount: number;
      status: string;
      financialStatus: string;
      financialReason: string;
      payoutReference: string | null;
      approvedAt: string | null;
      paidAt: string | null;
    };
    refunds: Array<{ id: string; amount: number; vendorAdjustment: number; platformFundedAmount: number; reason: string | null; financialStatus: string; createdAt: string }>;
  }>;
  financialLedger: Array<{
    id: string;
    transactionId: string;
    idempotencyKey: string;
    suborderId: string | null;
    partnerId: string | null;
    vendorId: string | null;
    type: string;
    direction: string;
    amount: number;
    paymentMethod: string | null;
    financialStatus: string | null;
    referenceId: string | null;
    details: unknown;
    createdAt: string;
  }>;
  deliveryLedger: Array<{ id: string; idempotencyKey: string; suborderId: string; partnerId: string | null; type: string; amount: number; details: unknown; createdAt: string }>;
  discountLedger: Array<{ id: string; suborderId: string | null; vendorId: string | null; type: string; fundingSource: string; sourceLabel: string; amount: number; createdAt: string }>;
  payouts: Array<{ id: string; amount: number; status: string; financialStatus: string; financialReason: string; payoutReference: string | null; createdAt: string; paidAt: string | null }>;
  history: { orderAudit: OrderAuditRecord[]; settlementAudit: OrderAuditRecord[]; payoutAudit: OrderAuditRecord[] };
};

export type AdminOrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'PAYMENT_FAILED'
  | 'REFUND_PENDING'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED';

export type Customer = {
  id: string;
  loyaltyPoints: number;
  isBlocked: boolean;
  user: { fullName: string | null; phone: string | null; email: string | null; status: string };
  _count: { orders: number };
};

export type DeliveryPartner = {
  id: string;
  fullName: string;
  approvalStatus: string;
  isOnline: boolean;
  user: { phone: string; status: string };
  assignments: Array<{ id: string; status: string }>;
};

let refreshInFlight: Promise<boolean> | null = null;

async function request<T>(path: string, init?: RequestInit, retryAfterRefresh = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Client-Platform': 'web', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init?.headers },
  });
  if (response.status === 401 && retryAfterRefresh && !path.startsWith('/auth/')) {
    if (await refreshAccessToken()) return request<T>(path, init, false);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }
  return payload as T;
}

export { request as adminRequest };

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Client-Platform': 'web' },
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      accessToken = '';
      return false;
    }
    if (!response.ok) throw new Error(payload.message ?? `Session refresh failed (${response.status})`);
    accessToken = payload.token;
    return true;
  })();
  try { return await refreshInFlight; } finally { refreshInFlight = null; }
}

export async function restoreAdminSession() {
  if (!await refreshAccessToken()) return null;
  const identity = await request<{ id: string; role: string }>('/auth/session');
  if (!['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'VENDOR_MANAGER', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'].includes(identity.role)) {
    await logoutAdminSession();
    return null;
  }
  return { ...identity, token: accessToken };
}

export async function logoutAdminSession() {
  try {
    await request<{ success: boolean }>('/auth/logout', { method: 'POST' }, false);
  } finally {
    accessToken = '';
  }
}

export const adminApi = {
  signIn: async (phone: string, otp: string) => {
    const result = await request<{ success: boolean; message: string; token?: string; user?: { id: string; role: string } }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    if (!result.success || !result.token || !result.user || !['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'VENDOR_MANAGER', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'].includes(result.user.role)) {
      throw new Error(result.message || 'This account does not have admin access.');
    }
    setAccessToken(result.token);
    return { id: result.user.id, role: result.user.role, token: result.token };
  },
  overview: () => request<Overview>('/admin/overview'),
  financials: () => request<FinancialOverview>('/admin/financials'),
  orders: () => request<AdminOrder[]>('/orders'),
  orderDetails: (id: string) => request<OrderDetail>(`/admin/orders/${encodeURIComponent(id)}/details`),
  overrideOrderStatus: (id: string, status: AdminOrderStatus, reason: string, suborderId?: string) => request<AdminOrder>(`/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, ...(suborderId ? { suborderId } : {}) }),
  }),
  reconcileCollection: (orderId: string, status: 'COLLECTED' | 'RECONCILIATION_PENDING', reason: string) => request(`/admin/orders/${encodeURIComponent(orderId)}/collection`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  }),
  reconcileOnlinePaymentSettlement: (
    orderId: string,
    status: 'SETTLED' | 'RECONCILIATION_PENDING',
    reason: string,
    settlementReference?: string,
  ) => request(`/admin/orders/${encodeURIComponent(orderId)}/payment-settlement`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, ...(settlementReference ? { settlementReference } : {}) }),
  }),
  settleDeliveryPayout: (payoutId: string, payoutReference: string) => request(`/admin/delivery-payouts/${encodeURIComponent(payoutId)}/settle`, {
    method: 'PATCH',
    body: JSON.stringify({ payoutReference }),
  }),
  approveDeliveryPayout: (payoutId: string) => request(`/admin/delivery-payouts/${encodeURIComponent(payoutId)}/approve`, {
    method: 'PATCH',
  }),
  updateVendorSettlement: (id: string, status: 'APPROVED' | 'PAID', details?: { payoutReference?: string }) => request(`/admin/vendors/settlements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...details }),
  }),
  users: () => request<User[]>('/users'),
  vendors: (status?: string) => request<Vendor[]>(`/admin/vendors${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  productsForReview: () => request<ProductReviewItem[]>('/admin/products/approvals'),
  products: () => request<ProductReviewItem[]>('/admin/products'),
  budgetOfferCategories: () => request<BudgetOfferCategory[]>('/budget-offers/admin/categories'),
  marketingBanners: () => request<MarketingBanner[]>('/marketing/admin/banners'),
  saveMarketingBanner: (id: string | undefined, payload: Omit<MarketingBanner, 'id'>) => request<MarketingBanner>(
    id ? `/marketing/admin/banners/${encodeURIComponent(id)}` : '/marketing/admin/banners',
    { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
  ),
  deleteMarketingBanner: (id: string) => request<{ success: boolean }>(`/marketing/admin/banners/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  marketingProducts: () => request<ProductReviewItem[]>('/admin/products'),
  marketingCategories: () => request<Array<{ id: string; name: string; type: 'GROCERY' | 'FOOD' }>>('/categories'),
  saveBudgetOfferCategory: (id: string | undefined, payload: Omit<BudgetOfferCategory, 'id' | '_count'>) => request<BudgetOfferCategory>(
    id ? `/budget-offers/admin/categories/${encodeURIComponent(id)}` : '/budget-offers/admin/categories',
    { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
  ),
  deleteBudgetOfferCategory: (id: string) => request<{ success: boolean }>(`/budget-offers/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveProductBudgetOffer: (id: string, payload: { categoryId: string; offerPrice: number; isActive?: boolean; startDate?: string | null; endDate?: string | null } | { remove: true }) => request(`/budget-offers/admin/products/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  bulkBudgetOffers: (payload: {
    assignments?: Array<{ productId: string; categoryId: string; offerPrice: number; isActive?: boolean; startDate?: string | null; endDate?: string | null }>;
    productIds?: string[];
    action?: 'ACTIVATE' | 'DEACTIVATE' | 'REMOVE';
  }) => request<{ updated: number } | Array<{ id: string }>>('/budget-offers/admin/products/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  reviewProduct: (id: string, status: 'PUBLISHED' | 'PAUSED' | 'REJECTED', reason?: string, patch?: Record<string, unknown>) => request<ProductReviewItem>(`/admin/products/${encodeURIComponent(id)}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, ...patch }),
  }),
  adjustInventory: (id: string, available: number, reason: string) => request(`/admin/products/${encodeURIComponent(id)}/inventory`, {
    method: 'PATCH',
    body: JSON.stringify({ available, reason }),
  }),
  inventoryHistory: (id: string) => request<Array<{ id: string; type: string; quantity: number; actorUserId: string | null; note: string | null; createdAt: string }>>(`/admin/products/${encodeURIComponent(id)}/inventory/history`),
  customers: () => request<Customer[]>('/admin/customers'),
  deliveryPartners: () => request<DeliveryPartner[]>('/admin/delivery-partners'),
  reviewVendor: (id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', reason?: string) => request<Vendor>(`/admin/vendors/${encodeURIComponent(id)}/approval`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  }),
  notifications: (_userId: string) => request<Notification[]>('/notifications'),
  unreadCount: (_userId: string) => request<{ count: number }>('/notifications/unread-count'),
  markNotificationRead: (_userId: string, notificationId: string) => request<{ success: boolean }>('/notifications/read', {
    method: 'PATCH',
    body: JSON.stringify({ notificationId }),
  }),
};
