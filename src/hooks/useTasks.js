import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  deleteField,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

export function useTasks(uid) {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    if (!uid) return

    const q = query(collection(db, 'tasks'), where('uid', '==', uid))

    return onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [uid])

  const addTask = (fields) =>
    addDoc(collection(db, 'tasks'), {
      ...fields,
      uid,
      completed: false,
      createdAt: serverTimestamp(),
    })

  const toggleTask = (id, currentCompleted) =>
    updateDoc(doc(db, 'tasks', id), {
      completed: !currentCompleted,
      completedAt: currentCompleted ? deleteField() : serverTimestamp(),
      completedDate: currentCompleted
        ? deleteField()
        : new Date().toISOString().split('T')[0],
    })

  const deleteTask = (id) => deleteDoc(doc(db, 'tasks', id))

  const updateTask = (id, fields) => updateDoc(doc(db, 'tasks', id), fields)

  const bulkAddTasks = async (tasksData) => {
    const batch = writeBatch(db)
    tasksData.forEach((fields) => {
      const ref = doc(collection(db, 'tasks'))
      batch.set(ref, {
        ...fields,
        uid,
        completed: false,
        createdAt: serverTimestamp(),
      })
    })
    return batch.commit()
  }

  return { tasks, addTask, toggleTask, deleteTask, updateTask, bulkAddTasks }
}
