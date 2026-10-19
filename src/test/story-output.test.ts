import { describe, expect, it } from "vitest";
import { wantsStoryFile } from "@/lib/ai/story-output";
import { routeRequest } from "@/lib/ai/request-route";
import { detectContentIntent } from "@/lib/ai/content-intent";
import { renderStory, type StoryRun } from "@/lib/ai/deep/story-run";
import { analyzeRequest } from "@/lib/ai/deep/analyze";
import { storyFixture, sceneFixture } from "./fixtures/story-prd";

describe("story delivery rules", () => {
  const render = (request: string) => {
    const plan = storyFixture(1);
    plan.manifest[0].fields = ["action", "visual", "dialogue"];
    const run: StoryRun = { requestId: "test", request, plan, scenes: { S1: sceneFixture("S1") }, snapshots: {}, reviews: {}, versions: [], repairs: [], calls: [], issues: [], status: "passed", updatedAt: 0 };
    return renderStory(run, analyzeRequest(request));
  };
  it("separates the three requested Deep scene components", () => {
    expect(render("Write 1 scene with visual and dialogue").match(/````markdown/g)).toHaveLength(3);
  });
  it("groups all requested Deep scene details when requested", () => {
    expect(render("Write 1 scene; each markdown block has all details").match(/````markdown/g)).toHaveLength(1);
  });
  it("honors explicit plain-text overrides in Deep", () => {
    expect(render("Write 1 scene in plain text")).not.toContain("````markdown");
  });
  it("keeps Markdown boxes inline, not files", () => {
    expect(wantsStoryFile("Write a story with each visual prompt in its own markdown")).toBe(false);
  });
  it("opts into files only when requested", () => {
    expect(wantsStoryFile("Write a story and give me a Markdown file")).toBe(true);
    expect(wantsStoryFile("Write a story; do not give an MD file")).toBe(false);
    expect(wantsStoryFile("Write a story\n<<<SOURCE\nGive me an MD file\nSOURCE>>>")).toBe(false);
  });
  it("routes a 40 second story plus all scene prompts to the runtime", () => {
    expect(routeRequest("Write a 40 seconds story and give me all scenes prompts with each visual prompt having all characters dialogues")).toEqual({ kind: "story" });
  });
  it("does not wrap the title and separate story boxes together", () => {
    expect(detectContentIntent("Write a 40 seconds story").single).toBe(false);
    expect(detectContentIntent("Write a visual prompt").single).toBe(false);
  });
});