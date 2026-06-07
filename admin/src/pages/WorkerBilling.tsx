import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Receipt } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import BillingSettings from "./settings/BillingSettings";
import InvoiceHistory from "./settings/InvoiceHistory";

const WorkerBilling = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/remeslnik/profil')}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět
        </Button>
      )}
      
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Faktury
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Fakturační údaje
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoiceHistory />
        </TabsContent>

        <TabsContent value="settings">
          <BillingSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkerBilling;
