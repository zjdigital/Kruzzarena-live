const STORAGE_KEY = "kruzzarena-live-dashboard-v2-auto-queue";
const CHANNEL_KEY = "kruzzarena-live-sync";
const firebaseConfig = window.KRUZZARENA_CONFIG?.firebase;

export const defaultArenaSettings = {
  current: 1,
  totalMatches: 120,
  areaCount: 2,
  waitingCount: 5,
  readyCount: 10
};

export const makeArena = (name = "Lapangan Baru", color = "red", settings = {}) => ({
  name,
  color,
  current: settings.current ?? defaultArenaSettings.current,
  totalMatches: settings.totalMatches ?? defaultArenaSettings.totalMatches,
  areaCount: settings.areaCount ?? defaultArenaSettings.areaCount,
  waitingCount: settings.waitingCount ?? defaultArenaSettings.waitingCount,
  readyCount: settings.readyCount ?? defaultArenaSettings.readyCount
});

export const defaultState = {
  eventName: "TAEKWONDO ULTIMATE BANDAE CHALLENGE 4",
  subtitle: "KRUZZARENA LIVE MATCH DASHBOARD",
  updatedAt: new Date().toISOString(),
  arenas: [
    makeArena("Lapangan A", "red", { current: 1, totalMatches: 120, areaCount: 2, waitingCount: 5, readyCount: 10 }),
    makeArena("Lapangan B", "blue", { current: 10, totalMatches: 120, areaCount: 2, waitingCount: 5, readyCount: 10 }),
    makeArena("Lapangan C", "green", { current: 4, totalMatches: 120, areaCount: 2, waitingCount: 5, readyCount: 10 })
  ]
};

let dbApiPromise = null;
let localChannel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_KEY) : null;

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function maxExistingPartai(arena) {
  const values = [
    arena.current,
    ...(arena.area || []),
    ...(arena.waiting || []),
    ...(arena.ready || [])
  ].map(Number).filter(Number.isFinite);
  return values.length ? Math.max(...values) : defaultArenaSettings.totalMatches;
}

function cleanArena(arena = {}, index = 0) {
  const totalMatches = clampNumber(
    arena.totalMatches,
    Math.max(maxExistingPartai(arena), defaultArenaSettings.totalMatches),
    1,
    999
  );

  return {
    name: String(arena.name || defaultState.arenas[index]?.name || `Lapangan ${index + 1}`).trim(),
    color: ["red", "blue", "green"].includes(arena.color) ? arena.color : "red",
    current: clampNumber(arena.current, defaultArenaSettings.current, 1, totalMatches),
    totalMatches,
    areaCount: clampNumber(arena.areaCount ?? arena.area?.length, defaultArenaSettings.areaCount, 0, 20),
    waitingCount: clampNumber(arena.waitingCount ?? arena.waiting?.length, defaultArenaSettings.waitingCount, 0, 30),
    readyCount: clampNumber(arena.readyCount ?? arena.ready?.length, defaultArenaSettings.readyCount, 0, 30)
  };
}

function cleanState(state) {
  const next = structuredClone(state || defaultState);
  next.eventName = String(next.eventName || defaultState.eventName).trim();
  next.subtitle = String(next.subtitle || defaultState.subtitle).trim();
  next.updatedAt = new Date().toISOString();
  next.arenas = (next.arenas?.length ? next.arenas : defaultState.arenas).map(cleanArena);
  return next;
}

function numberRange(start, count, totalMatches) {
  return Array.from({ length: count }, (_, index) => {
    const value = start + index;
    return value <= totalMatches ? String(value) : "";
  });
}

export function buildArenaView(arena) {
  const clean = cleanArena(arena);
  const areaStart = clean.current + 1;
  const waitingStart = areaStart + clean.areaCount;
  const readyStart = waitingStart + clean.waitingCount;

  return {
    ...clean,
    current: String(clean.current),
    area: numberRange(areaStart, clean.areaCount, clean.totalMatches),
    waiting: numberRange(waitingStart, clean.waitingCount, clean.totalMatches),
    ready: numberRange(readyStart, clean.readyCount, clean.totalMatches)
  };
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
