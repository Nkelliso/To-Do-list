import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function useAiNotes(uid) {
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'users', uid, 'notes', 'ainotes'))
      .then((snap) => {
        if (snap.exists()) setContent(snap.data().content ?? '')
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [uid])

  const saveContent = (text) =>
    setDoc(doc(db, 'users', uid, 'notes', 'ainotes'), { content: text })

  return { content, setContent, saveContent, loaded }
}
