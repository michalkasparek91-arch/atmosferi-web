import { WorkerProfile } from "@/components/WorkerProfile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WorkerProfileEditPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-background px-3 py-4">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/remeslnik/profil')}
          className="mb-3 rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Zpět
        </Button>
        <WorkerProfile />
      </div>
    </div>
  );
};

export default WorkerProfileEditPage;
