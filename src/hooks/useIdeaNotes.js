import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function useIdeaNotes(uid) {
  const [notes, setNotes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [migrated, setMigrated] = useState(false)

  // Reset all state when the logged-in user changes
  useEffect(() => {
    setNotes([])
    setLoaded(false)
    setMigrated(false)
  }, [uid])

  // Real-time listener for all idea notes (unsorted — sorted client-side)
  useEffect(() => {
    if (!uid) return
    return onSnapshot(
      collection(db, 'users', uid, 'ideaNotes'),
      (snap) => {
        setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoaded(true)
      },
      () => setLoaded(true)
    )
  }, [uid])

  // One-time migration: copy existing Master Ideas List HTML into the first note.
  // Runs after Firestore data loads. Uses a flag field on the old ideas doc so it
  // only ever runs once per user.
  useEffect(() => {
    if (!uid || !loaded || migrated) return
    let cancelled = false

    const run = async () => {
      const flagRef = doc(db, 'users', uid, 'notes', 'ideas')
      const flagSnap = await getDoc(flagRef)
      if (cancelled) return

      if (!flagSnap.exists() || !flagSnap.data().migratedToNotebook) {
        const existing = flagSnap.exists() ? (flagSnap.data().content ?? '') : ''
        if (existing) {
          await addDoc(collection(db, 'users', uid, 'ideaNotes'), {
            content: existing,
            pinned: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        // Merge so we don't wipe the old content field (it remains but is unused)
        await setDoc(flagRef, { migratedToNotebook: true }, { merge: true })
      }

      if (!cancelled) setMigrated(true)
    }

    run().catch(console.error)
    return () => { cancelled = true }
  }, [uid, loaded, migrated])

  const createNote = () =>
    addDoc(collection(db, 'users', uid, 'ideaNotes'), {
      content: '',
      pinned: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

  const updateNote = (id, fields) =>
    updateDoc(doc(db, 'users', uid, 'ideaNotes', id), {
      ...fields,
      updatedAt: serverTimestamp(),
    })

  const deleteNote = (id) =>
    deleteDoc(doc(db, 'users', uid, 'ideaNotes', id))

  // loaded is only true once Firestore has responded AND migration is confirmed done
  return { notes, loaded: loaded && migrated, createNote, updateNote, deleteNote }
}
