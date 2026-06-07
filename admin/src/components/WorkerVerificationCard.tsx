import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "./VerificationBadge";
import { ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

interface VerificationData {
  status: VerificationStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export function WorkerVerificationCard() {
  const navigate = useNavigate();
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerification();
  }, []);

  const loadVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('worker_verifications')
        .select('status, rejection_reason, submitted_at, reviewed_at')
        .eq('worker_id', user.id)
        .single();

      setVerification(data as VerificationData | null);
    } catch (error) {
      console.error('Error loading verification:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64 mt-2" />
        </CardHeader>
      </Card>
    );
  }

  const status = verification?.status || 'unverified';

  return (
    <Card className={`border-border ${status === 'verified' ? 'bg-green-50/30 dark:bg-green-950/20' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'verified' ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted'}`}>
              <ShieldCheck className={`h-5 w-5 ${status === 'verified' ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Získejte odznak OVĚŘENO</p>
              <p className="text-xs text-muted-foreground">
                Zvyšte svou důvěryhodnost u klientů o 80 %
              </p>
            </div>
          </div>
          <VerificationBadge status={status} showLabel size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'verified' && (
          <p className="text-sm text-green-700">
            🎉 Gratulujeme! Váš profil byl ověřen. Klienti nyní vidí, že jste důvěryhodný dodavatel.
          </p>
        )}

        {status === 'pending' && (
          <p className="text-sm text-amber-700">
            ⏳ Vaše žádost o ověření je zpracovávána. Obvykle to trvá 1-2 pracovní dny.
          </p>
        )}

        {status === 'rejected' && verification?.rejection_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Důvod zamítnutí:</strong> {verification.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        {status === 'unverified' && (
          <p className="text-sm text-muted-foreground">
            Doložte svou identitu a získejte odznak ověřeného dodavatele. Zvýšíte tak svou šanci na získání zakázek.
          </p>
        )}

        {(status === 'unverified' || status === 'rejected') && (
          <Button 
            onClick={() => navigate('/remeslnik/verifikace')}
            className="w-full"
          >
            {status === 'rejected' ? 'Podat žádost znovu' : 'Zahájit ověření'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
