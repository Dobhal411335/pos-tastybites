import { AdminProvider } from "@/context/AdminContext";
import RegisterServiceWorker from "@/components/pwa/RegisterServiceWorker";

export const metadata = {
  title: {
    default: "Tasty Bites Admin",
    template: "%s | Tasty Bites Admin",
  },
  applicationName: "Tasty Bites Admin",
  description: "Tasty Bites restaurant admin and POS management",
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Admin",
  },
  icons: {
    icon: [
      { url: "/icons/admin-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/admin-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/admin-apple-touch.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#F97316",
};

export default function AdminRootLayout({ children }) {
  return (
    <>
      <RegisterServiceWorker />
      <AdminProvider>{children}</AdminProvider>
    </>
  );
}
