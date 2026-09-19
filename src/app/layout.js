import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/CartContext";
import { RestaurantPublicProvider } from "@/context/RestaurantPublicContext";
import { MenuPublicProvider } from "@/context/MenuPublicContext";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://pos.tastybitesrestaurant.com/"),
  title: {
    default: "Tasty Bites | Order Online for Same-Day Pickup",
    template: "%s | Tasty Bites",
  },
  description:
    "Order from Tasty Bites online for same-day pickup. Browse the menu, customize your meal, and pay at the restaurant.",
  keywords:
    "tasty bites, order online, restaurant pickup, menu, Exeter restaurant",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Tasty Bites | Order Online for Same-Day Pickup",
    description:
      "Fresh food made to order. Order online, pick up the same day, pay at the restaurant.",
    images: ["/BannerImage.png"],
    url: "https://pos.tastybitesrestaurant.com/",
    siteName: "Tasty Bites",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tasty Bites | Order Online",
    description:
      "Fresh food made to order. Order online for same-day pickup.",
    images: ["/BannerImage.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={jakarta.variable}
      style={{ ["--font-display"]: "var(--font-body)" }}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Toaster position="top-right" richColors />
        <RestaurantPublicProvider>
          <MenuPublicProvider>
            <CartProvider>{children}</CartProvider>
          </MenuPublicProvider>
        </RestaurantPublicProvider>
      </body>
    </html>
  );
}
