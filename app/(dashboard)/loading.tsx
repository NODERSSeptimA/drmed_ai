export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-secondary rounded-lg" />
          <div className="h-4 w-48 bg-secondary rounded-lg" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-secondary rounded-lg" />
          <div className="h-10 w-36 bg-secondary rounded-lg" />
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="h-3 w-24 bg-secondary rounded" />
            <div className="h-7 w-12 bg-secondary rounded" />
            <div className="h-3 w-20 bg-secondary rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="h-5 w-40 bg-secondary rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-secondary rounded-lg" />
          ))}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 h-[400px]">
          <div className="h-5 w-32 bg-secondary rounded" />
        </div>
      </div>
    </div>
  )
}
