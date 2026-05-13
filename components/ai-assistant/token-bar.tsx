"use client";

const DEFAULT_LIMIT = parseInt(process.env["NEXT_PUBLIC_TOKEN_LIMIT"] ?? "100000", 10);

interface TokenBarProps {
  used: number;
  limit?: number;
}

export function TokenBar({ used, limit = DEFAULT_LIMIT }: TokenBarProps) {
  const pct = Math.min((used / limit) * 100, 100);
  const isWarning = pct >= 70 && pct < 90;
  const isDanger = pct >= 90;

  const barColor = isDanger
    ? "bg-red-500"
    : isWarning
    ? "bg-yellow-400"
    : "bg-gray-400";

  return (
    <div className="space-y-1">
      {isDanger && (
        <p role="alert" className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
          Estás cerca del límite de tokens del plan
        </p>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {used.toLocaleString()} / {limit.toLocaleString()} tokens
        </span>
      </div>
    </div>
  );
}
