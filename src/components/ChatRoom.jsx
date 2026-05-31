import { useState, useEffect, useRef } from 'react'
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const MESSAGES_LIMIT = 300
const NAME_KEY = 'chatflow_display_name'

export default function ChatRoom({ user }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(NAME_KEY) || user.displayName || user.email || 'Unknown'
  )
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const editInputRef = useRef(null)
  const didInitialScroll = useRef(false)

  useEffect(() => {
    const q = query(
      collection(db, 'chatMessages'),
      orderBy('createdAt', 'asc'),
      limit(MESSAGES_LIMIT)
    )
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setMessages(msgs)
    }, (err) => {
      console.error('[ChatRoom] snapshot error:', err.code, err.message)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (messages.length === 0) return
    if (!didInitialScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      didInitialScroll.current = true
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus edit input when edit mode activates
  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    try {
      await addDoc(collection(db, 'chatMessages'), {
        text: trimmed,
        uid: user.uid,
        displayName,
        createdAt: Timestamp.fromDate(new Date()),
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSend(e)
    }
  }

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'chatMessages', id))
  }

  const startEdit = (msg) => {
    setEditingId(msg.id)
    setEditText(msg.text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async (id) => {
    const trimmed = editText.trim()
    if (trimmed) await updateDoc(doc(db, 'chatMessages', id), { text: trimmed })
    cancelEdit()
  }

  const handleEditKeyDown = (e, id) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit(id)
    }
    if (e.key === 'Escape') cancelEdit()
  }

  const openNameModal = () => {
    setNameInput(displayName)
    setNameModalOpen(true)
  }

  const saveName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setDisplayName(trimmed)
    localStorage.setItem(NAME_KEY, trimmed)
    setNameModalOpen(false)
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000)
    const now = new Date()
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    return isToday
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
          ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1]
    const isOwn = msg.uid === user.uid
    const sameAsPrev = prev && prev.uid === msg.uid
    acc.push({ ...msg, isOwn, sameAsPrev })
    return acc
  }, [])

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#2d2438' }}>

      {/* Top bar */}
      <div
        className="flex items-center px-4 py-2 border-b border-green-900/40 flex-shrink-0"
        style={{ background: '#261b2e' }}
      >
        <button
          onClick={openNameModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-amber-100/60 hover:text-amber-100/90 hover:bg-white/5 transition-colors cursor-pointer select-none"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{displayName}</span>
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {grouped.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm italic text-stone-500">No messages yet. Say something!</p>
          </div>
        )}

        {grouped.map((msg) => (
          <div
            key={msg.id}
            className={`group flex ${msg.isOwn ? 'flex-row-reverse' : 'flex-row'} ${
              msg.sameAsPrev ? 'mt-0.5' : 'mt-3'
            }`}
          >
            <div className={`flex flex-col max-w-[70%] ${msg.isOwn ? 'items-end' : 'items-start'}`}>
              {!msg.sameAsPrev && (
                <div className={`flex items-baseline gap-1.5 mb-0.5 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[11px] font-semibold text-amber-100/60 truncate max-w-[140px]">
                    {msg.displayName}
                  </span>
                  <span className="text-[10px] text-stone-500">{formatTime(msg.createdAt)}</span>
                </div>
              )}

              {editingId === msg.id ? (
                <div className="flex flex-col gap-1 w-full">
                  <textarea
                    ref={editInputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                    rows={2}
                    className="resize-none rounded-xl px-3 py-1.5 text-sm text-amber-100/90 outline-none focus:ring-1 focus:ring-green-700"
                    style={{ background: '#3e2e48', border: '1px solid #4a7c59', minWidth: '180px' }}
                  />
                  <div className={`flex gap-1.5 ${msg.isOwn ? 'justify-end' : ''}`}>
                    <button
                      onClick={() => saveEdit(msg.id)}
                      className="text-[10px] px-2 py-0.5 rounded bg-green-700 hover:bg-green-600 text-white cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-[10px] px-2 py-0.5 rounded text-stone-400 hover:text-stone-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`flex items-end gap-1 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="px-3 py-1.5 rounded-2xl text-sm leading-relaxed break-words"
                    style={{
                      background: msg.isOwn ? '#4a7c59' : '#3e2e48',
                      color: msg.isOwn ? '#e8f5e9' : '#e8e0f0',
                      borderBottomRightRadius: msg.isOwn ? '4px' : undefined,
                      borderBottomLeftRadius: !msg.isOwn ? '4px' : undefined,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Edit/delete — only own messages */}
                  {msg.isOwn && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mb-1">
                      <button
                        onClick={() => startEdit(msg)}
                        title="Edit"
                        className="p-1 rounded text-stone-500 hover:text-amber-100/70 transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        title="Delete"
                        className="p-1 rounded text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 px-4 py-3 border-t border-green-900/40 flex-shrink-0"
        style={{ background: '#261b2e' }}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          className="flex-1 resize-none rounded-xl px-3 py-2 text-sm text-amber-100/90 placeholder-stone-500 outline-none focus:ring-1 focus:ring-green-700 transition-all"
          style={{
            background: '#3e2e48',
            border: '1px solid #4a3558',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
          onInput={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>

      {/* Name modal */}
      {nameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-5 w-72 shadow-xl" style={{ background: '#3e2e48', border: '1px solid #4a3558' }}>
            <p className="text-sm font-semibold text-amber-100/80 mb-3">Change your chat name</p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setNameModalOpen(false) }}
              className="w-full rounded-lg px-3 py-2 text-sm text-amber-100/90 outline-none focus:ring-1 focus:ring-green-700"
              style={{ background: '#2d2438', border: '1px solid #4a3558' }}
              placeholder="Your name"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setNameModalOpen(false)}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveName}
                disabled={!nameInput.trim()}
                className="px-3 py-1.5 text-xs rounded-lg bg-green-700 hover:bg-green-600 text-white disabled:opacity-40 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
