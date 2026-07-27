import catalog from "../workflows/manifests/catalog.json";

export type SavedWorkflow = {
  id: string;
  label: string;
  description: string;
  graph: Record<string, unknown>;
  published: boolean;
  updatedAt: string;
};

type Runtime = typeof globalThis & { __bosonfieldSavedWorkflows?: Map<string, SavedWorkflow> };
const runtime = globalThis as Runtime;
export const savedWorkflows = runtime.__bosonfieldSavedWorkflows ?? (runtime.__bosonfieldSavedWorkflows = new Map());

export function workflowRecord(id: string) {
  const saved = savedWorkflows.get(id);
  if (saved) {
    const inputs = new Set<string>();
    // Traverse strings without relying on a graph-specific schema.
    const scan = (value: unknown): void => {
      if (typeof value === "string") {
        const match = /^\$\{([A-Za-z][A-Za-z0-9_]*)\}$/.exec(value);
        if (match) inputs.add(match[1]);
      } else if (Array.isArray(value)) value.forEach(scan);
      else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(scan);
    };
    scan(saved.graph);
    return { id: saved.id, version: 1, capability: "custom.graph", label: saved.label, status: saved.published ? "published" : "saved", inputs: [...inputs], graph: saved.graph };
  }
  return catalog.find((entry) => entry.id === id);
}
