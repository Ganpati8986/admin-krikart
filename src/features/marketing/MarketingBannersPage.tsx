import { useEffect, useState } from 'react';
import { adminApi, MarketingBanner } from '../../api';

const MAX_IMAGE_BYTES = 200 * 1024;
const MAX_HOME_BANNERS = 5;
const IMAGE_CLASS = 'h-36 w-full rounded-lg bg-[#F5F7FA] object-contain';
const FILE_CLASS = 'block w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs';

export function MarketingBannersPage() {
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const allBanners = await adminApi.marketingBanners();
      setBanners(allBanners.filter((banner) => banner.surface === 'CAROUSEL').slice(0, MAX_HOME_BANNERS));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the home banner.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    if (banners.length + selectedFiles.length > MAX_HOME_BANNERS) {
      setError(`You can show up to ${MAX_HOME_BANNERS} home banners. There are ${MAX_HOME_BANNERS - banners.length} available slot(s).`);
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    let uploaded = 0;
    try {
      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) throw new Error('Choose image files only.');
        const imageUrl = await compressImage(file);
        await adminApi.saveMarketingBanner(undefined, {
          title: 'Home banner',
          subtitle: null,
          imageUrl,
          ctaText: 'Explore now',
          destination: 'BUDGET_OFFERS',
          destinationId: null,
          customPath: null,
          surface: 'CAROUSEL',
          priority: banners.length + uploaded,
          startDate: null,
          endDate: null,
          isActive: true,
          showCountdown: false,
        });
        uploaded += 1;
      }
      setNotice(`${uploaded} home banner${uploaded === 1 ? '' : 's'} uploaded.`);
    } catch (caught) {
      setError(caught instanceof Error
        ? `${caught.message}${uploaded ? ` ${uploaded} banner(s) uploaded before the error.` : ''}`
        : 'Could not upload the home banners.');
    } finally {
      await load();
      setBusy(false);
    }
  }

  async function uploadImage(file: File | undefined, current?: MarketingBanner) {
    if (!file) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
      const imageUrl = await compressImage(file);
      await adminApi.saveMarketingBanner(current?.id, {
        title: current?.title ?? 'Home banner',
        subtitle: current?.subtitle ?? null,
        imageUrl,
        ctaText: current?.ctaText ?? 'Explore now',
        destination: current?.destination ?? 'BUDGET_OFFERS',
        destinationId: current?.destinationId ?? null,
        customPath: current?.customPath ?? null,
        surface: 'CAROUSEL',
        priority: current?.priority ?? banners.length,
        startDate: null,
        endDate: null,
        isActive: true,
        showCountdown: false,
      });
      setNotice(current ? 'Home banner updated.' : 'Home banner uploaded.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not upload the home banner.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteBanner(banner: MarketingBanner) {
    if (!window.confirm('Delete this home banner?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApi.deleteMarketingBanner(banner.id);
      setNotice('Home banner deleted.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the home banner.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-3xl space-y-5">
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#15966B]">Home page</p>
      <h1 className="mt-1 text-2xl font-black text-[#08264A]">Home banner</h1>
      <p className="mt-1 text-sm text-[#687588]">Upload up to five images for the carousel below the Grocery and Food cards.</p>
    </header>

    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

    <section className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <label className="block text-sm font-bold text-[#08264A]">
        Upload home banner images
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(event) => {
            void uploadImages(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
          className={`mt-2 ${FILE_CLASS}`}
        />
      </label>
      <p className="mt-2 text-xs text-[#8A96A6]">{banners.length}/{MAX_HOME_BANNERS} banners · Select 1–{MAX_HOME_BANNERS - banners.length} images. Images are compressed and keep their original proportions.</p>
    </section>

    <section className="space-y-3">
      <h2 className="text-sm font-extrabold text-[#08264A]">Home carousel · {banners.length}/{MAX_HOME_BANNERS}</h2>
      {loading
        ? <p className="rounded-xl border border-[#E2E8F0] bg-white p-5 text-sm text-[#687588]">Loading…</p>
        : banners.length === 0
          ? <p className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-5 text-sm text-[#687588]">No home banner uploaded.</p>
          : banners.map((banner) => <article key={banner.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            {banner.imageUrl
              ? <img src={banner.imageUrl} alt="Home banner" className={IMAGE_CLASS} />
              : <div className={`${IMAGE_CLASS} grid place-items-center text-sm text-[#8A96A6]`}>No image</div>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="text-xs font-bold text-[#687588]">
                Replace image
                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(event) => {
                    void uploadImage(event.currentTarget.files?.[0], banner);
                    event.currentTarget.value = '';
                  }}
                  className={`mt-1 ${FILE_CLASS}`}
                />
              </label>
              <button type="button" disabled={busy} onClick={() => void deleteBanner(banner)} className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 disabled:opacity-50">
                Delete banner
              </button>
            </div>
          </article>)}
    </section>
  </div>;
}

async function compressImage(file: File) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not read the image. Choose a valid image file.');
  }

  try {
    let scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    let quality = 0.82;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the banner image.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const compressed = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not compress the banner image.')), 'image/jpeg', quality);
      });
      if (compressed.size <= MAX_IMAGE_BYTES) {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the image.'));
          reader.onerror = () => reject(new Error('Could not read the image.'));
          reader.readAsDataURL(compressed);
        });
      }
      if (quality > 0.5) quality = Math.max(0.45, quality - 0.1);
      else if (scale > 0.02) scale *= 0.75;
      else break;
    }
    throw new Error('Could not compress this image. Choose a smaller image.');
  } finally {
    bitmap.close();
  }
}
