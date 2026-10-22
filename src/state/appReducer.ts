import type {
  AppState,
  BrandConfig,
  Brief,
  EvaluationRecord,
  FactCard,
  FactStatus,
  Run,
  WorkbenchStepId,
} from "@/lib/domain/types";
import { demoBrand } from "@/lib/data/demoBrand";
import { demoBriefs } from "@/lib/data/demoBriefs";
import { nowIso } from "@/lib/format";
import { createEmptyState, createInitialState } from "./persistence";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortFacts(facts: FactCard[]): FactCard[] {
  return [...facts].sort((a, b) => a.id.localeCompare(b.id));
}

function touch(state: AppState, patch: Partial<AppState>): AppState {
  return { ...state, ...patch, updatedAt: nowIso() };
}

export type AppAction =
  | { type: "REPLACE_STATE"; state: AppState }
  | { type: "UPDATE_BRAND"; brand: BrandConfig }
  | { type: "RESET_BRAND" }
  | { type: "ADD_FACT"; fact: FactCard }
  | { type: "UPDATE_FACT"; fact: FactCard }
  | { type: "DELETE_FACT"; id: string }
  | { type: "SET_FACT_STATUS"; id: string; status: FactStatus }
  | { type: "IMPORT_FACTS"; facts: FactCard[] }
  | { type: "REPLACE_FACTS"; facts: FactCard[] }
  | { type: "ADD_RUN"; run: Run }
  | { type: "UPDATE_RUN"; run: Run }
  | { type: "DELETE_RUN"; id: string }
  | { type: "SET_STEP"; step: WorkbenchStepId }
  | { type: "SET_BRIEF"; brief: Brief }
  | { type: "SET_SELECTED_FACTS"; ids: string[] }
  | { type: "SET_ACTIVE_RUN"; id: string | null }
  | { type: "SET_ACTIVE_CANDIDATE"; candidate: "A" | "B" }
  | { type: "RESET_WORKBENCH" }
  | { type: "ADD_EVALUATION"; evaluation: EvaluationRecord }
  | { type: "UPDATE_EVALUATION"; evaluation: EvaluationRecord }
  | { type: "DELETE_EVALUATION"; id: string }
  | { type: "CLEAR_HISTORY" }
  | { type: "RESET_ALL" }
  | { type: "CLEAR_ALL_DATA" };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "REPLACE_STATE":
      return action.state;

    case "UPDATE_BRAND":
      return touch(state, { brand: { ...action.brand, updatedAt: nowIso() } });

    case "RESET_BRAND":
      return touch(state, { brand: clone(demoBrand) });

    case "ADD_FACT": {
      const exists = state.facts.some((fact) => fact.id === action.fact.id);
      const facts = exists
        ? state.facts.map((fact) =>
            fact.id === action.fact.id ? action.fact : fact,
          )
        : [...state.facts, action.fact];
      return touch(state, { facts: sortFacts(facts) });
    }

    case "UPDATE_FACT":
      return touch(state, {
        facts: sortFacts(
          state.facts.map((fact) =>
            fact.id === action.fact.id ? action.fact : fact,
          ),
        ),
      });

    case "DELETE_FACT":
      return touch(state, {
        facts: state.facts.filter((fact) => fact.id !== action.id),
        workbench: {
          ...state.workbench,
          selectedFactIds: state.workbench.selectedFactIds.filter(
            (id) => id !== action.id,
          ),
          updatedAt: nowIso(),
        },
      });

    case "SET_FACT_STATUS":
      return touch(state, {
        facts: state.facts.map((fact) =>
          fact.id === action.id
            ? { ...fact, status: action.status, updatedAt: nowIso() }
            : fact,
        ),
      });

    case "IMPORT_FACTS": {
      const map = new Map(state.facts.map((fact) => [fact.id, fact]));
      for (const fact of action.facts) map.set(fact.id, fact);
      return touch(state, { facts: sortFacts([...map.values()]) });
    }

    case "REPLACE_FACTS":
      return touch(state, { facts: sortFacts(action.facts) });

    case "ADD_RUN":
      return touch(state, {
        runs: [action.run, ...state.runs.filter((run) => run.id !== action.run.id)],
        workbench: {
          ...state.workbench,
          activeRunId: action.run.id,
          activeCandidate:
            action.run.versions.find(
              (version) => version.id === action.run.activeVersionId,
            )?.candidate ?? "A",
          updatedAt: nowIso(),
        },
      });

    case "UPDATE_RUN":
      return touch(state, {
        runs: state.runs.map((run) =>
          run.id === action.run.id ? action.run : run,
        ),
      });

    case "DELETE_RUN": {
      const wasActive = state.workbench.activeRunId === action.id;
      return touch(state, {
        runs: state.runs.filter((run) => run.id !== action.id),
        workbench: {
          ...state.workbench,
          activeRunId: wasActive ? null : state.workbench.activeRunId,
          step:
            wasActive &&
            (state.workbench.step === "review" ||
              state.workbench.step === "export")
              ? "brief"
              : state.workbench.step,
          updatedAt: nowIso(),
        },
      });
    }

    case "SET_STEP":
      return touch(state, {
        workbench: {
          ...state.workbench,
          step: action.step,
          updatedAt: nowIso(),
        },
      });

    case "SET_BRIEF":
      return touch(state, {
        workbench: {
          ...state.workbench,
          brief: action.brief,
          updatedAt: nowIso(),
        },
      });

    case "SET_SELECTED_FACTS":
      return touch(state, {
        workbench: {
          ...state.workbench,
          selectedFactIds: [...new Set(action.ids)],
          updatedAt: nowIso(),
        },
      });

    case "SET_ACTIVE_RUN": {
      const run = state.runs.find((item) => item.id === action.id);
      const activeVersion = run?.versions.find(
        (version) => version.id === run.activeVersionId,
      );
      return touch(state, {
        workbench: {
          ...state.workbench,
          activeRunId: action.id,
          activeCandidate: activeVersion?.candidate ?? "A",
          updatedAt: nowIso(),
        },
      });
    }

    case "SET_ACTIVE_CANDIDATE":
      return touch(state, {
        workbench: {
          ...state.workbench,
          activeCandidate: action.candidate,
          updatedAt: nowIso(),
        },
      });

    case "RESET_WORKBENCH": {
      const template = demoBriefs[0];
      return touch(state, {
        workbench: {
          step: "brief",
          brief: clone(template.brief),
          selectedFactIds: [...template.recommendedFactIds],
          activeRunId: null,
          activeCandidate: "A",
          updatedAt: nowIso(),
        },
      });
    }

    case "ADD_EVALUATION":
      return touch(state, {
        evaluations: [
          action.evaluation,
          ...state.evaluations.filter(
            (item) => item.id !== action.evaluation.id,
          ),
        ],
      });

    case "UPDATE_EVALUATION":
      return touch(state, {
        evaluations: state.evaluations.map((item) =>
          item.id === action.evaluation.id ? action.evaluation : item,
        ),
      });

    case "DELETE_EVALUATION":
      return touch(state, {
        evaluations: state.evaluations.filter(
          (item) => item.id !== action.id,
        ),
      });

    case "CLEAR_HISTORY":
      return touch(state, {
        runs: [],
        evaluations: [],
        workbench: {
          ...state.workbench,
          activeRunId: null,
          step: "brief",
          updatedAt: nowIso(),
        },
      });

    case "RESET_ALL":
      return createInitialState();

    case "CLEAR_ALL_DATA":
      return createEmptyState();

    default:
      return state;
  }
}
