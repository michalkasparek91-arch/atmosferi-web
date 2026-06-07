import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { WorkerJobListings, WorkerJobListingsRef } from "@/components/WorkerJobListings";
import { useQueryClient } from "@tanstack/react-query";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useAuthSession } from "@/hooks/useAuthSession";

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const jobListingsRef = useRef<WorkerJobListingsRef>(null);

  const { session, isLoading, isAuthReady } = useAuthSession();

  useEffect(() => {
    if (isAuthReady && !session) {
      navigate('/prihlaseni');
    }
  }, [session, isAuthReady, navigate]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['available-jobs'] });
    await queryClient.invalidateQueries({ queryKey: ['worker-profile'] });
  };

  if (isLoading) return null;
  if (!session) return null;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">
        <WorkerJobListings ref={jobListingsRef} alwaysShowFilter />
      </div>
    </PullToRefresh>
  );
};

export default WorkerDashboard;
