// Spielvertrag: Was ein Spiel der Plattform-Hülle liefert (GameManifest) und was es von ihr bekommt (Platform).
// Ein Spiel spricht ausschließlich über `platform` mit der Außenwelt – kein localStorage, kein fetch, keine Konten.
// Ausführlich: docs/architektur.md, Abschnitt „Spielvertrag“.

/** Texte je Sprache, z. B. { de: 'Spielen', en: 'Play' }. Englisch sollte immer dabei sein. */
export type Localized = Partial<Record<string, string>>;

export interface Leaderboard {
  id: string;
  /** Name in der Bibliothek, z. B. die Schwierigkeitsstufe. Ohne Titel heißt die Rangliste einfach „Rekord“. */
  title?: Localized;
  /** 'desc': mehr ist besser (Punkte), 'asc': weniger ist besser (Zeit) */
  sort: 'asc' | 'desc';
  format: 'points' | 'time';
}

export interface GameManifest {
  /** Kleinbuchstaben und Bindestrich, z. B. 'cozy-garden'. Gleich dem Ordnernamen unter games/. */
  id: string;
  title: Localized;
  description?: Localized;
  /** URL eines Vorschaubilds für die Bibliothek (16:9) */
  cover?: string;
  /** Version des Spielstand-Formats. Alte Stände migriert das Spiel selbst. */
  saveVersion: number;
  /** Alte localStorage-Schlüssel aus der Zeit vor der Plattform. Die Hülle übernimmt sie einmalig. */
  legacySaveKeys?: string[];
  leaderboards?: Leaderboard[];
  /** Produkt-IDs der DLCs, die das Spiel über platform.entitlements abfragt */
  dlc?: string[];
  /** Baut das Spiel in `el` auf. Lädt den eigentlichen Spielcode am besten erst hier (dynamischer import). */
  mount(el: HTMLElement, platform: Platform): GameHandle | Promise<GameHandle>;
}

/** Was mount() zurückgibt: Die Hülle steuert damit den Lebenszyklus. */
export interface GameHandle {
  /** Tab verdeckt o. Ä.: Loop und Ton anhalten, speichern */
  pause(): void;
  resume(): void;
  /** Speichern, alle Listener und Timer abräumen, DOM entfernen. Danach darf nichts mehr laufen. */
  unmount(): void;
}

export interface PlatformUser {
  id: string | null;
  name: string | null;
  guest: boolean;
}

export interface Platform {
  gameId: string;
  user: PlatformUser;
  save: {
    /** Gespeicherter Stand des Slots oder null */
    load(slot?: string): Promise<unknown | null>;
    /** Stand des Slots ersetzen. Muss als JSON darstellbar sein. */
    store(data: unknown, slot?: string): void;
  };
  scores: {
    /** Wert für eine Rangliste melden. proof: alles, womit sich der Wert nachspielen lässt (Seed, Züge). */
    submit(board: string, value: number, proof?: unknown): void;
  };
  entitlements: {
    has(productId: string): boolean;
    /** Liefert eine Funktion zum Abmelden */
    onChange(cb: () => void): () => void;
  };
  /** Aktuelle Sprache, z. B. 'de' */
  language(): string;
  audio: {
    /** Gesamtlautstärke 0..1 (0 = stumm), gilt für alle Spiele */
    volume(): number;
    onChange(cb: (volume: number) => void): () => void;
  };
  /** Zurück zur Bibliothek. Fehlt, wenn das Spiel ohne Hülle läuft. */
  exit?: () => void;
  logError(error: unknown): void;
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Prüft das Manifest beim Laden und gibt es unverändert zurück. */
export function defineGame<T extends GameManifest>(manifest: T): T {
  if (!ID.test(manifest.id)) throw new Error(`Ungültige Spiel-ID: ${manifest.id}`);
  if (!Number.isInteger(manifest.saveVersion) || manifest.saveVersion < 1) {
    throw new Error(`${manifest.id}: saveVersion muss eine ganze Zahl ≥ 1 sein`);
  }
  if (typeof manifest.mount !== 'function') throw new Error(`${manifest.id}: mount fehlt`);
  return manifest;
}

export interface FakePlatformOptions {
  gameId: string;
  /** Speicher für Spielstände. Standard: localStorage, falls vorhanden, sonst nur im Arbeitsspeicher. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  language?: string;
  volume?: number;
  entitlements?: string[];
}

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } };
}

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch { /* z. B. blockierter Speicher */ }
  return memoryStorage();
}

/**
 * Plattform ohne Hülle: für Tests und um ein Spiel einzeln zu starten (games/<id>/index.html).
 * Spielstände unter `dev:<gameId>:<slot>`, damit sie sich nicht mit denen der Hülle mischen.
 */
export function createFakePlatform(opts: FakePlatformOptions): Platform {
  const storage = opts.storage ?? defaultStorage();
  const owned = new Set(opts.entitlements ?? []);
  const key = (slot = 'default') => `dev:${opts.gameId}:${slot}`;
  return {
    gameId: opts.gameId,
    user: { id: null, name: null, guest: true },
    save: {
      async load(slot) {
        try {
          const raw = storage.getItem(key(slot));
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.error(e);
          return null;
        }
      },
      store(data, slot) {
        try { storage.setItem(key(slot), JSON.stringify(data)); } catch { /* Speicher voll o. Ä. */ }
      },
    },
    scores: { submit() { /* ohne Hülle keine Ranglisten */ } },
    entitlements: { has: id => owned.has(id), onChange: () => () => {} },
    language: () => opts.language ?? globalThis.navigator?.language ?? 'en',
    audio: { volume: () => opts.volume ?? 1, onChange: () => () => {} },
    logError: e => console.error(e),
  };
}
