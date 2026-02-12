export default function PlombierStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
          <div className="h-7 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
