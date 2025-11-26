import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { PulsatingDots } from './SkeletonLoaders';

interface SmartLoadingProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ((retry: () => void) => ReactNode) | ReactNode;
  emptyFallback?: ReactNode;
  onRetry?: () => void;
}

/**
 * Smart loading wrapper component
 * Handles loading, error, and empty states with smooth transitions
 * Supports stale-while-revalidate pattern
 */
export function SmartLoading({
  isLoading,
  isError,
  isEmpty = false,
  error,
  children,
  loadingFallback,
  errorFallback,
  emptyFallback,
  onRetry,
}: SmartLoadingProps) {
  if (isError) {
    const errorContent =
      typeof errorFallback === 'function'
        ? errorFallback(onRetry || (() => {}))
        : errorFallback;

    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          {errorContent ? (
            <div>{errorContent}</div>
          ) : (
            <>
              <h3 className="font-semibold text-red-700 dark:text-red-400">
                {error?.message || 'Something went wrong'}
              </h3>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (isLoading && !children) {
    return (
      <div className="animate-in fade-in duration-300">
        {loadingFallback || (
          <div className="flex items-center justify-center py-12">
            <PulsatingDots />
          </div>
        )}
      </div>
    );
  }

  if (isEmpty && !isLoading) {
    return (
      <div className="animate-in fade-in duration-300">
        {emptyFallback || (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500 dark:text-slate-400">
              No data available
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  );
}

interface StaleWhileRevalidateProps {
  isLoadingFresh: boolean;
  isFetchingInBackground: boolean;
  hasStaleData: boolean;
  children: ReactNode;
  staleFallback?: ReactNode;
  freshLoadingFallback?: ReactNode;
}

/**
 * Component for stale-while-revalidate pattern
 * Shows cached data while fetching fresh data in background
 */
export function StaleWhileRevalidate({
  isLoadingFresh,
  isFetchingInBackground,
  hasStaleData,
  children,
  staleFallback,
  freshLoadingFallback,
}: StaleWhileRevalidateProps) {
  return (
    <div className="relative">
      {/* Show stale data with background refresh indicator */}
      {hasStaleData && !isLoadingFresh && (
        <div className="opacity-75">
          {staleFallback || children}
        </div>
      )}

      {/* Show fresh loading state */}
      {isLoadingFresh && !hasStaleData && (
        <div>
          {freshLoadingFallback || (
            <div className="flex items-center justify-center py-8">
              <PulsatingDots />
            </div>
          )}
        </div>
      )}

      {/* Show fresh content */}
      {!isLoadingFresh && !hasStaleData && (
        <div>{children}</div>
      )}

      {/* Background refresh indicator */}
      {isFetchingInBackground && (
        <div className="absolute top-2 right-2">
          <div className="animate-spin">
            <RefreshCw className="w-4 h-4 text-blue-500" />
          </div>
        </div>
      )}
    </div>
  );
}

interface PaginationLoadingProps {
  isLoading: boolean;
  hasMore: boolean;
  children: ReactNode;
}

/**
 * Component for pagination loading states
 * Shows indicator when loading next page
 */
export function PaginationLoading({
  isLoading,
  hasMore,
  children,
}: PaginationLoadingProps) {
  return (
    <>
      {children}

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <PulsatingDots />
        </div>
      )}

      {!hasMore && !isLoading && (
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            No more items to load
          </p>
        </div>
      )}
    </>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Error boundary component for graceful error handling
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    console.error('[ErrorBoundary]', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            {this.props.fallback ? (
              <div>
                {this.props.fallback(this.state.error, this.handleRetry)}
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-red-700 dark:text-red-400">
                  Something went wrong
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300">
                  {this.state.error.message}
                </p>
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
