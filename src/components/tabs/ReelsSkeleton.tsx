import { Skeleton } from '@/components/ui/skeleton';

const ReelsSkeleton = () => {
  return (
    <div className="fixed inset-0 bg-black">
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto bg-gray-800" />
          <Skeleton className="h-4 w-32 mx-auto bg-gray-800" />
        </div>
      </div>
    </div>
  );
};

export default ReelsSkeleton;

