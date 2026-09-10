import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

// Popups are unreliable on phones: iOS standalone (added-to-home-screen) opens
// them in a detached Safari view that can never post the result back, and
// mobile browsers close them on any tab switch. Both look identical to the
// user - the Google screen flashes and drops them back on the login button.
function prefersRedirect() {
  if (typeof window === 'undefined') return false
  const standalone =
    window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  const mobile = /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent)
  return standalone || mobile
}

// Errors that mean "this browser will not give us a popup" rather than
// "the user changed their mind".
const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/internal-error',
])

export function useAuth() {
  // undefined = loading, null = signed out, object = signed in
  const [user, setUser] = useState(undefined)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    // A redirect sign-in reports failure here, on the way back into the app.
    // Without this the trip just ends silently on the login screen.
    getRedirectResult(auth).catch((e) => {
      setAuthError(e.message || 'Sign-in failed.')
    })
    return onAuthStateChanged(auth, setUser)
  }, [])

  const signIn = async () => {
    setAuthError('')
    if (prefersRedirect()) {
      return signInWithRedirect(auth, googleProvider)
    }
    try {
      return await signInWithPopup(auth, googleProvider)
    } catch (e) {
      if (POPUP_UNAVAILABLE.has(e.code)) {
        return signInWithRedirect(auth, googleProvider)
      }
      throw e
    }
  }

  const signOutUser = () => signOut(auth)

  return { user, signIn, signOut: signOutUser, authError }
}
