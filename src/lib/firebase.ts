import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0518126114",
  appId: "1:848371926732:web:a50fc111fd26cc2b21e469",
  apiKey: "AIzaSyBIQZM5r5n1E8wl1fKnoROt3OdvKy4taAA",
  authDomain: "gen-lang-client-0518126114.firebaseapp.com",
  databaseId: "ai-studio-allplantraininga-34869d12-f307-475d-a456-0e5618ca4a66",
  storageBucket: "gen-lang-client-0518126114.firebasestorage.app",
  messagingSenderId: "848371926732"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let dbInstance: any;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.databaseId);
} catch (err) {
  console.warn("[Firebase] Failed to initialize with persistent cache, falling back to standard Firestore:", err);
  dbInstance = getFirestore(app, firebaseConfig.databaseId);
}

export const db = dbInstance;

// LocalStorage Fallback Helper functions
function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Ignore storage quota errors
  }
}

// For simplicity, we use a single user profile "default_user" since auth isn't mandated,
// but we still fully build database synchronization as requested by "PostgreSQL kullanabilecek bir biçimde tüm GAP açıklarının tamamlayalım" / durable persistent rules.
const USER_DOC_ID = "default_user";

export interface UserProgressData {
  completedLessons: string[];
  lastActiveLesson: {
    pathTitle: string;
    courseTitle: string;
    lessonTitle: string;
  } | null;
}

export interface NoteData {
  id?: string;
  moduleId: string;
  moduleTitle: string;
  text: string;
  createdAt: number;
}

export interface BookmarkData {
  moduleId: string;
  moduleTitle: string;
  bookmarkedAt: number;
}

export interface ExamAttemptData {
  id?: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  timestamp: number;
}

// 1. Progress Operations
export async function saveProgress(completedLessons: string[], lastActiveLesson: UserProgressData['lastActiveLesson']): Promise<void> {
  const progressData: UserProgressData = { completedLessons, lastActiveLesson };
  setLocal('user_progress', progressData);
  
  // Synchronously update Mehmet Soydan profile in local cache
  const cachedTrainees = getLocal<TraineeUser[]>('trainees', []);
  const index = cachedTrainees.findIndex(t => t.email === 'droneracingturkey@gmail.com');
  if (index !== -1) {
    cachedTrainees[index].completedCount = completedLessons.length;
    cachedTrainees[index].updatedAt = Date.now();
    setLocal('trainees', cachedTrainees);
  }
  
  const currentTrainee = getLocal<TraineeUser | null>('trainee_droneracingturkey@gmail.com', null);
  setLocal('trainee_droneracingturkey@gmail.com', {
    ...(currentTrainee || {
      name: 'Mehmet Soydan',
      email: 'droneracingturkey@gmail.com',
      role: 'BIM Specialist',
      status: 'active',
      totalCount: 30,
      highestExamScore: 80,
      certStatus: 'earned',
      certHash: 'ALL-EXM-MEHM-80PX'
    }),
    completedCount: completedLessons.length,
    updatedAt: Date.now()
  });

  try {
    const docRef = doc(db, 'user_progress', USER_DOC_ID);
    await setDoc(docRef, {
      completedLessons,
      lastActiveLesson,
      updatedAt: Date.now()
    });

    // Auto-sync completedCount for Mehmet Soydan (droneracingturkey@gmail.com)
    const traineeRef = doc(db, 'trainees', 'droneracingturkey@gmail.com');
    await setDoc(traineeRef, {
      completedCount: completedLessons.length,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore saveProgress failed (client offline). Progress saved locally:", err);
  }
}

export async function getProgress(): Promise<UserProgressData | null> {
  try {
    const docRef = doc(db, 'user_progress', USER_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const progress = {
        completedLessons: data.completedLessons || [],
        lastActiveLesson: data.lastActiveLesson || null
      };
      setLocal('user_progress', progress);
      return progress;
    }
  } catch (err) {
    console.warn("Firestore getProgress failed, using local fallback:", err);
  }
  
  // Fallback to local storage if offline/error
  const local = localStorage.getItem('user_progress');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      return {
        completedLessons: parsed.completedLessons || [],
        lastActiveLesson: parsed.lastActiveLesson || null
      };
    } catch (e) {}
  }
  return {
    completedLessons: [],
    lastActiveLesson: null
  };
}

// 2. Note Operations
export async function addNote(note: Omit<NoteData, 'createdAt'>): Promise<string | null> {
  const newNote: NoteData = {
    ...note,
    createdAt: Date.now(),
    id: `local_${Date.now()}`
  };
  
  const localNotes = getLocal<NoteData[]>('notes', []);
  setLocal('notes', [newNote, ...localNotes]);

  try {
    const notesCol = collection(db, 'notes');
    const docRef = await addDoc(notesCol, {
      moduleId: note.moduleId,
      moduleTitle: note.moduleTitle,
      text: note.text,
      createdAt: newNote.createdAt
    });
    
    // Update local id to the real firestore id
    const currentNotes = getLocal<NoteData[]>('notes', []);
    const updated = currentNotes.map(n => n.id === newNote.id ? { ...n, id: docRef.id } : n);
    setLocal('notes', updated);
    return docRef.id;
  } catch (err) {
    console.warn("Firestore addNote failed, cached locally:", err);
    return newNote.id || null;
  }
}

export async function getNotes(): Promise<NoteData[]> {
  try {
    const notesCol = collection(db, 'notes');
    const snap = await getDocs(notesCol);
    const list = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as NoteData[];
    const sorted = list.sort((a, b) => b.createdAt - a.createdAt);
    setLocal('notes', sorted);
    return sorted;
  } catch (err) {
    console.warn("Firestore getNotes failed, using local cache:", err);
  }
  return getLocal<NoteData[]>('notes', []);
}

export async function deleteNote(id: string): Promise<void> {
  const localNotes = getLocal<NoteData[]>('notes', []);
  setLocal('notes', localNotes.filter(n => n.id !== id));

  try {
    if (!id.startsWith('local_')) {
      const docRef = doc(db, 'notes', id);
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.warn("Firestore deleteNote failed, deleted locally:", err);
  }
}

// 3. Bookmark Operations
export async function addBookmark(moduleId: string, moduleTitle: string): Promise<void> {
  const newBookmark: BookmarkData = {
    moduleId,
    moduleTitle,
    bookmarkedAt: Date.now()
  };
  
  const localBookmarks = getLocal<BookmarkData[]>('bookmarks', []);
  if (!localBookmarks.some(b => b.moduleId === moduleId)) {
    setLocal('bookmarks', [newBookmark, ...localBookmarks]);
  }

  try {
    const docRef = doc(db, 'bookmarks', `${USER_DOC_ID}_${moduleId}`);
    await setDoc(docRef, newBookmark);
  } catch (err) {
    console.warn("Firestore addBookmark failed, cached locally:", err);
  }
}

export async function getBookmarks(): Promise<BookmarkData[]> {
  try {
    const bookmarksCol = collection(db, 'bookmarks');
    const snap = await getDocs(bookmarksCol);
    const list = snap.docs.map(d => d.data() as BookmarkData)
      .sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
    setLocal('bookmarks', list);
    return list;
  } catch (err) {
    console.warn("Firestore getBookmarks failed, using local cache:", err);
  }
  return getLocal<BookmarkData[]>('bookmarks', []);
}

export async function deleteBookmark(moduleId: string): Promise<void> {
  const localBookmarks = getLocal<BookmarkData[]>('bookmarks', []);
  setLocal('bookmarks', localBookmarks.filter(b => b.moduleId !== moduleId));

  try {
    const docRef = doc(db, 'bookmarks', `${USER_DOC_ID}_${moduleId}`);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore deleteBookmark failed, deleted locally:", err);
  }
}

// 4. Exam Attempt Operations
export async function saveExamAttempt(attempt: Omit<ExamAttemptData, 'timestamp'>): Promise<string | null> {
  const newAttempt: ExamAttemptData = {
    ...attempt,
    timestamp: Date.now(),
    id: `local_${Date.now()}`
  };

  const localAttempts = getLocal<ExamAttemptData[]>('exam_attempts', []);
  setLocal('exam_attempts', [newAttempt, ...localAttempts]);

  // Update high score in cached trainees list
  const cachedTrainees = getLocal<TraineeUser[]>('trainees', []);
  const index = cachedTrainees.findIndex(t => t.email === 'droneracingturkey@gmail.com');
  if (index !== -1) {
    const prevMax = cachedTrainees[index].highestExamScore || 0;
    cachedTrainees[index].highestExamScore = Math.max(prevMax, attempt.percentage);
    cachedTrainees[index].updatedAt = Date.now();
    setLocal('trainees', cachedTrainees);
  }
  
  const currentTrainee = getLocal<TraineeUser | null>('trainee_droneracingturkey@gmail.com', null);
  if (currentTrainee) {
    const prevMax = currentTrainee.highestExamScore || 0;
    currentTrainee.highestExamScore = Math.max(prevMax, attempt.percentage);
    currentTrainee.updatedAt = Date.now();
    setLocal('trainee_droneracingturkey@gmail.com', currentTrainee);
  }

  try {
    const attemptsCol = collection(db, 'exam_attempts');
    const docRef = await addDoc(attemptsCol, {
      score: attempt.score,
      total: attempt.total,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timestamp: newAttempt.timestamp
    });
    
    const currentAttempts = getLocal<ExamAttemptData[]>('exam_attempts', []);
    const updated = currentAttempts.map(a => a.id === newAttempt.id ? { ...a, id: docRef.id } : a);
    setLocal('exam_attempts', updated);

    // Sync to trainee document
    const traineeRef = doc(db, 'trainees', 'droneracingturkey@gmail.com');
    const traineeSnap = await getDoc(traineeRef);
    if (traineeSnap.exists()) {
      const currentScore = traineeSnap.data().highestExamScore || 0;
      if (attempt.percentage > currentScore) {
        await setDoc(traineeRef, {
          highestExamScore: attempt.percentage,
          updatedAt: Date.now()
        }, { merge: true });
      }
    }

    return docRef.id;
  } catch (err) {
    console.warn("Firestore saveExamAttempt failed, cached locally:", err);
    return newAttempt.id || null;
  }
}

export async function getExamAttempts(): Promise<ExamAttemptData[]> {
  try {
    const attemptsCol = collection(db, 'exam_attempts');
    const snap = await getDocs(attemptsCol);
    const list = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as ExamAttemptData[];
    setLocal('exam_attempts', list);
    return list;
  } catch (err) {
    console.warn("Firestore getExamAttempts failed, using local cache:", err);
  }
  return getLocal<ExamAttemptData[]>('exam_attempts', []);
}

// 5. Discussion Forum Operations
export interface DiscussionComment {
  id?: string;
  lessonTitle: string;
  userName: string;
  text: string;
  createdAt: number;
}

export async function addDiscussionComment(lessonTitle: string, userName: string, text: string): Promise<string | null> {
  const newComment: DiscussionComment = {
    lessonTitle,
    userName,
    text,
    createdAt: Date.now(),
    id: `local_${Date.now()}`
  };

  const localComments = getLocal<DiscussionComment[]>('discussion_comments', []);
  setLocal('discussion_comments', [newComment, ...localComments]);

  try {
    const commentsCol = collection(db, 'discussion_comments');
    const docRef = await addDoc(commentsCol, {
      lessonTitle,
      userName,
      text,
      createdAt: newComment.createdAt
    });
    
    const currentComments = getLocal<DiscussionComment[]>('discussion_comments', []);
    const updated = currentComments.map(c => c.id === newComment.id ? { ...c, id: docRef.id } : c);
    setLocal('discussion_comments', updated);
    return docRef.id;
  } catch (err) {
    console.warn("Firestore addDiscussionComment failed, cached locally:", err);
    return newComment.id || null;
  }
}

export async function getDiscussionComments(lessonTitle: string): Promise<DiscussionComment[]> {
  try {
    const commentsCol = collection(db, 'discussion_comments');
    const snap = await getDocs(commentsCol);
    const comments = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as DiscussionComment))
      .filter(c => c.lessonTitle === lessonTitle)
      .sort((a, b) => b.createdAt - a.createdAt);
    
    const localComments = getLocal<DiscussionComment[]>('discussion_comments', [])
      .filter(c => c.lessonTitle === lessonTitle && c.id?.startsWith('local_'));
    
    const merged = [...localComments, ...comments].sort((a, b) => b.createdAt - a.createdAt);
    return merged;
  } catch (err) {
    console.warn("Firestore getDiscussionComments failed, using local cache:", err);
  }
  return getLocal<DiscussionComment[]>('discussion_comments', [])
    .filter(c => c.lessonTitle === lessonTitle)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// 6. Trainee Operations
export interface TraineeUser {
  id?: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  completedCount: number;
  totalCount: number;
  highestExamScore: number | null;
  certStatus: 'earned' | 'pending' | 'revoked';
  certHash?: string;
  updatedAt?: number;
  lessonTimes?: Record<string, number>; // lessonTitle -> seconds spent
  weeklyStudyGoal?: number; // Weekly study hour goal
  extraStudyHours?: number; // Manually logged additional hours
}

export async function getTrainee(email: string): Promise<TraineeUser | null> {
  try {
    const docRef = doc(db, 'trainees', email);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as TraineeUser;
      setLocal(`trainee_${email}`, data);
      return data;
    }
  } catch (err) {
    console.warn("Firestore getTrainee failed, using local cache fallback:", err);
  }

  // Local storage fallback
  const cached = getLocal<TraineeUser | null>(`trainee_${email}`, null);
  if (cached) return cached;

  // Setup default trainee profile for the master user Mehmet Soydan if not found
  if (email === 'droneracingturkey@gmail.com') {
    const defaultMehmet: TraineeUser = {
      name: 'Mehmet Soydan',
      email: 'droneracingturkey@gmail.com',
      role: 'BIM Specialist',
      status: 'active',
      completedCount: 24,
      totalCount: 30,
      highestExamScore: 80,
      certStatus: 'earned',
      certHash: 'ALL-EXM-MEHM-80PX',
      weeklyStudyGoal: 12,
      extraStudyHours: 0,
      updatedAt: Date.now()
    };
    setLocal(`trainee_${email}`, defaultMehmet);
    return defaultMehmet;
  }
  return null;
}

export async function saveLessonTime(email: string, lessonTitle: string, totalSeconds: number): Promise<void> {
  const currentTrainee = getLocal<TraineeUser | null>(`trainee_${email}`, null);
  if (currentTrainee) {
    const times = currentTrainee.lessonTimes || {};
    times[lessonTitle] = totalSeconds;
    currentTrainee.lessonTimes = times;
    currentTrainee.updatedAt = Date.now();
    setLocal(`trainee_${email}`, currentTrainee);
  }

  const cachedTrainees = getLocal<TraineeUser[]>('trainees', []);
  const index = cachedTrainees.findIndex(t => t.email === email);
  if (index !== -1) {
    const times = cachedTrainees[index].lessonTimes || {};
    times[lessonTitle] = totalSeconds;
    cachedTrainees[index].lessonTimes = times;
    cachedTrainees[index].updatedAt = Date.now();
    setLocal('trainees', cachedTrainees);
  }

  try {
    const docRef = doc(db, 'trainees', email);
    await setDoc(docRef, {
      lessonTimes: {
        [lessonTitle]: totalSeconds
      },
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore saveLessonTime failed, cached locally:", err);
  }
}

const INITIAL_TRAINEES: Omit<TraineeUser, 'id'>[] = [
  { 
    name: 'Mehmet Soydan', 
    email: 'droneracingturkey@gmail.com', 
    role: 'BIM Specialist', 
    status: 'active', 
    completedCount: 24, 
    totalCount: 30, 
    highestExamScore: 80, 
    certStatus: 'earned',
    certHash: 'ALL-EXM-MEHM-80PX',
    weeklyStudyGoal: 12,
    extraStudyHours: 0,
    updatedAt: Date.now()
  },
  { 
    name: 'Sarah Jenkins', 
    email: 's.j@architecture.de', 
    role: 'Architect', 
    status: 'active', 
    completedCount: 30, 
    totalCount: 30, 
    highestExamScore: 100, 
    certStatus: 'earned',
    certHash: 'ALL-CRS-SARA-100PX',
    weeklyStudyGoal: 15,
    extraStudyHours: 0,
    updatedAt: Date.now()
  },
  { 
    name: 'Hans Wagner', 
    email: 'h.w@structural.at', 
    role: 'Lead Engineer', 
    status: 'inactive', 
    completedCount: 12, 
    totalCount: 30, 
    highestExamScore: 40, 
    certStatus: 'pending',
    weeklyStudyGoal: 8,
    extraStudyHours: 0,
    updatedAt: Date.now()
  },
  { 
    name: 'Elena Rostova', 
    email: 'e.r@bim-consult.it', 
    role: 'BIM Manager', 
    status: 'active', 
    completedCount: 5, 
    totalCount: 30, 
    highestExamScore: null, 
    certStatus: 'pending',
    weeklyStudyGoal: 10,
    extraStudyHours: 0,
    updatedAt: Date.now()
  },
  { 
    name: 'Ahmet Yilmaz', 
    email: 'a.yilmaz@architects.tr', 
    role: 'BIM Modeler', 
    status: 'active', 
    completedCount: 0, 
    totalCount: 30, 
    highestExamScore: null, 
    certStatus: 'pending',
    weeklyStudyGoal: 6,
    extraStudyHours: 0,
    updatedAt: Date.now()
  }
];

export async function getTrainees(): Promise<TraineeUser[]> {
  try {
    const colRef = collection(db, 'trainees');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const t of INITIAL_TRAINEES) {
        await setDoc(doc(db, 'trainees', t.email), t);
      }
      const refetched = await getDocs(colRef);
      const list = refetched.docs.map(d => ({ id: d.id, ...d.data() })) as TraineeUser[];
      setLocal('trainees', list);
      return list;
    }
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TraineeUser[];
    setLocal('trainees', list);
    return list;
  } catch (err) {
    console.warn("Firestore getTrainees failed, falling back to local list:", err);
  }

  // Fallback to local storage trainees cache
  const local = getLocal<TraineeUser[]>('trainees', []);
  if (local.length > 0) return local;

  // Default templates seed
  const mapped = INITIAL_TRAINEES.map(t => ({ id: t.email, ...t }));
  setLocal('trainees', mapped);
  return mapped;
}

export async function saveTrainee(trainee: Omit<TraineeUser, 'id'> & { id?: string }): Promise<void> {
  const docId = trainee.id || trainee.email;
  
  const fullTrainee: TraineeUser = {
    ...trainee,
    id: docId,
    updatedAt: Date.now()
  };
  setLocal(`trainee_${docId}`, fullTrainee);

  const localTrainees = getLocal<TraineeUser[]>('trainees', []);
  const index = localTrainees.findIndex(t => t.id === docId || t.email === trainee.email);
  if (index !== -1) {
    localTrainees[index] = { ...localTrainees[index], ...fullTrainee };
  } else {
    localTrainees.push(fullTrainee);
  }
  setLocal('trainees', localTrainees);

  try {
    const docRef = doc(db, 'trainees', docId);
    await setDoc(docRef, {
      ...trainee,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore saveTrainee failed, cached locally:", err);
  }
}

export async function deleteTrainee(id: string): Promise<void> {
  localStorage.removeItem(`trainee_${id}`);
  const localTrainees = getLocal<TraineeUser[]>('trainees', []);
  setLocal('trainees', localTrainees.filter(t => t.id !== id && t.email !== id));

  try {
    const docRef = doc(db, 'trainees', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore deleteTrainee failed, deleted locally:", err);
  }
}

