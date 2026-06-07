import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";

// Lazy-load below-hero components to reduce JS blocking LCP
const ServiceCategories = lazy(() => import("@/components/ServiceCategories"));
const TrustHighlights = lazy(() => import("@/components/TrustHighlights"));
const NativeOnboarding = lazy(() => import("@/components/NativeOnboarding"));

// Lazy-load below-fold sections to reduce initial JS and improve LCP
const OstravaLaunchSection = lazy(() => import("@/components/OstravaLaunchSection"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const AppPromoSection = lazy(() => import("@/components/AppPromoSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const CustomerBenefitsSection = lazy(() => import("@/components/CustomerBenefitsSection"));
const WorkerRecruitmentSection = lazy(() => import("@/components/WorkerRecruitmentSection"));
const CtaSection = lazy(() => import("@/components/CtaSection"));
const Footer = lazy(() => import("@/components/Footer"));
const TopPseoLinks = lazy(() => import("@/components/seo/TopPseoLinks"));
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import JsonLd from "@/components/JsonLd";
import { usePageSEO } from "@/hooks/use-page-seo";
const getToast = () => import("@/hooks/use-toast").then(m => m.toast);

// Dynamically import supabase to avoid loading the heavy chunk before first paint
const getSupabase = () => import("@/integrations/supabase/client").then((m) => m.supabase);

const Index = () => {
  const isNativeApp = useIsNativeApp();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const handledPendingJobRef = useRef(false);

  // Initialize SEO for homepage
  usePageSEO({
    title: "Jedna aplikace na všechny služby",
    description: "Potřebujete instalatéra, účetní nebo fitness trenéra? Na Zrobee najdete ověřené profesionály pro každou situaci. Zadejte poptávku zdarma!",
    image: "https://storage.googleapis.com/gpt-engineer-file-uploads/oCPGyyk46uboNosKsHsfhCvC3i02/social-images/social-1776146784229-Zrobee_Social_image.webp"
  });

  // Landing page is strictly light mode
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    if (wasDark) document.documentElement.classList.remove("dark");

    // Track session start
    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = searchParams.get('utm_source');
    const utmCampaign = searchParams.get('utm_campaign');
    
    // Simple session detection to avoid double tracking on re-renders
    const lastSessionId = sessionStorage.getItem('analytics_session_id');
    const currentSessionId = utmCampaign || 'direct';
    
    if (lastSessionId !== currentSessionId) {
      import('@/lib/analytics').then(({ analytics }) => {
        analytics.trackSessionStart(
          utmSource === 'email' ? 'email' : 'landing',
          utmCampaign || undefined
        );
      });
      sessionStorage.setItem('analytics_session_id', currentSessionId);
    }

    return () => {
      // Restore whatever the user had before leaving landing page
      if (wasDark) document.documentElement.classList.add("dark");
    };
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    getSupabase()
      .then((supabase) => {
        checkUserType(supabase);

        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange(() => {
          checkUserType(supabase);
        });
        subscription = sub;
      })
      .catch((err) => {
        // If Supabase fails to load (e.g. crawler, network issue), just show the landing page
        console.warn("Supabase init failed, rendering public landing page:", err);
        setLoading(false);
      });

    return () => subscription?.unsubscribe();
  }, []);

  async function checkUserType(supabase: Awaited<ReturnType<typeof getSupabase>>) {
    try {
      // If we've already handled a pending-job flow, never auto-redirect to worker dashboard.
      if (handledPendingJobRef.current) {
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data } = await supabase.from("profiles").select("user_type").eq("id", session.user.id).single();
        const type = data?.user_type || null;
        setUserType(type);

        if (!type) {
          navigate("/prihlaseni", { replace: true });
          setLoading(false);
          return;
        }

        // If some flow (e.g. job posting) requests a specific post-auth redirect, honor it.
        // This prevents the global "worker-first" logic from overriding customer flows.
        const searchParams = new URLSearchParams(window.location.search);
        const urlRedirect = searchParams.get("redirect");
        
        let postAuthRedirect = urlRedirect || localStorage.getItem("postAuthRedirect") || sessionStorage.getItem("postAuthRedirect");
        
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
          
          // Remove the redirect param from URL if it exists
          if (urlRedirect) {
            searchParams.delete("redirect");
            const newUrl = window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "") + window.location.hash;
            window.history.replaceState({}, "", newUrl);
          }
          
          navigate(postAuthRedirect, { replace: true });
          setLoading(false);
          return;
        }


        // --- Pending job submission (after auth / email confirmation) ---
        // MUST win over any worker/both redirects.
        const pendingJobSubmit = sessionStorage.getItem("pendingJobSubmit");
        if (pendingJobSubmit === "true") {
          handledPendingJobRef.current = true;

          const pendingJobData = sessionStorage.getItem("pendingJobData");
          const pendingTempPhotoUrls = sessionStorage.getItem("pendingJobTempPhotoUrls");

          // Clear flags immediately to avoid duplicate processing (and to avoid later worker redirects).
          sessionStorage.removeItem("pendingJobSubmit");
          sessionStorage.removeItem("pendingJobData");
          sessionStorage.removeItem("pendingJobPhotoCount");
          sessionStorage.removeItem("pendingJobTempPhotoUrls");

          // Redirect immediately and prevent any other auto-redirects.
          navigate("/zakaznik/poptavky", { replace: true });
          setLoading(false);

          // Create job in background (non-blocking).
          if (pendingJobData) {
            void (async () => {
              try {
                const jobData = JSON.parse(pendingJobData);

                const budgetMax = jobData.budgetMax ? parseFloat(jobData.budgetMax) : null;
                const photos: string[] = pendingTempPhotoUrls ? JSON.parse(pendingTempPhotoUrls) : [];

                const { data: newJob, error: jobError } = await supabase
                  .from("jobs")
                  .insert([
                    {
                      customer_id: session.user.id,
                      category_id: jobData.categoryId,
                      subcategory_id: jobData.subcategoryId,
                      title: jobData.title || "Zakázka",
                      description: jobData.description,
                      city: jobData.city,
                      full_address: jobData.fullAddress,
                      budget_min: budgetMax ? 0 : null,
                      budget_max: budgetMax,
                      deadline_type: jobData.deadlineType || "asap",
                      deadline_date: jobData.date || null,
                      photos,
                      status: "open",
                    },
                  ])
                  .select()
                  .single();

                // Notify workers about the new job (fire and forget)
                if (newJob) {
                  supabase.functions
                    .invoke("notify-workers-new-job", {
                      body: { job: newJob },
                    })
                    .catch((err) => console.log("[Push] Failed to notify workers:", err));
                }

                if (!jobError) {
                  // Log conversion
                  import('@/lib/analytics').then(({ analytics }) => {
                    analytics.trackConversion('job_posted', { 
                      subcategory_id: jobData.subcategoryId,
                      is_urgent: false
                    });
                  });

                  getToast().then(toast => toast({
                    title: "Úspěch",
                    description: photos.length
                      ? "Zakázka byla úspěšně vytvořena včetně fotek."
                      : "Zakázka byla úspěšně vytvořena!",
                  }));
                } else {
                  console.error("Error creating job after auth:", jobError);
                  getToast().then(toast => toast({
                    title: "Chyba",
                    description: "Zakázku se nepodařilo vytvořit. Zkuste to prosím znovu.",
                    variant: "destructive",
                  }));
                }
              } catch (error) {
                console.error("Error posting job after auth:", error);
                getToast().then(toast => toast({
                  title: "Chyba",
                  description: "Zakázku se nepodařilo vytvořit. Zkuste to prosím znovu.",
                  variant: "destructive",
                }));
              }
            })();
          }

          return;
        }

        // --- Normal redirects ---
        const pendingWorkerOnboarding = sessionStorage.getItem("pendingWorkerOnboarding");

        if (pendingWorkerOnboarding === "true") {
          sessionStorage.removeItem("pendingWorkerOnboarding");
          // Redirect to worker onboarding check
          const [profileResult, servicesResult] = await Promise.all([
            supabase.from("profiles").select("phone, company_type, city").eq("id", session.user.id).single(),
            supabase.from("worker_services").select("id").eq("worker_id", session.user.id),
          ]);

          if (
            !profileResult.data?.phone ||
            !profileResult.data?.company_type ||
            !profileResult.data?.city ||
            !servicesResult.data ||
            servicesResult.data.length === 0
          ) {
            navigate("/registrace-remeslnika");
            setLoading(false);
            return;
          }
          navigate("/remeslnik/hledej");
        } else if (type === "worker") {
          // Pure worker account
          const [profileResult, servicesResult] = await Promise.all([
            supabase.from("profiles").select("phone, company_type, city").eq("id", session.user.id).single(),
            supabase.from("worker_services").select("id").eq("worker_id", session.user.id),
          ]);

          if (
            !profileResult.data?.phone ||
            !profileResult.data?.company_type ||
            !profileResult.data?.city ||
            !servicesResult.data ||
            servicesResult.data.length === 0
          ) {
            navigate("/registrace-remeslnika");
            setLoading(false);
            return;
          }
          navigate("/remeslnik/hledej");
        } else if (type === "both") {
          // For users with both roles, respect their last active role
          const lastRole = localStorage.getItem("last_role");
          if (lastRole === "worker") {
            // Check worker onboarding completion
            const [profileResult, servicesResult] = await Promise.all([
              supabase.from("profiles").select("phone, company_type, city").eq("id", session.user.id).single(),
              supabase.from("worker_services").select("id").eq("worker_id", session.user.id),
            ]);

            if (
              !profileResult.data?.phone ||
              !profileResult.data?.company_type ||
              !profileResult.data?.city ||
              !servicesResult.data ||
              servicesResult.data.length === 0
            ) {
              navigate("/registrace-remeslnika");
              setLoading(false);
              return;
            }
            navigate("/remeslnik/hledej");
          } else {
            // Default to customer for "both" users (or if last_role is "customer" or missing)
            navigate("/zakaznik/nova-zakazka");
          }
        } else if (type === "customer") {
          navigate("/zakaznik/nova-zakazka");
        }
      } else {
        setUserType(null);
      }

      setLoading(false);
    } catch (err) {
      // If session check fails (crawler, network), just show the landing page
      console.warn("Session check failed, rendering public landing page:", err);
      setLoading(false);
    }
  }

  // Detect if we're likely about to redirect (auth callback or existing session)
  const hasAuthCallback = window.location.hash.includes("access_token");
  const hasExistingSession = !!localStorage.getItem("sb-uminqrrkflgldlfeaypn-auth-token");
  const likelyRedirecting = hasAuthCallback || hasExistingSession;

  // Show nothing while auth check runs if redirect is likely; first-time visitors see landing instantly
  if (loading && (userType !== null || likelyRedirecting)) {
    return null;
  }

  // Native app mode OR PWA standalone: show onboarding/auth instead of landing page for unauthenticated users
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);

  if ((isNativeApp || isStandalone) && !userType && !loading) {
    return (
      <Suspense fallback={null}>
        <NativeOnboarding />
      </Suspense>
    );
  }

  const globalSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://zrobee.cz/#organization",
        "name": "Zrobee",
        "url": "https://zrobee.cz",
        "logo": "https://zrobee.cz/logo.png",
        "image": "https://storage.googleapis.com/gpt-engineer-file-uploads/oCPGyyk46uboNosKsHsfhCvC3i02/social-images/social-1776146784229-Zrobee_Social_image.webp"
      },
      {
        "@type": "WebSite",
        "@id": "https://zrobee.cz/#website",
        "url": "https://zrobee.cz",
        "name": "Zrobee",
        "publisher": { "@id": "https://zrobee.cz/#organization" },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://zrobee.cz/vsechny-sluzby?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "ImageObject",
        "@id": "https://zrobee.cz/#primaryimage",
        "url": "https://storage.googleapis.com/gpt-engineer-file-uploads/oCPGyyk46uboNosKsHsfhCvC3i02/social-images/social-1776146784229-Zrobee_Social_image.webp",
        "width": "1200",
        "height": "630"
      },
      {
        "@type": "WebPage",
        "@id": "https://zrobee.cz/#webpage",
        "url": "https://zrobee.cz",
        "name": "Zrobee - Kvalitní řemeslníci a služby",
        "isPartOf": { "@id": "https://zrobee.cz/#website" },
        "about": { "@id": "https://zrobee.cz/#organization" },
        "primaryImageOfPage": { "@id": "https://zrobee.cz/#primaryimage" },
        "description": "Jedna aplikace na všechny služby. Najděte experty od zedníka a instalatéra až po účetní, lektora jazyků nebo trenéra."
      },
      {
        "@type": "ItemList",
        "@id": "https://zrobee.cz/#navigation",
        "name": "Hlavní navigace",
        "itemListElement": [
          { "@type": "SiteNavigationElement", "position": 1, "name": "Všechny služby", "url": "https://zrobee.cz/vsechny-sluzby" },
          { "@type": "SiteNavigationElement", "position": 2, "name": "O Zrobee", "url": "https://zrobee.cz/o-zrobee" },
          { "@type": "SiteNavigationElement", "position": 3, "name": "Pro řemeslníky", "url": "https://zrobee.cz/registrace-remeslnika" },
          { "@type": "SiteNavigationElement", "position": 4, "name": "Veřejné poptávky", "url": "https://zrobee.cz/poptavky" },
          { "@type": "SiteNavigationElement", "position": 5, "name": "Rádce a tipy", "url": "https://zrobee.cz/radce" }
        ]
      }
    ]
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-background">
      <Helmet>
        <title>Zrobee | Řemeslníci a Služby</title>
      </Helmet>
      <JsonLd data={globalSchema} id="global-schema" />
      <div className="h-full overflow-auto overscroll-contain">
        <Header />
        <HeroSection />
        <Suspense fallback={null}>
          <ServiceCategories />
          <TrustHighlights />
        </Suspense>
        <Suspense fallback={null}>
          <OstravaLaunchSection />
          <HowItWorks />
          <AppPromoSection />
          <TestimonialsSection />
          <CustomerBenefitsSection />
          <WorkerRecruitmentSection />
          <CtaSection />

          {/* Top Searched Services - PSEO Internal Linking */}
          <TopPseoLinks limit={30} variant="grid" />

          <Footer />
        </Suspense>
      </div>
    </div>
  );
};

export default Index;
