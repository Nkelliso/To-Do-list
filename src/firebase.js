import { initializeApp } from 'firebase/app'
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Safari partitions storage by origin, so a redirect sign-in that hops through
// personal-todo-list-b5ea8.firebaseapp.com loses its pending-redirect state and
// lands us back on the login screen with nothing to show for it. vercel.json
// proxies /__/auth/* to that same handler, so in production we point authDomain
// at our own host and the whole round trip stays first-party. Dev has no proxy,
// and localhost is exempt from partitioning anyway, so it uses the env value.
const authDomain =
  import.meta.env.PROD && typeof window !== 'undefined'
    ? window.location.host
    : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// getAuth() picks one persistence backend and gives up if it is unavailable.
// iOS Safari blocks IndexedDB in some standalone/private contexts, which drops
// the session mid sign-in. Listing fallbacks keeps the session alive there.
// The resolver has to be passed explicitly when using initializeAuth, or
// signInWithPopup / signInWithRedirect throw at call time.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
})

export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
