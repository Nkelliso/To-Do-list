import { useState, useRef, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'
import { useNotes } from './hooks/useNotes'
import Login from './components/Login'
import Header from './components/Header'
import TaskList from './components/TaskList'
import WeeklyCalendar from './components/WeeklyCalendar'
import AddTaskModal from './components/AddTaskModal'
import BulkImportModal from './components/BulkImportModal'
import IdeasPage from './components/IdeasPage'

export default function App() {
  const { user, signIn, signOut } = useAuth()
  const { tasks, addTask, toggleTask, deleteTask, updateTask, bulkAddTasks, archiveTasks, deleteTasks } = useTasks(user?.uid)
  const { content, saveContent, loaded } = useNotes(user?.uid)
  const [showModal, setShowModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [page, setPage] = useState('todo')
  const [showBulkImport, setShowBulkImport] = useState(false)
  const ideasRef = useRef(null)
  const archiveChecked = useRef(false)

  // Weekly archive: on first task load, move completed tasks from before this
  // week into archived folders. Delete archives older than 30 days.
  useEffect(() => {
    if (!user?.uid || tasks.length === 0 || archiveChecked.current) return
    archiveChecked.current = true

    // Find the Monday of the current week
    const now = new Date()
    const dow = now.getDay() // 0=Sun
    const daysToMon = dow === 0 ? 6 : dow - 1
    const mon = new Date(now)
    mon.setDate(mon.getDate() - daysToMon)
    const currentWeekMonday = mon.toISOString().split('T')[0]

    const lastArchive = localStorage.getItem('taskflow_last_weekly_archive')
    if (lastArchive !== currentWeekMonday) {
      // Archive completed, non-archived tasks from before this week
      const toArchive = tasks
        .filter(t => t.completed && !t.archived && t.completedDate && t.completedDate < currentWeekMonday)
        .map(t => {
          const d = new Date(t.completedDate + 'T12:00:00')
          const tdow = d.getDay()
          const dToMon = tdow === 0 ? 6 : tdow - 1
          const taskMon = new Date(d)
          taskMon.setDate(taskMon.getDate() - dToMon)
          return { id: t.id, weekOf: taskMon.toISOString().split('T')[0] }
        })

      archiveTasks(toArchive).then(() => {
        localStorage.setItem('taskflow_last_weekly_archive', currentWeekMonday)
      })
    }

    // Delete archived tasks older than 30 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString()
    const toDelete = tasks
      .filter(t => t.archived && t.archivedAt && t.archivedAt < cutoffStr)
      .map(t => t.id)
    deleteTasks(toDelete)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, tasks])

  const handlePageChange = (newPage) => {
    if (page === 'ideas' && newPage !== 'ideas') {
      ideasRef.current?.flush()
    }
    setPage(newPage)
  }

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#2d2418' }}>
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user === null) {
    return <Login onSignIn={signIn} />
  }

  const handleSaveTask = async (fields) => {
    await addTask(fields)
    setShowModal(false)
  }

  return (
    <div className="flex flex-col min-h-screen md:h-screen md:overflow-hidden" style={{ background: '#2d2418' }}>
      <Header
        user={user}
        onAddTask={() => setShowModal(true)}
        onSignOut={signOut}
        page={page}
        onPageChange={handlePageChange}
        onBulkImport={() => setShowBulkImport(true)}
      />

      {/* Ideas page — always mounted so editor DOM is preserved */}
      <div className={`flex flex-col flex-1 min-h-0 w-full ${page !== 'ideas' ? 'hidden' : ''}`}>
        {loaded && (
          <IdeasPage
            ref={ideasRef}
            content={content}
            onChange={saveContent}
          />
        )}
      </div>

      {/* To-Do + Calendar — always mounted */}
      <div className={`flex flex-1 md:min-h-0 flex-col md:flex-row ${page === 'ideas' ? 'hidden' : ''}`}>
        {/* Left column — task list */}
        <div
          className="w-full md:w-2/5 md:flex-shrink-0 md:overflow-y-auto border-b md:border-b-0 md:border-r border-green-900/40"
          style={{ background: '#382818' }}
        >
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onUpdate={updateTask}
          />
        </div>

        {/* Right column — calendar */}
        <div
          className="flex-1 md:overflow-y-auto"
          style={{ background: '#302010' }}
        >
          <WeeklyCalendar
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onUpdateTask={updateTask}
          />
        </div>
      </div>

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveTask}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImport={bulkAddTasks}
        />
      )}

      <div className="fixed bottom-2 left-3 text-[10px] text-white pointer-events-none select-none z-50">
        v1.6
      </div>
    </div>
  )
}
