/**
 * Host-aware PWA manifest helpers for Sales and Admin entry points.
 * Path mode (localhost:3000/sales) vs subdomain mode (sales.* / pos.*).
 */

export function isSalesHost(hostname = "") {
  return (
    hostname.includes("sales.tastybitesrestaurant.com") ||
    hostname.includes("sales.localhost")
  );
}

export function isPosHost(hostname = "") {
  return (
    hostname.includes("pos.tastybitesrestaurant.com") ||
    hostname.includes("pos.localhost")
  );
}

const THEME = {
  theme_color: "#F97316",
  background_color: "#FAFAFA",
  display: "standalone",
};

function iconSet(prefix) {
  return [
    {
      src: `/icons/${prefix}-192.png`,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: `/icons/${prefix}-512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: `/icons/${prefix}-maskable-512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
}

export function buildSalesManifest(hostname = "") {
  const subdomain = isSalesHost(hostname);
  return {
    id: subdomain ? "/" : "/sales",
    name: "Tasty Bites Sales",
    short_name: "Sales",
    description: "Tasty Bites restaurant sales and floor POS",
    start_url: subdomain ? "/" : "/sales",
    scope: subdomain ? "/" : "/sales/",
    ...THEME,
    icons: iconSet("sales"),
  };
}

export function buildAdminManifest(hostname = "") {
  const subdomain = isPosHost(hostname);
  return {
    id: subdomain ? "/" : "/admin",
    name: "Tasty Bites Admin",
    short_name: "Admin",
    description: "Tasty Bites restaurant admin and POS management",
    start_url: subdomain ? "/" : "/admin",
    scope: subdomain ? "/" : "/admin/",
    ...THEME,
    icons: iconSet("admin"),
  };
}

export function manifestResponse(manifest) {
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
