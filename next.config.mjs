/** @type {import('next').NextConfig} */
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
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*',
            },
            {
                protocol: 'http',
                hostname: '*',
            },
        ]
    }
};

export default nextConfig;