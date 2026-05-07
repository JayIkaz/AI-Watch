export function RefreshingBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="relative h-0.5 w-full overflow-hidden rounded-full mb-4">
      <div className="absolute inset-0 bg-primary/15 rounded-full" />
      <div
        className="absolute inset-y-0 left-0 w-2/5 bg-primary rounded-full animate-refreshing"
      />
    </div>
  );
}
