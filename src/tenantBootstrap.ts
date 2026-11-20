import { collection as fsCollection, doc as fsDoc, Firestore } from 'firebase/firestore';

export interface UniversalTenantConfig {
  id?: string;
  slug?: string;
  name?: string;
  slogan?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  phone?: string;
  whatsapp?: string;
  businessType?: string;
  commercialRegister?: string;
  taxCardNumber?: string;
  subscriptionStatus?: 'active' | 'trial' | 'expired';
  appAccessMode?: 'full_app' | 'landing_page';
  studioLandingPageUrl?: string;
  planNameAr?: string;
  upgradeUrl?: string;
}

export function resolveCafeBrandSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const b = (window as any).__TENANT_BRAND__ as UniversalTenantConfig | undefined;
  const slug = String(b?.slug || b?.id || '').trim().toLowerCase();
  if (!slug || slug === 'sehraya-cafe' || slug === 'sehraya_cafe') return null;
  return slug;
}

export function tenantCollection(db: Firestore, path: string, ...pathSegments: string[]) {
  const slug = resolveCafeBrandSlug();
  return slug ? fsCollection(db, 'tenants', slug, path, ...pathSegments) : fsCollection(db, path, ...pathSegments);
}

export function tenantDoc(db: Firestore, path: string, ...pathSegments: string[]) {
  const slug = resolveCafeBrandSlug();
  return slug ? fsDoc(db, 'tenants', slug, path, ...pathSegments) : fsDoc(db, path, ...pathSegments);
}

const DEFAULT_TOKENS = ['كافيه سهرايا', 'كافية سهرايا', 'سهرايا', 'Sehraya Cafe', 'Sehraya'];
const DEFAULT_SUBTITLE = 'المنيو الرقمي وطلبات الطاولات';

function renderGateOverlay(id: string, html: string, zIndex: number) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.dir = 'rtl';
  overlay.style.cssText = `position:fixed;inset:0;z-index:${zIndex};overflow:auto;background:rgba(2,6,23,0.96);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px 16px;font-family:Cairo,sans-serif;color:#fff;`;
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function applyThemeAndMeta(brand: UniversalTenantConfig) {
  if (typeof document === 'undefined') return;
  const primary = brand.primaryColor || '#D4AF37';
  document.documentElement.style.setProperty('--tenant-primary', primary);
  document.documentElement.style.setProperty('--brand-primary', primary);

  let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = primary;

  if (brand.logoUrl) {
    let iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = brand.logoUrl;
  }

  if (brand.name) {
    document.title = `${brand.name} | ${brand.slogan || DEFAULT_SUBTITLE}`;
  }
}

function startDomBrandReplacer(brandName: string) {
  if (typeof document === 'undefined' || !brandName) return;
  const escaped = DEFAULT_TOKENS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(escaped.join('|'), 'g');

  const replaceTextNodes = (root: Node) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue;
      if (val && regex.test(val)) {
        regex.lastIndex = 0;
        node.nodeValue = val.replace(regex, brandName);
      }
    }
  };

  replaceTextNodes(document.body);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData' && m.target.nodeValue && regex.test(m.target.nodeValue)) {
        regex.lastIndex = 0;
        m.target.nodeValue = m.target.nodeValue.replace(regex, brandName);
      } else {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) {
            replaceTextNodes(n);
          }
        });
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

export async function initTenantBootstrap(): Promise<UniversalTenantConfig | null> {
  let brand: UniversalTenantConfig | null = null;
  try {
    const res = await fetch('/tenant-config.json', { cache: 'no-store' });
    if (res.ok) {
      const parsed = await res.json();
      if (parsed && typeof parsed === 'object' && parsed.name) {
        brand = parsed;
      }
    }
  } catch {}

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const queryBrandId = params?.get('brandId') || params?.get('tenant');
  if (queryBrandId && (!brand || (brand.slug !== queryBrandId && brand.id !== queryBrandId))) {
    try {
      const res = await fetch(`https://ez-zel.onrender.com/api/public/brand/${encodeURIComponent(queryBrandId)}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data?.brand) brand = data.brand;
      }
    } catch {}
  }

  if (!brand || !brand.name) return null;
  (window as any).__TENANT_BRAND__ = brand;
  applyThemeAndMeta(brand);

  const isDefaultBrand = DEFAULT_TOKENS.some(t => t.toLowerCase() === brand!.name!.trim().toLowerCase());
  if (!isDefaultBrand && typeof document !== 'undefined') {
    if (document.body) {
      startDomBrandReplacer(brand.name);
    } else {
      window.addEventListener('DOMContentLoaded', () => startDomBrandReplacer(brand!.name!));
    }
  }

  if (brand.subscriptionStatus === 'expired') {
    renderGateOverlay(
      'ezzel-trial-paywall',
      `<div style="max-width:460px;background:#0f172a;border:2px solid #f59e0b;border-radius:24px;padding:28px;text-align:center;">
        <h2 style="margin:0 0 10px;font-size:22px;font-weight:900;">تطبيق ${brand.name} متوقف مؤقتاً</h2>
        <p style="margin:0 0 18px;font-size:14px;color:#cbd5e1;">انتهت فترة التجربة. يرجى تفعيل الاشتراك عبر منظومة الظل لاستئناف التشغيل.</p>
        <a href="${brand.upgradeUrl || 'https://ez-zel.onrender.com/pricing'}" target="_blank" rel="noreferrer" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#f59e0b;color:#020617;font-weight:900;text-decoration:none;">تفعيل الاشتراك الآن</a>
      </div>`,
      999999
    );
  } else if (brand.appAccessMode === 'landing_page') {
    if (brand.studioLandingPageUrl && !window.location.href.startsWith(brand.studioLandingPageUrl)) {
      window.location.replace(brand.studioLandingPageUrl);
    } else {
      const waNum = String(brand.whatsapp || brand.phone || '').replace(/[^0-9]/g, '');
      const waHref = `https://wa.me/${waNum.startsWith('0') ? `2${waNum}` : waNum}`;
      renderGateOverlay(
        'ezzel-landing-gate',
        `<div style="max-width:480px;background:#0f172a;border:1px solid #10b981;border-radius:24px;padding:28px;text-align:center;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;">${brand.name}</h1>
          <p style="margin:0 0 18px;font-size:14px;color:#cbd5e1;">${brand.slogan || DEFAULT_SUBTITLE}</p>
          ${waNum ? `<a href="${waHref}" target="_blank" rel="noreferrer" style="display:block;padding:12px;border-radius:12px;background:#25D366;color:#020617;font-weight:900;text-decoration:none;margin-bottom:12px;">💬 تواصل عبر واتساب</a>` : ''}
          <a href="${brand.upgradeUrl || 'https://ez-zel.onrender.com/pricing'}" target="_blank" rel="noreferrer" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#38bdf8;color:#020617;font-weight:900;text-decoration:none;">ترقية للنظام الكامل</a>
        </div>`,
        999998
      );
    }
  }

  return brand;
}
