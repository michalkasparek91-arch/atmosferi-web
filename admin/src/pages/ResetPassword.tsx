import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[ResetPassword] Auth event:", event, !!session);
      if (event === "PASSWORD_RECOVERY" || (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION"))) {
        setIsRecovery(true);
        setIsChecking(false);
      }
    });

    // Check initial state AND session
    const checkInitialState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const hash = window.location.hash;
      const search = window.location.search;
      
      const hasRecoveryToken = 
        hash.includes("type=recovery") || 
        search.includes("type=recovery") || 
        hash.includes("access_token=") || 
        hash.includes("id_token=") ||
        search.includes("token=");

      if (hasRecoveryToken || session) {
        console.log("[ResetPassword] Valid state detected (Token or Session)");
        setIsRecovery(true);
        setIsChecking(false);
      }
    };

    checkInitialState();
    
    // Give Supabase some time to process the hash before showing "Invalid"
    const timer = setTimeout(() => {
      checkInitialState().then(() => {
        setIsChecking(false);
      });
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Heslo musí mít alespoň 6 znaků");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Hesla se neshodují");
      return;
    }

    setLoading(true);
    try {
      // Try to get session again just in case it was delayed
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        console.error("[ResetPassword] No session found during submit");
        toast.error("Relace vypršela nebo chybí. Zkuste prosím znovu kliknout na odkaz v e-mailu.");
        setLoading(false);
        return;
      }

      console.log("[ResetPassword] Proceeding with update for user:", currentSession.user.id);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      toast.success("Heslo bylo úspěšně změněno!");
      
      // Fetch user type to redirect correctly
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', currentSession.user.id)
        .single();
        
      const lastRole = localStorage.getItem("last_role");
      
      if (profileError) {
        navigate("/");

      } else if (profile?.user_type === 'worker' || (profile?.user_type === 'both' && lastRole === 'worker')) {
        navigate("/remeslnik/hledej");
      } else {
        navigate("/zakaznik/nova-zakazka");
      }
    } catch (error: any) {
      console.error("[ResetPassword] Update error:", error);
      toast.error(error.message || "Nepodařilo se změnit heslo");
    } finally {
      setLoading(false);
    }
  };

  // We are removing the gate entirely to ensure the user can see the form.
  // The actual security is handled by Supabase when handleSubmit calls updateUser.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Nastavit nové heslo</CardTitle>
          <CardDescription>Zadejte své nové heslo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nové heslo</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potvrdit heslo</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ukládám..." : "Změnit heslo"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
