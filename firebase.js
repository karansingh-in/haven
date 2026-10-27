import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import {
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";

// Keep your EXISTING Firebase config values here.
const firebaseConfig = {
  apiKey: "AIzaSyBbuYKVg4uzaBs-DdVUmMgMKa9IjrwQUh0",
  authDomain: "haven-3cf56.firebaseapp.com",
  projectId: "haven-3cf56",
  storageBucket: "haven-3cf56.firebasestorage.app",
  messagingSenderId: "139216151256",
  appId: "1:139216151256:web:41747f63cd15fbd4d52dad",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance;
try {
  const persistence =
    typeof getReactNativePersistence === "function"
      ? getReactNativePersistence(AsyncStorage)
      : undefined;
  authInstance = initializeAuth(app, persistence ? { persistence } : {});
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);

// --------------------------------------------------
// AUTH
// --------------------------------------------------

export const loginUser = async (email, password) => {
  return signInWithEmailAndPassword(auth, email.trim(), password);
};

export const logoutUser = async () => {
  return signOut(auth);
};

export const deleteStudySession = async (coupleId, timestamp) => {
  const ref = doc(db, "couples", coupleId);

  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const logs = Array.isArray(snap.data().studyLogs)
    ? snap.data().studyLogs
    : [];

  await updateDoc(ref, {
    studyLogs: logs.filter((log) => log?.timestamp !== timestamp),
  });
};

// --------------------------------------------------
// USER
// --------------------------------------------------

export const getUserProfile = async (uid) => {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("User profile was not found.");
  }

  return snapshot.data();
};

// --------------------------------------------------
// COUPLE REAL-TIME SYNC
// --------------------------------------------------

export const subscribeToCoupleData = (coupleId, callback) => {
  const coupleRef = doc(db, "couples", coupleId);

  return onSnapshot(
    coupleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback({
          waterIntake: 0,
          waterGoal: 2000,
          periods: [],
          studyLogs: [],
          recentSubjects: [],
          testScores: [],
          lastCheer: null,
          cheerTimestamp: null,
        });
      }
    },
    (error) => {
      console.error("Couple data listener error:", error);
    },
  );
};

// --------------------------------------------------
// PERIODS
// --------------------------------------------------

export const updateCouplePeriods = async (coupleId, periods) => {
  const coupleRef = doc(db, "couples", coupleId);

  await updateDoc(coupleRef, {
    periods,
  });
};

// --------------------------------------------------
// SYMPTOMS
// --------------------------------------------------

// One dotted field per day, so a tap never rewrites the whole map. An empty
// selection deletes the field instead of leaving a `[]` behind.
export const updateCoupleSymptoms = async (coupleId, dayKey, ids) => {
  const coupleRef = doc(db, "couples", coupleId);
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];

  await updateDoc(coupleRef, {
    [`symptoms.${dayKey}`]: list.length ? list : deleteField(),
  });
};

// --------------------------------------------------
// STUDY
// --------------------------------------------------

export const logStudySession = async (
  coupleId,
  session,
  recentSubjects = null,
) => {
  const coupleRef = doc(db, "couples", coupleId);

  const update = {
    studyLogs: arrayUnion(session),
  };

  if (Array.isArray(recentSubjects)) {
    update.recentSubjects = recentSubjects;
  }

  await updateDoc(coupleRef, update);
};

// --------------------------------------------------
// TEST SCORES — shared across the pair
// --------------------------------------------------

export const logTestScore = async (coupleId, entry) => {
  const coupleRef = doc(db, "couples", coupleId);

  await updateDoc(coupleRef, {
    testScores: arrayUnion(entry),
  });
};

export const deleteTestScore = async (coupleId, timestamp) => {
  const ref = doc(db, "couples", coupleId);

  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const scores = Array.isArray(snap.data().testScores)
    ? snap.data().testScores
    : [];

  await updateDoc(ref, {
    testScores: scores.filter((s) => s?.timestamp !== timestamp),
  });
};

// --------------------------------------------------
// HOME-SCREEN WIDGET
// --------------------------------------------------

// `widgets/{coupleId}` is world-readable so the Scriptable widget can fetch it
// without credentials; `payload` comes from src/widget.js, which is the
// allow-list for what may leave the device. Merge so a failed write never
// blanks the widget.
export const publishWidgetSummary = async (coupleId, payload) => {
  if (!coupleId) return;

  await setDoc(doc(db, "widgets", coupleId), payload, { merge: true });
};
