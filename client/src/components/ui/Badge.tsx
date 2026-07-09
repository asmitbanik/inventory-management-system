import { cn } from '@/lib/utils';

const variants: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ordered: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  in: 'bg-green-100 text-green-700',
  out: 'bg-orange-100 text-orange-700',
  adjustment: 'bg-purple-100 text-purple-700',
  admin: 'bg-purple-100 text-purple-700',
  staff: 'bg-gray-100 text-gray-700',
};

export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[status] || 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {status}
    </span>
  );
}
