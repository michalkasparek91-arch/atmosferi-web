import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface UserMenuProps {
  user: { id: string; email?: string };
  userType: string | null;
  profile?: {
    avatar_url?: string | null;
    full_name?: string | null;
  } | null;
  isWorkerContext: boolean;
  onLogout?: () => void;
  onAccountTypeSwitch?: () => void;
}

const UserMenu = ({ user, userType, profile, isWorkerContext }: UserMenuProps) => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (isWorkerContext || userType === 'worker') {
      navigate('/remeslnik/profil');
    } else {
      navigate('/zakaznik/profil');
    }
  };

  return (
    <Button 
      variant="ghost" 
      className="relative h-10 w-10 rounded-full p-0 overflow-hidden hover:bg-muted focus-visible:ring-primary border border-border/60"
      onClick={handleProfileClick}
    >
      <Avatar className="h-full w-full">
        <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
          {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
    </Button>
  );
};

export default UserMenu;
