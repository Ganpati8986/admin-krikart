import { adminRequest } from './api';

export type AdminEarningsFilters = {
  period?: 'today' | 'monthly' | 'yearly' | 'custom';
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  timezone?: string;
  status?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  page?: number;
  pageSize?: number;
};

export type AdminVendorEarnings = {
  vendorId: string;
  businessName: string;
  commissionRateBps: number;
  completedOrders: number;
  grossRevenue: number;
  customerProductAmount: number;
  customerRefundAmount: number;
  vendorDiscounts: number;
  platformDiscounts: number;
  commission: number;
  refundAdjustments: number;
  netEarnings: number;
  platformMargin: number;
};

export type AdminSettlement = {
  id: string;
  vendorId: string;
  amount: number;
  paidAmount: number;
  customerProductAmount: number;
  customerRefundAmount: number;
  grossEligibleAmount: number;
  vendorDiscountAmount: number;
  platformDiscountAmount: number;
  commissionAmount: number;
  refundAdjustment: number;
  paymentMethod: 'COD' | 'ONLINE' | null;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  payoutReference: string | null;
  rejectionReason: string | null;
  createdAt: string;
  vendor: { id: string; businessName: string };
  suborder: {
    id: string;
    parentOrder: { orderCode: string; createdAt: string; paymentMethod: string };
  } | null;
};

export type PromotionRecord = {
  id: string;
  name: string;
  kind: 'FREE_DELIVERY' | 'MIN_ORDER_DISCOUNT';
  discountType: 'FIXED' | 'PERCENTAGE';
  value: number;
  minimumOrderAmount: number;
  maximumDiscount: number | null;
  serviceZoneIds: string[];
  categoryIds: string[];
  vendorIds: string[];
  customerIds: string[];
  customerGroupIds: string[];
  productTypes: Array<'FOOD' | 'GROCERY'>;
  totalUsageLimit: number | null;
  perCustomerUsageLimit: number | null;
  fundingSource: 'PLATFORM_FUNDED' | 'VENDOR_FUNDED' | 'SHARED_FUNDED';
  platformFundingPercent: number;
  vendorFundingPercent: number;
  vendorAgreements?: Array<{ vendorId: string; status: string; vendor: { id: string; businessName: string } }>;
  isActive: boolean;
  validFrom: string;
  validTo: string;
};

export type CouponRecord = {
  id: string;
  code: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  categoryIds: string[];
  vendorIds: string[];
  customerIds: string[];
  customerGroupIds: string[];
  firstOrderOnly: boolean;
  totalUsageLimit: number | null;
  perCustomerUsageLimit: number | null;
  fundingSource: 'PLATFORM_FUNDED' | 'VENDOR_FUNDED' | 'SHARED_FUNDED';
  platformFundingPercent: number;
  vendorFundingPercent: number;
  vendorAgreements?: Array<{ vendorId: string; status: string; vendor: { id: string; businessName: string } }>;
  isActive: boolean;
  validFrom: string;
  validTo: string;
};

export type DiscountFundingRecord = {
  id: string;
  type: 'PRODUCT_DISCOUNT' | 'COUPON' | 'PROMOTION' | 'REWARD_COINS' | 'FREE_DELIVERY';
  fundingSource: 'PLATFORM_FUNDED' | 'VENDOR_FUNDED';
  sourceId: string;
  sourceLabel: string;
  amount: number;
  createdAt: string;
  order: { orderCode: string; status: string; createdAt: string };
  vendor: { id: string; businessName: string } | null;
};

export type PromotionSettings = {
  allowCouponWithPromotion: boolean;
  allowRewardWithCoupon: boolean;
  allowRewardWithPromotion: boolean;
  allowMultiplePromotions: boolean;
  packagingFee: number;
  handlingFee: number;
};

export type LoyaltySettings = {
  enabled: boolean;
  rewardMode: 'FIXED' | 'RANDOM';
  minimumRewardCoins: number;
  maximumRewardCoins: number;
  coinsPerRupee: number;
  minimumOrderForReward: number;
  qualifyingOrderStatus: 'DELIVERED';
  minimumOrderForRedemption: number;
  maximumCoinsPerOrder: number | null;
  maximumDiscountPercent: number;
  expiryDays: number | null;
  categoryIds: string[];
};

export type PromotionOptions = {
  categories: Array<{ id: string; name: string; type: string }>;
  vendors: Array<{ id: string; businessName: string }>;
  zones: Array<{ id: string; name: string; city: string }>;
  customerGroups: Array<{ id: string; name: string }>;
};

export type CustomerGroupRecord = {
  id: string;
  name: string;
  _count: { customers: number };
};

export type DeliveryPricingConfig = {
  id: string;
  zoneId: string;
  productType: 'FOOD' | 'GROCERY';
  customerBaseCharge: number;
  customerIncludedDistanceKm: number;
  customerChargePerKm: number;
  minimumDeliveryCharge: number;
  maximumDeliveryCharge: number;
  maximumDeliveryDistanceKm: number;
  freeDeliveryThreshold: number | null;
  distanceRounding: 'EXACT' | 'ROUND_UP';
  partnerBaseEarning: number;
  partnerIncludedDistanceKm: number;
  partnerEarningPerKm: number;
  batchDeliveryEnabled: boolean;
  multiPickupIncentive: number;
  peakHourIncentive: number;
  nightDeliveryIncentive: number;
  waitingTimeFreeMinutes: number;
  waitingTimePerMinute: number;
  otherBonus: number;
  effectiveFrom: string;
  isActive: boolean;
};

export type DeliveryServiceZone = {
  id: string;
  name: string;
  city: string;
  pincode: string | null;
  isEnabled: boolean;
  deliveryPricingConfigs: DeliveryPricingConfig[];
};

export type DeliveryPricingInput = Omit<DeliveryPricingConfig, 'id' | 'zoneId'> & { zoneId: string };

const request = adminRequest;

export const platformAdminApi = {
  vendorEarnings: (filters: AdminEarningsFilters = {}) => request<{
    totals: { grossRevenue: number; customerProductAmount: number; customerRefundAmount: number; platformMargin: number; vendorDiscounts: number; platformDiscounts: number; commission: number; refundAdjustments: number; netEarnings: number; completedOrders: number };
    page: number;
    pageSize: number;
    total: number;
    vendors: AdminVendorEarnings[];
  }>(`/admin/vendors/earnings?${queryString(filters)}`),
  vendorSettlements: (filters: AdminEarningsFilters = {}) => request<{ page: number; pageSize: number; total: number; transactions: AdminSettlement[] }>(`/admin/vendors/settlements?${queryString(filters)}`),
  updateSettlement: (id: string, status: 'APPROVED' | 'REJECTED' | 'PAID', details?: { payoutReference?: string; rejectionReason?: string }) => request<AdminSettlement>(`/admin/vendors/settlements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...details }),
  }),
  updateVendorCommission: (id: string, commissionRateBps: number) => request(`/admin/vendors/${encodeURIComponent(id)}/commission`, {
    method: 'PATCH',
    body: JSON.stringify({ commissionRateBps }),
  }),
  promotionOptions: () => request<PromotionOptions>('/admin/promotion-options'),
  promotions: () => request<PromotionRecord[]>('/admin/promotions'),
  savePromotion: (payload: Omit<PromotionRecord, 'id'>, id?: string) => request<PromotionRecord>(`/admin/promotions${id ? `/${encodeURIComponent(id)}` : ''}`, {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(payload),
  }),
  coupons: () => request<CouponRecord[]>('/admin/coupons'),
  saveCoupon: (payload: Omit<CouponRecord, 'id'>, id?: string) => request<CouponRecord>(`/admin/coupons${id ? `/${encodeURIComponent(id)}` : ''}`, {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(payload),
  }),
  discountFundingLedger: (filters: { fundingSource?: DiscountFundingRecord['fundingSource']; type?: DiscountFundingRecord['type']; startDate?: string; endDate?: string; page?: number; pageSize?: number } = {}) => request<{
    page: number;
    pageSize: number;
    total: number;
    totals: { platformFunded: number; vendorFunded: number };
    entries: DiscountFundingRecord[];
  }>(`/admin/discount-funding-ledger?${queryString(filters)}`),
  promotionSettings: () => request<{ promotion: PromotionSettings | null; loyalty: LoyaltySettings | null }>('/admin/promotion-settings'),
  savePromotionSettings: (payload: PromotionSettings) => request<PromotionSettings>('/admin/promotion-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  saveLoyaltySettings: (payload: LoyaltySettings) => request<LoyaltySettings>('/admin/loyalty-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  customerGroups: () => request<CustomerGroupRecord[]>('/admin/customer-groups'),
  createCustomerGroup: (name: string) => request<CustomerGroupRecord>('/admin/customer-groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  assignCustomerGroup: (customerId: string, customerGroupId: string | null) => request(`/admin/customers/${encodeURIComponent(customerId)}/customer-group`, {
    method: 'PATCH',
    body: JSON.stringify({ customerGroupId }),
  }),
  deliveryPricing: () => request<DeliveryServiceZone[]>('/admin/delivery-pricing'),
  saveDeliveryZone: (payload: { name: string; city: string; pincode?: string | null; isEnabled: boolean }, id?: string) =>
    request<DeliveryServiceZone>(`/admin/delivery-pricing/zones${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    }),
  saveDeliveryPricing: (payload: DeliveryPricingInput) =>
    request<DeliveryPricingConfig>('/admin/delivery-pricing/configurations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

function queryString(filters: AdminEarningsFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}
