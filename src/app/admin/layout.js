import { AdminProvider } from "@/context/AdminContext";

export default function AdminRootLayout({ children }) {
  return <AdminProvider>{children}</AdminProvider>;
}
