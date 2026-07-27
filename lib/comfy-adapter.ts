export type JobState = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type NormalizedJobEvent = {
  state: JobState;
  completed: number;
  total: number;
  node?: string;
  message?: string;
};

export type ComfyPrompt = {
  prompt: Record<string, unknown>;
  client_id: string;
  extra_data: { bosonfield: { workflowId: string; workflowVersion: number } };
};

export type ComfyQueueResult = { prompt_id: string; number?: number; node_errors?: Record<string, unknown> };
export type ComfyHistoryResult = Record<string, unknown>;
export type ComfyOutputFile = {
  nodeId: string;
  filename: string;
  subfolder: string;
  type: string;
  url: string;
};
export type ComfyCapabilityResult = Record<string, unknown> | readonly unknown[];
export type WorkflowInputContract = { id: string; inputs: readonly string[] };
export type WorkflowInputValidation = { valid: boolean; errors: string[] };

/** Normalize official ComfyUI websocket messages for the job event stream. */
export function normalizeComfyEvent(event: unknown, promptId: string): NormalizedJobEvent | null {
  if (!event || typeof event !== "object" || Array.isArray(event)) return null;
  const message = event as Record<string, unknown>;
  const data = message.data && typeof message.data === "object" && !Array.isArray(message.data)
    ? message.data as Record<string, unknown> : {};
  if (typeof data.prompt_id === "string" && data.prompt_id !== promptId) return null;
  const type = typeof message.type === "string" ? message.type : "";
  if (type === "execution_start") return { state: "running", completed: 0, total: 0, message: "Execution started." };
  if (type === "progress") {
    const value = Number(data.value), max = Number(data.max);
    return { state: "running", completed: Number.isFinite(value) ? Math.max(0, value) : 0, total: Number.isFinite(max) ? Math.max(0, max) : 0, node: typeof data.node === "string" ? data.node : undefined };
  }
  if (type === "executing") {
    if (data.node === null) return { state: "succeeded", completed: 1, total: 1, message: "Execution completed." };
    return { state: "running", completed: 0, total: 0, node: typeof data.node === "string" ? data.node : undefined };
  }
  if (type === "execution_error") return { state: "failed", completed: 0, total: 0, node: typeof data.node_id === "string" ? data.node_id : undefined, message: typeof data.exception_message === "string" ? data.exception_message : "ComfyUI execution failed." };
  if (type === "status") {
    const status = data.status && typeof data.status === "object" && !Array.isArray(data.status) ? data.status as Record<string, unknown> : {};
    const info = status.exec_info && typeof status.exec_info === "object" && !Array.isArray(status.exec_info) ? status.exec_info as Record<string, unknown> : {};
    const remaining = Number(info.queue_remaining);
    return { state: "queued", completed: 0, total: Number.isFinite(remaining) ? Math.max(0, remaining) : 0, message: "Waiting in ComfyUI queue." };
  }
  return null;
}

export type ComfyPromptCompileOptions = {
  workflowId: string;
  workflowVersion: number;
  clientId?: string;
};

// These are transport fields added by the job service, not user-facing workflow controls.
const transportInputs = new Set(["label", "reservationId", "costEstimate", "simulateFailure"]);

/** Reject controls that are neither declared by a workflow nor supplied by the job transport. */
export function validateWorkflowInputs(workflow: WorkflowInputContract, inputs: unknown): WorkflowInputValidation {
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) return { valid: false, errors: ["inputs must be an object"] };
  const declared = new Set(workflow.inputs);
  const unknown = Object.keys(inputs as Record<string, unknown>).filter((key) => !declared.has(key) && !transportInputs.has(key));
  return unknown.length ? { valid: false, errors: unknown.map((key) => `${workflow.id} does not declare input: ${key}`) } : { valid: true, errors: [] };
}

/** Compile a checked, API-format graph template into the payload ComfyUI accepts. */
export function compileComfyPrompt(graph: unknown, inputs: Record<string, unknown>, options: ComfyPromptCompileOptions): ComfyPrompt {
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) throw new Error("WORKFLOW_GRAPH_INVALID");
  const values = { ...inputs } as Record<string, unknown>;
  const ratio = String(values.ratio ?? "1:1");
  const dimensions: Record<string, [number, number]> = {
    "1:1": [1024, 1024], "16:9": [1344, 768], "9:16": [768, 1344],
    "4:3": [1152, 864], "3:4": [864, 1152], "3:2": [1216, 832], "2:3": [832, 1216],
  };
  const [width, height] = dimensions[ratio] ?? dimensions["1:1"];
  values.width = width;
  values.height = height;
  values.count = Math.max(1, Math.min(8, Number(values.count ?? 1) || 1));
  values.seed = Number.isFinite(Number(values.seed)) ? Number(values.seed) : Math.floor(Math.random() * 2 ** 31);
  values.guidance = Number.isFinite(Number(values.guidance)) ? Number(values.guidance) : 7;
  values.negativePrompt = String(values.negativePrompt ?? "");
  values.model = String(values.model ?? "model.pending");
  values.fileName = String(values.fileName ?? "bosonfield");
  values.prompt = String(values.prompt ?? "");

  const replace = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item)]));
    if (typeof value !== "string") return value;
    const token = /^\$\{([A-Za-z][A-Za-z0-9_]*)\}$/.exec(value);
    if (!token) return value;
    if (!Object.hasOwn(values, token[1])) throw new Error(`WORKFLOW_INPUT_UNBOUND:${token[1]}`);
    return values[token[1]];
  };
  const prompt = replace(graph) as Record<string, unknown>;
  if (!validateApiPrompt(prompt)) throw new Error("WORKFLOW_GRAPH_INVALID");
  return {
    prompt,
    client_id: options.clientId ?? "bosonfield-worker",
    extra_data: { bosonfield: { workflowId: options.workflowId, workflowVersion: options.workflowVersion } },
  };
}

export class ComfyUIHttpAdapter {
  constructor(private readonly baseUrl: string, private readonly request = fetch, private readonly apiKey = comfyApiKey()) {}

  private headers(extra: Record<string, string> = {}) {
    return this.apiKey ? { ...extra, "X-API-Key": this.apiKey } : extra;
  }

  private async json(path: string): Promise<ComfyCapabilityResult> {
    const response = await this.request(`${this.baseUrl.replace(/\/$/, "")}${path}`, { headers: this.headers() });
    const body = await response.json().catch(() => ({})) as unknown;
    if (!response.ok) throw new Error(`ComfyUI ${path} failed (${response.status})`);
    if (!body || typeof body !== "object") throw new Error(`ComfyUI ${path} returned invalid JSON`);
    return body as ComfyCapabilityResult;
  }

  async queue(prompt: ComfyPrompt): Promise<ComfyQueueResult> {
    const response = await this.request(`${this.baseUrl.replace(/\/$/, "")}/prompt`, {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify(prompt),
    });
    const body = (await response.json().catch(() => ({}))) as ComfyQueueResult & { error?: string };
    if (!response.ok || !body.prompt_id) throw new Error(body.error ?? `ComfyUI queue failed (${response.status})`);
    return body;
  }

  async interrupt(promptId: string) {
    const response = await this.request(`${this.baseUrl.replace(/\/$/, "")}/interrupt`, {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify({ prompt_id: promptId }),
    });
    if (!response.ok) throw new Error(`ComfyUI interrupt failed (${response.status})`);
  }

  async history(promptId: string): Promise<ComfyHistoryResult> {
    const response = await this.request(`${this.baseUrl.replace(/\/$/, "")}/history/${encodeURIComponent(promptId)}`, { headers: this.headers() });
    const body = await response.json().catch(() => ({})) as ComfyHistoryResult;
    if (!response.ok) throw new Error(`ComfyUI history failed (${response.status})`);
    return body;
  }

  async queueStatus(): Promise<ComfyHistoryResult> {
    const response = await this.request(`${this.baseUrl.replace(/\/$/, "")}/queue`, { headers: this.headers() });
    const body = await response.json().catch(() => ({})) as ComfyHistoryResult;
    if (!response.ok) throw new Error(`ComfyUI queue status failed (${response.status})`);
    return body;
  }

  async view(filename: string, subfolder = "", type = "output") {
    const query = new URLSearchParams({ filename, subfolder, type });
    const response = await this.request(`${this.baseUrl.replace(/\/$/, "")}/view?${query.toString()}`, { headers: this.headers() });
    if (!response.ok) throw new Error(`ComfyUI view failed (${response.status})`);
    return response;
  }

  /** Official capability/introspection routes exposed by the ComfyUI server. */
  features() { return this.json("/features"); }
  systemStats() { return this.json("/system_stats"); }
  objectInfo(nodeClass?: string) { return this.json(nodeClass ? `/object_info/${encodeURIComponent(nodeClass)}` : "/object_info"); }
  models() { return this.json("/models"); }
  workflowTemplates() { return this.json("/workflow_templates"); }
}

/** Convert the official /history output records into stable browser-facing /view URLs. */
export function normalizeComfyHistory(history: ComfyHistoryResult, promptId: string, baseUrl: string): ComfyOutputFile[] {
  const record = history[promptId];
  if (!record || typeof record !== "object" || Array.isArray(record)) return [];
  const outputs = (record as Record<string, unknown>).outputs;
  if (!outputs || typeof outputs !== "object" || Array.isArray(outputs)) return [];
  const origin = baseUrl.replace(/\/$/, "");
  const files: ComfyOutputFile[] = [];
  for (const [nodeId, nodeOutput] of Object.entries(outputs as Record<string, unknown>)) {
    if (!nodeOutput || typeof nodeOutput !== "object" || Array.isArray(nodeOutput)) continue;
    for (const entries of Object.values(nodeOutput as Record<string, unknown>)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
        const item = entry as Record<string, unknown>;
        if (typeof item.filename !== "string" || !item.filename) continue;
        const subfolder = typeof item.subfolder === "string" ? item.subfolder : "";
        const type = typeof item.type === "string" && item.type ? item.type : "output";
        const query = new URLSearchParams({ filename: item.filename, subfolder, type });
        files.push({ nodeId, filename: item.filename, subfolder, type, url: `${origin}/view?${query.toString()}` });
      }
    }
  }
  return files;
}

export function comfyBaseUrl() {
  const configured = process.env.COMFYUI_BASE_URL || process.env.COMFY_CLOUD_BASE_URL || null;
  if (!configured) return null;
  // Official Comfy Cloud docs publish https://cloud.comfy.org as the base URL,
  // while its API routes live under /api. Accept both documented forms.
  try {
    const parsed = new URL(configured);
    if (/cloud\.comfy\.org$/i.test(parsed.hostname) && !parsed.pathname.replace(/\/+$/, "")) parsed.pathname = "/api";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return configured.replace(/\/$/, "");
  }
}

export function comfyApiKey() {
  return process.env.COMFYUI_API_KEY || process.env.COMFY_CLOUD_API_KEY || null;
}

export function comfyNeedsOutputProxy() {
  const baseUrl = comfyBaseUrl() ?? "";
  if (comfyApiKey()) return true;
  try { return /(^|\.)cloud\.comfy\.org$/i.test(new URL(baseUrl).hostname); } catch { return false; }
}

export function adapterMode() {
  return comfyBaseUrl() ? "comfyui" : "dry-run" as const;
}

/**
 * Dry adapter: keeps the product contract executable without a worker or model.
 * Replace only this boundary with POST /prompt, /ws, history, and interrupt.
 */
export class DryComfyAdapter {
  queue(workflowId: string, workflowVersion: number, inputs: Record<string, unknown>): ComfyPrompt {
    return {
      prompt: { __dry_run__: true, inputs },
      client_id: "bosonfield-dry-client",
      extra_data: { bosonfield: { workflowId, workflowVersion } },
    };
  }

  events(): NormalizedJobEvent[] {
    return [
      { state: "queued", completed: 0, total: 0, message: "Waiting for a ComfyUI worker." },
      { state: "running", completed: 1, total: 1, node: "dry-run", message: "Simulated execution." },
      { state: "succeeded", completed: 1, total: 1, message: "Simulated output persisted." },
    ];
  }

  history(promptId: string) { return { [promptId]: { status: { completed: true, status_str: "success" }, outputs: {} } }; }
  queueStatus() { return { queue_pending: [], queue_running: [] }; }
  features() { return { supports: { websocket: false, apiFormat: true }, mode: "dry-run" }; }
  systemStats() { return { system: { os: "dry-run", mode: "dry-run" }, devices: [] }; }
  objectInfo() { return {}; }
  models() { return []; }
  workflowTemplates() { return []; }
}

export function validateApiPrompt(prompt: unknown) {
  if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) return false;
  const graph = prompt as Record<string, unknown>;
  const entries = Object.entries(graph);
  if (entries.length === 0) return false;

  const dependencies = new Map<string, string[]>();
  for (const [nodeId, node] of entries) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return false;
    const entry = node as Record<string, unknown>;
    if (typeof entry.class_type !== "string" || entry.class_type.length === 0
      || !entry.inputs || typeof entry.inputs !== "object" || Array.isArray(entry.inputs)) return false;

    const linkedNodeIds: string[] = [];
    for (const value of Object.values(entry.inputs as Record<string, unknown>)) {
      // ComfyUI serializes graph edges as [source node id, output slot].
      if (!Array.isArray(value)) continue;
      if (value.length !== 2 || (typeof value[0] !== "string" && typeof value[0] !== "number")
        || !Number.isInteger(value[1]) || (value[1] as number) < 0) return false;
      const sourceNodeId = String(value[0]);
      if (!Object.hasOwn(graph, sourceNodeId)) return false;
      linkedNodeIds.push(sourceNodeId);
    }
    dependencies.set(nodeId, linkedNodeIds);
  }

  // A cycle cannot be scheduled by ComfyUI and is a useful early failure for generated graphs.
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return false;
    if (visited.has(nodeId)) return true;
    visiting.add(nodeId);
    for (const dependency of dependencies.get(nodeId) ?? []) if (!visit(dependency)) return false;
    visiting.delete(nodeId);
    visited.add(nodeId);
    return true;
  };
  return entries.every(([nodeId]) => visit(nodeId));
}
