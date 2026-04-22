import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pull the first non-empty plain-text line from HTML content. */
function extractTitle(html) {
  if (!html) return 'Untitled'
  const div = document.createElement('div')
  div.innerHTML = html
  const text = (div.textContent || '').replace(/\r/g, '').trim()
  const firstLine = text.split('\n')[0].trim()
  return firstLine || 'Untitled'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NoteListItem({ note, isSelected, onClick, onPin, onDelete }) {
  const title = extractTitle(note.content)
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-1.5 px-2.5 py-2.5 cursor-pointer select-none border-b transition-colors"
      style={{
        borderBottomColor: '#fde68a',
        background: isSelected ? '#fde68a' : 'transparent',
      }}
    >
      {note.pinned && (
        <svg className="w-2.5 h-2.5 text-amber-700 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
        </svg>
      )}
      <span
        className="flex-1 min-w-0 text-xs truncate text-amber-950 font-medium leading-snug"
        style={{ fontFamily: "Georgia, 'Palatino Linotype', serif" }}
      >
        {title}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onPin() }}
          title={note.pinned ? 'Unpin' : 'Pin'}
          className="p-0.5 rounded hover:bg-amber-300 text-amber-700 transition-colors"
        >
          <svg className="w-3 h-3" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(e) }}
          title="Delete note"
          className="p-0.5 rounded hover:bg-red-100 text-amber-700 hover:text-red-600 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ToolbarBtn({ onMouseDown, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onMouseDown() }}
      title={title}
      className="flex items-center justify-center px-2 py-1 text-amber-900/60 hover:text-amber-900 hover:bg-amber-200/60 rounded transition-colors cursor-pointer select-none min-w-[1.75rem] text-sm leading-none"
    >
      {children}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

const IdeaNotebook = forwardRef(function IdeaNotebook(
  { notes, createNote, updateNote, deleteNote },
  ref
) {
  const [selectedId, setSelectedId] = useState(null)
  const [saved, setSaved] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  const editorRef = useRef(null)
  const debounceRef = useRef(null)
  /** ID of the note whose content is currently in the editor DOM */
  const loadedNoteRef = useRef(null)
  /** Mirror of notes prop that's always current inside callbacks/effects */
  const notesRef = useRef(notes)
  useEffect(() => { notesRef.current = notes }, [notes])

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Sort: pinned notes first, then by updatedAt desc within each group
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

  // Auto-select first note when list loads or when the selected note is deleted
  useEffect(() => {
    if (sortedNotes.length === 0) return
    const exists = sortedNotes.some((n) => n.id === selectedId)
    if (!selectedId || !exists) {
      setSelectedId(sortedNotes[0].id)
    }
  }, [sortedNotes, selectedId])

  // Load note content into the editor whenever the selected note changes
  useEffect(() => {
    if (!editorRef.current || !selectedId) return
    if (loadedNoteRef.current === selectedId) return // already loaded
    const note = notesRef.current.find((n) => n.id === selectedId)
    if (!note) return
    editorRef.current.innerHTML = note.content || ''
    loadedNoteRef.current = selectedId
  }, [selectedId])

  // Expose flush() so App.jsx can force-save when switching away from Ideas tab
  useImperativeHandle(ref, () => ({
    flush() {
      clearTimeout(debounceRef.current)
      if (editorRef.current && loadedNoteRef.current) {
        updateNote(loadedNoteRef.current, { content: editorRef.current.innerHTML })
      }
    },
  }))

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const triggerSave = () => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (editorRef.current && loadedNoteRef.current) {
        updateNote(loadedNoteRef.current, { content: editorRef.current.innerHTML })
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }
    }, 500)
  }

  /** Switch to another note, flushing any pending save for the current one first. */
  const switchNote = (id) => {
    if (id === selectedId) return
    clearTimeout(debounceRef.current)
    if (editorRef.current && loadedNoteRef.current) {
      updateNote(loadedNoteRef.current, { content: editorRef.current.innerHTML })
    }
    loadedNoteRef.current = null
    setSelectedId(id)
  }

  const handleCreate = async () => {
    // Flush current note before creating
    clearTimeout(debounceRef.current)
    if (editorRef.current && loadedNoteRef.current) {
      updateNote(loadedNoteRef.current, { content: editorRef.current.innerHTML })
    }
    const docRef = await createNote()
    // Optimistically set up the editor before Firestore round-trips back
    loadedNoteRef.current = null
    setSelectedId(docRef.id)
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
      loadedNoteRef.current = docRef.id
      setTimeout(() => editorRef.current?.focus(), 50)
    }
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

  const fmt = (cmd, value) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value ?? null)
  }

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    let lineEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
    while (lineEl && lineEl !== editorRef.current && lineEl.parentElement !== editorRef.current) {
      lineEl = lineEl.parentElement
    }
    const lineText =
      lineEl === editorRef.current
        ? node.nodeType === Node.TEXT_NODE
          ? node.textContent
          : lineEl.textContent
        : lineEl?.textContent ?? ''
    if (!lineText.startsWith('- ')) return
    e.preventDefault()
    if (lineText === '- ') {
      if (lineEl && lineEl !== editorRef.current) {
        const r = document.createRange()
        r.selectNodeContents(lineEl)
        sel.removeAllRanges()
        sel.addRange(r)
        document.execCommand('delete')
      }
      document.execCommand('insertParagraph')
    } else {
      document.execCommand('insertParagraph')
      document.execCommand('insertText', false, '- ')
    }
  }

  // ── Legal-pad editor styles ──────────────────────────────────────────────────
  const editorStyle = {
    backgroundColor: '#fefce8',
    backgroundImage: [
      // Red vertical margin line at 52px from left
      'linear-gradient(to right, transparent 52px, #fca5a5 52px, #fca5a5 54px, transparent 54px)',
      // Blue horizontal ruled lines every 28px
      'repeating-linear-gradient(to bottom, transparent, transparent 27px, #bfdbfe 27px, #bfdbfe 28px)',
    ].join(', '),
    fontFamily: "Georgia, 'Palatino Linotype', Palatino, serif",
    fontSize: '15px',
    lineHeight: '28px',
    color: '#1c1917',
    paddingLeft: '68px',
    paddingRight: '28px',
    paddingTop: '8px',
    paddingBottom: '40px',
  }

  const sidebarBg = '#fef3c7'
  const dividerColor = '#fde68a'

  // The selected note object (for mobile toolbar actions)
  const selectedNote = sortedNotes.find((n) => n.id === selectedId)

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: sidebarBg }}>

      {/* ── Mobile: horizontally scrollable note strip ── */}
      {isMobile && (
        <div
          className="flex items-stretch flex-shrink-0 border-b overflow-x-auto"
          style={{ background: sidebarBg, borderBottomColor: dividerColor, minHeight: '42px' }}
        >
          {/* New note button */}
          <button
            onClick={handleCreate}
            title="New note"
            className="flex-shrink-0 flex items-center justify-center w-10 text-xl font-light text-amber-800 hover:bg-amber-200/70 border-r transition-colors select-none cursor-pointer"
            style={{ borderRightColor: dividerColor }}
          >
            +
          </button>

          {sortedNotes.length === 0 && (
            <span
              className="flex items-center px-3 text-xs text-amber-700/50 italic"
              style={{ fontFamily: "Georgia, serif" }}
            >
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
                fontFamily: "Georgia, serif",
                background: note.id === selectedId ? '#fde68a' : 'transparent',
                color: '#1c1917',
                fontWeight: note.id === selectedId ? 600 : 400,
              }}
            >
              {note.pinned && (
                <svg className="w-2.5 h-2.5 flex-shrink-0 text-amber-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
              )}
              {extractTitle(note.content)}
            </button>
          ))}
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
              <span
                className="text-[10px] font-semibold uppercase tracking-widest text-amber-900/50"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Notes
              </span>
              <button
                onClick={handleCreate}
                title="New note"
                className="flex items-center justify-center w-6 h-6 rounded text-lg font-light leading-none text-amber-800 hover:bg-amber-300/60 transition-colors cursor-pointer select-none"
              >
                +
              </button>
            </div>

            {/* Note list */}
            <div className="flex-1 overflow-y-auto">
              {sortedNotes.length === 0 && (
                <p
                  className="text-xs text-amber-900/40 px-3 py-5 text-center italic leading-relaxed"
                  style={{ fontFamily: "Georgia, serif" }}
                >
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

          {/* Toolbar */}
          <div
            className="flex items-center gap-0.5 px-2 py-1 flex-shrink-0 border-b"
            style={{ background: sidebarBg, borderBottomColor: dividerColor }}
          >
            <ToolbarBtn onMouseDown={() => fmt('bold')} title="Bold">
              <span className="font-bold">B</span>
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={() => fmt('italic')} title="Italic">
              <span className="italic">I</span>
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={() => fmt('strikeThrough')} title="Strikethrough">
              <span className="line-through">S</span>
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={() => fmt('insertUnorderedList')} title="Bullet list">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </ToolbarBtn>

            <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: dividerColor }} />

            <ToolbarBtn onMouseDown={() => fmt('fontSize', '5')} title="Larger text">
              <span className="text-base leading-none">A</span>
              <span className="text-[9px] align-super leading-none ml-px">+</span>
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={() => fmt('fontSize', '2')} title="Smaller text">
              <span className="text-xs leading-none">A</span>
              <span className="text-[9px] align-super leading-none ml-px">−</span>
            </ToolbarBtn>

            {/* Mobile-only: pin + delete for the currently selected note */}
            {isMobile && selectedNote && (
              <>
                <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: dividerColor }} />
                <ToolbarBtn
                  onMouseDown={() => updateNote(selectedNote.id, { pinned: !selectedNote.pinned })}
                  title={selectedNote.pinned ? 'Unpin' : 'Pin'}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill={selectedNote.pinned ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </ToolbarBtn>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleDelete(e, selectedNote.id) }}
                  title="Delete note"
                  className="flex items-center justify-center px-2 py-1 text-amber-900/60 hover:text-red-600 hover:bg-red-100 rounded transition-colors cursor-pointer select-none min-w-[1.75rem]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}

            {/* Saved indicator */}
            <span
              className="ml-auto text-xs pointer-events-none select-none transition-opacity duration-500"
              style={{ color: '#92400e', opacity: saved ? 0.7 : 0 }}
            >
              Saved
            </span>
          </div>

          {/* Editor area */}
          {selectedId ? (
            <div className="relative flex-1 min-h-0">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Start writing..."
                className="idea-notebook-editor absolute inset-0 overflow-y-auto outline-none"
                style={editorStyle}
                onInput={triggerSave}
                onKeyDown={handleKeyDown}
              />
            </div>
          ) : (
            <div
              className="flex-1 flex items-center justify-center"
              style={{ background: '#fefce8' }}
            >
              <p
                className="text-sm italic"
                style={{ color: '#92400e', opacity: 0.4, fontFamily: "Georgia, serif" }}
              >
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
