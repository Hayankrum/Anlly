'use client'

import { useState } from 'react'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
}

interface TestFile {
  file: string
  tests: TestResult[]
  passed: number
  failed: number
  skipped: number
  duration: number
}

interface TestResultsTableProps {
  files: TestFile[]
}

type Filter = 'all' | 'pass' | 'fail'

export default function TestResultsTable({ files }: TestResultsTableProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filteredFiles = files
    .map((f) => {
      if (filter === 'all') return f
      return {
        ...f,
        tests: f.tests.filter((t) => t.status === filter),
      }
    })
    .filter((f) => f.tests.length > 0)

  const toggle = (file: string) => {
    setExpanded(expanded === file ? null : file)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Filtro:
        </span>
        {(['all', 'pass', 'fail'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: filter === f ? 'var(--btn-primary-bg)' : 'var(--btn-secondary-bg)',
              color: filter === f ? 'var(--btn-primary-text)' : 'var(--text-primary)',
            }}
          >
            {f === 'all' ? 'Todos' : f === 'pass' ? 'Passando' : 'Falhando'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredFiles.map((file) => (
          <div
            key={file.file}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--card-border)' }}
          >
            <button
              onClick={() => toggle(file.file)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {file.file.split('/').pop()}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {file.file}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-green-500 font-medium">{file.passed} pass</span>
                {file.failed > 0 && (
                  <span className="text-xs text-red-500 font-medium">{file.failed} fail</span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {file.duration.toFixed(0)}ms
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${expanded === file.file ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {expanded === file.file && (
              <div style={{ backgroundColor: 'var(--bg-secondary)' }}>
                {file.tests.map((test, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                    style={{
                      borderBottom: i < file.tests.length - 1 ? '1px solid var(--border-color)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            test.status === 'pass' ? '#16a34a' : test.status === 'fail' ? '#dc2626' : '#d97706',
                        }}
                      />
                      <span style={{ color: 'var(--text-primary)' }}>{test.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {test.duration.toFixed(0)}ms
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredFiles.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            Nenhum teste encontrado com este filtro
          </p>
        )}
      </div>
    </div>
  )
}
