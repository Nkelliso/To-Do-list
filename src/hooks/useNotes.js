import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function useNotes(uid) {
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'users', uid, 'notes', 'ideas')).then((snap) => {
      if (snap.exists()) setContent(snap.data().content ?? '')
      setLoaded(true)
    })
  }, [uid])

  const saveContent = (text) =>
    setDoc(doc(db, 'users', uid, 'notes', 'ideas'), { content: text })

  return { content, setContent, saveContent, loaded }
}
