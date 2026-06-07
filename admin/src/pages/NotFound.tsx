import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center p-8">
        <h1 className="mb-4 text-6xl font-bold tracking-tighter">404</h1>
        <p className="mb-8 text-xl text-muted-foreground">Stránka nebyla nalezena</p>
        <Button asChild className="rounded-full px-8" size="lg">
          <Link to="/">
            Zpět na úvodní stránku
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
