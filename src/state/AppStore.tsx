"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import type { AppState, HealthResponse } from "@/lib/domain/types";
import { fetchHealth } from "@/lib/api/client";
import { uid } from "@/lib/format";
import { appReducer, type AppAction } from "./appReducer";
import {
  createInitialState,
  loadState,
  persistState,
} from "./persistence";
import { getActiveVersion, getRunStatus } from "./selectors";

export type ToastTone = "info" | "success" | "warning" | "error";

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type AppContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  hydrated: boolean;
  activeRun: AppState["runs"][number] | null;
  activeVersion: ReturnType<typeof getActiveVersion> | null;
  activeRunStatus: ReturnType<typeof getRunStatus> | null;
  storageWarning: string | null;
  clearStorageWarning: () => void;
  health: HealthResponse | null;
  healthLoading: boolean;
  refreshHealth: () => Promise<void>;
  toasts: ToastItem[];
  toast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const result = loadState();
    dispatch({ type: "REPLACE_STATE", state: result.state });
    if (result.warning) setStorageWarning(result.warning);
    setHydrated(true);
  }, []);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    const result = await fetchHealth();
    setHealth(result);
    setHealthLoading(false);
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      const result = persistState(state);
      if (!result.ok && result.error) {
        setStorageWarning(result.error);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [state, hydrated]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = uid("toast");
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      const timer = setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
        timers.current.delete(id);
      }, 4200);
      timers.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, []);

  const activeRun = useMemo(
    () =>
      state.runs.find((run) => run.id === state.workbench.activeRunId) ?? null,
    [state.runs, state.workbench.activeRunId],
  );
  const activeVersion = useMemo(
    () => (activeRun ? getActiveVersion(activeRun) : null),
    [activeRun],
  );
  const activeRunStatus = useMemo(
    () => (activeRun ? getRunStatus(activeRun) : null),
    [activeRun],
  );

  const value: AppContextValue = {
    state,
    dispatch,
    hydrated,
    activeRun,
    activeVersion,
    activeRunStatus,
    storageWarning,
    clearStorageWarning: () => setStorageWarning(null),
    health,
    healthLoading,
    refreshHealth,
    toasts,
    toast,
    dismissToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} dismiss={dismissToast} />
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("useApp must be used inside AppStoreProvider");
  }
  return value;
}

function ToastHost({
  toasts,
  dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`toast toast-${item.tone}`}
          role="status"
        >
          <span>{item.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(item.id)}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
