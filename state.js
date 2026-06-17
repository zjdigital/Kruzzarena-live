const STORAGE_KEY = "kruzzarena-live-dashboard-v1";
const CHANNEL_KEY = "kruzzarena-live-sync";
const firebaseConfig = window.KRUZZARENA_CONFIG?.firebase;

const initialArena = (name, current, area, ready, waiting, color) => ({
  name,
  color,
  current,
  area,
  ready,
  waiting
});

export const defaultState = {
  eventName: "KRUZZARENA LIVE MATCH DASHBOARD",
  subtitle: "TAEKWONDO ULTIMATE BANDAE CHALLENGE",
  updatedAt: new Date().toISOString(),
  arenas: [
    initialArena("Lapangan A", "7", ["8", "9"], ["10", "11", "12", "13", "14", "", "", "", "", ""], ["15", "16", "17", "18", "19", "", "", "", "", ""], "red"),
    initialArena("Lapangan B", "10", ["11", "12"], ["13", "14", "15", "16", "17", "", "", "", "", ""], ["18", "19", "20", "21", "22", "", "", "", "", ""], "blue"),
    initialArena("Lapangan C", "4", ["5", "6"], ["7", "8", "9", "10", "11", "", "", "", "", ""], ["12", "13", "14", "15", "16", "", "", "", "", ""], "green")
  ]
};

let dbApiPromise = null;
let localChannel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_KEY) : null;

function cleanState(state) {
  const next = structuredClone(state || defaultState);
  next.eventName = String(next.eventName || defaultState.eventName).trim();
  next.subtitle = String(next.subtitle || defaultState.subtitle).trim();
  next.updatedAt = new Date().toISOString();
  next.arenas = (next.arenas || defaultState.arenas).slice(0, 3).map((arena, index) => ({
    name: String(arena.name || defaultState.arenas[index].name).trim(),
    color: ["red", "blue", "green"].includes(arena.color) ? arena.color : "red",
    current: String(arena.current || "").trim(),
    area: normalizeList(arena.area, 2),
    ready: normalizeList(arena.ready, 10),
    waiting: normalizeList(arena.waiting, 10)
  }));
  return next;
}

function normalizeList(items, length) {
  return Array.from({ length }, (_, index) => String(items?.[index] || "").trim());
}

async function getFirebaseApi() {
  if (!firebaseConfig) return null;
  if (dbApiPromise) return dbApiPromise;

  dbApiPromise = Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js")
  ]).then(([appModule, dbModule]) => {
    const app = appModule.initializeApp(firebaseConfig);
    const db = dbModule.getDatabase(app);
    const stateRef = dbModule.ref(db, "liveDashboard/state");
    return { ...dbModule, stateRef };
  });

  return dbApiPromise;
}

export async function loadState() {
  const firebaseApi = await getFirebaseApi();
  if (firebaseApi) {
    const snapshot = await firebaseApi.get(firebaseApi.stateRef);
    if (snapshot.exists()) return cleanState(snapshot.val());
    await saveState(defaultState);
    return cleanState(defaultState);
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return cleanState(defaultState);
  }

  try {
    return cleanState(JSON.parse(raw));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return cleanState(defaultState);
  }
}

export async function saveState(state) {
  const next = cleanState(state);
  const firebaseApi = await getFirebaseApi();

  if (firebaseApi) {
    await firebaseApi.set(firebaseApi.stateRef, next);
    return next;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  localChannel?.postMessage(next);
  window.dispatchEvent(new CustomEvent(CHANNEL_KEY, { detail: next }));
  return next;
}

export async function resetState() {
  return saveState(defaultState);
}

export async function subscribeState(callback) {
  const firebaseApi = await getFirebaseApi();

  if (firebaseApi) {
    firebaseApi.onValue(firebaseApi.stateRef, (snapshot) => {
      callback(snapshot.exists() ? cleanState(snapshot.val()) : cleanState(defaultState));
    });
    return;
  }

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) callback(cleanState(JSON.parse(event.newValue)));
  };
  const onLocalEvent = (event) => callback(cleanState(event.detail));
  const onChannel = (event) => callback(cleanState(event.data));

  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANNEL_KEY, onLocalEvent);
  localChannel?.addEventListener("message", onChannel);
}
