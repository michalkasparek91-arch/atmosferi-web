import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import AuthDialog from "@/components/AuthDialog";
import { useSession } from "@/providers/SessionProvider";

type AuthStep = "email" | "login" | "register-type" | "register" | "email-verification" | "password-reset-sent";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, profile, isLoading } = useSession();
  const [authDialogOpen, setAuthDialogOpen] = useState(true);
  const [step, setStep] = useState<AuthStep>("email");
  const isNativeApp = sessionStorage.getItem("isNativeApp") === "true";

  useEffect(() => {
    if (isLoading) return;

    if (session) {
      if (profile) {
        // Logged in but user_type is not set (e.g. new Google user)
        if (!profile.user_type) {
          setStep("register-type");
          return;
        }

        let postAuthRedirect = localStorage.getItem("postAuthRedirect") || sessionStorage.getItem("postAuthRedirect");
        
        // Fallback: If postAuthRedirect is missing but we have a sniperJobId, assume we want to go back to the shared job
        if (!postAuthRedirect) {
          const sniperJobId = localStorage.getItem("sniperJobId") || sessionStorage.getItem("sniperJobId");
          if (sniperJobId) {
            postAuthRedirect = `/sdilena-zakazka/${sniperJobId}`;
          }
        }

        if (postAuthRedirect) {
          localStorage.removeItem("postAuthRedirect");
          sessionStorage.removeItem("postAuthRedirect");
          navigate(postAuthRedirect, { replace: true });
          return;
        }

        if (profile.user_type === "customer") {
          navigate("/zakaznik/nova-zakazka", { replace: true });
        } else if (profile.user_type === "worker") {
          navigate("/registrace-remeslnika", { replace: true });
        } else if (profile.user_type === "both") {
          const lastRole = localStorage.getItem("last_role");
          if (lastRole === "worker") {
            navigate("/remeslnik/hledej", { replace: true });
          } else {
            navigate("/zakaznik/nova-zakazka", { replace: true });
          }
        }
      } else {
        // Logged in but profile is not loaded or doesn't exist yet
        setStep("register-type");
      }
    } else {
      setStep("email");
    }
  }, [session, profile, isLoading, navigate]);

  // When dialog closes without successful auth, go back to landing page
  const handleDialogChange = (open: boolean) => {
    setAuthDialogOpen(open);
    if (!open) {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c1408] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground text-sm mt-4 font-medium">Načítání...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isNativeApp && <Header />}
      <div className="container mx-auto px-4 py-20 flex items-center justify-center" />
      <AuthDialog open={authDialogOpen} onOpenChange={handleDialogChange} initialStep={step} />
    </div>
  );
};

export default Auth;

