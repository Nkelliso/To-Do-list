import TaskRow from './TaskRow'

const DAY_ORDER = { M: 0, Tu: 1, W: 2, Th: 3, F: 4, Wknd: 5 }

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    const dayDiff = (DAY_ORDER[a.dayDue] ?? 99) - (DAY_ORDER[b.dayDue] ?? 99)
    if (dayDiff !== 0) return dayDiff
    return (a.timeDue || '').localeCompare(b.timeDue || '')
  })
}

export default function TaskList({ tasks, selectedTaskId, onSelectTask, onToggle, onDelete }) {
  const sorted = sortTasks(tasks)

  return (
    <div className="p-4">
      <h2 className="text-xs font-semibold text-gray-600 tracking-widest uppercase mb-4 px-1">
        To Do
      </h2>

      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-center">
          <p className="text-gray-700 text-sm leading-relaxed">
            No tasks this week.<br />Add one to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {sorted.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              isSelected={task.id === selectedTaskId}
              onSelect={() => onSelectTask(task.id === selectedTaskId ? null : task.id)}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
