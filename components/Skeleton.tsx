import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }}
    />
  );
};

export const SkeletonRow: React.FC = () => {
  return (
    <tr className="animate-pulse">
      <td className="py-3"><Skeleton className="h-3.5 w-14 rounded" /></td>
      <td className="py-3">
        <Skeleton className="h-3.5 w-28 rounded mb-1.5" />
        <Skeleton className="h-3 w-16 rounded" />
      </td>
      <td className="py-3">
        <Skeleton className="h-3.5 w-24 rounded mb-1.5" />
        <Skeleton className="h-3 w-12 rounded" />
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-3.5 w-14 rounded" />
        </div>
      </td>
      <td className="py-3 text-right">
        <Skeleton className="h-5 w-20 rounded-full inline-block" />
      </td>
    </tr>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-full rounded" />
      <Skeleton className="h-3.5 w-3/4 rounded" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
    </div>
  );
};

export const SkeletonHeader: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-3.5 w-52 rounded" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
};

export const SkeletonStats: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-[#e5e5e5] rounded-xl p-4 space-y-2">
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-6 w-12 rounded" />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
