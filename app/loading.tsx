export default function Loading() {
  return (
    <div role="status" className="animate-pulse space-y-6">
      <div className="h-12 w-2/3 rounded-2xl bg-blush" />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square rounded-3xl bg-blush/70" />
        ))}
      </div>
      <span className="sr-only">Loading your beauty essentials</span>
    </div>
  );
}
