import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BudgetOfferCategory, ProductReviewItem, adminApi } from '../../api';

type CategoryDraft = {
  name: string;
  maxDisplayPrice: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

type ProductOfferDraft = {
  show: boolean;
  categoryId: string;
  offerPrice: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const EMPTY_CATEGORY: CategoryDraft = {
  name: '',
  maxDisplayPrice: '',
  imageUrl: '',
  sortOrder: '0',
  isActive: true,
  startDate: '',
  endDate: '',
};

function toLocalDate(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function toApiDate(value: string) {
  return value || null;
}

function categoryDraft(category: BudgetOfferCategory): CategoryDraft {
  return {
    name: category.name,
    maxDisplayPrice: String(category.maxDisplayPrice),
    imageUrl: category.imageUrl ?? '',
    sortOrder: String(category.sortOrder),
    isActive: category.isActive,
    startDate: toLocalDate(category.startDate),
    endDate: toLocalDate(category.endDate),
  };
}

function productDraft(product: ProductReviewItem, categories: BudgetOfferCategory[]): ProductOfferDraft {
  return {
    show: Boolean(product.budgetOffer),
    categoryId: product.budgetOffer?.categoryId ?? categories.find((category) => category.isActive)?.id ?? '',
    offerPrice: String(product.budgetOffer?.offerPrice ?? ''),
    isActive: product.budgetOffer?.isActive ?? true,
    startDate: toLocalDate(product.budgetOffer?.startDate),
    endDate: toLocalDate(product.budgetOffer?.endDate),
  };
}

export function BudgetOffersPage() {
  const [categories, setCategories] = useState<BudgetOfferCategory[]>([]);
  const [products, setProducts] = useState<ProductReviewItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ProductOfferDraft>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>();
  const [categoryForm, setCategoryForm] = useState<CategoryDraft>(EMPTY_CATEGORY);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const vendors = useMemo(() => [...new Map(products.map((product) => [product.vendor.id, product.vendor])).values()]
    .sort((a, b) => a.businessName.localeCompare(b.businessName)), [products]);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesText = !query || `${product.name} ${product.vendor.businessName} ${product.category.name}`.toLocaleLowerCase().includes(query);
      return matchesText && (!categoryFilter || product.category.id === categoryFilter) && (!vendorFilter || product.vendor.id === vendorFilter);
    });
  }, [products, search, categoryFilter, vendorFilter]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [nextCategories, nextProducts] = await Promise.all([adminApi.budgetOfferCategories(), adminApi.products()]);
      setCategories(nextCategories);
      setProducts(nextProducts);
      setDrafts(Object.fromEntries(nextProducts.map((product) => [product.id, productDraft(product, nextCategories)])));
      setSelectedIds((current) => current.filter((id) => nextProducts.some((product) => product.id === id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load budget offer management.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  function updateProductDraft(productId: string, patch: Partial<ProductOfferDraft>) {
    setDrafts((current) => ({ ...current, [productId]: { ...current[productId], ...patch } }));
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApi.saveBudgetOfferCategory(editingCategoryId, {
        name: categoryForm.name.trim(),
        maxDisplayPrice: Number(categoryForm.maxDisplayPrice),
        imageUrl: categoryForm.imageUrl.trim() || null,
        sortOrder: Number(categoryForm.sortOrder),
        isActive: categoryForm.isActive,
        startDate: toApiDate(categoryForm.startDate),
        endDate: toApiDate(categoryForm.endDate),
      });
      setEditingCategoryId(undefined);
      setCategoryForm(EMPTY_CATEGORY);
      setNotice('Budget offer category saved.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save budget offer category.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(category: BudgetOfferCategory) {
    if (!window.confirm(`Delete "${category.name}" and remove its product assignments?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApi.deleteBudgetOfferCategory(category.id);
      setNotice('Category and its product assignments were deleted.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete budget offer category.');
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct(productId: string) {
    const draft = drafts[productId];
    if (!draft) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!draft.show) {
        await adminApi.saveProductBudgetOffer(productId, { remove: true });
      } else {
        await adminApi.saveProductBudgetOffer(productId, {
          categoryId: draft.categoryId,
          offerPrice: Number(draft.offerPrice),
          isActive: draft.isActive,
          startDate: toApiDate(draft.startDate),
          endDate: toApiDate(draft.endDate),
        });
      }
      setNotice('Product budget offer saved.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save product budget offer.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSelectedProducts() {
    const selected = selectedIds.map((id) => ({ id, draft: drafts[id] })).filter((item) => item.draft);
    if (!selected.length) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const assignments = selected.filter(({ draft }) => draft!.show).map(({ id, draft }) => ({
        productId: id,
        categoryId: draft!.categoryId,
        offerPrice: Number(draft!.offerPrice),
        isActive: draft!.isActive,
        startDate: toApiDate(draft!.startDate),
        endDate: toApiDate(draft!.endDate),
      }));
      const removals = selected.filter(({ draft }) => !draft!.show).map(({ id }) => id);
      if (assignments.length) await adminApi.bulkBudgetOffers({ assignments });
      if (removals.length) await adminApi.bulkBudgetOffers({ productIds: removals, action: 'REMOVE' });
      setNotice(`Saved offers for ${selected.length} selected products.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save selected product offers.');
    } finally {
      setBusy(false);
    }
  }

  async function bulkAction(action: 'ACTIVATE' | 'DEACTIVATE' | 'REMOVE') {
    if (!selectedIds.length) return;
    if (action === 'REMOVE' && !window.confirm(`Remove budget offers from ${selectedIds.length} selected products?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await adminApi.bulkBudgetOffers({ productIds: selectedIds, action });
      const count = 'updated' in result ? result.updated : selectedIds.length;
      setNotice(`${action === 'REMOVE' ? 'Removed' : action === 'ACTIVATE' ? 'Activated' : 'Deactivated'} ${count} product offers.`);
      setSelectedIds([]);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update selected product offers.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-5">
    <header>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#FF7900]">Super Admin</p>
      <h2 className="mt-1 text-xl font-extrabold text-[#08264A]">Budget Offers Management</h2>
      <p className="mt-1 text-sm text-[#788391]">Create dynamic price categories and manage product offer prices without changing regular prices.</p>
    </header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>}

    <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      <div className="border-b border-[#E2E8F0] px-4 py-3"><h3 className="text-sm font-extrabold text-[#08264A]">Budget offer categories</h3></div>
      <form onSubmit={(event) => void saveCategory(event)} className="grid gap-3 border-b border-[#E2E8F0] p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-[#788391]">Category name<input required maxLength={80} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Under ₹25" className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm text-[#202A36]" /></label>
        <label className="text-xs font-bold text-[#788391]">Maximum display price (₹)<input required type="number" min="1" step="1" value={categoryForm.maxDisplayPrice} onChange={(event) => setCategoryForm({ ...categoryForm, maxDisplayPrice: event.target.value })} className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm text-[#202A36]" /></label>
        <label className="text-xs font-bold text-[#788391]">Public image URL<input type="url" value={categoryForm.imageUrl} onChange={(event) => setCategoryForm({ ...categoryForm, imageUrl: event.target.value })} placeholder="https://example.com/image.jpg" className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm text-[#202A36]" /><span className="mt-1 block font-normal">This image appears beside the offer in the customer app.</span></label>
        <label className="text-xs font-bold text-[#788391]">Display order<input type="number" step="1" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: event.target.value })} className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm text-[#202A36]" /></label>
        <label className="text-xs font-bold text-[#788391]">Start date<input type="date" value={categoryForm.startDate} onChange={(event) => setCategoryForm({ ...categoryForm, startDate: event.target.value })} className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm text-[#202A36]" /></label>
        <label className="text-xs font-bold text-[#788391]">End date<input type="date" value={categoryForm.endDate} onChange={(event) => setCategoryForm({ ...categoryForm, endDate: event.target.value })} className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm text-[#202A36]" /></label>
        <label className="flex items-center gap-2 text-xs font-bold text-[#788391]"><input type="checkbox" checked={categoryForm.isActive} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.checked })} /> Active</label>
        <div className="flex items-end gap-2"><button disabled={busy} className="rounded-lg bg-[#FF7900] px-4 py-2 text-xs font-extrabold text-[#08264A] disabled:opacity-50">{editingCategoryId ? 'Save category' : 'Create category'}</button>{editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(undefined); setCategoryForm(EMPTY_CATEGORY); }} className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-bold">Cancel</button>}</div>
      </form>
      {categories.length ? <div className="divide-y divide-[#E2E8F0]">{categories.map((category) => <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {category.imageUrl ? <img src={category.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#FFF1DE] font-extrabold text-[#FF7900]">₹</div>}
          <div><p className="text-sm font-bold text-[#202A36]">{category.name} <span className="font-normal text-[#788391]">· max ₹{category.maxDisplayPrice}</span></p><p className="text-[10px] text-[#788391]">{category._count?.productOffers ?? 0} assigned · order {category.sortOrder} · {category.isActive ? 'Active' : 'Inactive'}{category.startDate ? ` · from ${toLocalDate(category.startDate)}` : ''}{category.endDate ? ` · until ${toLocalDate(category.endDate)}` : ''}</p></div>
        </div>
        <div className="flex gap-2"><button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryForm(categoryDraft(category)); }} className="rounded-md border border-[#CBD5E1] px-3 py-1.5 text-xs font-bold text-[#08264A]">Edit</button><button type="button" disabled={busy} onClick={() => void deleteCategory(category)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">Delete</button></div>
      </div>)}</div> : <p className="p-5 text-center text-sm text-[#788391]">Create a price category to start assigning products.</p>}
    </section>

    <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3"><div><h3 className="text-sm font-extrabold text-[#08264A]">Product assignments</h3><p className="mt-1 text-[10px] text-[#788391]">Offer prices are separate from regular selling prices. Only active published products are shown to customers.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !selectedIds.length} onClick={() => void saveSelectedProducts()} className="rounded-md bg-[#FF7900] px-3 py-2 text-xs font-bold text-[#08264A] disabled:opacity-50">Save selected</button>
          <button type="button" disabled={busy || !selectedIds.length} onClick={() => void bulkAction('ACTIVATE')} className="rounded-md border border-[#CBD5E1] px-3 py-2 text-xs font-bold disabled:opacity-50">Activate</button>
          <button type="button" disabled={busy || !selectedIds.length} onClick={() => void bulkAction('DEACTIVATE')} className="rounded-md border border-[#CBD5E1] px-3 py-2 text-xs font-bold disabled:opacity-50">Deactivate</button>
          <button type="button" disabled={busy || !selectedIds.length} onClick={() => void bulkAction('REMOVE')} className="rounded-md border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Remove offers</button>
        </div>
      </div>
      <div className="grid gap-2 border-b border-[#E2E8F0] p-4 md:grid-cols-3">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or vendor" aria-label="Search products by name or vendor" className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm" />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter products by catalog category" className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm"><option value="">All product categories</option>{[...new Map(products.map((product) => [product.category.id, product.category])).values()].map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} aria-label="Filter products by vendor" className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm"><option value="">All vendors</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.businessName}</option>)}</select>
      </div>
      {loading ? <p className="p-8 text-center text-sm text-[#788391]">Loading products…</p> : !visibleProducts.length ? <p className="p-8 text-center text-sm text-[#788391]">No products match these filters.</p> : <div className="divide-y divide-[#E2E8F0]">{visibleProducts.map((product) => {
        const draft = drafts[product.id] ?? productDraft(product, categories);
        const selected = selectedIds.includes(product.id);
        return <article key={product.id} className="grid gap-3 p-4 xl:grid-cols-[minmax(210px,1fr)_auto]">
          <div className="flex min-w-0 items-start gap-3">
            <input type="checkbox" aria-label={`Select ${product.name} for bulk budget offer actions`} checked={selected} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} className="mt-1" />
            {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#F5F7FA] text-lg font-bold text-[#788391]">{product.name.charAt(0)}</div>}
            <div className="min-w-0"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 text-xs text-[#788391]">{product.brand ? `${product.brand} · ` : ''}{product.vendor.businessName} · {product.category.name}</p><p className="mt-1 text-[10px] text-[#788391]">Regular customer price ₹{product.customerSellingPrice ?? product.basePrice} · {product.status}</p>
              <label className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#08264A]"><input type="checkbox" checked={draft.show} onChange={(event) => updateProductDraft(product.id, { show: event.target.checked })} /> Show in Budget Offers</label>
            </div>
          </div>
          {draft.show && <div className="grid items-end gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <label className="text-[10px] font-bold text-[#788391]">Offer category<select value={draft.categoryId} onChange={(event) => updateProductDraft(product.id, { categoryId: event.target.value })} className="mt-1 w-full rounded border border-[#CBD5E1] bg-white px-2 py-2 text-xs"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name} · max ₹{category.maxDisplayPrice}</option>)}</select></label>
            <label className="text-[10px] font-bold text-[#788391]">Display price (₹)<input type="number" min="1" step="1" value={draft.offerPrice} onChange={(event) => updateProductDraft(product.id, { offerPrice: event.target.value })} className="mt-1 w-full rounded border border-[#CBD5E1] px-2 py-2 text-xs" /></label>
            <label className="text-[10px] font-bold text-[#788391]">Start date<input type="date" value={draft.startDate} onChange={(event) => updateProductDraft(product.id, { startDate: event.target.value })} className="mt-1 w-full rounded border border-[#CBD5E1] px-2 py-2 text-xs" /></label>
            <label className="text-[10px] font-bold text-[#788391]">End date<input type="date" value={draft.endDate} onChange={(event) => updateProductDraft(product.id, { endDate: event.target.value })} className="mt-1 w-full rounded border border-[#CBD5E1] px-2 py-2 text-xs" /></label>
            <label className="flex items-center gap-2 pb-2 text-xs font-bold text-[#788391]"><input type="checkbox" checked={draft.isActive} onChange={(event) => updateProductDraft(product.id, { isActive: event.target.checked })} /> Offer active</label>
            <button type="button" disabled={busy} onClick={() => void saveProduct(product.id)} className="rounded-md border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#08264A] disabled:opacity-50">Save product</button>
          </div>}
        </article>;
      })}</div>}
    </section>
  </div>;
}
