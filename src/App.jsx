import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'
import { useNotes } from './hooks/useNotes'
import Login from './components/Login'
import Header from './components/Header'
import TaskList from './components/TaskList'
import WeeklyCalendar from './components/WeeklyCalendar'
import AddTaskModal from './components/AddTaskModal'
import IdeasPage from './components/IdeasPage'

export default function App() {
  const { user, signIn, signOut } = useAuth()
  const { tasks, addTask, toggleTask, deleteTask, updateTask } = useTasks(user?.uid)
  const { content, saveContent, loaded } = useNotes(user?.uid)
  const [showModal, setShowModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [page, setPage] = useState('todo')

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0b06' }}>
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
    <div className="flex flex-col min-h-screen md:h-screen md:overflow-hidden" style={{ background: '#0d0b06' }}>
      <Header
        user={user}
        onAddTask={() => setShowModal(true)}
        onSignOut={signOut}
        page={page}
        onPageChange={setPage}
      />

      {page === 'ideas' ? (
        <div className="flex flex-col flex-1 min-h-0 w-full">
          {loaded && (
            <IdeasPage
              content={content}
              onChange={saveContent}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-1 md:min-h-0 flex-col md:flex-row">
          {/* Left column — task list */}
          <div
            className="w-full md:w-2/5 md:flex-shrink-0 md:overflow-y-auto border-b md:border-b-0 md:border-r border-green-900/40"
            style={{ background: '#18120a' }}
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
            style={{ background: '#120f08' }}
          >
            <WeeklyCalendar
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onUpdateTask={updateTask}
            />
          </div>
        </div>
      )}

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveTask}
        />
      )}

      <div className="fixed bottom-2 left-3 text-[10px] text-white pointer-events-none select-none z-50">
        v1.5
      </div>
    </div>
  )
}
