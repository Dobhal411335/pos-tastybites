/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Intentionally no strict CSP yet — Sales/POS uses Socket.IO, inline styles, and rich editors.
  // Frame/MIME/referrer hardening only to avoid breaking floor terminals.
];

const productionHeaders =
  process.env.NODE_ENV === "production"
    ? [
        ...securityHeaders,
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : securityHeaders;

const remotePatterns = [
  {
    protocol: "https",
    hostname: "res.cloudinary.com",
    pathname: "/**",
  },
];

// Local/dev uploads and absolute localhost images used by Next/Image
if (process.env.NODE_ENV !== "production") {
  remotePatterns.push(
    { protocol: "http", hostname: "localhost", pathname: "/**" },
    { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
  );
}

const nextConfig = {
  reactStrictMode: false,
  // Keep pdfkit/exceljs outside the bundler so AFM font data resolves from real node_modules
  // (bundling rewrites __dirname to an invalid path like D:\ROOT\...).
  serverExternalPackages: ["pdfkit", "fontkit", "exceljs"],
  outputFileTracingIncludes: {
    "/api/eod/pdf": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/eod/email": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/eod/excel": ["./node_modules/exceljs/**/*"],
  },
  images: {
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: productionHeaders,
      },
    ];
  },
};

export default nextConfig;
