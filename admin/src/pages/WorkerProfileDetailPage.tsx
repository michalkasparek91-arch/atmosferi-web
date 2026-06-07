import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { safeGoBack } from "@/utils/navigation";
import { WorkerProfileView } from "@/components/WorkerProfileView";

const WorkerProfileDetailPage = () => {
  const navigate = useNavigate();
  const [popupOpen, setPopupOpen] = useState(true);

  const handleOpenChange = (open: boolean) => {
    setPopupOpen(open);
    if (!open) {
      safeGoBack(navigate, '/');
    }
  };

  return (
    <div className="min-h-full bg-muted/50 flex items-center justify-center p-4">
      <WorkerProfileView open={popupOpen} onOpenChange={handleOpenChange} />
    </div>
  );
};

export default WorkerProfileDetailPage;
