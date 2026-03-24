/**
 * Re-export TanStack Query hooks with sensible DMF defaults.
 */
export {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

export const DEFAULT_STALE_TIME = 5 * 60 * 1000  // 5 minutes
export const DEFAULT_GC_TIME = 10 * 60 * 1000    // 10 minutes
