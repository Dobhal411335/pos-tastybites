import { Toaster } from "sonner";
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://pos.tastybitesrestaurant.com/"),
  title: {
    default: "TastyBites - Modern POS & Restaurant Management",
    template: "%s | TastyBites",
  },
  description:
    "Experience seamless restaurant management with TastyBites. Manage menus, orders, tables, and staff efficiently with our enterprise POS solution.",
  keywords:
    "tastybites, restaurant pos, pos system, restaurant management, online ordering, billing software, menu management, cafe pos",
  icons: { 
    icon: "/favicon/favicon.ico",
    shortcut: "/favicon/favicon-16x16.png",
    apple: "/favicon/apple-touch-icon.png" 
  },
  manifest: "/favicon/site.webmanifest",
  openGraph: {
    title: "TastyBites - Modern POS & Restaurant Management",
    description:
      "Experience seamless restaurant management with TastyBites. Manage menus, orders, tables, and staff efficiently.",
    images: ["/BannerImage.png"],
    url: "https://pos.tastybitesrestaurant.com/",
    siteName: "TastyBites",
  },
  twitter: {
    card: "summary_large_image",
    title: "TastyBites - Modern POS & Restaurant Management",
    description:
      "Experience seamless restaurant management with TastyBites. Manage menus, orders, tables, and staff efficiently.",
    images: ["/BannerImage.png"],
  },
  other: {
    "author": "TastyBites",
    "robots": "index, follow",
    "viewport": "width=device-width, initial-scale=1",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
    suppressHydrationWarning
      lang="en"
      className={``}
    >
      <body className="min-h-full flex flex-col">
        <Toaster position="top-right" richColors />
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
