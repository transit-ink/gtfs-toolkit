declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let measurementId: string | null = null;

/**
 * Load gtag script and initialize GA4 with the given measurement ID.
 * One data stream per region: each subdomain uses its stream's ID (see INSTANCES in constants).
 * No-op if id is missing or GA is already initialized.
 */
export function initGa(id: string | undefined): void {
  if (!id || measurementId !== null) return;
  measurementId = id;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.gtag('config', id);
}

/**
 * Send a page_view event for SPA route changes.
 * No-op if GA was not initialized.
 */
export function pageview(path: string): void {
  if (measurementId && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', { page_path: path });
  }
}

/**
 * Send a search event when the user performs a search (GA4 recommended event).
 * No-op if GA was not initialized.
 */
export function trackSearch(searchTerm: string): void {
  if (measurementId && typeof window.gtag === 'function' && searchTerm.trim()) {
    window.gtag('event', 'search', { search_term: searchTerm.trim() });
  }
}
