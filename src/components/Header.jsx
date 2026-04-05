import { useState, useRef, useEffect } from 'react'

export default function Header({ user, onAddTask, onSignOut }) {
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
    <header className="grid grid-cols-3 items-center border-b border-green-900/50 bg-black px-6 py-3 flex-shrink-0">
      {/* Left: Add Task */}
      <div>
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Center: App name */}
      <div className="flex justify-center">
        <span className="text-sm font-semibold text-gray-200 tracking-wide">To-Do List</span>
      </div>

      {/* Right: User avatar */}
      <div className="flex justify-end">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 focus:ring-offset-black"
          >
            {avatarContent}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 bg-gray-900 border border-green-900 rounded-lg shadow-xl py-1 w-48 z-50">
              <div className="px-3 py-2 border-b border-green-900">
                <p className="text-xs font-medium text-gray-200 truncate">{user?.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); onSignOut() }}
                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-black hover:text-gray-200 transition-colors cursor-pointer"
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
