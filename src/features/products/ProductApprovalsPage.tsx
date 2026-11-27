import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, ProductReviewItem } from '../../api';

const MAX_PRODUCT_IMAGE_BYTES = 200 * 1024;

export function ProductApprovalsPage() {
  const [searchParams] = useSearchParams();
  const search = (searchParams.get('search') ?? '').trim().toLocaleLowerCase();
  const [pendingProducts, setPendingProducts] = useState<ProductReviewItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductReviewItem[]>([]);
  const [busyId, setBusyId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductReviewItem | null>(null);
  const [inventoryProduct, setInventoryProduct] = useState<string>('');
  const [inventoryAvailable, setInventoryAvailable] = useState('0');
  const [inventoryReason, setInventoryReason] = useState('');
  const [inventoryBusy, setInventoryBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    brand: '',
    description: '',
    imageUrl: '',
    categoryId: '',
    type: 'GROCERY' as 'GROCERY' | 'FOOD',
    basePrice: 0,
    customerSellingPrice: 0,
    discountPrice: 0,
    vendorFundedDiscount: 0,
    vendorFundedDiscountAgreed: false,
    isActive: true,
  });
  const matchesSearch = (product: ProductReviewItem) => !search
    || `${product.name} ${product.vendor.businessName} ${product.category.name} ${product.type} ${product.id}`.toLocaleLowerCase().includes(search);
  const visiblePendingProducts = pendingProducts.filter(matchesSearch);
  const visibleCatalogProducts = catalogProducts.filter(matchesSearch);

  async function refresh() {
    setError('');
    try {
      const [pending, catalog] = await Promise.all([adminApi.productsForReview(), adminApi.products()]);
      setPendingProducts(pending);
      setCatalogProducts(catalog.filter((product) => ['PUBLISHED', 'PAUSED'].includes(product.status)));
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load product approvals.'); }
  }
  useEffect(() => { void refresh(); }, []);

  function openEditor(product: ProductReviewItem) {
    const proposed = product.pendingChanges ?? {};
    setEditingProduct(product);
    setDraft({
      name: String(proposed.name ?? product.name),
      brand: String(proposed.brand ?? product.brand ?? ''),
      description: String(proposed.description ?? product.description ?? ''),
      imageUrl: String(proposed.imageUrl ?? product.imageUrl ?? ''),
      categoryId: String((proposed.categoryId ?? product.category.id) ?? ''),
      type: (String(proposed.type ?? product.type) as 'GROCERY' | 'FOOD'),
      basePrice: Number(proposed.basePrice ?? product.basePrice ?? 0),
      customerSellingPrice: Number((proposed.customerSellingPrice ?? product.customerSellingPrice ?? product.basePrice) ?? 0),
      discountPrice: Number(proposed.discountPrice ?? product.discountPrice ?? 0),
      vendorFundedDiscount: Number(proposed.vendorFundedDiscount ?? product.vendorFundedDiscount ?? 0),
      vendorFundedDiscountAgreed: Boolean(proposed.vendorFundedDiscountAgreed ?? product.vendorFundedDiscountAgreed ?? false),
      isActive: product.status === 'PUBLISHED' ? product.isActive : product.status !== 'REJECTED',
    });
  }

  async function review(product: ProductReviewItem, status: 'PUBLISHED' | 'PAUSED' | 'REJECTED', rejection?: string, overrides?: Record<string, unknown>) {
    setBusyId(product.id);
    try {
      await adminApi.reviewProduct(product.id, status, rejection, overrides);
      setRejectingId('');
      setReason('');
      setEditingProduct(null);
      await refresh();
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update product status.'); }
    finally { setBusyId(''); }
  }

  async function adjustInventory(product: ProductReviewItem) {
    setInventoryBusy(true);
    setError('');
    try {
      await adminApi.adjustInventory(product.id, Number(inventoryAvailable), inventoryReason.trim());
      setInventoryProduct('');
      setInventoryReason('');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not adjust product inventory.');
    } finally {
      setInventoryBusy(false);
    }
  }

  function getStock(product: ProductReviewItem) {
    if (product.inventory.length) {
      return {
        onHand: product.inventory.reduce((sum, item) => sum + item.available, 0),
        available: product.inventory.reduce((sum, item) => sum + item.available - item.reserved, 0),
        reserved: product.inventory.reduce((sum, item) => sum + item.reserved, 0),
        sold: product.inventory.reduce((sum, item) => sum + item.sold, 0),
      };
    }
    return {
      onHand: product.variants.reduce((sum, item) => sum + item.stock, 0),
      available: product.variants.reduce((sum, item) => sum + item.stock - item.reserved, 0),
      reserved: product.variants.reduce((sum, item) => sum + item.reserved, 0),
      sold: product.variants.reduce((sum, item) => sum + item.sold, 0),
    };
  }

  function submitEdit(product: ProductReviewItem) {
    const payload = {
      name: draft.name.trim(),
      brand: draft.brand.trim() || null,
      description: draft.description.trim() || null,
      imageUrl: draft.imageUrl.trim() || null,
      categoryId: draft.categoryId,
      type: draft.type,
      customerSellingPrice: Number(draft.customerSellingPrice),
      discountPrice: Number(draft.discountPrice) || null,
      vendorFundedDiscount: draft.vendorFundedDiscountAgreed ? Number(draft.vendorFundedDiscount) : 0,
      vendorFundedDiscountAgreed: draft.vendorFundedDiscountAgreed,
      isActive: draft.isActive,
    };
    return review(product, 'PUBLISHED', undefined, payload);
  }

  async function uploadProductImage(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image to upload.');
      return;
    }

    setImageBusy(true);
    setError('');
    try {
      const imageUrl = await compressProductImage(file);
      setDraft((current) => ({ ...current, imageUrl }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not process the product image.');
    } finally {
      setImageBusy(false);
    }
  }

  function renderProducts(products: ProductReviewItem[], mode: 'REVIEW' | 'CATALOG') {
    return <div className="divide-y divide-[#E2E8F0]">
      {products.map((product) => {
        const proposed = product.pendingChanges;
        const name = String(proposed?.name ?? product.name);
        const basePrice = Number(proposed?.basePrice ?? product.basePrice ?? 0);
        const sellingPrice = Number((proposed?.customerSellingPrice ?? product.customerSellingPrice ?? basePrice) ?? 0);
        const stock = getStock(product);
        return <article key={product.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{name}</h3><span className={`rounded px-2 py-1 text-[9px] font-extrabold ${product.status === 'PUBLISHED' ? 'bg-[#e1f1df] text-[#287043]' : 'bg-[#fff1cf] text-[#8b6520]'}`}>{proposed ? 'EDIT PENDING' : product.status}</span></div>
            <p className="mt-1 text-xs text-[#788391]">{product.vendor.businessName} · {product.vendor.user.fullName ?? product.vendor.user.phone}</p>
            <p className="mt-1 text-xs text-[#788391]">{String(proposed?.brand ?? product.brand ?? '') ? `${String(proposed?.brand ?? product.brand)} · ` : ''}{String(proposed?.type ?? product.type)} / {product.category.name} · Vendor ₹{basePrice} · Customer ₹{sellingPrice} · Vendor promo ₹{Number(proposed?.vendorFundedDiscount ?? product.vendorFundedDiscount ?? 0)} {Boolean(proposed?.vendorFundedDiscountAgreed ?? product.vendorFundedDiscountAgreed) ? '(agreed)' : '(not agreed)'}</p>
            <p className="mt-1 text-xs text-[#788391]">
              Stock: {stock.onHand} on hand · {stock.available} available · {stock.reserved} reserved · {stock.sold} sold
            </p>
            <p className="mt-2 text-xs text-[#788391]">{String(proposed?.description ?? product.description ?? 'No description supplied.')}</p>
            {product.imageUrl && <a href={product.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#FF7900]">View product image</a>}
            {inventoryProduct === product.id && <div className="mt-3 grid max-w-xl gap-2 rounded border border-[#E2E8F0] bg-[#F5F7FA] p-3 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
              <input type="number" min="0" value={inventoryAvailable} onChange={(event) => setInventoryAvailable(event.target.value)} aria-label="New on-hand stock" className="rounded border border-[#CBD5E1] px-2 py-2 text-xs" />
              <input value={inventoryReason} onChange={(event) => setInventoryReason(event.target.value)} placeholder="Required audit reason" className="min-w-0 rounded border border-[#CBD5E1] px-2 py-2 text-xs" />
              <button disabled={inventoryBusy || !inventoryReason.trim() || Number(inventoryAvailable) < 0} onClick={() => void adjustInventory(product)} className="rounded bg-[#FF9800] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{inventoryBusy ? 'Saving...' : 'Save stock'}</button>
            </div>}
            {product.rejectionReason && <p className="mt-2 text-xs text-[#a24d3c]">Previous rejection: {product.rejectionReason}</p>}
            {rejectingId === product.id && <div className="mt-3 flex max-w-lg gap-2"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rejection" className="min-w-0 flex-1 rounded border border-[#CBD5E1] px-2 py-2 text-xs" /><button disabled={busyId === product.id || !reason.trim()} onClick={() => void review(product, 'REJECTED', reason.trim())} className="rounded bg-[#a75343] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm rejection</button></div>}
          </div>
          <div className="flex flex-wrap gap-2 xl:flex-col">
            {mode === 'REVIEW' && <button disabled={busyId === product.id} onClick={() => openEditor(product)} className="rounded bg-[#FF9800] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve & publish</button>}
            {mode === 'CATALOG' && product.status === 'PUBLISHED' && <button onClick={() => openEditor(product)} className="rounded bg-[#FF9800] px-3 py-2 text-xs font-bold text-[#08264A]">Edit product</button>}
            {product.status === 'PUBLISHED' && <button disabled={busyId === product.id} onClick={() => void review(product, 'PAUSED')} className="rounded border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#788391] disabled:opacity-50">Pause</button>}
            {product.status === 'PAUSED' && <button disabled={busyId === product.id} onClick={() => void review(product, 'PUBLISHED')} className="rounded bg-[#FF9800] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Republish</button>}
            {mode === 'REVIEW' && <button disabled={busyId === product.id} onClick={() => { setRejectingId(product.id); setReason(''); }} className="rounded border border-[#d9c3be] px-3 py-2 text-xs font-bold text-[#9a4e40] disabled:opacity-50">Reject</button>}
            {mode === 'CATALOG' && <button onClick={() => { setInventoryProduct(inventoryProduct === product.id ? '' : product.id); setInventoryAvailable(String(stock.onHand)); setInventoryReason(''); }} className="rounded border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#788391]">Adjust stock</button>}
          </div>
        </article>;
      })}
      {!products.length && <p className="px-4 py-8 text-center text-sm text-[#788391]">{mode === 'REVIEW' ? 'No products awaiting review.' : 'No published or paused products.'}</p>}
    </div>
  }

  return <div className="space-y-5">
    {error && <p role="alert" className="border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</p>}
    {editingProduct && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202A36]/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-extrabold text-[#202A36]">{editingProduct.status === 'PUBLISHED' ? 'Edit product' : 'Review product'}</h3><button onClick={() => setEditingProduct(null)} className="text-sm font-bold text-[#788391]">Close</button></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-[#788391]">Product name<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-[#788391]">Brand<input maxLength={120} value={draft.brand} onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))} placeholder="Optional brand name" className="mt-1 w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-[#788391]">Category<select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))} className="mt-1 w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm"><option value={editingProduct.category.id}>{editingProduct.category.name}</option></select></label>
          <label className="text-xs font-bold text-[#788391]">Type<select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as 'GROCERY' | 'FOOD' }))} className="mt-1 w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm"><option value="GROCERY">GROCERY</option><option value="FOOD">FOOD</option></select></label>
          <label className="text-xs font-bold text-[#788391]">Visible<input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} className="mt-2 block h-4 w-4" /></label>
          <div className="text-xs font-bold text-[#788391]">Vendor agreed price<div className="mt-1 rounded border border-[#CBD5E1] bg-[#F5F7FA] px-3 py-2 text-sm font-semibold">₹{draft.basePrice} · Vendor-controlled</div></div>
          <label className="text-xs font-bold text-[#788391]">Customer selling price<input type="number" min="0" value={draft.customerSellingPrice} onChange={(event) => setDraft((current) => ({ ...current, customerSellingPrice: Number(event.target.value) }))} className="mt-1 w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-[#788391] md:col-span-2">Description<textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1 min-h-[96px] w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm" /></label>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-[#788391]">Product image</label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded bg-[#FF9800] px-3 py-2 text-xs font-bold text-[#08264A]">
                {imageBusy ? 'Preparing image...' : 'Choose image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={imageBusy || busyId === editingProduct.id}
                  onChange={(event) => {
                    void uploadProductImage(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                  className="sr-only"
                />
              </label>
              {draft.imageUrl && <button type="button" onClick={() => setDraft((current) => ({ ...current, imageUrl: '' }))} className="rounded border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#788391]">Remove image</button>}
              <span className="text-[11px] text-[#788391]">JPEG, PNG or WebP · automatically compressed to 200 KB max</span>
            </div>
            <input aria-label="Product image URL" value={draft.imageUrl.startsWith('data:') ? '' : draft.imageUrl} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Or paste a public image URL" className="mt-3 w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm" />
            {draft.imageUrl
              ? <img src={draft.imageUrl} alt="Product image preview" className="mt-3 h-28 w-28 rounded-lg border border-[#E2E8F0] object-cover" />
              : <p className="mt-2 text-[11px] text-[#788391]">No product image selected.</p>}
          </div>
          <label className="text-xs font-bold text-[#788391]">Offer price<input type="number" min="0" value={draft.discountPrice} onChange={(event) => setDraft((current) => ({ ...current, discountPrice: Number(event.target.value) }))} className="mt-1 w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-[#788391]">Vendor-funded discount<input type="number" min="0" value={draft.vendorFundedDiscount} onChange={(event) => setDraft((current) => ({ ...current, vendorFundedDiscount: Number(event.target.value) }))} className="mt-1 w-full rounded border border-[#CBD5E1] px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-[#788391]">Vendor has agreed to fund this promotion<input type="checkbox" checked={draft.vendorFundedDiscountAgreed} onChange={(event) => setDraft((current) => ({ ...current, vendorFundedDiscountAgreed: event.target.checked, vendorFundedDiscount: event.target.checked ? current.vendorFundedDiscount : 0 }))} className="mt-2 block h-4 w-4" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditingProduct(null)} className="rounded border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#788391]">Cancel</button><button disabled={busyId === editingProduct.id || imageBusy} onClick={() => void submitEdit(editingProduct)} className="rounded bg-[#FF9800] px-3 py-2 text-xs font-bold text-[#08264A] disabled:opacity-50">{editingProduct.status === 'PUBLISHED' ? 'Save changes' : 'Approve & publish'}</button></div>
      </div>
    </div>}
    <section className="border border-[#E2E8F0] bg-white">
      <header className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3"><h2 className="text-sm font-extrabold">{search ? `Product search · ${searchParams.get('search')}` : 'Product approval queue'}</h2><button onClick={() => void refresh()} className="text-xs font-bold text-[#FF7900]">Refresh · {visiblePendingProducts.length} waiting</button></header>
      {renderProducts(visiblePendingProducts, 'REVIEW')}
    </section>
    <section className="border border-[#E2E8F0] bg-white">
      <header className="border-b border-[#E2E8F0] px-4 py-3"><h2 className="text-sm font-extrabold">Published and paused catalog</h2></header>
      {renderProducts(visibleCatalogProducts, 'CATALOG')}
    </section>
  </div>;
}

async function compressProductImage(file: File) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not read this image. Try choosing a JPEG, PNG or WebP file.');
  }

  try {
    let scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    let quality = 0.82;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the product image.');
      context.drawImage(bitmap, 0, 0, width, height);
      const compressed = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Could not compress the product image.'));
        }, 'image/jpeg', quality);
      });

      if (compressed.size <= MAX_PRODUCT_IMAGE_BYTES) {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === 'string'
            ? resolve(reader.result)
            : reject(new Error('Could not read the compressed product image.'));
          reader.onerror = () => reject(new Error('Could not read the compressed product image.'));
          reader.readAsDataURL(compressed);
        });
      }

      if (quality > 0.5) quality = Math.max(0.45, quality - 0.1);
      else if (scale > 0.02) scale *= 0.75;
      else break;
    }
    throw new Error('Could not compress this image below 200 KB. Choose a smaller image.');
  } finally {
    bitmap.close();
  }
}
