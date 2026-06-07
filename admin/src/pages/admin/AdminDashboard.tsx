import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, LayoutDashboard, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Vítejte v administraci Atmosferi"
        subtitle="Váš centrální bod pro správu e-mailových kampaní a kontaktů"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Email Campaigns Card */}
        <Card className="rounded-xl border border-border shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-lg mt-4">E-mailové kampaně</CardTitle>
            <CardDescription>
              Správa kontaktů architektů, vytváření a rozesílání chytrých kampaní přes Brevo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full justify-between mt-2" 
              onClick={() => navigate('/emaily')}
            >
              Přejít na Kampaně
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Website Link Card */}
        <Card className="rounded-xl border border-border shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-lg mt-4">Veřejný Web</CardTitle>
            <CardDescription>
              Zobrazit veřejnou část webu Atmosferi pro klienty.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full justify-between mt-2" 
              onClick={() => window.open('/', '_blank')}
            >
              Otevřít web
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
