import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'
import Login from './components/Login'
import Header from './components/Header'
import TaskList from './components/TaskList'
import WeeklyCalendar from './components/WeeklyCalendar'
import AddTaskModal from './components/AddTaskModal'

export default function App() {
  const { user, signIn, signOut } = useAuth()
  const { tasks, addTask, toggleTask, deleteTask, updateTask } = useTasks(user?.uid)
  const [showModal, setShowModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
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
    <div className="flex flex-col min-h-screen md:h-screen md:overflow-hidden bg-black">
      <Header
        user={user}
        onAddTask={() => setShowModal(true)}
        onSignOut={signOut}
      />

      <div className="flex flex-1 md:min-h-0 flex-col md:flex-row">
        {/* Left column — 40% — master task list */}
        <div
          className="w-full md:w-2/5 md:flex-shrink-0 md:overflow-y-auto border-b md:border-b-0 md:border-r border-green-900/50"
          style={{ background: '#0a0a08' }}
        >
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        </div>

        {/* Right column — 60% — weekly calendar */}
        <div
          className="flex-1 md:overflow-y-auto"
          style={{ background: '#06080a' }}
        >
          <WeeklyCalendar
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onUpdateTask={updateTask}
          />
        </div>
      </div>

      <div className="fixed bottom-2 left-3 text-[10px] text-white pointer-events-none select-none z-50">
        v1.1
      </div>

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}
