import { useState, useRef, useEffect } from 'react'

export default function Header({ user, onAddTask, onSignOut, page, onPageChange, onBulkImport }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const avatarContent = user?.photoURL ? (
    <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-sm font-semibold">
      {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
    </div>
  )

  return (
    <header
      className="grid grid-cols-3 items-center border-b border-green-900/40 px-6 py-3 flex-shrink-0"
      style={{ background: '#261b2e' }}
    >
      {/* Left: Add Task (hidden on Ideas page) */}
      <div>
        {page !== 'ideas' && (
          <button
            onClick={onAddTask}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer select-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        )}
      </div>

      {/* Center: Nav */}
      <div className="flex justify-center items-center gap-5">
        <button
          onClick={() => onPageChange('todo')}
          className={`text-sm font-semibold tracking-wide transition-colors cursor-pointer select-none pb-0.5 ${
            page === 'todo'
              ? 'text-amber-100/90 border-b border-amber-100/60'
              : 'text-amber-100/40 hover:text-amber-100/60'
          }`}
        >
          To-Do List
        </button>
        <button
          onClick={() => onPageChange('ideas')}
          className={`text-sm font-semibold tracking-wide transition-colors cursor-pointer select-none pb-0.5 ${
            page === 'ideas'
              ? 'text-amber-100/90 border-b border-amber-100/60'
              : 'text-amber-100/40 hover:text-amber-100/60'
          }`}
        >
          Ideas
        </button>
      </div>

      {/* Right: Bulk import icon + User avatar */}
      <div className="flex justify-end items-center gap-2">
        {page !== 'ideas' && (
          <button
            onClick={onBulkImport}
            title="Bulk import tasks"
            className="w-8 h-8 flex items-center justify-center rounded-full text-stone-600 hover:text-stone-300 transition-colors cursor-pointer select-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
        )}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 focus:ring-offset-[#261b2e] select-none"
          >
            {avatarContent}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 border border-green-900/60 rounded-lg shadow-xl py-1 w-48 z-50" style={{ background: '#3e2e38' }}>
              <div className="px-3 py-2 border-b border-green-900/40">
                <p className="text-xs font-medium text-amber-100/70 truncate">{user?.displayName}</p>
                <p className="text-xs text-stone-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); onSignOut() }}
                className="w-full text-left px-3 py-2 text-sm text-stone-400 hover:text-amber-100/80 transition-colors cursor-pointer select-none"
                style={{ ':hover': { background: '#261b2e' } }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
