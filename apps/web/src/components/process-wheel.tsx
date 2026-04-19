export function ProcessWheel({
  label,
  percent,
  color,
  sub,
}: {
  label: string;
  percent: number;
  color: string;
  sub: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex flex-col items-center gap-2 p-2.5 border border-dashed border-gray-200 rounded-xl">
      <div
        className="w-24 h-24 rounded-full grid place-items-center relative"
        style={{ background: `conic-gradient(${color} ${p}%, #eef2ff 0)` }}
      >
        <div className="absolute inset-2.5 rounded-full bg-white" />
        <span className="relative font-extrabold text-lg">{p}%</span>
      </div>
      <div className="font-bold text-sm">{label}</div>
      <div className="text-xs text-ink-3">{sub}</div>
    </div>
  );
}
