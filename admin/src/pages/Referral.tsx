import { useEffect, useState } from "react";
import ContentLoader from "@/components/ContentLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Copy, Gift, Users, Check, Coins, Share2, UserPlus, ShoppingCart } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReferredFriend {
  id: string;
  name: string;
  stage: "signed_up" | "purchased";
  credits: number;
  date: string;
}

const Referral = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
      if (!session) {
        navigate('/prihlaseni');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', session.user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }

      // Get referral transactions with referee info
      const { data: transactions, error } = await supabase
        .from('referral_transactions')
        .select('referrer_credits, referee_id, created_at')
        .eq('referrer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && transactions) {
        // Group by referee_id to get unique friends and their stage
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

        // Fetch names for referred friends
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
    } catch (error) {
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/remeslnik/profil')}
          className="-ml-2 -mt-2 text-muted-foreground hover:text-foreground rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět
        </Button>
      )}

      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Gift className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Doporuč a získej</h1>
        <p className="text-lg text-primary font-semibold">
          Až <span className="text-2xl">110 kreditů</span> za každého kolegu!
        </p>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Pošlete svůj odkaz známému řemeslníkovi. Za registraci i první nákup vám připsáme kredity.
        </p>
      </div>

      {/* Friend benefit callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-4 px-4 flex items-center gap-4">
          <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Co dostane váš kolega?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Váš kolega získá <span className="font-bold text-primary">100 kreditů zdarma</span> ihned po registraci přes váš odkaz. Skvělý start!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Two-stage reward visual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: Share2,
            step: "1",
            title: "Sdílejte odkaz",
            desc: "Pošlete odkaz kolegům řemeslníkům",
            reward: null,
          },
          {
            icon: UserPlus,
            step: "2",
            title: "Kolega se zaregistruje",
            desc: "Okamžitě získáte odměnu",
            reward: "+10 kreditů",
          },
          {
            icon: ShoppingCart,
            step: "3",
            title: "Kolega nakoupí kredity",
            desc: "Získáte velký bonus",
            reward: "+100 kreditů",
          },
        ].map((item) => (
          <Card key={item.step} className="relative overflow-hidden">
            <CardContent className="pt-5 pb-4 px-4 text-center space-y-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold text-muted-foreground">Krok {item.step}</div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
              {item.reward && (
                <div className="inline-block bg-primary/10 text-primary font-bold text-sm px-3 py-1 rounded-full">
                  {item.reward}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral Link */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold text-sm">Váš unikátní odkaz</h3>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-sm font-mono break-all text-muted-foreground">
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
          <Button onClick={handleShare} className="w-full" size="sm">
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
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.invitedCount}</p>
                <p className="text-xs text-muted-foreground">Pozvaní</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.earnedCredits}</p>
                <p className="text-xs text-muted-foreground">Kreditů celkem</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Friends progress */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold text-sm">Vaši pozvaní kolegové</h3>
          {friends.length > 0 ? (
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${f.stage === 'purchased' ? 'bg-primary' : 'bg-yellow-500'}`} />
                    <span className="text-sm font-medium">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      f.stage === 'purchased' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-yellow-500/10 text-yellow-600'
                    }`}>
                      {f.stage === 'purchased' ? 'Nakoupil' : 'Registrován'}
                    </span>
                    <span className="text-sm font-bold text-primary">+{f.credits}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Zatím jste nikoho nepozvali</p>
              <p className="text-xs text-muted-foreground">Sdílejte svůj odkaz a získejte kredity!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fine print */}
      <p className="text-xs text-center text-muted-foreground">
        Váš kolega získá 100 kreditů ihned po registraci. Vy dostanete 10 kreditů za jeho registraci a dalších 100 kreditů po jeho prvním nákupu.
        Každý uživatel může být pozván pouze jednou.
      </p>
    </div>
  );
};

export default Referral;
