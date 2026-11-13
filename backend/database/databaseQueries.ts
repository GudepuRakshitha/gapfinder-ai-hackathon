import type { DataStore } from "@/backend/database/dataStore";
import type { StorageMode } from "@/backend/types";
import { isSupabaseConfigured } from "@/backend/database/supabase";
import { localStore } from "@/backend/database/localStore";
import { supabaseStore } from "@/backend/database/supabaseStore";

/**
 * Returns the active persistence adapter.
 *
 * Supabase is used whenever all three Supabase environment variables are set.
 * Otherwise GapFinder runs in local demo mode with a JSON store in `.data/`
 * (or the platform temp directory). The active mode is surfaced in the UI and
 * in `/api/status` so it is never silently pretending to be cloud-backed.
 */
export function getDataStore(): DataStore {
  return isSupabaseConfigured ? supabaseStore : localStore;
}

export function getStorageMode(): StorageMode {
  return isSupabaseConfigured ? "supabase" : "local";
}

export const db: DataStore = new Proxy({} as DataStore, {
  get(_target, property) {
    const store = getDataStore();
    const value = Reflect.get(store, property) as unknown;
    if (typeof value === "function") {
      return value.bind(store);
    }
    return value;
  },
});
