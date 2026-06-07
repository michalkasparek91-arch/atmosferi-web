import { lazy, Suspense, useEffect } from "react";

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Lightweight layout shell for public-facing pages (worker profiles, etc.)
 * Renders the same Header + Footer as the landing page, without any
 * dashboard sidebar/menu. Forces light mode to match the primary site aesthetic.
 */
export const PublicLayout = ({ children }: PublicLayoutProps) => {
  // Force light mode on public pages (same approach as Index.tsx landing page)
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    if (wasDark) document.documentElement.classList.remove("dark");
    return () => {
      if (wasDark) document.documentElement.classList.add("dark");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default PublicLayout;
