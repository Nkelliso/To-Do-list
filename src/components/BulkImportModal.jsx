import { useState, useEffect } from 'react'

const VALID_DAYS = ['M', 'Tu', 'W', 'Th', 'F', 'Wknd']

function normalizeTime(str) {
  if (!str) return ''
  str = str.trim().toLowerCase()
  if (!str) return ''

  // Already 24-hour HH:MM or H:MM
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const [h, m] = str.split(':')
    return `${String(Number(h)).padStart(2, '0')}:${m}`
  }

  // 12-hour: 9:00am, 9am, 9:00pm, 9pm
  const match = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/)
  if (match) {
    let h = Number(match[1])
    const m = match[2] || '00'
    const period = match[3]
    if (period === 'pm' && h !== 12) h += 12
    if (period === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}`
  }

  return ''
}

function parseLine(line) {
  const parts = line.split(',').map(s => s.trim())
  const name = parts[0] || ''
  const dayDue = parts[1] || ''
  const timeDue = normalizeTime(parts[2] || '')
  const priorityRaw = Number(parts[3])
  const priority = priorityRaw >= 1 && priorityRaw <= 5 ? priorityRaw : 1

  if (!name) return null
  if (!VALID_DAYS.includes(dayDue)) return null

  return { name, dayDue, timeDue, priority }
}

export default function BulkImportModal({ onClose, onImport }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null) // null | { count } | 'none'
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleImport = async () => {
    const lines = text.split('\n').filter(l => l.trim())
    const valid = lines.map(parseLine).filter(Boolean)

    if (valid.length === 0) {
      setStatus('none')
      return
    }

    setImporting(true)
    await onImport(valid)
    setImporting(false)
    setStatus({ count: valid.length })

    setTimeout(() => onClose(), 1500)
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="border border-green-900/50 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 flex flex-col gap-5"
        style={{ background: '#3e2e38' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold text-amber-100/90">Bulk Import Tasks</h2>
          <p className="text-xs text-stone-600 mt-0.5">Paste a list of tasks to add them all at once.</p>
        </div>

        {/* Format guide */}
        <div className="rounded-lg px-4 py-3 text-xs space-y-1.5" style={{ background: '#30202c' }}>
          <p className="text-stone-500 font-medium">Format — one task per line:</p>
          <p className="text-stone-600 font-mono">Task Name, Day, Time, Priority</p>
          <div className="h-px bg-green-900/20 my-1" />
          <p className="text-stone-600 font-mono">Hydraulics HW, F, 9:00am, 3</p>
          <p className="text-stone-600 font-mono">Study for exam, Th, 8:00pm, 5</p>
          <p className="text-stone-600 font-mono">Buy groceries, M, , 1</p>
          <div className="h-px bg-green-900/20 my-1" />
          <ul className="text-stone-700 space-y-0.5 list-none">
            <li>Day: M · Tu · W · Th · F · Wknd</li>
            <li>Time: optional — leave blank but keep the comma</li>
            <li>Priority: 1 (low) to 5 (urgent) — defaults to 1</li>
          </ul>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setStatus(null) }}
          placeholder="Paste your tasks here, one per line..."
          rows={6}
          className="border border-green-900/50 text-stone-300 placeholder-stone-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent resize-none font-mono"
          style={{ background: '#30202c' }}
        />

        {/* Status message */}
        {status === 'none' && (
          <p className="text-xs text-amber-500 -mt-2">No valid tasks found. Check the format and try again.</p>
        )}
        {status?.count && (
          <p className="text-xs text-green-500 -mt-2">{status.count} task{status.count !== 1 ? 's' : ''} imported successfully.</p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-200 transition-colors cursor-pointer select-none"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !text.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer select-none"
          >
            {importing ? 'Importing…' : 'Import Tasks'}
          </button>
        </div>
      </div>
    </div>
  )
}
