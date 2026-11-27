import { FormEvent, useEffect, useState } from 'react';
import {
  CouponRecord,
  CustomerGroupRecord,
  DiscountFundingRecord,
  LoyaltySettings,
  PromotionOptions,
  PromotionRecord,
  PromotionSettings,
  platformAdminApi,
} from '../../platformApi';
import './PromotionManagement.css';

type PromotionForm = Omit<PromotionRecord, 'id' | 'vendorAgreements' | 'validFrom' | 'validTo' | 'value' | 'minimumOrderAmount' | 'maximumDiscount' | 'totalUsageLimit' | 'perCustomerUsageLimit'> & {
  id?: string;
  validFrom: string;
  validTo: string;
  value: string;
  minimumOrderAmount: string;
  maximumDiscount: string;
  totalUsageLimit: string;
  perCustomerUsageLimit: string;
};

type CouponForm = Omit<CouponRecord, 'id' | 'vendorAgreements' | 'validFrom' | 'validTo' | 'value' | 'minOrderValue' | 'maxDiscount' | 'totalUsageLimit' | 'perCustomerUsageLimit'> & {
  id?: string;
  validFrom: string;
  validTo: string;
  value: string;
  minOrderValue: string;
  maxDiscount: string;
  totalUsageLimit: string;
  perCustomerUsageLimit: string;
};

const emptyPromotion = (): PromotionForm => ({
  name: '',
  kind: 'FREE_DELIVERY',
  discountType: 'FIXED',
  value: '0',
  minimumOrderAmount: '500',
  maximumDiscount: '',
  serviceZoneIds: [],
  categoryIds: [],
  vendorIds: [],
  customerIds: [],
  customerGroupIds: [],
  productTypes: [],
  totalUsageLimit: '',
  perCustomerUsageLimit: '',
  fundingSource: 'PLATFORM_FUNDED',
  platformFundingPercent: 100,
  vendorFundingPercent: 0,
  isActive: true,
  validFrom: localDateTime(new Date()),
  validTo: localDateTime(new Date(Date.now() + 30 * 86_400_000)),
});

const emptyCoupon = (): CouponForm => ({
  code: '',
  type: 'FIXED',
  value: '50',
  minOrderValue: '0',
  maxDiscount: '',
  categoryIds: [],
  vendorIds: [],
  customerIds: [],
  customerGroupIds: [],
  firstOrderOnly: false,
  totalUsageLimit: '',
  perCustomerUsageLimit: '',
  fundingSource: 'PLATFORM_FUNDED',
  platformFundingPercent: 100,
  vendorFundingPercent: 0,
  isActive: true,
  validFrom: localDateTime(new Date()),
  validTo: localDateTime(new Date(Date.now() + 30 * 86_400_000)),
});

const emptyPromotionSettings: PromotionSettings = {
  allowCouponWithPromotion: true,
  allowRewardWithCoupon: true,
  allowRewardWithPromotion: true,
  allowMultiplePromotions: false,
  packagingFee: 0,
  handlingFee: 0,
};

const emptyLoyaltySettings: LoyaltySettings = {
  enabled: false,
  rewardMode: 'RANDOM',
  minimumRewardCoins: 5,
  maximumRewardCoins: 20,
  coinsPerRupee: 1,
  minimumOrderForReward: 0,
  qualifyingOrderStatus: 'DELIVERED',
  minimumOrderForRedemption: 0,
  maximumCoinsPerOrder: null,
  maximumDiscountPercent: 100,
  expiryDays: null,
  categoryIds: [],
};

export function PromotionManagement() {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [fundingLedger, setFundingLedger] = useState<{
    totals: { platformFunded: number; vendorFunded: number };
    entries: DiscountFundingRecord[];
    total: number;
  } | null>(null);
  const [options, setOptions] = useState<PromotionOptions | null>(null);
  const [groups, setGroups] = useState<CustomerGroupRecord[]>([]);
  const [promotion, setPromotion] = useState<PromotionForm>(emptyPromotion);
  const [coupon, setCoupon] = useState<CouponForm>(emptyCoupon);
  const [settings, setSettings] = useState<PromotionSettings>(emptyPromotionSettings);
  const [loyalty, setLoyalty] = useState<LoyaltySettings>(emptyLoyaltySettings);
  const [groupName, setGroupName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerGroupId, setCustomerGroupId] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    try {
      const [promotionRows, couponRows, configured, references, groupRows, fundingRows] = await Promise.all([
        platformAdminApi.promotions(),
        platformAdminApi.coupons(),
        platformAdminApi.promotionSettings(),
        platformAdminApi.promotionOptions(),
        platformAdminApi.customerGroups(),
        platformAdminApi.discountFundingLedger({ pageSize: 20 }),
      ]);
      setPromotions(promotionRows);
      setCoupons(couponRows);
      setSettings(configured.promotion ?? emptyPromotionSettings);
      setLoyalty(configured.loyalty ?? emptyLoyaltySettings);
      setOptions(references);
      setGroups(groupRows);
      setFundingLedger(fundingRows);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load promotion settings.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function savePromotion(event: FormEvent) {
    event.preventDefault();
    setBusy('promotion');
    setError('');
    try {
      const { id, ...form } = promotion;
      await platformAdminApi.savePromotion({
        ...form,
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString(),
        value: Number(form.value),
        minimumOrderAmount: Number(form.minimumOrderAmount),
        maximumDiscount: optionalNumber(form.maximumDiscount),
        totalUsageLimit: optionalNumber(form.totalUsageLimit),
        perCustomerUsageLimit: optionalNumber(form.perCustomerUsageLimit),
      }, id);
      setPromotion(emptyPromotion());
      setSuccess('Promotion saved.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save promotion.');
    } finally { setBusy(''); }
  }

  async function saveCoupon(event: FormEvent) {
    event.preventDefault();
    setBusy('coupon');
    setError('');
    try {
      const { id, ...form } = coupon;
      await platformAdminApi.saveCoupon({
        ...form,
        code: form.code.trim().toUpperCase(),
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString(),
        value: Number(form.value),
        minOrderValue: optionalNumber(form.minOrderValue) ?? 0,
        maxDiscount: optionalNumber(form.maxDiscount),
        totalUsageLimit: optionalNumber(form.totalUsageLimit),
        perCustomerUsageLimit: optionalNumber(form.perCustomerUsageLimit),
      }, id);
      setCoupon(emptyCoupon());
      setSuccess('Coupon saved.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save coupon.');
    } finally { setBusy(''); }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setBusy('settings');
    setError('');
    try {
      await platformAdminApi.savePromotionSettings(settings);
      setSuccess('Discount stacking and checkout charges saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save promotion settings.');
    } finally { setBusy(''); }
  }

  async function saveLoyalty(event: FormEvent) {
    event.preventDefault();
    setBusy('loyalty');
    setError('');
    try {
      if (loyalty.minimumRewardCoins > loyalty.maximumRewardCoins) throw new Error('Maximum reward coins must be at least the minimum.');
      await platformAdminApi.saveLoyaltySettings(loyalty);
      setSuccess('Reward coin settings saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save reward settings.');
    } finally { setBusy(''); }
  }

  async function addGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupName.trim()) return;
    setBusy('group');
    try {
      await platformAdminApi.createCustomerGroup(groupName.trim());
      setGroupName('');
      await load();
      setSuccess('Customer group created.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create customer group.');
    } finally { setBusy(''); }
  }

  async function assignGroup(event: FormEvent) {
    event.preventDefault();
    if (!customerId.trim()) return;
    setBusy('assignment');
    try {
      await platformAdminApi.assignCustomerGroup(customerId.trim(), customerGroupId || null);
      setSuccess('Customer group assignment saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not assign customer group.');
    } finally { setBusy(''); }
  }

  return <section className="promotion-management">
    <header className="promotion-heading">
      <div><p className="eyebrow">CUSTOMER INCENTIVES</p><h2>Offer, discount & loyalty management</h2><p className="muted">Configure server-calculated promotions, coupons, delivery waivers and reward coins.</p></div>
      <button onClick={() => void load()}>Refresh</button>
    </header>
    {error && <p role="alert" className="error">{error}</p>}
    {success && <p role="status" className="success">{success}</p>}

    <div className="promotion-grid">
      <section className="promotion-card">
        <h3>{promotion.id ? 'Edit promotion' : 'Create promotion'}</h3>
        <form onSubmit={(event) => void savePromotion(event)}>
          <label>Offer name<input required value={promotion.name} onChange={(event) => setPromotion({ ...promotion, name: event.target.value })} /></label>
          <div className="promotion-fields">
            <label>Promotion type<select value={promotion.kind} onChange={(event) => setPromotion({ ...promotion, kind: event.target.value as PromotionForm['kind'] })}><option value="FREE_DELIVERY">Free delivery</option><option value="MIN_ORDER_DISCOUNT">Minimum order discount</option></select></label>
            <label>Minimum eligible subtotal (₹)<input type="number" min="0" value={promotion.minimumOrderAmount} onChange={(event) => setPromotion({ ...promotion, minimumOrderAmount: event.target.value })} /></label>
          </div>
          {promotion.kind === 'MIN_ORDER_DISCOUNT' && <div className="promotion-fields">
            <label>Discount type<select value={promotion.discountType} onChange={(event) => setPromotion({ ...promotion, discountType: event.target.value as PromotionForm['discountType'] })}><option value="FIXED">Fixed rupees</option><option value="PERCENTAGE">Percentage</option></select></label>
            <label>Discount value<input type="number" min="0" value={promotion.value} onChange={(event) => setPromotion({ ...promotion, value: event.target.value })} /></label>
            <label>Maximum discount cap (₹)<input type="number" min="0" value={promotion.maximumDiscount} onChange={(event) => setPromotion({ ...promotion, maximumDiscount: event.target.value })} /></label>
          </div>}
          {promotion.kind === 'FREE_DELIVERY' && <label>Delivery waiver cap (₹; empty = full charge)<input type="number" min="0" value={promotion.maximumDiscount} onChange={(event) => setPromotion({ ...promotion, maximumDiscount: event.target.value })} /></label>}
          <label>Discount funding source<select value={promotion.fundingSource} onChange={(event) => {
            const fundingSource = event.target.value as PromotionForm['fundingSource'];
            setPromotion({ ...promotion, fundingSource, platformFundingPercent: fundingSource === 'PLATFORM_FUNDED' ? 100 : fundingSource === 'VENDOR_FUNDED' ? 0 : 50, vendorFundingPercent: fundingSource === 'PLATFORM_FUNDED' ? 0 : fundingSource === 'VENDOR_FUNDED' ? 100 : 50 });
          }}><option value="PLATFORM_FUNDED">Platform funded</option><option value="VENDOR_FUNDED">Vendor funded (requires vendor consent)</option><option value="SHARED_FUNDED">Shared funded</option></select></label>
          {promotion.fundingSource === 'SHARED_FUNDED' && <div className="promotion-fields">
            <label>Platform contribution (%)<input type="number" min="1" max="99" value={promotion.platformFundingPercent} onChange={(event) => setPromotion({ ...promotion, platformFundingPercent: Number(event.target.value), vendorFundingPercent: 100 - Number(event.target.value) })} /></label>
            <label>Vendor contribution (%)<input readOnly value={promotion.vendorFundingPercent} /></label>
          </div>}
          {promotion.fundingSource !== 'PLATFORM_FUNDED' && <p className="muted">Vendors must explicitly accept the exact funding split before their eligible products receive this offer.</p>}
          <OptionSelect label="Applicable zones (empty = all)" values={promotion.serviceZoneIds} options={options?.zones.map((item) => ({ value: item.id, label: `${item.name}, ${item.city}` })) ?? []} onChange={(serviceZoneIds) => setPromotion({ ...promotion, serviceZoneIds })} />
          <OptionSelect label="Categories (empty = all)" values={promotion.categoryIds} options={options?.categories.map((item) => ({ value: item.id, label: item.name })) ?? []} onChange={(categoryIds) => setPromotion({ ...promotion, categoryIds })} />
          <OptionSelect label="Vendors (empty = all)" values={promotion.vendorIds} options={options?.vendors.map((item) => ({ value: item.id, label: item.businessName })) ?? []} onChange={(vendorIds) => setPromotion({ ...promotion, vendorIds })} />
          <OptionSelect label="Customer groups (empty = all)" values={promotion.customerGroupIds} options={options?.customerGroups.map((item) => ({ value: item.id, label: item.name })) ?? []} onChange={(customerGroupIds) => setPromotion({ ...promotion, customerGroupIds })} />
          <label>Customer IDs (comma separated, optional)<input value={promotion.customerIds.join(', ')} onChange={(event) => setPromotion({ ...promotion, customerIds: splitList(event.target.value) })} /></label>
          <label>Applicable product types<select multiple value={promotion.productTypes} onChange={(event) => setPromotion({ ...promotion, productTypes: selectedValues(event) as PromotionForm['productTypes'] })}><option value="GROCERY">Grocery</option><option value="FOOD">Food</option></select></label>
          <div className="promotion-fields">
            <label>Total uses<input type="number" min="1" placeholder="Unlimited" value={promotion.totalUsageLimit} onChange={(event) => setPromotion({ ...promotion, totalUsageLimit: event.target.value })} /></label>
            <label>Uses per customer<input type="number" min="1" placeholder="Unlimited" value={promotion.perCustomerUsageLimit} onChange={(event) => setPromotion({ ...promotion, perCustomerUsageLimit: event.target.value })} /></label>
            <label>Starts<input required type="datetime-local" value={promotion.validFrom} onChange={(event) => setPromotion({ ...promotion, validFrom: event.target.value })} /></label>
            <label>Expires<input required type="datetime-local" value={promotion.validTo} onChange={(event) => setPromotion({ ...promotion, validTo: event.target.value })} /></label>
          </div>
          <label className="promotion-check"><input type="checkbox" checked={promotion.isActive} onChange={(event) => setPromotion({ ...promotion, isActive: event.target.checked })} /> Active</label>
          <div className="promotion-actions"><button disabled={busy === 'promotion'}>{busy === 'promotion' ? 'Saving…' : promotion.id ? 'Save changes' : 'Create promotion'}</button>{promotion.id && <button type="button" className="secondary-button" onClick={() => setPromotion(emptyPromotion())}>Cancel edit</button>}</div>
        </form>
        <div className="promotion-list">
          <h4>Configured promotions</h4>
          {promotions.map((item) => <article key={item.id}>
            <div><strong>{item.name}</strong><p>{item.kind === 'FREE_DELIVERY' ? `Free delivery from ₹${item.minimumOrderAmount}` : `${item.discountType === 'PERCENTAGE' ? `${item.value}%` : `₹${item.value}`} off from ₹${item.minimumOrderAmount}`} · {item.fundingSource.replace('_FUNDED', '').toLowerCase()} funding · {item.isActive ? 'Active' : 'Paused'}</p>{item.vendorAgreements?.length ? <small>{item.vendorAgreements.map((agreement) => `${agreement.vendor.businessName}: ${agreement.status.toLowerCase()}`).join(' · ')}</small> : null}</div>
            <button type="button" className="secondary-button" onClick={() => setPromotion(promotionFromRecord(item))}>Edit</button>
          </article>)}
          {!promotions.length && <p className="muted">No promotions created.</p>}
        </div>
      </section>

      <section className="promotion-card">
        <h3>{coupon.id ? 'Edit coupon' : 'Create coupon'}</h3>
        <form onSubmit={(event) => void saveCoupon(event)}>
          <div className="promotion-fields">
            <label>Coupon code<input required value={coupon.code} onChange={(event) => setCoupon({ ...coupon, code: event.target.value.toUpperCase() })} /></label>
            <label>Discount type<select value={coupon.type} onChange={(event) => setCoupon({ ...coupon, type: event.target.value as CouponForm['type'] })}><option value="FIXED">Fixed rupees</option><option value="PERCENTAGE">Percentage</option></select></label>
            <label>Discount value<input required type="number" min="1" value={coupon.value} onChange={(event) => setCoupon({ ...coupon, value: event.target.value })} /></label>
            <label>Minimum purchase (₹)<input type="number" min="0" value={coupon.minOrderValue} onChange={(event) => setCoupon({ ...coupon, minOrderValue: event.target.value })} /></label>
            <label>Maximum discount (₹)<input type="number" min="0" value={coupon.maxDiscount} onChange={(event) => setCoupon({ ...coupon, maxDiscount: event.target.value })} /></label>
          </div>
          <label>Discount funding source<select value={coupon.fundingSource} onChange={(event) => {
            const fundingSource = event.target.value as CouponForm['fundingSource'];
            setCoupon({ ...coupon, fundingSource, platformFundingPercent: fundingSource === 'PLATFORM_FUNDED' ? 100 : fundingSource === 'VENDOR_FUNDED' ? 0 : 50, vendorFundingPercent: fundingSource === 'PLATFORM_FUNDED' ? 0 : fundingSource === 'VENDOR_FUNDED' ? 100 : 50 });
          }}><option value="PLATFORM_FUNDED">Platform funded</option><option value="VENDOR_FUNDED">Vendor funded (requires vendor consent)</option><option value="SHARED_FUNDED">Shared funded</option></select></label>
          {coupon.fundingSource === 'SHARED_FUNDED' && <div className="promotion-fields">
            <label>Platform contribution (%)<input type="number" min="1" max="99" value={coupon.platformFundingPercent} onChange={(event) => setCoupon({ ...coupon, platformFundingPercent: Number(event.target.value), vendorFundingPercent: 100 - Number(event.target.value) })} /></label>
            <label>Vendor contribution (%)<input readOnly value={coupon.vendorFundingPercent} /></label>
          </div>}
          {coupon.fundingSource !== 'PLATFORM_FUNDED' && <p className="muted">Vendors must explicitly accept the exact funding split before their eligible products receive this coupon.</p>}
          <OptionSelect label="Categories (empty = all)" values={coupon.categoryIds} options={options?.categories.map((item) => ({ value: item.id, label: item.name })) ?? []} onChange={(categoryIds) => setCoupon({ ...coupon, categoryIds })} />
          <OptionSelect label="Vendors (empty = all)" values={coupon.vendorIds} options={options?.vendors.map((item) => ({ value: item.id, label: item.businessName })) ?? []} onChange={(vendorIds) => setCoupon({ ...coupon, vendorIds })} />
          <OptionSelect label="Customer groups (empty = all)" values={coupon.customerGroupIds} options={options?.customerGroups.map((item) => ({ value: item.id, label: item.name })) ?? []} onChange={(customerGroupIds) => setCoupon({ ...coupon, customerGroupIds })} />
          <label>Customer IDs (comma separated, optional)<input value={coupon.customerIds.join(', ')} onChange={(event) => setCoupon({ ...coupon, customerIds: splitList(event.target.value) })} /></label>
          <div className="promotion-fields">
            <label>Total redemptions<input type="number" min="1" placeholder="Unlimited" value={coupon.totalUsageLimit} onChange={(event) => setCoupon({ ...coupon, totalUsageLimit: event.target.value })} /></label>
            <label>Per customer<input type="number" min="1" placeholder="Unlimited" value={coupon.perCustomerUsageLimit} onChange={(event) => setCoupon({ ...coupon, perCustomerUsageLimit: event.target.value })} /></label>
            <label>Starts<input required type="datetime-local" value={coupon.validFrom} onChange={(event) => setCoupon({ ...coupon, validFrom: event.target.value })} /></label>
            <label>Expires<input required type="datetime-local" value={coupon.validTo} onChange={(event) => setCoupon({ ...coupon, validTo: event.target.value })} /></label>
          </div>
          <label className="promotion-check"><input type="checkbox" checked={coupon.firstOrderOnly} onChange={(event) => setCoupon({ ...coupon, firstOrderOnly: event.target.checked })} /> First order only</label>
          <label className="promotion-check"><input type="checkbox" checked={coupon.isActive} onChange={(event) => setCoupon({ ...coupon, isActive: event.target.checked })} /> Active</label>
          <div className="promotion-actions"><button disabled={busy === 'coupon'}>{busy === 'coupon' ? 'Saving…' : coupon.id ? 'Save changes' : 'Create coupon'}</button>{coupon.id && <button type="button" className="secondary-button" onClick={() => setCoupon(emptyCoupon())}>Cancel edit</button>}</div>
        </form>
        <div className="promotion-list">
          <h4>Coupon codes</h4>
          {coupons.map((item) => <article key={item.id}>
            <div><strong>{item.code}</strong><p>{item.type === 'PERCENTAGE' ? `${item.value}%` : `₹${item.value}`} off · Min ₹{item.minOrderValue ?? 0} · {item.fundingSource.replace('_FUNDED', '').toLowerCase()} funding · {item.isActive ? 'Active' : 'Paused'}</p>{item.vendorAgreements?.length ? <small>{item.vendorAgreements.map((agreement) => `${agreement.vendor.businessName}: ${agreement.status.toLowerCase()}`).join(' · ')}</small> : null}</div>
            <button type="button" className="secondary-button" onClick={() => setCoupon(couponFromRecord(item))}>Edit</button>
          </article>)}
          {!coupons.length && <p className="muted">No coupons created.</p>}
        </div>
      </section>
    </div>

    <section className="promotion-card funding-ledger">
      <h3>Discount funding ledger</h3>
      <p className="muted">Order-level expenses are recorded separately by actual funding party. Delivery-partner earnings are never derived from customer discounts or final payable.</p>
      <div className="funding-totals">
        <article><span>Platform-funded expense</span><strong>₹{fundingLedger?.totals.platformFunded ?? 0}</strong></article>
        <article><span>Vendor-funded contribution</span><strong>₹{fundingLedger?.totals.vendorFunded ?? 0}</strong></article>
      </div>
      <div className="promotion-list">
        {fundingLedger?.entries.map((entry) => <article key={entry.id}>
          <div>
            <strong>{entry.sourceLabel} · {entry.type.replace(/_/g, ' ').toLowerCase()}</strong>
            <p>{entry.order.orderCode} · {entry.order.status} · {entry.vendor?.businessName ?? 'Unassigned vendor'} · {new Date(entry.createdAt).toLocaleString()}</p>
          </div>
          <strong>{entry.fundingSource === 'PLATFORM_FUNDED' ? 'Platform' : 'Vendor'} ₹{entry.amount}</strong>
        </article>)}
        {!fundingLedger?.entries.length && <p className="muted">No discount funding entries recorded yet.</p>}
      </div>
      <small>{fundingLedger?.total ?? 0} funding entries · latest 20 shown</small>
    </section>

    <div className="promotion-grid promotion-bottom">
      <form className="promotion-card" onSubmit={(event) => void saveSettings(event)}>
        <h3>Stacking and checkout charges</h3>
        <Check label="Allow coupon with promotions" value={settings.allowCouponWithPromotion} onChange={(value) => setSettings({ ...settings, allowCouponWithPromotion: value })} />
        <Check label="Allow reward coins with coupons" value={settings.allowRewardWithCoupon} onChange={(value) => setSettings({ ...settings, allowRewardWithCoupon: value })} />
        <Check label="Allow reward coins with promotions" value={settings.allowRewardWithPromotion} onChange={(value) => setSettings({ ...settings, allowRewardWithPromotion: value })} />
        <Check label="Allow multiple minimum-order promotions" value={settings.allowMultiplePromotions} onChange={(value) => setSettings({ ...settings, allowMultiplePromotions: value })} />
        <div className="promotion-fields">
          <label>Packaging charge (₹)<input type="number" min="0" value={settings.packagingFee} onChange={(event) => setSettings({ ...settings, packagingFee: Number(event.target.value) })} /></label>
          <label>Handling charge (₹)<input type="number" min="0" value={settings.handlingFee} onChange={(event) => setSettings({ ...settings, handlingFee: Number(event.target.value) })} /></label>
        </div>
        <button disabled={busy === 'settings'}>{busy === 'settings' ? 'Saving…' : 'Save checkout rules'}</button>
      </form>

      <form className="promotion-card" onSubmit={(event) => void saveLoyalty(event)}>
        <h3>Reward coin program</h3>
        <Check label="Enable rewards" value={loyalty.enabled} onChange={(value) => setLoyalty({ ...loyalty, enabled: value })} />
        <div className="promotion-fields">
          <label>Reward mode<select value={loyalty.rewardMode} onChange={(event) => setLoyalty({ ...loyalty, rewardMode: event.target.value as LoyaltySettings['rewardMode'] })}><option value="RANDOM">Secure random range</option><option value="FIXED">Fixed reward</option></select></label>
          <label>Minimum coins<input type="number" min="0" value={loyalty.minimumRewardCoins} onChange={(event) => setLoyalty({ ...loyalty, minimumRewardCoins: Number(event.target.value) })} /></label>
          <label>Maximum coins<input type="number" min="0" value={loyalty.maximumRewardCoins} onChange={(event) => setLoyalty({ ...loyalty, maximumRewardCoins: Number(event.target.value) })} /></label>
          <label>Coins per ₹1<input type="number" min="1" value={loyalty.coinsPerRupee} onChange={(event) => setLoyalty({ ...loyalty, coinsPerRupee: Number(event.target.value) })} /></label>
          <label>Minimum eligible order (₹)<input type="number" min="0" value={loyalty.minimumOrderForReward} onChange={(event) => setLoyalty({ ...loyalty, minimumOrderForReward: Number(event.target.value) })} /></label>
          <label>Credit coins after<select value={loyalty.qualifyingOrderStatus} onChange={() => setLoyalty({ ...loyalty, qualifyingOrderStatus: 'DELIVERED' })}><option value="DELIVERED">Delivered</option></select></label>
          <label>Minimum redemption subtotal (₹)<input type="number" min="0" value={loyalty.minimumOrderForRedemption} onChange={(event) => setLoyalty({ ...loyalty, minimumOrderForRedemption: Number(event.target.value) })} /></label>
          <label>Maximum coins per order<input type="number" min="1" placeholder="No limit" value={loyalty.maximumCoinsPerOrder ?? ''} onChange={(event) => setLoyalty({ ...loyalty, maximumCoinsPerOrder: optionalNumber(event.target.value) })} /></label>
          <label>Max discount percentage<input type="number" min="0" max="100" value={loyalty.maximumDiscountPercent} onChange={(event) => setLoyalty({ ...loyalty, maximumDiscountPercent: Number(event.target.value) })} /></label>
          <label>Expiry in days<input type="number" min="1" placeholder="Never expires" value={loyalty.expiryDays ?? ''} onChange={(event) => setLoyalty({ ...loyalty, expiryDays: optionalNumber(event.target.value) })} /></label>
        </div>
        <OptionSelect label="Eligible categories (empty = all)" values={loyalty.categoryIds} options={options?.categories.map((item) => ({ value: item.id, label: item.name })) ?? []} onChange={(categoryIds) => setLoyalty({ ...loyalty, categoryIds })} />
        <button disabled={busy === 'loyalty'}>{busy === 'loyalty' ? 'Saving…' : 'Save reward rules'}</button>
      </form>

      <section className="promotion-card">
        <h3>Customer groups</h3>
        <form onSubmit={(event) => void addGroup(event)} className="promotion-inline-form">
          <input required placeholder="New group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
          <button disabled={busy === 'group'}>Create group</button>
        </form>
        <div className="promotion-list">
          {groups.map((group) => <article key={group.id}><div><strong>{group.name}</strong><p>{group._count.customers} customers</p></div></article>)}
          {!groups.length && <p className="muted">No customer groups configured.</p>}
        </div>
        <form onSubmit={(event) => void assignGroup(event)}>
          <label>Assign group to customer ID<input required value={customerId} onChange={(event) => setCustomerId(event.target.value)} /></label>
          <label>Customer group<select value={customerGroupId} onChange={(event) => setCustomerGroupId(event.target.value)}><option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
          <button disabled={busy === 'assignment'}>Save assignment</button>
        </form>
      </section>
    </div>
  </section>;
}

function OptionSelect({ label, values, options, onChange }: { label: string; values: string[]; options: Array<{ value: string; label: string }>; onChange: (values: string[]) => void }) {
  return <label>{label}<select multiple value={values} onChange={(event) => onChange(selectedValues(event))}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>Hold Ctrl/Command to select more than one.</small></label>;
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="promotion-check"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /> {label}</label>;
}

function selectedValues(event: React.ChangeEvent<HTMLSelectElement>) {
  return Array.from(event.currentTarget.selectedOptions, (option) => option.value);
}

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function localDateTime(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dateTimeInput(value: string) {
  return localDateTime(new Date(value));
}

function promotionFromRecord(value: PromotionRecord): PromotionForm {
  const form = { ...value };
  delete form.vendorAgreements;
  return {
    ...form,
    validFrom: dateTimeInput(value.validFrom),
    validTo: dateTimeInput(value.validTo),
    value: String(value.value),
    minimumOrderAmount: String(value.minimumOrderAmount),
    maximumDiscount: value.maximumDiscount == null ? '' : String(value.maximumDiscount),
    totalUsageLimit: value.totalUsageLimit == null ? '' : String(value.totalUsageLimit),
    perCustomerUsageLimit: value.perCustomerUsageLimit == null ? '' : String(value.perCustomerUsageLimit),
  };
}

function couponFromRecord(value: CouponRecord): CouponForm {
  const form = { ...value };
  delete form.vendorAgreements;
  return {
    ...form,
    validFrom: dateTimeInput(value.validFrom),
    validTo: dateTimeInput(value.validTo),
    value: String(value.value),
    minOrderValue: String(value.minOrderValue ?? 0),
    maxDiscount: value.maxDiscount == null ? '' : String(value.maxDiscount),
    totalUsageLimit: value.totalUsageLimit == null ? '' : String(value.totalUsageLimit),
    perCustomerUsageLimit: value.perCustomerUsageLimit == null ? '' : String(value.perCustomerUsageLimit),
  };
}
