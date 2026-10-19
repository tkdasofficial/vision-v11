import { describe, expect, it } from "vitest";
import { wantsStoryFile } from "@/lib/ai/story-output";
import { routeRequest } from "@/lib/ai/request-route";
import { detectContentIntent } from "@/lib/ai/content-intent";

describe("story delivery rules", () => {
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