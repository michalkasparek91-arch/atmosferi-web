import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Gift, Users, Check, Coins, Share2, UserPlus, ShoppingCart, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import ContentLoader from "@/components/ContentLoader";

interface ReferredFriend {
  id: string;
  name: string;
  stage: "signed_up" | "purchased";
  credits: number;
  date: string;
}

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReferralContent = ({ onClose }: { onClose: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState({ invitedCount: 0, earnedCredits: 0 });
  const [friends, setFriends] = useState<ReferredFriend[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', session.user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }

      const { data: transactions, error } = await supabase
        .from('referral_transactions')
        .select('referrer_credits, referee_id, created_at')
        .eq('referrer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && transactions) {
        const friendMap = new Map<string, { credits: number; date: string }>();
        for (const t of transactions) {
          const existing = friendMap.get(t.referee_id);
          if (existing) {
            existing.credits += t.referrer_credits || 0;
          } else {
            friendMap.set(t.referee_id, {
              credits: t.referrer_credits || 0,
              date: t.created_at || '',
            });
          }
        }

        const refereeIds = Array.from(friendMap.keys());
        const friendsList: ReferredFriend[] = [];

        if (refereeIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, referral_reward_stage')
            .in('id', refereeIds);

          for (const p of profiles || []) {
            const info = friendMap.get(p.id);
            friendsList.push({
              id: p.id,
              name: p.full_name || 'Uživatel',
              stage: p.referral_reward_stage === 'purchased' ? 'purchased' : 'signed_up',
              credits: info?.credits || 0,
              date: info?.date || '',
            });
          }
        }

        setFriends(friendsList);
        setStats({
          invitedCount: friendMap.size,
          earnedCredits: transactions.reduce((sum, t) => sum + (t.referrer_credits || 0), 0),
        });
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = referralCode
    ? `https://zrobee.cz/registrace?ref=${referralCode}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Odkaz zkopírován do schránky!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nepodařilo se zkopírovat odkaz');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Zrobee – 100 kreditů zdarma!',
          text: 'Zaregistruj se na Zrobee přes můj odkaz a získej 100 kreditů na start zdarma!',
          url: referralLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return <ContentLoader />;
  }

  return (
    <div className="space-y-5 overflow-y-auto">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
          <Gift className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Doporuč a získej</h2>
        <p className="text-base text-primary font-semibold">
          Až <span className="text-xl">110 kreditů</span> za každého kolegu!
        </p>
        <p className="text-muted-foreground text-xs max-w-sm mx-auto">
          Pošlete svůj odkaz známému řemeslníkovi. Za registraci i první nákup vám připsáme kredity.
        </p>
      </div>

      {/* Friend benefit callout */}
      <Card className="border-foreground/15 bg-primary/5">
        <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
          <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Co dostane váš kolega?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Váš kolega získá <span className="font-bold text-primary">100 kreditů zdarma</span> ihned po registraci.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Share2, step: "1", title: "Sdílejte odkaz", reward: null },
          { icon: UserPlus, step: "2", title: "Registrace", reward: "+10" },
          { icon: ShoppingCart, step: "3", title: "Nákup", reward: "+100" },
        ].map((item) => (
          <Card key={item.step} className="border-foreground/15">
            <CardContent className="pt-3 pb-3 px-2 text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="text-[10px] font-bold text-muted-foreground">Krok {item.step}</div>
              <h3 className="text-xs font-semibold">{item.title}</h3>
              {item.reward && (
                <div className="inline-block bg-primary/10 text-primary font-bold text-xs px-2 py-0.5 rounded-full">
                  {item.reward}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral Link */}
      <Card className="border-foreground/15">
        <CardContent className="pt-4 pb-4 space-y-3">
          <h3 className="font-semibold text-sm">Váš unikátní odkaz</h3>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-mono break-all text-muted-foreground">
              {referralLink}
            </div>
            <Button
              onClick={handleCopy}
              variant={copied ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={handleShare} className="w-full rounded-full" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Sdílet odkaz
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Kód: <span className="font-mono font-bold">{referralCode}</span>
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-foreground/15">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.invitedCount}</p>
                <p className="text-xs text-muted-foreground">Pozvaní</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-foreground/15">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Coins className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.earnedCredits}</p>
                <p className="text-xs text-muted-foreground">Kreditů celkem</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Friends progress */}
      {friends.length > 0 && (
        <Card className="border-foreground/15">
          <CardContent className="pt-4 space-y-2">
            <h3 className="font-semibold text-sm">Vaši pozvaní kolegové</h3>
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${f.stage === 'purchased' ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                    <span className="text-sm font-medium">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      f.stage === 'purchased'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {f.stage === 'purchased' ? 'Nakoupil' : 'Registrován'}
                    </span>
                    <span className="text-sm font-bold text-primary">+{f.credits}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-center text-muted-foreground pb-2">
        Váš kolega získá 100 kreditů ihned po registraci. Vy dostanete 10 kreditů za registraci a dalších 100 po prvním nákupu.
      </p>
    </div>
  );
};

export const ReferralDialog = ({ open, onOpenChange }: ReferralDialogProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] rounded-none bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <DrawerTitle className="text-base font-semibold">Doporučení</DrawerTitle>
            <button onClick={() => onOpenChange(false)} className="p-1 rounded-full hover:bg-muted">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ReferralContent onClose={() => onOpenChange(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white">
        <DialogTitle className="sr-only">Doporučení</DialogTitle>
        <ReferralContent onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDialog;
