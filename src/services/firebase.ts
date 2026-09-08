import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inisialisasi Firebase App secara aman
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Firestore & Auth
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId && dbId !== '(default)' && dbId !== ''
  ? getFirestore(app, dbId)
  : getFirestore(app);

export const auth = getAuth(app);

let authInitPromise: Promise<FirebaseUser | null> | null = null;

/**
 * Memastikan koneksi autentikasi Firebase aktif.
 * Tidak akan memblokir eksekusi walau login anonim dinonaktifkan di console.
 */
export function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      let resolved = false;

      // Pantau state auth (Google Sign-In atau sesi aktif sebelumnya)
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && !resolved) {
          resolved = true;
          unsubscribe();
          resolve(user);
        }
      });

      // Coba Anonymous Auth sebagai fallback jika belum ada user login
      signInAnonymously(auth)
        .then((cred) => {
          if (!resolved) {
            resolved = true;
            resolve(cred.user);
          }
        })
        .catch((err) => {
          console.warn('Anonymous auth fallback bypassed:', err?.message || err);
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        });

      // Timeout batas aman agar alur simpan data tidak gantung
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(auth.currentUser);
        }
      }, 3000);
    });
  }
  return authInitPromise;
}

// Jalankan pengecekan auth awal saat aplikasi dibuka
ensureFirebaseAuth().catch(() => {});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

/**
 * Log error Firestore tanpa melempar crash total pada UI,
 * sehingga fallback offline/lokal tetap berjalan normal.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
}

/**
 * Tes koneksi server Firestore di latar belakang
 */
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Abaikan jika dokumen pengetesan awal tidak ada
  }
}

testFirestoreConnection().catch(() => {});
