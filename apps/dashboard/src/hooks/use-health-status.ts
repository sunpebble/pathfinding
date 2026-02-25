"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api";

export function useHealthStatus() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
  });
}
