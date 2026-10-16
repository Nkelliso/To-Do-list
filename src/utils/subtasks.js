// Subtasks live on the task doc as `subtasks: [{ id, name, done, subtasks? }]`.
// Two levels: a task's subtasks can have their own subtasks, which can't nest further.

export const MAX_SUBTASK_DEPTH = 2

export const newSubtaskId = () => Math.random().toString(36).slice(2, 10)

// Mark an item and everything under it done / not done
export function setDone(item, done) {
  return {
    ...item,
    done,
    ...(item.subtasks ? { subtasks: item.subtasks.map((s) => setDone(s, done)) } : {}),
  }
}

// Replace an item's children. An item with children is done exactly when all of them are.
export function withChildren(item, children) {
  return {
    ...item,
    subtasks: children,
    done: children.length ? children.every((c) => c.done) : item.done,
  }
}
