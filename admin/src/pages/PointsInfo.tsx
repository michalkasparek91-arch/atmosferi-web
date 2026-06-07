import { useNavigate } from "react-router-dom";
import { safeGoBack } from "@/utils/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Coins, Send, CheckCircle, HelpCircle, Zap, Star, Crown, Sparkles } from "lucide-react";

const PointsInfo = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-muted px-3 py-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => safeGoBack(navigate, '/remeslnik/profil')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Jak fungují body</h1>
        </div>

        {/* Intro Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Bodový systém</h2>
                <p className="text-sm text-muted-foreground">Jednoduchý způsob, jak získat zakázky</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Body jsou virtuální měna, kterou používáte k odesílání nabídek na zakázky. 
              Za každou odeslanou nabídku se vám odečte 1 bod. Čím více bodů máte, 
              tím více zakázek můžete oslovit.
            </p>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Jak to funguje</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Zakoupte si body</p>
                  <p className="text-sm text-muted-foreground">Vyberte si balíček bodů, který vám vyhovuje. Čím více bodů najednou, tím lepší cena za bod.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Najděte zajímavou zakázku</p>
                  <p className="text-sm text-muted-foreground">Procházejte dostupné zakázky ve vaší oblasti a oboru.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Odešlete nabídku</p>
                  <p className="text-sm text-muted-foreground">Za odeslání nabídky se vám odečte 1 bod. Zákazník uvidí vaši nabídku a může vás kontaktovat.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="font-medium">Získejte zakázku</p>
                  <p className="text-sm text-muted-foreground">Pokud zákazník přijme vaši nabídku, můžete začít pracovat na zakázce.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Výhody bodového systému</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Platíte jen za odeslané nabídky</p>
                  <p className="text-sm text-muted-foreground">Žádné měsíční poplatky, platíte pouze za to, co skutečně využijete.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Větší balíčky = lepší cena</p>
                  <p className="text-sm text-muted-foreground">Čím více bodů nakoupíte najednou, tím méně platíte za jeden bod.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Body nikdy nepropadají</p>
                  <p className="text-sm text-muted-foreground">Zakoupené body zůstávají na vašem účtu, dokud je nevyužijete.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing overview */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Přehled balíčků</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">5 bodů</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">59 Kč</span>
                  <span className="text-xs text-muted-foreground ml-2">(11,8 Kč/bod)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">15 bodů</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">149 Kč</span>
                  <span className="text-xs text-muted-foreground ml-2">(9,9 Kč/bod)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 bg-primary/5 rounded-lg px-2 -mx-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">35 bodů</span>
                  <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">NEJOBLÍBENĚJŠÍ</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">299 Kč</span>
                  <span className="text-xs text-muted-foreground ml-2">(8,5 Kč/bod)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">75 bodů</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">549 Kč</span>
                  <span className="text-xs text-muted-foreground ml-2">(7,3 Kč/bod)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-2 -mx-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">150 bodů</span>
                  <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full">NEJLEPŠÍ HODNOTA</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">999 Kč</span>
                  <span className="text-xs text-muted-foreground ml-2">(6,7 Kč/bod)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Časté dotazy</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Vrátí se mi bod, pokud zákazník nabídku odmítne?</p>
                    <p className="text-sm text-muted-foreground mt-1">Ne, bod se odečítá za odeslání nabídky, nikoliv za její přijetí. Kvalitní nabídky však mají vysokou úspěšnost.</p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Mohu body převést na peníze?</p>
                    <p className="text-sm text-muted-foreground mt-1">Ne, zakoupené body nelze vrátit ani převést na peníze. Body lze využít pouze k odesílání nabídek.</p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Jak dlouho body platí?</p>
                    <p className="text-sm text-muted-foreground mt-1">Body nikdy nepropadají. Zůstávají na vašem účtu, dokud je nevyužijete.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Button 
          className="w-full rounded-full" 
          size="lg"
          onClick={() => safeGoBack(navigate, '/remeslnik/profil')}
        >
          Zpět na profil
        </Button>
      </div>
    </div>
  );
};

export default PointsInfo;
