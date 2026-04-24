import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
      className="group flex items-center gap-1.5 px-3 py-2.5 cursor-pointer select-none border-b transition-colors"
      style={{ borderBottomColor: '#d1d5db', background: isSelected ? '#bfdbfe' : 'transparent' }}
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
  const [saved, setSaved] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [displayNotes, setDisplayNotes] = useState([])
  /** The <img> element the user last clicked — drives the resize toolbar */
  const [selectedImg, setSelectedImg] = useState(null)
  const [imgToolbarPos, setImgToolbarPos] = useState({ top: 0, left: 0 })

  const editorRef = useRef(null)
  const debounceRef = useRef(null)
  const loadedNoteRef = useRef(null)
  const notesRef = useRef(notes)
  useEffect(() => { notesRef.current = notes }, [notes])
  const lastSelectedIdRef = useRef(null)

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

  // Stable display list: re-sort only when the user switches notes
  useEffect(() => {
    if (selectedId !== lastSelectedIdRef.current) {
      lastSelectedIdRef.current = selectedId
      setDisplayNotes(sortedNotes)
      return
    }
    setDisplayNotes((prev) => {
      const noteMap = new Map(sortedNotes.map((n) => [n.id, n]))
      const prevIds = new Set(prev.map((n) => n.id))
      const updated = prev.filter((n) => noteMap.has(n.id)).map((n) => noteMap.get(n.id))
      const brandNew = sortedNotes.filter((n) => !prevIds.has(n.id))
      return [...brandNew, ...updated]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedNotes, selectedId])

  // Load note content into editor when selected note changes
  useEffect(() => {
    if (!editorRef.current || !selectedId) return
    if (loadedNoteRef.current === selectedId) return
    const note = notesRef.current.find((n) => n.id === selectedId)
    if (!note) return
    editorRef.current.innerHTML = note.content || ''
    loadedNoteRef.current = selectedId
    setSelectedImg(null)
  }, [selectedId])

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

  const switchNote = (id) => {
    if (id === selectedId) return
    clearTimeout(debounceRef.current)
    if (editorRef.current && loadedNoteRef.current) {
      updateNote(loadedNoteRef.current, { content: editorRef.current.innerHTML })
    }
    loadedNoteRef.current = null
    setSelectedImg(null)
    setSelectedId(id)
  }

  const handleCreate = async () => {
    clearTimeout(debounceRef.current)
    if (editorRef.current && loadedNoteRef.current) {
      updateNote(loadedNoteRef.current, { content: editorRef.current.innerHTML })
    }
    let docRef
    try {
      docRef = await createNote()
    } catch (err) {
      console.error('[IdeaNotebook] Failed to create note:', err)
      return
    }
    loadedNoteRef.current = null
    setSelectedImg(null)
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
      const remaining = displayNotes.filter((n) => n.id !== id)
      loadedNoteRef.current = null
      setSelectedImg(null)
      setSelectedId(remaining[0]?.id ?? null)
    }
  }

  // ── Image paste ──────────────────────────────────────────────────────────────

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (ev) => {
          document.execCommand(
            'insertHTML',
            false,
            `<img src="${ev.target.result}" style="max-width:100%;height:auto;display:block;cursor:pointer;" />`
          )
          triggerSave()
        }
        reader.readAsDataURL(file)
        return
      }
    }
  }

  // ── Image resize ─────────────────────────────────────────────────────────────

  const positionImgToolbar = (img) => {
    const editorRect = editorRef.current.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    setImgToolbarPos({
      top: imgRect.bottom - editorRect.top + editorRef.current.scrollTop + 6,
      left: Math.max(0, imgRect.left - editorRect.left),
    })
  }

  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG') {
      setSelectedImg(e.target)
      positionImgToolbar(e.target)
    } else {
      setSelectedImg(null)
    }
  }

  const scaleImg = (delta) => {
    if (!selectedImg || !editorRef.current) return
    const maxWidth = editorRef.current.clientWidth - 32
    const currentWidth = selectedImg.offsetWidth
    const newWidth = Math.max(80, Math.min(maxWidth, currentWidth + delta))
    selectedImg.style.width = `${newWidth}px`
    selectedImg.style.maxWidth = 'none'
    positionImgToolbar(selectedImg)
    triggerSave()
  }

  const removeImg = () => {
    if (!selectedImg) return
    selectedImg.remove()
    setSelectedImg(null)
    triggerSave()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const selectedNote = displayNotes.find((n) => n.id === selectedId)
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

          {displayNotes.length === 0 && (
            <span className="flex items-center px-3 text-xs text-gray-400 italic">No notes yet</span>
          )}

          {displayNotes.map((note) => (
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
            <div
              className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b"
              style={{ borderBottomColor: dividerColor }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Notes</span>
              <button
                onClick={handleCreate}
                title="New note"
                className="flex items-center justify-center w-6 h-6 rounded text-lg font-light leading-none text-gray-600 hover:bg-gray-300 transition-colors cursor-pointer select-none"
              >
                +
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {displayNotes.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-5 text-center italic leading-relaxed">
                  No notes yet.<br />Press + to create one.
                </p>
              )}
              {displayNotes.map((note) => (
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

          {/* Saved indicator */}
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

          {/* Editor */}
          {selectedId ? (
            <div className="relative flex-1 min-h-0">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Start writing... paste an image with Ctrl+V"
                className="idea-notebook-editor absolute inset-0 overflow-y-auto outline-none p-4"
                style={{
                  background: '#ffffff',
                  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#1f2937',
                }}
                onInput={triggerSave}
                onPaste={handlePaste}
                onClick={handleEditorClick}
              />

              {/* Image resize/remove toolbar — appears below the selected image */}
              {selectedImg && (
                <div
                  className="absolute flex items-center gap-1 rounded shadow-lg select-none z-10"
                  style={{
                    top: imgToolbarPos.top,
                    left: imgToolbarPos.left,
                    background: '#1f2937',
                    padding: '3px 8px',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <button
                    onClick={() => scaleImg(-60)}
                    title="Shrink"
                    className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-white text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="text-[11px] text-gray-400 px-1">size</span>
                  <button
                    onClick={() => scaleImg(60)}
                    title="Grow"
                    className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-white text-lg leading-none"
                  >
                    +
                  </button>
                  <div className="w-px h-3 mx-1" style={{ background: '#4b5563' }} />
                  <button
                    onClick={removeImg}
                    title="Remove image"
                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-400 text-xs leading-none"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#ffffff' }}>
              <p className="text-sm italic text-gray-400">Press + to create your first note.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default IdeaNotebook
