import { useEffect, useState } from 'react';
import { networkAwareFetcher, FetchOptions } from '@/services/networkAwareFetcher';

/**
 * Hook for network-aware data fetching
 * Adapts to connection speed automatically
 */
export function useNetworkAwareFetch<T>(
  url: string,
  options: FetchOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    networkAwareFetcher.smartFetch<T>(url, options)
      .then(result => {
        if (mounted) {
          setData(result);
          setError(null);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Fetch failed'));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [url, options]);

  return { data, loading, error };
}
