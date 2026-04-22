import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip HTML and return the first non-empty line of plain text. */
function extractTitle(html) {
  if (!html) return 'Untitled'
  const div = document.createElement('div')
  div.innerHTML = html
  const text = (div.textContent || '').replace(/\r/g, '').trim()
  const firstLine = text.split('\n')[0].trim()
  return firstLine || 'Untitled'
}

/** Strip HTML tags to get plain text for the textarea. */
function htmlToPlain(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || '').replace(/\r\n/g, '\n')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NoteListItem({ note, isSelected, onClick, onPin, onDelete }) {
  const title = extractTitle(note.content)
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-1.5 px-3 py-2.5 cursor-pointer select-none border-b transition-colors"
      style={{
        borderBottomColor: '#d1d5db',
        background: isSelected ? '#bfdbfe' : 'transparent',
      }}
    >
      {note.pinned && (
        <svg className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
        </svg>
      )}
      <span className="flex-1 min-w-0 text-xs truncate text-gray-700 font-medium leading-snug">
        {title}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onPin() }}
          title={note.pinned ? 'Unpin' : 'Pin'}
          className="p-0.5 rounded hover:bg-blue-200 text-gray-400 hover:text-blue-600 transition-colors"
        >
          <svg className="w-3 h-3" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(e) }}
          title="Delete note"
          className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

const IdeaNotebook = forwardRef(function IdeaNotebook(
  { notes, createNote, updateNote, deleteNote },
  ref
) {
  const [selectedId, setSelectedId] = useState(null)
  const [editorContent, setEditorContent] = useState('')
  const [saved, setSaved] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  const textareaRef = useRef(null)
  const debounceRef = useRef(null)
  /** ID of the note whose content is currently loaded in the textarea */
  const loadedNoteRef = useRef(null)
  /** Current textarea value — kept in a ref so flush() always has latest */
  const contentRef = useRef('')
  /** Mirror of notes prop that's always current inside callbacks/effects */
  const notesRef = useRef(notes)
  useEffect(() => { notesRef.current = notes }, [notes])

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Sort: pinned first, then by updatedAt desc
  const sortedNotes = useMemo(() => {
    const ts = (n) => {
      if (!n.updatedAt) return 0
      return typeof n.updatedAt.toMillis === 'function'
        ? n.updatedAt.toMillis()
        : (n.updatedAt.seconds || 0) * 1000
    }
    return [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return ts(b) - ts(a)
    })
  }, [notes])

  // Auto-select first note on initial load only
  useEffect(() => {
    if (!selectedId && sortedNotes.length > 0) {
      setSelectedId(sortedNotes[0].id)
    }
  }, [sortedNotes, selectedId])

  // Load note content into textarea when selected note changes
  useEffect(() => {
    if (!selectedId) return
    if (loadedNoteRef.current === selectedId) return
    const note = notesRef.current.find((n) => n.id === selectedId)
    if (!note) return
    const plain = htmlToPlain(note.content)
    contentRef.current = plain
    setEditorContent(plain)
    loadedNoteRef.current = selectedId
  }, [selectedId])

  // Expose flush() so App.jsx can force-save when switching away
  useImperativeHandle(ref, () => ({
    flush() {
      clearTimeout(debounceRef.current)
      if (loadedNoteRef.current) {
        updateNote(loadedNoteRef.current, { content: contentRef.current })
      }
    },
  }))

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const triggerSave = (value) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (loadedNoteRef.current) {
        updateNote(loadedNoteRef.current, { content: value })
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }
    }, 500)
  }

  const handleChange = (e) => {
    const value = e.target.value
    contentRef.current = value
    setEditorContent(value)
    triggerSave(value)
  }

  /** Switch to another note, flushing any pending save first. */
  const switchNote = (id) => {
    if (id === selectedId) return
    clearTimeout(debounceRef.current)
    if (loadedNoteRef.current) {
      updateNote(loadedNoteRef.current, { content: contentRef.current })
    }
    loadedNoteRef.current = null
    setSelectedId(id)
  }

  const handleCreate = async () => {
    clearTimeout(debounceRef.current)
    if (loadedNoteRef.current) {
      updateNote(loadedNoteRef.current, { content: contentRef.current })
    }
    let docRef
    try {
      docRef = await createNote()
    } catch (err) {
      console.error('[IdeaNotebook] Failed to create note:', err)
      return
    }
    loadedNoteRef.current = null
    contentRef.current = ''
    setEditorContent('')
    setSelectedId(docRef.id)
    loadedNoteRef.current = docRef.id
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    deleteNote(id)
    if (id === selectedId) {
      const remaining = sortedNotes.filter((n) => n.id !== id)
      loadedNoteRef.current = null
      setSelectedId(remaining[0]?.id ?? null)
    }
  }

  const selectedNote = sortedNotes.find((n) => n.id === selectedId)

  const sidebarBg = '#e4e4e4'
  const dividerColor = '#d1d5db'

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#f0f0f0' }}>

      {/* ── Mobile: horizontally scrollable note strip ── */}
      {isMobile && (
        <div
          className="flex items-stretch flex-shrink-0 border-b overflow-x-auto"
          style={{ background: sidebarBg, borderBottomColor: dividerColor, minHeight: '42px' }}
        >
          <button
            onClick={handleCreate}
            title="New note"
            className="flex-shrink-0 flex items-center justify-center w-10 text-xl font-light text-gray-600 hover:bg-gray-300 border-r transition-colors select-none cursor-pointer"
            style={{ borderRightColor: dividerColor }}
          >
            +
          </button>

          {sortedNotes.length === 0 && (
            <span className="flex items-center px-3 text-xs text-gray-400 italic">
              No notes yet
            </span>
          )}

          {sortedNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => switchNote(note.id)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1 text-xs border-r transition-colors select-none cursor-pointer whitespace-nowrap"
              style={{
                borderRightColor: dividerColor,
                background: note.id === selectedId ? '#bfdbfe' : 'transparent',
                color: '#374151',
                fontWeight: note.id === selectedId ? 600 : 400,
              }}
            >
              {note.pinned && (
                <svg className="w-2.5 h-2.5 flex-shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
              )}
              {extractTitle(note.content)}
            </button>
          ))}

          {/* Mobile: pin + delete in the strip header area */}
          {selectedNote && (
            <div className="flex items-center gap-1 ml-auto px-2 flex-shrink-0">
              <button
                onClick={() => updateNote(selectedNote.id, { pinned: !selectedNote.pinned })}
                title={selectedNote.pinned ? 'Unpin' : 'Pin'}
                className="p-1 rounded hover:bg-blue-200 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill={selectedNote.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <button
                onClick={(e) => handleDelete(e, selectedNote.id)}
                title="Delete note"
                className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main content: sidebar + editor ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Desktop sidebar ── */}
        {!isMobile && (
          <div
            className="w-52 flex-shrink-0 flex flex-col border-r"
            style={{ background: sidebarBg, borderRightColor: dividerColor }}
          >
            {/* Sidebar header */}
            <div
              className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b"
              style={{ borderBottomColor: dividerColor }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Notes
              </span>
              <button
                onClick={handleCreate}
                title="New note"
                className="flex items-center justify-center w-6 h-6 rounded text-lg font-light leading-none text-gray-600 hover:bg-gray-300 transition-colors cursor-pointer select-none"
              >
                +
              </button>
            </div>

            {/* Note list */}
            <div className="flex-1 overflow-y-auto">
              {sortedNotes.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-5 text-center italic leading-relaxed">
                  No notes yet.<br />Press + to create one.
                </p>
              )}
              {sortedNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={note.id === selectedId}
                  onClick={() => switchNote(note.id)}
                  onPin={() => updateNote(note.id, { pinned: !note.pinned })}
                  onDelete={(e) => handleDelete(e, note.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Editor panel ── */}
        <div className="flex flex-col flex-1 min-h-0">

          {/* Saved indicator bar */}
          <div
            className="flex items-center px-3 py-1 flex-shrink-0 border-b"
            style={{ background: sidebarBg, borderBottomColor: dividerColor, minHeight: '32px' }}
          >
            <span
              className="ml-auto text-xs pointer-events-none select-none transition-opacity duration-500 text-gray-500"
              style={{ opacity: saved ? 0.8 : 0 }}
            >
              Saved
            </span>
          </div>

          {/* Textarea */}
          {selectedId ? (
            <textarea
              ref={textareaRef}
              value={editorContent}
              onChange={handleChange}
              placeholder="Start writing..."
              className="flex-1 resize-none outline-none p-4 text-sm text-gray-800 leading-relaxed"
              style={{
                background: '#ffffff',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: '14px',
                lineHeight: '1.7',
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#ffffff' }}>
              <p className="text-sm italic text-gray-400">
                Press + to create your first note.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default IdeaNotebook
