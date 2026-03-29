import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAgentConfig,
  useUpdateAgentConfig,
  useGetMemory,
  useUpdateMemory,
  useRunAgentCycle,
  useGetAgentLogs,
  getGetAgentLogsQueryKey,
  getGetMemoryQueryKey,
  getGetAgentConfigQueryKey,
} from "@workspace/api-client-react";

export function useAgentDashboard() {
  const queryClient = useQueryClient();

  // 1. Config
  const configQuery = useGetAgentConfig();
  
  const updateConfigMutation = useUpdateAgentConfig({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAgentConfigQueryKey() });
      },
    },
  });

  // 2. Memory
  const memoryQuery = useGetMemory();
  
  const updateMemoryMutation = useUpdateMemory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMemoryQueryKey() });
      },
    },
  });

  // 3. Logs (polling if running)
  const isRunning = configQuery.data?.isRunning ?? false;
  
  const logsQuery = useGetAgentLogs(
    { limit: 50 },
    {
      query: {
        refetchInterval: isRunning ? 3000 : false,
      },
    }
  );

  // 4. Run Cycle Manually
  const runCycleMutation = useRunAgentCycle({
    mutation: {
      onSuccess: () => {
        // Immediately refresh logs and memory to show the new thought/action
        queryClient.invalidateQueries({ queryKey: getGetAgentLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMemoryQueryKey() });
      },
    },
  });

  // Toggle Auto-Run helper
  const toggleIsRunning = () => {
    if (!configQuery.data) return;
    updateConfigMutation.mutate({
      data: {
        ...configQuery.data,
        isRunning: !configQuery.data.isRunning,
      },
    });
  };

  return {
    config: configQuery.data,
    isLoadingConfig: configQuery.isLoading,
    updateConfig: updateConfigMutation.mutate,
    isUpdatingConfig: updateConfigMutation.isPending,
    toggleIsRunning,

    memory: memoryQuery.data,
    isLoadingMemory: memoryQuery.isLoading,
    updateMemory: updateMemoryMutation.mutate,
    isUpdatingMemory: updateMemoryMutation.isPending,

    logs: logsQuery.data?.logs ?? [],
    isLoadingLogs: logsQuery.isLoading,
    isFetchingLogs: logsQuery.isFetching,

    runCycle: runCycleMutation.mutate,
    isRunningCycle: runCycleMutation.isPending,
  };
}
