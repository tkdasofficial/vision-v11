import { describe, it, expect } from "vitest";
import { WORKFLOWS, pickWorkflow } from "@/lib/runtime/workflows";

describe("runtime workflow routing", () => {
  it("has exactly 28 one-word workflows and 18 workers", () => {
    expect(Object.keys(WORKFLOWS)).toHaveLength(28);
    for (const k of Object.keys(WORKFLOWS)) expect(k).toMatch(/^[a-z]+$/);
    expect(new Set(Object.values(WORKFLOWS).map((w) => w.worker)).size).toBe(18);
  });
  it("routes story jobs to story.yml", () => expect(pickWorkflow("story_generate", undefined)).toBe("story"));
  it("routes office conversions by source family", () => {
    expect(pickWorkflow("office_convert", "docx")).toBe("documents");
    expect(pickWorkflow("office_convert", "xlsx")).toBe("spreadsheets");
    expect(pickWorkflow("office_convert", "pptx")).toBe("presentations");
  });
  it("routes renders by diagram language", () => {
    expect(pickWorkflow("render", "tex")).toBe("tex");
    expect(pickWorkflow("render", "mmd")).toBe("mermaid");
    expect(pickWorkflow("render", "dot")).toBe("graphviz");
    expect(pickWorkflow("render", "puml")).toBe("plantuml");
    expect(pickWorkflow("render", "dxf")).toBe("cad");
    expect(pickWorkflow("render", "svg")).toBe("vector");
  });
  it("routes data by source", () => {
    expect(pickWorkflow("data_convert", "sqlite")).toBe("sqlite");
    expect(pickWorkflow("data_convert", "shp")).toBe("maps");
    expect(pickWorkflow("data_convert", "csv")).toBe("data");
    expect(pickWorkflow("archive_convert", "cbz")).toBe("comics");
  });
  it("routes checksums by file name, falling back to terminal", () => {
    expect(pickWorkflow("checksum", "", "subs.srt")).toBe("subtitles");
    expect(pickWorkflow("checksum", "", "a.ics")).toBe("calendars");
    expect(pickWorkflow("checksum", "", "blob.xyz")).toBe("terminal");
  });
  it("refuses an op no workflow handles for that source", () => expect(pickWorkflow("render", "docx")).toBeNull());
});
