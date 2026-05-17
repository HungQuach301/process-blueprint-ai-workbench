export type DataServiceReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; value?: T; error: Error };

export type DataServiceWriteResult = { ok: true } | { ok: false; error: Error };

export interface DataService {
  getJson<T>(key: string, fallback: T): T;
  getJsonResult<T>(key: string, fallback?: T): DataServiceReadResult<T>;
  setJson<T>(key: string, value: T): DataServiceWriteResult;
  remove(key: string): DataServiceWriteResult;
}

export interface LocalDataServiceOptions {
  storage?: Storage;
}

function toError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

function unavailableStorageError() {
  return new Error("localStorage is unavailable.");
}

export class LocalDataService implements DataService {
  private readonly storage?: Storage;

  constructor(options: LocalDataServiceOptions = {}) {
    this.storage = options.storage;
  }

  getJson<T>(key: string, fallback: T): T {
    const result = this.getJsonResult(key, fallback);

    return result.ok ? result.value : fallback;
  }

  getJsonResult<T>(key: string, fallback?: T): DataServiceReadResult<T> {
    const storage = this.getStorage();

    if (!storage) {
      return { ok: false, value: fallback, error: unavailableStorageError() };
    }

    try {
      const rawValue = storage.getItem(key);

      if (rawValue === null) {
        if (fallback !== undefined) {
          return { ok: true, value: fallback };
        }

        return {
          ok: false,
          error: new Error(`No JSON value found for key: ${key}`)
        };
      }

      return { ok: true, value: JSON.parse(rawValue) as T };
    } catch (error) {
      return {
        ok: false,
        value: fallback,
        error: toError(error, "Unable to read JSON value from localStorage.")
      };
    }
  }

  setJson<T>(key: string, value: T): DataServiceWriteResult {
    const storage = this.getStorage();

    if (!storage) {
      return { ok: false, error: unavailableStorageError() };
    }

    try {
      storage.setItem(key, JSON.stringify(value));

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: toError(error, "Unable to write JSON value to localStorage.")
      };
    }
  }

  remove(key: string): DataServiceWriteResult {
    const storage = this.getStorage();

    if (!storage) {
      return { ok: false, error: unavailableStorageError() };
    }

    try {
      storage.removeItem(key);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: toError(error, "Unable to remove localStorage value.")
      };
    }
  }

  private getStorage() {
    if (this.storage) {
      return this.storage;
    }

    if (typeof window === "undefined") {
      return null;
    }

    try {
      return window.localStorage ?? null;
    } catch {
      return null;
    }
  }
}

export const localDataService = new LocalDataService();
