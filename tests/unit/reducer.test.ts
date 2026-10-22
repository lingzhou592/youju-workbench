import { describe, expect, it } from "vitest";
import { createSampleRun } from "@/lib/data/sampleRun";
import { createInitialState } from "@/state/persistence";
import { appReducer } from "@/state/appReducer";

describe("appReducer", () => {
  it("adds a run and focuses it in the workbench", () => {
    const initial = createInitialState();
    const run = createSampleRun();
    const next = appReducer(initial, { type: "ADD_RUN", run });
    expect(next.runs).toHaveLength(1);
    expect(next.workbench.activeRunId).toBe(run.id);
  });

  it("deletes a fact from the draft but keeps the run snapshot", () => {
    const initial = createInitialState();
    const run = createSampleRun();
    const withRun = appReducer(initial, { type: "ADD_RUN", run });
    expect(withRun.workbench.selectedFactIds).toContain("F-101");
    const deleted = appReducer(withRun, {
      type: "DELETE_FACT",
      id: "F-101",
    });
    expect(deleted.facts.some((fact) => fact.id === "F-101")).toBe(false);
    expect(deleted.workbench.selectedFactIds).not.toContain("F-101");
    expect(
      deleted.runs[0].input.facts.some((fact) => fact.id === "F-101"),
    ).toBe(true);
  });

  it("clears history but keeps brand and facts", () => {
    const initial = createInitialState();
    const withRun = appReducer(initial, {
      type: "ADD_RUN",
      run: createSampleRun(),
    });
    const cleared = appReducer(withRun, { type: "CLEAR_HISTORY" });
    expect(cleared.runs).toHaveLength(0);
    expect(cleared.facts).toHaveLength(withRun.facts.length);
    expect(cleared.brand.name).toBe(withRun.brand.name);
  });

  it("can clear all data for a blank workspace", () => {
    const initial = createInitialState();
    const empty = appReducer(initial, { type: "CLEAR_ALL_DATA" });
    expect(empty.brand.name).toBe("");
    expect(empty.facts).toHaveLength(0);
    expect(empty.runs).toHaveLength(0);
  });

  it("moves between workbench steps", () => {
    const initial = createInitialState();
    const next = appReducer(initial, {
      type: "SET_STEP",
      step: "evidence",
    });
    expect(next.workbench.step).toBe("evidence");
  });
});
