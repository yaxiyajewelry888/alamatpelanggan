/**
 * Helper to dynamically update the browser tab favicon based on store settings custom logo.
 * Supports direct URLs, Base64 data URLs, and auto-centers wide/rectangular logos into a crisp square canvas.
 */

export const DEFAULT_FAVICON_URL = '/logo-yaxiya-pink.png';
const STORAGE_KEY = 'yaxiya_app_favicon';

function applyFaviconToDocument(href: string) {
  try {
    // Select or create favicon link tags
    const iconRels = ['icon', 'shortcut icon', 'apple-touch-icon'];
    
    // Remove existing links to force browser re-evaluation
    const existing = document.querySelectorAll("link[rel*='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
    existing.forEach(el => el.remove());

    iconRels.forEach(rel => {
      const link = document.createElement('link');
      link.rel = rel;
      if (href.startsWith('data:image/svg') || href.includes('.svg')) {
        link.type = 'image/svg+xml';
      } else if (href.startsWith('data:image/jpeg') || href.includes('.jpg') || href.includes('.jpeg')) {
        link.type = 'image/jpeg';
      } else {
        link.type = 'image/png';
      }
      link.href = href;
      document.head.appendChild(link);
    });

    // Also cache in localStorage for instant retrieval on next reload before React mounts
    try {
      if (href && href.length < 500000) { // Avoid overflow if huge base64
        localStorage.setItem(STORAGE_KEY, href);
      }
    } catch {}
  } catch (err) {
    console.warn('[Favicon] Failed to apply favicon:', err);
  }
}

/**
 * Updates the browser favicon dynamically.
 * @param customLogoUrl Custom logo URL or base64 string from store settings
 */
export function updateFavicon(customLogoUrl?: string | null) {
  const targetUrl = customLogoUrl && customLogoUrl.trim().length > 0 
    ? customLogoUrl.trim() 
    : DEFAULT_FAVICON_URL;

  // 1. Immediately apply the target URL directly
  applyFaviconToDocument(targetUrl);

  // 2. Enhance: Load into an Image and render centered with square aspect ratio
  // This prevents rectangular / wide company logos from getting distorted or squished in browser tabs
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, size, size);

        // Keep 2px inner padding
        const padding = 2;
        const maxW = size - padding * 2;
        const maxH = size - padding * 2;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (size - drawW) / 2;
        const offsetY = (size - drawH) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        const squareFaviconData = canvas.toDataURL('image/png');
        applyFaviconToDocument(squareFaviconData);
      } catch (canvasErr) {
        // If canvas is tainted (CORS on external URL), direct apply already succeeded
      }
    };
    img.onerror = () => {
      // If image fails, revert to default
      if (targetUrl !== DEFAULT_FAVICON_URL) {
        applyFaviconToDocument(DEFAULT_FAVICON_URL);
      }
    };
    img.src = targetUrl;
  } catch {}
}
