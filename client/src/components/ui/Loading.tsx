export function LoadingSpinner({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div
        className={`animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 ${className}`}
      />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-gray-500 text-sm">{message}</div>
  );
}
