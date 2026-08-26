import SalesAppShell from "@/components/pwa/SalesAppShell";
import RegisterServiceWorker from "@/components/pwa/RegisterServiceWorker";

export const metadata = {
  title: {
    default: "Tasty Bites Sales",
    template: "%s | Tasty Bites Sales",
  },
  applicationName: "Tasty Bites Sales",
  description: "Tasty Bites restaurant sales and floor POS",
  manifest: "/sales/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sales",
  },
  icons: {
    icon: [
      { url: "/icons/sales-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/sales-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/sales-apple-touch.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#F97316",
};

export default function SalesLayout({ children }) {
  return (
    <>
      <RegisterServiceWorker />
      <SalesAppShell>{children}</SalesAppShell>
    </>
  );
}
