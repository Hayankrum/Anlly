'use client'

interface CoverageCardProps {
  label: string
  percentage: number
  covered: number
  total: number
}

function getColor(pct: number): string {
  if (pct >= 80) return '#16a34a'
  if (pct >= 50) return '#d97706'
  return '#dc2626'
}

function getBg(pct: number): string {
  if (pct >= 80) return '#dcfce7'
  if (pct >= 50) return '#fef3c7'
  return '#fee2e2'
}

export default function CoverageCard({ label, percentage, covered, total }: CoverageCardProps) {
  const color = getColor(percentage)
  const bg = getBg(percentage)

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: bg, color }}
        >
          {percentage.toFixed(1)}%
        </span>
      </div>

      <div
        className="w-full h-2 rounded-full overflow-hidden mb-2"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span>{covered} cobertos</span>
        <span>{total} total</span>
      </div>
    </div>
  )
}
