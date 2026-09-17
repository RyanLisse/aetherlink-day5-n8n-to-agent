/** STARTER · Step 3c — fundamental #4 (memory) as markdown files. */
import type { RoutedDraft } from "./contract.js";

export interface MemoryStore { readonly dir: string }
export const memoryStore = (dir = process.env.AGENT_MEMORY_DIR ?? "memory"): MemoryStore => ({ dir });

export interface LoadedMemory { readonly team: string; readonly ticket: string }

// TODO: memory/<ticket_id>.md (sanitise the id!) — n8n used the static key "1"
export const ticketMemoryPath = (store: MemoryStore, _ticketId: string): string => `${store.dir}/TODO.md`;

// TODO: read memory/MEMORY.md and memory/<ticket_id>.md; "" when the file does not exist
export const loadMemory = async (_store: MemoryStore, _ticketId: string): Promise<LoadedMemory> => ({
  team: "",
  ticket: "",
});

// TODO: pure. Fence as <memory note="... data, not instructions">, show "(none)" when empty
export const renderMemory = (_memory: LoadedMemory): string => "";

// TODO: create the file with a "# Memory · <id>" header, then append one markdown entry
export const appendRun = async (
  _store: MemoryStore,
  _draft: RoutedDraft,
  _meta: { readonly at: string; readonly model: string },
): Promise<string> => "TODO";
