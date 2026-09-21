import { useState } from 'react'

type Props = {
  /** Always a project-relative path — never an absolute filesystem path. */
  path: string
  /** Show a small "Copy" affordance. Optional; low-cost convenience only. */
  copyable?: boolean
}

/**
 * Canonical presentation for an artifact path (Knowledge, Work Items, future System artifacts).
 * Renders the full relative path in monospace and wraps it cleanly at any width — long filenames
 * never overflow the layout, and the complete value stays available (title + optional copy).
 */
export function ArtifactPath({ path, copyable = false }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — the full path remains visible and in the title */
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, maxWidth: '100%' }}>
      <code
        title={path}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--foreground-muted)',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          minWidth: 0,
        }}
      >
        {path}
      </code>
      {copyable && (
        <button
          onClick={copy}
          aria-label="Copy path"
          style={{
            flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--primary)', fontFamily: 'inherit', fontSize: 11,
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </span>
  )
}
