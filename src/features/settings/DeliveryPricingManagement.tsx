import { FormEvent, useEffect, useState } from 'react';
import { DeliveryPricingInput, DeliveryServiceZone, platformAdminApi } from '../../platformApi';
import './DeliveryPricingManagement.css';

type PricingForm = Omit<DeliveryPricingInput, 'zoneId' | 'effectiveFrom'> & { effectiveFrom: string };

const initialPricing: PricingForm = {
  productType: 'GROCERY',
  customerBaseCharge: 20,
  customerIncludedDistanceKm: 2,
  customerChargePerKm: 8,
  minimumDeliveryCharge: 20,
  maximumDeliveryCharge: 200,
  maximumDeliveryDistanceKm: 20,
  freeDeliveryThreshold: null,
  distanceRounding: 'EXACT',
  partnerBaseEarning: 25,
  partnerIncludedDistanceKm: 2,
  partnerEarningPerKm: 10,
  batchDeliveryEnabled: false,
  multiPickupIncentive: 0,
  peakHourIncentive: 0,
  nightDeliveryIncentive: 0,
  waitingTimeFreeMinutes: 0,
  waitingTimePerMinute: 0,
  otherBonus: 0,
  effectiveFrom: localDateTimeInput(new Date()),
  isActive: true,
};

export function DeliveryPricingManagement() {
  const [zones, setZones] = useState<DeliveryServiceZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [zoneForm, setZoneForm] = useState({ name: '', city: '', pincode: '', isEnabled: true });
  const [pricing, setPricing] = useState<PricingForm>(initialPricing);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const result = await platformAdminApi.deliveryPricing();
      setZones(result);
      setSelectedZoneId((current) => result.some((zone) => zone.id === current) ? current : result[0]?.id ?? '');
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load delivery pricing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId);

  useEffect(() => {
    if (!selectedZone) {
      setZoneForm({ name: '', city: '', pincode: '', isEnabled: true });
      return;
    }
    setZoneForm({ name: selectedZone.name, city: selectedZone.city, pincode: selectedZone.pincode ?? '', isEnabled: selectedZone.isEnabled });
  }, [selectedZone]);

  async function saveZone(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const saved = await platformAdminApi.saveDeliveryZone({
        ...zoneForm,
        pincode: zoneForm.pincode.trim() || null,
      }, selectedZone?.id);
      await load();
      setSelectedZoneId(saved.id);
      setMessage(selectedZone ? 'Delivery zone updated.' : 'Delivery zone created.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save delivery zone.');
    } finally {
      setSaving(false);
    }
  }

  async function savePricing(event: FormEvent) {
    event.preventDefault();
    if (!selectedZoneId) {
      setError('Create or select a service zone first.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await platformAdminApi.saveDeliveryPricing({
        ...pricing,
        zoneId: selectedZoneId,
        effectiveFrom: new Date(pricing.effectiveFrom).toISOString(),
      });
      await load();
      setMessage('Pricing configuration saved and audit logged.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save delivery pricing.');
    } finally {
      setSaving(false);
    }
  }

  function setNumber(field: keyof PricingForm, value: string) {
    setPricing((current) => ({
      ...current,
      [field]: field === 'freeDeliveryThreshold' && value === '' ? null : value === '' ? 0 : Number(value),
    }));
  }

  if (loading) return <section className="delivery-pricing"><p>Loading delivery pricing…</p></section>;

  return <section className="delivery-pricing">
    <header className="delivery-pricing-heading">
      <div>
        <p className="eyebrow">SETTINGS · DELIVERY PRICING</p>
        <h2>Fixed delivery pricing</h2>
        <p>Each order uses the configured customer delivery fee and the delivery partner’s base earning. No routing service is needed.</p>
      </div>
    </header>
    {error && <p className="delivery-pricing-alert error" role="alert">{error}</p>}
    {message && <p className="delivery-pricing-alert success" role="status">{message}</p>}

    <div className="delivery-pricing-layout">
      <section className="delivery-pricing-card">
        <h3>Service zone</h3>
        <label>Zone
          <select value={selectedZoneId} onChange={(event) => {
            const zone = zones.find((item) => item.id === event.target.value);
            setSelectedZoneId(event.target.value);
            setZoneForm(zone ? { name: zone.name, city: zone.city, pincode: zone.pincode ?? '', isEnabled: zone.isEnabled } : { name: '', city: '', pincode: '', isEnabled: true });
          }}>
            <option value="">Create a new zone</option>
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {zone.city} · {zone.pincode ?? 'No PIN'}</option>)}
          </select>
        </label>
        <form onSubmit={(event) => void saveZone(event)}>
          <label>Zone name<input required value={zoneForm.name} onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })} /></label>
          <label>City<input required value={zoneForm.city} onChange={(event) => setZoneForm({ ...zoneForm, city: event.target.value })} /></label>
          <label>PIN code<input value={zoneForm.pincode} onChange={(event) => setZoneForm({ ...zoneForm, pincode: event.target.value })} /></label>
          <label className="delivery-check"><input type="checkbox" checked={zoneForm.isEnabled} onChange={(event) => setZoneForm({ ...zoneForm, isEnabled: event.target.checked })} /> Zone enabled</label>
          <button type="submit" disabled={saving}>{selectedZone ? 'Update zone' : 'Create zone'}</button>
        </form>
        <div className="delivery-config-history">
          <h4>Saved configurations</h4>
          {selectedZone?.deliveryPricingConfigs.length
            ? selectedZone.deliveryPricingConfigs.map((config) => <article key={config.id}>
              <strong>{config.productType} · {config.isActive ? 'Active' : 'Inactive'}</strong>
              <span>Customer fixed fee: ₹{config.customerBaseCharge}</span>
              <span>Partner base earning: ₹{config.partnerBaseEarning}</span>
              <span>Effective {new Date(config.effectiveFrom).toLocaleString()}</span>
            </article>)
            : <p>No pricing history for this zone yet.</p>}
        </div>
      </section>

      <section className="delivery-pricing-card">
        <h3>Pricing configuration</h3>
        <form onSubmit={(event) => void savePricing(event)}>
          <div className="delivery-field-grid">
            <label>Product applicability<select value={pricing.productType} onChange={(event) => setPricing({ ...pricing, productType: event.target.value as PricingForm['productType'] })}>
              <option value="GROCERY">Grocery</option><option value="FOOD">Food</option>
            </select></label>
            <NumberField label="Customer fixed delivery fee (₹)" field="customerBaseCharge" value={pricing.customerBaseCharge} onChange={setNumber} />
            <NumberField label="Free-delivery subtotal threshold (₹)" field="freeDeliveryThreshold" value={pricing.freeDeliveryThreshold ?? ''} onChange={setNumber} />
            <NumberField label="Partner base earning (₹)" field="partnerBaseEarning" value={pricing.partnerBaseEarning} onChange={setNumber} />
            <label className="delivery-check"><input type="checkbox" checked={pricing.batchDeliveryEnabled} onChange={(event) => setPricing({ ...pricing, batchDeliveryEnabled: event.target.checked })} /> Allow same-partner batch pickups for one parent order</label>
            <NumberField label="Multi-pickup incentive (₹)" field="multiPickupIncentive" value={pricing.multiPickupIncentive} onChange={setNumber} />
            <NumberField label="Peak-hour incentive (₹)" field="peakHourIncentive" value={pricing.peakHourIncentive} onChange={setNumber} />
            <NumberField label="Night-delivery incentive (₹)" field="nightDeliveryIncentive" value={pricing.nightDeliveryIncentive} onChange={setNumber} />
            <NumberField label="Waiting time allowance (minutes)" field="waitingTimeFreeMinutes" value={pricing.waitingTimeFreeMinutes} onChange={setNumber} />
            <NumberField label="Waiting incentive (₹/minute)" field="waitingTimePerMinute" value={pricing.waitingTimePerMinute} onChange={setNumber} />
            <NumberField label="Other partner bonus (₹)" field="otherBonus" value={pricing.otherBonus} onChange={setNumber} />
            <label>Effective from<input required type="datetime-local" value={pricing.effectiveFrom} onChange={(event) => setPricing({ ...pricing, effectiveFrom: event.target.value })} /></label>
          </div>
          <label className="delivery-check"><input type="checkbox" checked={pricing.isActive} onChange={(event) => setPricing({ ...pricing, isActive: event.target.checked })} /> Configuration active</label>
          <p className="delivery-method-note">The customer fee and partner base earning are fixed per delivery. Free-delivery offers can waive the customer fee but do not reduce partner earnings. Configured incentives are added separately when a delivery is completed.</p>
          <button type="submit" disabled={saving || !selectedZoneId}>{saving ? 'Saving…' : 'Save pricing configuration'}</button>
        </form>
      </section>
    </div>
  </section>;
}

function NumberField({ label, field, value, onChange, step = '1' }: {
  label: string;
  field: keyof PricingForm;
  value: number | '';
  onChange: (field: keyof PricingForm, value: string) => void;
  step?: string;
}) {
  return <label>{label}<input type="number" min="0" step={step} value={value} onChange={(event) => onChange(field, event.target.value)} /></label>;
}

function localDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
