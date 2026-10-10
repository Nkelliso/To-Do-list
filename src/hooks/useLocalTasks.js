import { useState } from 'react'

// Dev-only stand-in for useTasks: same API, but tasks live in memory so the
// "Skip sign-in" path on localhost never reads or writes real Firestore data.
// Refreshing the page resets to the sample tasks below.

const TODAY_CODE = ['Wknd', 'M', 'Tu', 'W', 'Th', 'F', 'Wknd'][new Date().getDay()]

const SAMPLE_TASKS = [
  { name: 'Sample: due today', dayDue: TODAY_CODE, timeDue: '10:00', priority: 2 },
  { name: 'Sample: Friday task', dayDue: 'F', timeDue: '14:00', priority: 2 },
  { name: 'Sample: manually critical', dayDue: 'Th', timeDue: '09:00', priority: 5 },
  { name: 'Sample: weekend chore', dayDue: 'Wknd', timeDue: '12:00', priority: 1 },
  { name: 'Sample: no day set', dayDue: null, timeDue: '09:00', priority: 3 },
].map((t, i) => ({ ...t, id: `local-${i}`, uid: 'dev-local', completed: false }))

let nextId = SAMPLE_TASKS.length

export function useLocalTasks() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS)

  const patch = (id, fields) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...fields } : t)))

  const addTask = async (fields) =>
    setTasks((ts) => [...ts, { ...fields, id: `local-${nextId++}`, uid: 'dev-local', completed: false }])

  const toggleTask = async (id, currentCompleted) =>
    patch(id, {
      completed: !currentCompleted,
      completedDate: currentCompleted ? undefined : new Date().toISOString().split('T')[0],
    })

  const deleteTask = async (id) => setTasks((ts) => ts.filter((t) => t.id !== id))

  const updateTask = async (id, fields) => patch(id, fields)

  const bulkAddTasks = async (tasksData) => {
    for (const fields of tasksData) await addTask(fields)
  }

  const archiveTasks = async () => {}
  const deleteTasks = async (ids) => setTasks((ts) => ts.filter((t) => !ids.includes(t.id)))

  return { tasks, addTask, toggleTask, deleteTask, updateTask, bulkAddTasks, archiveTasks, deleteTasks }
}
