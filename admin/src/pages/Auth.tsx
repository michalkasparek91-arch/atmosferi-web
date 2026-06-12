import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "@/providers/SessionProvider";
import { Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (session) {
      navigate("/", { replace: true });
    }
  }, [session, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.toLowerCase() !== "michal.kasparek91@gmail.com") {
      toast.error("Přístup odepřen. Nemáte oprávnění k administraci.");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Úspěšně přihlášeno!");
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error("Přihlášení se nezdařilo. Zkontrolujte heslo.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D97757]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#f4f4f0] flex flex-col items-center justify-center p-4 font-sans selection:bg-[#D97757] selection:text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Atmosferi <span className="font-normal text-white/50 text-xl">• Outreach studio</span>
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 mt-8">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/60 uppercase text-[10px] font-bold tracking-widest">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent border-b border-x-0 border-t-0 border-white/20 rounded-none px-0 text-white focus-visible:ring-0 focus-visible:border-[#D97757] h-12 text-lg shadow-none"
              placeholder="michal.kasparek91@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/60 uppercase text-[10px] font-bold tracking-widest">
              Heslo
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-transparent border-b border-x-0 border-t-0 border-white/20 rounded-none px-0 text-white focus-visible:ring-0 focus-visible:border-[#D97757] h-12 text-lg pr-10 shadow-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 mt-4 bg-[#D97757] hover:bg-[#c66444] text-white text-xs font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_15px_rgba(217,119,87,0.4)]"
          >
            {loading ? "Přihlašování..." : "Přihlásit se"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
