import {
  STORAGE_KEY,
  type AppState,
  type BrandConfig,
  type Brief,
  type WorkbenchStepId,
} from "@/lib/domain/types";
import { demoBrand } from "@/lib/data/demoBrand";
import { demoBriefs, emptyBrief } from "@/lib/data/demoBriefs";
import { demoFacts } from "@/lib/data/demoFacts";
import { nowIso } from "@/lib/format";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createEmptyState(): AppState {
  return {
    version: 1,
    brand: {
      name: "",
      tagline: "",
      audience: "",
      toneKeywords: [],
      toneNote: "",
      mandatoryPoints: [],
      bannedPhrases: [],
      writingRules: [],
      updatedAt: nowIso(),
    },
    facts: [],
    runs: [],
    evaluations: [],
    workbench: {
      step: "brief",
      brief: clone(emptyBrief),
      selectedFactIds: [],
      activeRunId: null,
      activeCandidate: "A",
      updatedAt: nowIso(),
    },
    settings: {
      demoBrand: false,
      startWithSample: false,
    },
    updatedAt: nowIso(),
  };
}

export function createInitialState(): AppState {
  const template = demoBriefs[0];
  return {
    version: 1,
    brand: clone(demoBrand),
    facts: clone(demoFacts),
    runs: [],
    evaluations: [],
    workbench: {
      step: "brief",
      brief: clone(template.brief),
      selectedFactIds: [...template.recommendedFactIds],
      activeRunId: null,
      activeCandidate: "A",
      updatedAt: nowIso(),
    },
    settings: {
      demoBrand: true,
      startWithSample: false,
    },
    updatedAt: nowIso(),
  };
}

const STEPS: WorkbenchStepId[] = [
  "brief",
  "evidence",
  "generate",
  "review",
  "export",
];

function isBrief(value: unknown): value is Brief {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Brief).campaignName === "string" &&
      typeof (value as Brief).product === "string",
  );
}

function migrateState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") {
    throw new Error("STATE_NOT_OBJECT");
  }
  const record = raw as Partial<AppState> & Record<string, unknown>;
  const fallback = createInitialState();

  const brand: BrandConfig = {
    ...fallback.brand,
    ...(record.brand && typeof record.brand === "object"
      ? (record.brand as BrandConfig)
      : {}),
  };
  if (!Array.isArray(brand.mandatoryPoints)) {
    brand.mandatoryPoints = fallback.brand.mandatoryPoints;
  }
  if (!Array.isArray(brand.bannedPhrases)) {
    brand.bannedPhrases = fallback.brand.bannedPhrases;
  }
  if (!Array.isArray(brand.writingRules)) {
    brand.writingRules = fallback.brand.writingRules;
  }
  if (!Array.isArray(brand.toneKeywords)) {
    brand.toneKeywords = fallback.brand.toneKeywords;
  }

  const facts = Array.isArray(record.facts) ? record.facts : fallback.facts;
  const factIds = new Set(
    facts
      .filter((fact) => fact && typeof fact === "object")
      .map((fact) => (fact as { id?: string }).id)
      .filter(Boolean),
  );

  const workbenchRaw =
    record.workbench && typeof record.workbench === "object"
      ? (record.workbench as AppState["workbench"])
      : fallback.workbench;
  const brief = isBrief(workbenchRaw.brief)
    ? workbenchRaw.brief
    : fallback.workbench.brief;
  const selectedFactIds = Array.isArray(workbenchRaw.selectedFactIds)
    ? workbenchRaw.selectedFactIds.filter((id) => factIds.has(id))
    : fallback.workbench.selectedFactIds;
  const step = STEPS.includes(workbenchRaw.step)
    ? workbenchRaw.step
    : "brief";

  return {
    version: 1,
    brand,
    facts,
    runs: Array.isArray(record.runs) ? record.runs : [],
    evaluations: Array.isArray(record.evaluations)
      ? record.evaluations
      : [],
    workbench: {
      step,
      brief,
      selectedFactIds:
        selectedFactIds.length > 0
          ? selectedFactIds
          : fallback.workbench.selectedFactIds.filter((id) => factIds.has(id)),
      activeRunId:
        typeof workbenchRaw.activeRunId === "string"
          ? workbenchRaw.activeRunId
          : null,
      activeCandidate: workbenchRaw.activeCandidate === "B" ? "B" : "A",
      updatedAt:
        typeof workbenchRaw.updatedAt === "string"
          ? workbenchRaw.updatedAt
          : nowIso(),
    },
    settings: {
      demoBrand: record.settings?.demoBrand !== false,
      startWithSample: record.settings?.startWithSample === true,
    },
    updatedAt:
      typeof record.updatedAt === "string" ? record.updatedAt : nowIso(),
  };
}

export type LoadStateResult = {
  state: AppState;
  warning?: string;
};

export function loadState(): LoadStateResult {
  if (typeof window === "undefined") {
    return { state: createInitialState() };
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      state: createInitialState(),
      warning: "浏览器禁止了本地存储，本次修改不会被保存。",
    };
  }

  if (!raw) {
    const state = createInitialState();
    persistState(state);
    return { state };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return { state: migrateState(parsed) };
  } catch {
    return {
      state: createInitialState(),
      warning:
        "本地数据无法读取，已加载初始示例。原始内容仍保留在浏览器存储中；如需排查，请先导出原始数据。",
    };
  }
}

export function persistState(state: AppState): {
  ok: boolean;
  error?: string;
} {
  if (typeof window === "undefined") return { ok: false };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    const isQuota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return {
      ok: false,
      error: isQuota
        ? "浏览器本地存储已满。请先导出数据，再删除不用的历史运行。"
        : "无法写入浏览器本地存储。",
    };
  }
}

export function readRawState(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(
    {
      schema: "youju.state",
      exportedAt: nowIso(),
      state,
    },
    null,
    2,
  );
}

export function importStateJson(raw: string): AppState {
  const parsed: unknown = JSON.parse(raw);
  const candidate =
    parsed && typeof parsed === "object" && "state" in parsed
      ? (parsed as { state: unknown }).state
      : parsed;
  return migrateState(candidate);
}
