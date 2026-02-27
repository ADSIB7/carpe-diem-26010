import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgriShield Warehouse Portal",
  description: "Supabase Auth with Next.js App Router"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="brand">AgriShield</div>
        </header>
        <main className="page-wrap">{children}</main>
      </body>
    </html>
  );
}
