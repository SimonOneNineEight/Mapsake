"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Client providers. TanStack Query is the server-state layer (region marks, pins).
 * The QueryClient is created once per browser session via useState so it survives
 * re-renders but isn't shared across requests on the server.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Reads: refetch-on-focus (architecture#Frontend); short stale window.
          queries: { staleTime: 30_000, refetchOnWindowFocus: true },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
