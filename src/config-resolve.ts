import type { ProseyConfig } from "./config";

export function resolveSummarizeCmd(config: ProseyConfig): string | null {
  return config.summarize?.command ?? config.ai?.command ?? null;
}

export function resolveSummarizePrompt(config: ProseyConfig): string | null {
  return config.summarize?.prompt ?? null;
}

export function resolveTranscribeCmd(config: ProseyConfig): string | null {
  return config.transcribe?.command ?? config.ai?.command ?? config.summarize?.command ?? null;
}

export function resolveTranscribePrompt(config: ProseyConfig): string | null {
  return config.transcribe?.prompt ?? config.summarize?.prompt ?? null;
}
