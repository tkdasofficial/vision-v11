import { extractSource } from "./references";

/** Only request instructions can opt into a downloadable story. */
export function wantsStoryFile(prompt: string): boolean {
  const request = (extractSource(prompt)?.request ?? prompt).split("<<<SOURCE")[0];
  const directives = request.split(/[.!?;\n]|\bbut\b/i).filter((clause) => /\b(?:file|download|attachment|export|save\s+as)\b/i.test(clause));
  const last = directives.at(-1);
  return !!last && !/\b(?:don['’]?t|do\s+not|never|without|no)\b/i.test(last);
}