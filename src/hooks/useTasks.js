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
      // Record when completed; clear it when unchecking
      completedAt: currentCompleted ? deleteField() : serverTimestamp(),
    })

  const deleteTask = (id) => deleteDoc(doc(db, 'tasks', id))

  const updateTask = (id, fields) => updateDoc(doc(db, 'tasks', id), fields)

  return { tasks, addTask, toggleTask, deleteTask, updateTask }
}
