'use client'

interface CoverageFile {
  file: string
  statements: number
  branches: number
  functions: number
  lines: number
}

interface CoverageByFileProps {
  files: CoverageFile[]
  onCreateTest?: (file: string) => void
}

function getColor(pct: number): string {
  if (pct >= 80) return '#16a34a'
  if (pct >= 50) return '#d97706'
  return '#dc2626'
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2" title={label}>
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: getColor(value) }}
        />
      </div>
      <span className="text-xs w-10 text-right" style={{ color: 'var(--text-tertiary)' }}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

export default function CoverageByFile({ files, onCreateTest }: CoverageByFileProps) {
  const sorted = [...files].sort((a, b) => a.lines - b.lines)

  return (
    <div className="space-y-2">
      {sorted.map((f) => (
        <div
          key={f.file}
          className="flex items-center gap-4 px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
            {f.file}
          </span>
          <Bar value={f.statements} label="Stmts" />
          <Bar value={f.branches} label="Branch" />
          <Bar value={f.functions} label="Funcs" />
          <Bar value={f.lines} label="Lines" />
          {f.lines === 0 && onCreateTest && (
            <button
              onClick={() => onCreateTest(f.file)}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
            >
              + Teste
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
