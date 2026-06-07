import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteAccountSectionProps {
  isNativeApp: boolean;
  navigate: (path: string) => void;
  context?: 'worker' | 'customer';
}

export const DeleteAccountSection = ({ isNativeApp, navigate, context }: DeleteAccountSectionProps) => {
  const [open, setOpen] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserType = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      if (data) setUserType(data.user_type);
    };
    fetchUserType();
  }, []);

  const isBoth = userType === 'both';

  const getButtonLabel = () => {
    if (!isBoth) return "Smazat účet";
    return context === 'worker' ? "Smazat profil pracovníka" : "Smazat profil zákazníka";
  };

  const getDialogTitle = () => {
    if (!isBoth) return "Opravdu chcete smazat účet?";
    return context === 'worker'
      ? "Opravdu chcete smazat pracovní profil?"
      : "Opravdu chcete smazat zákaznický profil?";
  };

  const getDialogDescription = () => {
    if (!isBoth) return "Tato akce je nevratná. Všechna vaše data budou trvale smazána.";
    return context === 'worker'
      ? "Váš pracovní profil bude smazán. Budete převedeni na zákaznický účet."
      : "Váš zákaznický profil bude smazán. Budete převedeni na pracovní účet.";
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (isBoth && context) {
        // Downgrade: remove one role
        const { error } = await supabase.functions.invoke("delete-profile-role", {
          body: { role: context },
        });
        if (error) throw error;

        toast.success(
          context === 'worker'
            ? "Pracovní profil byl smazán"
            : "Zákaznický profil byl smazán"
        );
        navigate(context === 'worker' ? '/zakaznik/nova-zakazka' : '/remeslnik/hledej');
      } else {
        // Full account deletion
        const { error } = await supabase.functions.invoke("delete-own-account");
        if (error) throw error;
        await supabase.auth.signOut();
        navigate("/");
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error("Nepodařilo se smazat účet");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  if (isNativeApp) {
    return (
      <div className="pt-4 border-t border-border">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              {getButtonLabel()}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getDialogTitle()}</AlertDialogTitle>
              <AlertDialogDescription>{getDialogDescription()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                {isBoth ? "Smazat profil" : "Smazat účet"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-border">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <button
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            disabled={loading}
          >
            {getButtonLabel()}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDialogTitle()}</AlertDialogTitle>
            <AlertDialogDescription>{getDialogDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {isBoth ? "Smazat profil" : "Smazat účet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccountSection;
