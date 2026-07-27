"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import manifestCatalog from "../workflows/manifests/catalog.json";
import { viralPresetCatalog } from "../lib/presets";
import { usecaseAppsCatalog } from "../lib/apps";

type Studio =
  | "Explore"
  | "Image"
  | "Video"
  | "Audio"
  | "UGC"
  | "Influencer"
  | "AI Influencer"
  | "Clipping"
  | "Vibe Motion"
  | "Recast"
  | "Cinema"
  | "MCP & CLI"
  | "Agent Studio"
  | "Design Agent"
  | "Academy"
  | "Supercomputer"
  | "Community"
  | "Plugins"
  | "Marketing"
  | "Canvas"
  | "Originals"
  | "Shorts"
  | "Explainer"
  | "Apps"
  | "Workflows"
  | "Presets"
  | "Projects"
  | "Library"
  | "Account"
  | "Team"
  | "Billing";

type JobState = "queued" | "running" | "complete" | "failed" | "cancelled";
type JobEvent = { state: string; completed?: number; total?: number; message?: string; node?: string };
type JobOutput = { filename: string; url: string; nodeId?: string; subfolder?: string; type?: string };
type Job = { id: string; label: string; state: JobState; event?: JobEvent; outputFiles?: JobOutput[]; reservationId?: string };
type WorkerStatus = { mode: "dry-run" | "comfyui"; healthy?: boolean };
type Generate = (label?: string, inputs?: Record<string, unknown>) => void;

function eventStateForJob(state: JobState) {
  return state === "complete" ? "succeeded" : state;
}

function eventForState(events: JobEvent[], state: JobState) {
  const target = eventStateForJob(state);
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].state === target) return events[index];
  }
  return undefined;
}

type WorkflowManifest = { id: string; label: string; capability: string; inputs: string[]; status: string; version: number };
const workflowManifests = manifestCatalog as WorkflowManifest[];
function workflowInputs(id: string) {
  return workflowManifests.find((item) => item.id === id)?.inputs ?? [];
}
function schemaInputs(id: string, values: Record<string, unknown>) {
  const allowed = new Set([...workflowInputs(id), "label", "reservationId", "costEstimate", "simulateFailure"]);
  const result = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
  if (allowed.has("frameRate") && result.frameRate === undefined) result.frameRate = 24;
  return result;
}

function workflowForStudio(active: Studio, label: string, inputs: Record<string, unknown>) {
  if (active === "Image") return label.toLowerCase().startsWith("edit") ? "image-edit" : label.toLowerCase().startsWith("upscale") ? "image-enhance" : label.toLowerCase().startsWith("identity") ? "character-profile" : "image-basic";
  if (active === "Audio") return inputs.mode === "Speech" ? "audio-speech" : inputs.mode === "Soundtrack" ? "audio-soundtrack" : inputs.mode === "Translate" ? "audio-translate" : "audio-lipsync";
  if (["Video", "Shorts", "UGC", "Clipping", "Vibe Motion", "Recast"].includes(active)) {
    if (active === "UGC") return "campaign-shot";
    if (active === "Vibe Motion") return "video-vibe-motion";
    if (active === "Clipping") return "video-clipping";
    if (active === "Recast") return "video-recast";
    return inputs.mode === "Edit" || inputs.mode === "Clip" ? "video-v2v" : inputs.mode === "Motion" ? "video-motion" : "video-i2v";
  }
  if (active === "AI Influencer") return "ai-influencer";
  if (active === "Influencer") return "character-profile";
  if (active === "Marketing") return "campaign-shot";
  if (active === "Explainer") return "explainer-scene";
  if (active === "Agent Studio") return "agent-plan";
  if (active === "Design Agent") return "design-plan";
  if (active === "Academy") return "academy-lesson";
  if (active === "Cinema") return "cinema-shot";
  if (active === "Supercomputer") return "cinema-shot";
  return "image-basic";
}

function SchemaSummary({ workflowId }: { workflowId: string }) {
  const manifest = workflowManifests.find((item) => item.id === workflowId);
  if (!manifest) return null;
  return <div className="schema-summary" aria-label={`${manifest.label} workflow schema`}><small>{manifest.capability} · v{manifest.version} · {manifest.status}</small><div className="tag-row">{manifest.inputs.slice(0, 8).map((input) => <span key={input}>{input}</span>)}{manifest.inputs.length > 8 && <span>+{manifest.inputs.length - 8} inputs</span>}</div></div>;
}

const nav: Studio[] = [
  "Explore",
  "Apps",
  "Workflows",
  "Image",
  "Video",
  "Audio",
  "UGC",
  "Influencer",
  "AI Influencer",
  "Clipping",
  "Vibe Motion",
  "Recast",
  "Cinema",
  "MCP & CLI",
  "Agent Studio",
  "Design Agent",
  "Academy",
  "Supercomputer",
  "Community",
  "Plugins",
  "Marketing",
  "Canvas",
  "Originals",
  "Shorts",
  "Explainer",
];

const appCatalog = ["3d-figure", "3d-render", "3d-rotation", "60s-cafe", "ads-products", "ai-headshot-generator", "ai-stylist", "angles", "asmr-add-on", "asmr-classic", "asmr-host", "asmr-promo", "banana-eating", "behind-the-scenes", "billboard", "breakdown", "brick-cube", "bullet-time-scene", "bullet-time-splash", "bullet-time-white", "burning-sunset", "camera-motion", "chameleon", "character-swap", "click-to-ad", "clipcut", "cloud-surf", "color-grading", "comic-book", "commercial-faces", "enhance-style", "expand-image", "extras", "face-identity", "face-swap", "fridge-ad", "game-dump", "games-characters", "ghoulgao", "giallo-horror", "giant-product", "glitter-sticker", "graffiti-ad", "gtai", "idol", "image-background-remover", "j-magazine", "j-poster", "japanese-show", "kick-ad", "latex", "macroshot-product", "macroshot-scene", "magic-button", "mascot", "melting-doodle", "meme-generator", "mugshot", "mukbang", "nano-strike", "nano-theft", "outfit-shot", "outfit-swap", "packshot", "paint-app", "pixel-game", "plushies", "poster", "rapgod", "recast", "relight", "renaissance", "roller-coaster", "sand-worm", "shots", "signboard", "simlife", "sketch-to-real", "skibidi", "skin-enhancer", "social-media-icon", "sticker-matchcut", "storm-creature", "style-snap", "surrounded-by-animals", "this-is-fine", "transitions", "trending-templates", "truck-ad", "urban-cuts", "vending-machine", "victory-card", "video-background-remover", "video-editing", "video-face-swap", "virality-predictor", "volcano-ad", "whats-next", "yes-kiss", "zooms"];
const mixedPresets = ["Acid", "Akrill", "Broken mirror", "Bubbles", "Cannabis", "Canvas", "Cold vision", "Comic", "Flash comic", "Fragments", "Hand paint", "Lava", "Layer mixed media", "LSD", "Magazine", "Marble", "Modern", "Multiverse", "Noir", "Ocean", "Origami", "Overexposed", "Palette", "Paper", "Particles", "Random Glow", "Sketch", "Toxic", "Tracking", "Two color", "Ultraviolet", "Vintage", "Windows"];
const motionPresets = ["360 Orbit", "Arc Left", "Dolly In", "Crane Up", "Whip Pan", "Crash Zoom", "FPV Push", "Overhead", "Focus Pull", "Handheld", "Bullet Time", "Action Run", "Car Chase", "Levitation", "Disintegration", "Thunder Storm"];

function Icon({ children }: { children: string }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

async function registerDryAsset(file: File, kind: "image" | "video" | "audio" | "reference") {
  const response = await fetch("/api/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, kind, mimeType: file.type || `${kind}/*`, sizeBytes: file.size, idempotencyKey: `${file.name}:${file.size}:${file.lastModified}` }) });
  if (!response.ok) throw new Error("asset registration failed");
  const body = await response.json() as { asset?: { id: string } };
  if (!body.asset?.id) throw new Error("asset id missing");
  await fetch(`/api/assets/${body.asset.id}/complete`, { method: "POST" });
  return body.asset.id;
}

type LibraryAsset = { id: string; name: string; kind: string; status?: string; provenance?: { jobId?: string } };

function ReferencePicker({ kind, selected, onChange }: { kind: "image" | "video" | "audio"; selected: string[]; onChange: (ids: string[]) => void }) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    void fetch(`/api/library?kind=${kind}`).then((response) => response.ok ? response.json() : null).then((body: { assets?: LibraryAsset[] } | null) => { if (mounted) setAssets(body?.assets ?? []); });
    return () => { mounted = false; };
  }, [kind]);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id].slice(-5));
  return <div className="reference-picker">
    <button type="button" className="control-pill" onClick={() => setOpen((value) => !value)} aria-expanded={open}>References <span>{selected.length ? `${selected.length} selected` : "Library"}</span></button>
    {selected.length > 0 && <div className="reference-chips">{selected.map((id) => <span key={id}>{assets.find((asset) => asset.id === id)?.name ?? id}<button type="button" onClick={() => toggle(id)} aria-label="Remove reference">×</button></span>)}</div>}
    {open && <div className="reference-menu" role="listbox" aria-label={`${kind} library references`}>
      {assets.length ? assets.slice(-8).reverse().map((asset) => <button type="button" role="option" aria-selected={selected.includes(asset.id)} className={selected.includes(asset.id) ? "selected" : ""} key={asset.id} onClick={() => toggle(asset.id)}><span>{asset.name}</span><small>{asset.kind} · {asset.status ?? "ready"}</small></button>) : <small>No {kind} assets in Library yet.</small>}
    </div>}
  </div>;
}

function OutputStrip({ kind, onGenerate }: { kind: "image" | "video" | "audio"; onGenerate: Generate }) {
  const [assets, setAssets] = useState<Array<{ id: string; name: string; kind: string; provenance?: { jobId?: string } }>>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => { const response = await fetch(`/api/library?kind=${kind}`); if (!response.ok) return; const body = await response.json() as { assets?: Array<{ id: string; name: string; kind: string; provenance?: { jobId?: string } }> }; if (mounted) setAssets((body.assets ?? []).filter((asset) => asset.provenance?.jobId).slice(-6).reverse()); };
    void load();
    const timer = window.setInterval(() => void load(), 1000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [kind]);
  if (!assets.length) return null;
  return <div className="output-strip" aria-label={`Completed ${kind} outputs`}>{assets.map((asset) => <article className="output-card" key={asset.id}><div className={`output-thumb art-${kind}`}><i /></div><strong>{asset.name}</strong><small>Complete · {kind}</small><div><button onClick={() => onGenerate(`${asset.name} reuse`, { sourceAssetId: asset.id, assetId: asset.id })}>Reuse</button><button onClick={() => onGenerate(`${asset.name} variation`, { sourceAssetId: asset.id, assetId: asset.id, mode: "Variation" })}>Variation</button><a className="ghost-button" href={`/api/assets/${encodeURIComponent(asset.id)}/download`} download aria-label={`Download ${asset.name}`}>Download</a></div></article>)}</div>;
}

export default function Home() {
  return <main className="bosonfield-shell"><ViralPresetsView onGenerate={() => undefined} /></main>;

  const [active, setActive] = useState<Studio>("Presets");
  const [videoTab, setVideoTab] = useState("Create");
  const [imageTab, setImageTab] = useState("Create");
  const [imagePrompt, setImagePrompt] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [dryRunSequence, setDryRunSequence] = useState(0);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>({ mode: "dry-run", healthy: true });
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  useEffect(() => {
    void fetch("/api/worker").then((response) => response.json() as Promise<WorkerStatus>).then((body) => {
      if (body.mode === "comfyui" || body.mode === "dry-run") setWorkerStatus(body);
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    void fetch("/api/credits").then((response) => response.ok ? response.json() as Promise<{ balance?: number }> : null).then((body) => {
      if (typeof body?.balance === "number") setCreditBalance(body.balance);
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("preset")) setActive("Presets");
      else if (params.has("lesson")) setActive("Academy");
      else if (params.has("original")) setActive("Originals");
      else if (params.has("workflow")) setActive("Workflows");
      else if (params.has("project")) setActive("Projects");
      else if (params.has("asset")) setActive("Library");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeJobs = useMemo(() => jobs.filter((job) => job.state !== "complete"), [jobs]);
  async function finalizeCredit(reservationId: string, action: "release" | "settle") {
    const response = await fetch(`/api/credits/${reservationId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const body = await response.json().catch(() => null) as { remaining?: number } | null;
    if (typeof body?.remaining === "number") setCreditBalance(body.remaining);
  }
  useEffect(() => {
    void fetch("/api/jobs").then((response) => response.ok ? response.json() : null).then(async (body: { jobs?: Array<{ id: string; label?: string; state: JobState; outputFiles?: JobOutput[]; reservationId?: string | null }> } | null) => {
      if (!body?.jobs?.length) return;
      const hydrated = await Promise.all(body.jobs.map(async (job) => {
        const response = await fetch(`/api/jobs/${job.id}/events`);
        if (!response.ok) return { id: job.id, label: job.label ?? "Dry generation", state: job.state, outputFiles: job.outputFiles, reservationId: job.reservationId ?? undefined };
        const events = (await response.json() as { events?: JobEvent[] }).events ?? [];
        return { id: job.id, label: job.label ?? "Dry generation", state: job.state, event: eventForState(events, job.state), outputFiles: job.outputFiles, reservationId: job.reservationId ?? undefined };
      }));
      setJobs(hydrated);
    });
  }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen((open) => !open); }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function generate(label = active === "Image" ? "Image generation" : `${active} preview`, inputs: Record<string, unknown> = {}) {
    const nextSequence = dryRunSequence + 1;
    setDryRunSequence(nextSequence);
    const id = `dry_${nextSequence}`;
    const workflowId = typeof inputs.workflowSource === "string" && inputs.workflowSource.trim() ? inputs.workflowSource : typeof inputs.workflowId === "string" && inputs.workflowId.trim() ? inputs.workflowId : workflowForStudio(active, label, inputs);
    const jobInputs = { ...inputs };
    // Preset UI metadata may include an image alias; Comfy manifests consume the asset id.
    delete jobInputs.image;
    delete jobInputs.workflowId;
    delete jobInputs.workflowSource;
    setJobs((current) => [...current, { id, label, state: "queued" }]);
    setNotice("Dry run queued — no model or GPU was started.");
    try {
      const reservationResponse = await fetch("/api/credits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 18, jobId: id }) });
      const reservation = await reservationResponse.json() as { reservation?: { id: string }; remaining?: number; error?: { message?: string } };
      if (!reservationResponse.ok || !reservation.reservation?.id) { setJobs((current) => current.filter((job) => job.id !== id)); setNotice(reservation.error?.message ?? "Not enough credits for this dry run."); return; }
      if (typeof reservation.remaining === "number") setCreditBalance(reservation.remaining);
      const reservationId = reservation.reservation.id;
      setJobs((current) => current.map((job) => job.id === id ? { ...job, reservationId } : job));
      const response = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId, inputs: { label, ...jobInputs, reservationId: reservation.reservation.id, costEstimate: 18 }, idempotencyKey: id }) });
      const body = await response.json() as { job?: { id: string; state: Job["state"] }; error?: { message?: string } };
      if (!response.ok || !body.job?.id) {
        await finalizeCredit(reservationId, "release");
        setJobs((current) => current.filter((job) => job.id !== id));
        setNotice(body.error?.message ?? "This workflow is not ready for the configured ComfyUI worker.");
        return;
      }
      const serverId = body.job?.id ?? id;
      setJobs((current) => current.map((job) => (job.id === id ? { ...job, id: serverId } : job)));
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        const status = await fetch(`/api/jobs/${serverId}`);
        if (!status.ok) break;
        const statusBody = await status.json() as { job?: { state: Job["state"]; outputFiles?: JobOutput[] } };
        const state = statusBody.job?.state;
        if (!state) continue;
        let event: JobEvent | undefined;
        const eventResponse = await fetch(`/api/jobs/${serverId}/events`);
        if (eventResponse.ok) {
          const events = (await eventResponse.json() as { events?: JobEvent[] }).events ?? [];
          event = eventForState(events, state);
        }
        setJobs((current) => current.map((job) => (job.id === serverId ? { ...job, state, event, outputFiles: statusBody.job?.outputFiles } : job)));
        if (event?.message) setNotice(event.message);
        if (state === "complete") { await finalizeCredit(reservationId, "settle"); setNotice("Preview complete. The result is available in Library."); break; }
        if (state === "cancelled" || state === "failed") { await finalizeCredit(reservationId, "release"); setNotice(state === "failed" ? "Preview failed in the dry worker." : "Run cancelled."); break; }
      }
    } catch {
      setNotice("Dry run could not reach the job service.");
    }
  }

  function selectStudio(studio: Studio, context?: string) {
    setActive(studio);
    if (studio === "Image" && context) {
      const tab = context === "Upscale Image" ? "Upscale" : ["Edit Image", "Draw to Edit"].includes(context) ? "Edit" : ["Fashion Factory", "Soul ID"].includes(context) ? "Identity" : undefined;
      if (tab) setImageTab(tab);
    }
    if (studio === "Video" && context === "Video Upscale") setVideoTab("Upscale");
    if (studio === "Shorts" && context === "Shorts Builder") setVideoTab("Clip");
    setMobileMenu(false);
    setCommandOpen(false);
    setCommandQuery("");
    setNotice("");
  }

  async function createCustomApp() {
    if (typeof window === "undefined") return;
    const title = window.prompt("App title");
    const description = title && window.prompt("Short description");
    const studio = title && window.prompt("Studio (for example Image or Video)");
    const group = title && window.prompt("Category");
    const comfyAppUrl = title && window.prompt("Optional Comfy Cloud/shared-app URL") || undefined;
    if (!title || !description || !studio || !group) return;
    const response = await fetch("/api/admin/apps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description, studio, group, comfyAppUrl }) });
    setNotice(response.ok ? "Custom app created. Open Apps to see it." : "Custom app could not be created.");
    if (response.ok) selectStudio("Explore");
  }

  async function createCustomPreset() {
    if (typeof window === "undefined") return;
    const name = window.prompt("Preset name");
    const capability = name && window.prompt("Capability (for example image.generate)");
    if (!name || !capability) return;
    const response = await fetch("/api/admin/presets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, capability }) });
    setNotice(response.ok ? "Custom preset created. Open Presets to see it." : "Custom preset could not be created.");
    if (response.ok) selectStudio("Presets");
  }

  const commands = [
    ...nav.map((studio) => ({ label: `Open ${studio}`, hint: "Studio", run: () => selectStudio(studio === "Apps" ? "Explore" : studio) })),
    { label: "Open Library", hint: "Workspace", run: () => selectStudio("Library") },
    { label: historyOpen ? "Hide run history" : "Show run history", hint: "View", run: () => { setHistoryOpen((open) => !open); setCommandOpen(false); } },
    { label: "Generate dry preview", hint: "Run", run: () => { setCommandOpen(false); void generate(); } },
    { label: "Create custom Comfy app", hint: "Admin catalog", run: () => { setCommandOpen(false); void createCustomApp(); } },
    { label: "Create custom preset", hint: "Admin catalog", run: () => { setCommandOpen(false); void createCustomPreset(); } },
  ].filter((command, index, all) => all.findIndex((item) => item.label === command.label) === index);
  const visibleCommands = commands.filter((command) => command.label.toLowerCase().includes(commandQuery.trim().toLowerCase()));

  async function jobAction(job: Job, action: "cancel" | "retry" | "duplicate") {
    const response = await fetch(`/api/jobs/${job.id}/${action}`, { method: "POST" });
    if (!response.ok) {
      setNotice(`${action} unavailable for this dry run`);
      return;
    }
    const body = await response.json() as { job?: { id: string; state: Job["state"] }; draft?: { id: string } };
    if (action === "cancel") {
      if (job.reservationId) await finalizeCredit(job.reservationId, "release");
      setJobs((current) => current.map((item) => item.id === job.id ? { ...item, state: "cancelled" } : item));
    }
    if (action === "retry" && body.job) setJobs((current) => current.some((item) => item.id === body.job!.id) ? current.map((item) => item.id === body.job!.id ? { ...item, label: `${job.label} · retry`, state: body.job!.state } : item) : [...current, { id: body.job!.id, label: `${job.label} · retry`, state: body.job!.state }]);
    if (action === "duplicate" && body.draft) setJobs((current) => current.some((item) => item.id === body.draft!.id) ? current : [...current, { id: body.draft!.id, label: `${job.label} · duplicate`, state: "queued" }]);
    setNotice(action === "cancel" ? "Run cancelled." : action === "retry" ? "Retry queued." : "Editable duplicate created.");
  }

  return (
    <main className={`bosonfield-shell ${active === "Explore" ? "apps-shell" : ""}`}>
      <header className="topbar">
        <button className="brand" onClick={() => selectStudio("Explore")} aria-label="Bosonfield home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>BOSONFIELD</span>
        </button>
        <button className="mobile-toggle" onClick={() => setMobileMenu((open) => !open)} aria-expanded={mobileMenu} aria-controls="primary-navigation" aria-label="Toggle navigation">☰</button>
        <nav id="primary-navigation" className={mobileMenu ? "topnav open" : "topnav"} aria-label="Product navigation">
          {nav.map((item) => (
            <button key={item} className={(active === item && item !== "Explore") || (item === "Apps" && active === "Explore") ? "nav-item active" : "nav-item"} aria-current={(active === item && item !== "Explore") || (item === "Apps" && active === "Explore") ? "page" : undefined} onClick={() => selectStudio(item === "Apps" ? "Explore" : item)}>
              {item}{["MCP & CLI", "Academy", "Plugins", "Supercomputer"].includes(item) && <sup>NEW</sup>}
            </button>
          ))}
        </nav>
        <div className="account-actions">
          <button className="command-trigger" onClick={() => setCommandOpen(true)} aria-haspopup="dialog" aria-expanded={commandOpen}>⌘K</button>
          <button className="credit-pill" onClick={() => setNotice(`Dry account: ${creditBalance ?? 480} credits available`)}>{creditBalance ?? 480} <span>credits</span></button>
          <button className="avatar" aria-label="Open profile" onClick={() => selectStudio("Account")}>BF</button>
        </div>
      </header>

      <nav className="workspace-nav" aria-label="Workspace navigation">
        <span>WORKSPACE</span>
        {(["Projects", "Library", "Presets", "Team", "Billing"] as Studio[]).map((item) => <button key={item} className={active === item ? "selected" : ""} aria-current={active === item ? "page" : undefined} onClick={() => selectStudio(item)}>{item}</button>)}
      </nav>

      <section className="workspace-header">
        <div>
          <p className="eyebrow">BOSONFIELD / CREATIVE SYSTEM</p>
          <h1>{active === "Explore" ? "Discover Comfy apps." : active}</h1>
          <p className="lede">{active === "Explore" ? "Browse use-case apps and open their Comfy Cloud workflows." : "A fast, focused studio for images, motion, stories, and worlds."}</p>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={() => selectStudio("Library")}><Icon>▦</Icon> Library</button>
          <button className="ghost-button" onClick={() => setHistoryOpen((open) => !open)}><Icon>◒</Icon> {historyOpen ? "Hide history" : "Show history"}</button>
          <button className="primary-button" onClick={() => generate()}><Icon>✦</Icon> Generate</button>
        </div>
      </section>

      <div className="notice" aria-live="polite">{notice || (activeJobs.length ? `${activeJobs.length} ${workerStatus.mode === "comfyui" ? "ComfyUI run" : "dry run"} in progress` : workerStatus.mode === "comfyui" ? workerStatus.healthy ? "ComfyUI worker connected." : "ComfyUI worker configured · currently unavailable." : "Dry-run mode · connected to no GPU")}</div>

      {active === "Explore" ? <Explore onSelect={selectStudio} /> : <StudioView active={active} videoTab={videoTab} setVideoTab={setVideoTab} imageTab={imageTab} setImageTab={setImageTab} prompt={imagePrompt} setPrompt={setImagePrompt} onGenerate={generate} />}

      {historyOpen && <aside className="history-panel" aria-label="Generation history">
        <div className="panel-heading"><span>RUN HISTORY</span><button onClick={() => setJobs([])}>Clear</button></div>
        {jobs.length === 0 ? <div className="history-empty"><span className="empty-orbit">◌</span><p>No runs yet</p><small>Your dry-run previews will appear here.</small></div> : jobs.slice().reverse().map((job) => <div className="job-row" key={job.id}><span className={`state-dot ${job.state}`} /><div><strong>{job.label}</strong><small>{job.event?.message ?? (job.state === "complete" ? "Ready in Library" : job.state)}{job.event?.total ? ` · ${job.event.completed ?? 0}/${job.event.total}` : ""}</small>{job.outputFiles?.length ? <div className="job-outputs" aria-label={`${job.label} outputs`}>{job.outputFiles.map((output) => <a key={`${output.nodeId ?? "output"}-${output.filename}`} href={output.url} target="_blank" rel="noreferrer">Open {output.filename}</a>)}</div> : null}</div><div className="job-actions"><button aria-label={`Retry ${job.label}`} onClick={() => void jobAction(job, "retry")}>Retry</button><button aria-label={`Duplicate ${job.label}`} onClick={() => void jobAction(job, "duplicate")}>Duplicate</button>{job.state !== "cancelled" && job.state !== "complete" && <button aria-label={`Cancel ${job.label}`} onClick={() => void jobAction(job, "cancel")}>Cancel</button>}</div></div>)}
      </aside>}

      {commandOpen && <div className="command-backdrop" role="presentation" onMouseDown={() => setCommandOpen(false)}>
        <section className="command-menu" role="dialog" aria-modal="true" aria-label="Command menu" onMouseDown={(event) => event.stopPropagation()}>
          <div className="command-search"><Icon>⌕</Icon><input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Jump to a studio or action..." aria-label="Search commands" /><kbd>ESC</kbd></div>
          <div className="command-results">{visibleCommands.length ? visibleCommands.map((command) => <button key={command.label} onClick={command.run}><span>{command.label}</span><small>{command.hint}</small></button>) : <p>No matching commands.</p>}</div>
          <small className="command-footnote">Ctrl/⌘ K opens this menu · Esc closes it.</small>
        </section>
      </div>}

      <footer className="statusbar"><span><i className="status-light" /> {workerStatus.mode === "comfyui" ? "ComfyUI workspace" : "Dry-run workspace"}</span><span>ComfyUI adapter: {workerStatus.mode === "comfyui" ? workerStatus.healthy ? "connected" : "unavailable" : "simulated"}</span><span>v0.1 / Bosonfield</span></footer>
    </main>
  );
}

function Explore({ onSelect }: { onSelect: (studio: Studio, context?: string) => void }) {
  type CatalogApp = typeof usecaseAppsCatalog[number];
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All apps");
  const [category, setCategory] = useState("All");
  const [selectedApp, setSelectedApp] = useState("Create Image");
  const [shareNotice, setShareNotice] = useState("");
  const [appLinks, setAppLinks] = useState<Record<string, string>>({});
  const [linkInput, setLinkInput] = useState("");
  const [savedAppIds, setSavedAppIds] = useState<string[]>([]);
  const [savedAppsReady, setSavedAppsReady] = useState(false);
  const [catalogApps, setCatalogApps] = useState<CatalogApp[]>(usecaseAppsCatalog);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const slug = new URLSearchParams(window.location.search).get("app");
      const linked = catalogApps.find((app) => app.id === slug || app.id.replace(/^app_/, "") === slug || app.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug);
      if (linked) setSelectedApp(linked.title);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [catalogApps]);
  useEffect(() => { void fetch("/api/apps").then((response) => response.ok ? response.json() : null).then((body: { apps?: Array<CatalogApp & { comfyAppUrl?: string | null }> } | null) => { const apps = body?.apps ?? []; if (apps.length) setCatalogApps(apps as CatalogApp[]); setAppLinks(Object.fromEntries(apps.filter((app) => app.comfyAppUrl).map((app) => [app.id, app.comfyAppUrl as string]))); }); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { try { const saved = JSON.parse(window.localStorage.getItem("bosonfield:saved-apps") ?? "[]"); setSavedAppIds(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []); } catch { setSavedAppIds([]); } finally { setSavedAppsReady(true); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (savedAppsReady) window.localStorage.setItem("bosonfield:saved-apps", JSON.stringify(savedAppIds)); }, [savedAppIds, savedAppsReady]);
  const usecaseApps = catalogApps;
  const featuredAppIds = new Set(usecaseApps.slice(0, 12).map((app) => app.id));
  const visible = usecaseApps.filter((app) => (tab === "My apps" ? savedAppIds.includes(app.id) : tab === "Higgsfield apps" ? featuredAppIds.has(app.id) : true) && (category === "All" || category === app.group) && `${app.title} ${app.studio} ${app.group}`.toLowerCase().includes(query.toLowerCase()));
  const selected = usecaseApps.find((app) => app.title === selectedApp) ?? usecaseApps[0];
  const selectedWorkflowId = selected.studio === "Workflows" ? "image-basic" : workflowForStudio(selected.studio as Studio, selected.title, {});
  const selectedComfyUrl = appLinks[selected.id];
  useEffect(() => { const timer = window.setTimeout(() => setLinkInput(selectedComfyUrl ?? ""), 0); return () => window.clearTimeout(timer); }, [selected.id, selectedComfyUrl]);
  // App cards select a catalog record; execution belongs to the external Comfy app.
  const open = (_studio: string, title: string) => { setSelectedApp(title); setShareNotice(""); const app = usecaseApps.find((item) => item.title === title); const link = app ? appLinks[app.id] : undefined; if (link && app) window.open(`/api/share/apps/${encodeURIComponent(app.id)}`, "_blank", "noopener,noreferrer"); };
  const copyShareLink = async () => {
    const url = `${window.location.origin}/?app=${encodeURIComponent(selected.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`;
    try { await navigator.clipboard.writeText(url); setShareNotice("Bosonfield app link copied."); } catch { setShareNotice(url); }
  };
  const copyComfyLink = async () => {
    if (!selectedComfyUrl) return;
    try { await navigator.clipboard.writeText(selectedComfyUrl); setShareNotice("Comfy shared app link copied."); } catch { setShareNotice(selectedComfyUrl); }
  };
  const toggleSaved = (id: string) => setSavedAppIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const saveComfyLink = async (nextValue = linkInput) => {
    const comfyAppUrl = nextValue.trim() || null;
    try {
      const response = await fetch("/api/apps", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ appId: selected.id, comfyAppUrl }) });
      if (!response.ok) { setShareNotice("Use an http(s) Comfy app URL."); return; }
      setAppLinks((current) => { const next = { ...current }; if (comfyAppUrl) next[selected.id] = comfyAppUrl; else delete next[selected.id]; return next; });
      setShareNotice(comfyAppUrl ? "Comfy shared app linked." : "Comfy shared app link removed.");
    } catch { setShareNotice("Could not reach the app catalog."); }
  };
  const downloadWorkflow = async () => {
    try {
      const response = await fetch(`/api/workflows/export?id=${encodeURIComponent(selectedWorkflowId)}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setShareNotice(body?.error?.message ?? "Workflow export is not ready yet.");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedWorkflowId}.api.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setShareNotice(`${selected.title} workflow downloaded.`);
    } catch {
      setShareNotice("Workflow export could not be reached.");
    }
  };
  return <div className="apps-directory"><aside className="apps-sidebar"><details className="apps-product-menu"><summary className="apps-product-switch"><span className="product-mark">✣</span><strong>Supercomputer</strong><span>⌄</span></summary><div className="apps-product-menu-items"><button onClick={() => onSelect("Supercomputer")}>Supercomputer</button><button onClick={() => onSelect("Explore")}>Apps directory</button><button onClick={() => onSelect("Workflows")}>Workflow studio</button><button onClick={() => onSelect("Presets")}>Viral presets</button></div></details><button className="new-chat-button" onClick={() => onSelect("Explore")}>＋ <strong>New chat</strong></button><button className="apps-search-button" onClick={() => document.querySelector<HTMLInputElement>('[aria-label="Search apps"]')?.focus()}>⌕ <span>Search</span><kbd>⌘ K</kbd></button><p className="sidebar-label">PRODUCTS <span>⌄</span></p><button className="sidebar-link active"><span>⠿</span> Apps <em>NEW</em></button><p className="sidebar-label">WORKSPACE <span>⌄</span></p><button className="sidebar-link" onClick={() => onSelect("Projects")}><span>▦</span> My projects</button><button className="sidebar-link" onClick={() => onSelect("Library")}><span>◫</span> Library</button><div className="sidebar-spacer" /><button className="sidebar-pricing" onClick={() => onSelect("Billing")}>♢ <span>Pricing</span><em>30% OFF</em></button><button className="sidebar-login" onClick={() => onSelect("Account")}>↪ Log in</button></aside><section className="apps-main"><header className="apps-header"><h1>Apps</h1><button className="my-apps-button" onClick={() => setTab("My apps")}>◫ &nbsp; My apps{savedAppIds.length ? ` · ${savedAppIds.length}` : ""}</button></header><section className="apps-banner"><strong>COMFY APPS, READY TO EXPLORE</strong><b>BOSONFIELD</b><button onClick={() => onSelect("Supercomputer")}>VIEW WORKFLOWS &nbsp;›</button></section><div className="apps-toolbar"><div className="apps-tabs">{["All apps", "Higgsfield apps", "My apps"].map((item) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}{item === "My apps" && savedAppIds.length ? ` · ${savedAppIds.length}` : ""}</button>)}</div><div className="apps-filters"><label>⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search apps" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="App category"><option>All</option>{Array.from(new Set(usecaseApps.map((app) => app.group))).sort().map((group) => <option key={group}>{group}</option>)}</select></div></div><div className="apps-sharebar" aria-label="Share selected app"><div><small>SELECTED APP</small><strong>{selected.title}</strong><span>{shareNotice || (selectedComfyUrl ? "Comfy shared app ready" : "No external Comfy app linked yet")}</span><label className="apps-share-editor">Shared Comfy app URL<input value={linkInput} onChange={(event) => setLinkInput(event.target.value)} placeholder="https://cloud.comfy.org/..." aria-label="Shared Comfy app URL" /></label></div><div><button onClick={() => void saveComfyLink()}>{selectedComfyUrl ? "Update link" : "Save link"}</button><button disabled={!selectedComfyUrl} onClick={() => { setLinkInput(""); void saveComfyLink(""); }}>Remove link</button><button disabled={!selectedComfyUrl} onClick={() => void copyComfyLink()}>Copy Comfy app link</button><button onClick={() => void copyShareLink()}>Copy catalog link</button><button disabled={!selectedComfyUrl} onClick={() => selectedComfyUrl && window.open(`/api/share/apps/${encodeURIComponent(selected.id)}`, "_blank", "noopener,noreferrer")}>Open shared Comfy app ↗</button><button onClick={downloadWorkflow}>Download workflow</button></div></div>{tab === "My apps" && !visible.length ? <section className="my-apps-empty"><span>＋</span><h2>{savedAppIds.length ? "No matching apps" : "No apps yet"}</h2><p>{savedAppIds.length ? "Try another search or category." : "Save an app from this directory to make it yours."}</p><button className="primary-button" onClick={() => setTab("All apps")}>Browse all apps</button></section> : <div className="usecase-grid">{visible.map((app, index) => <div className="usecase-card-shell" key={app.id}><button className={`usecase-card ${selectedApp === app.title ? "selected" : ""}`} onClick={() => open(app.studio, app.title)}><span className={`usecase-art art-${app.art}`}><i>{String(index + 1).padStart(2, "0")}</i><b>{app.group}</b></span><strong>{app.title}</strong><small>{app.description}</small><span className="usecase-arrow">↗</span></button><button className={`app-save-button ${savedAppIds.includes(app.id) ? "saved" : ""}`} aria-label={`${savedAppIds.includes(app.id) ? "Remove" : "Save"} ${app.title}`} aria-pressed={savedAppIds.includes(app.id)} onClick={() => toggleSaved(app.id)}>{savedAppIds.includes(app.id) ? "★" : "☆"}</button></div>)}{!visible.length && <div className="my-apps-empty"><h2>No matching apps</h2><p>Try another use case or category.</p></div>}</div>}</section></div>;
}

function StudioView({ active, videoTab, setVideoTab, imageTab, setImageTab, prompt, setPrompt, onGenerate }: { active: Studio; videoTab: string; setVideoTab: (tab: string) => void; imageTab: string; setImageTab: (tab: string) => void; prompt: string; setPrompt: (prompt: string) => void; onGenerate: Generate }) {
  if (active === "Image") return <ConsentImageStudio tab={imageTab} setTab={setImageTab} prompt={prompt} setPrompt={setPrompt} onGenerate={onGenerate} />;
  if (active === "Video" || active === "Shorts" || active === "Explainer" || active === "UGC" || active === "Influencer") return <div className="studio-output-surface" data-output-kind="video"><VideoStudio active={active} tab={videoTab} setTab={setVideoTab} onGenerate={onGenerate} />{active === "Influencer" && <CharacterProfilePanel />}<OutputStrip kind="video" onGenerate={onGenerate} /></div>;
  if (active === "Audio") return <div className="studio-output-surface" data-output-kind="audio"><AudioStudio onGenerate={onGenerate} /><OutputStrip kind="audio" onGenerate={onGenerate} /></div>;
  if (active === "Agent Studio") return <AgentStudio onGenerate={onGenerate} />;
  if (active === "Design Agent") return <DesignAgent onGenerate={onGenerate} />;
  if (active === "Apps" || active === "Presets") return <CatalogView active={active} onGenerate={onGenerate} />;
  if (active === "Workflows") return <WorkflowStudio onGenerate={onGenerate} />;
  if (["Projects", "Library", "Account", "Team", "Billing"].includes(active)) return <WorkspaceView active={active} onGenerate={onGenerate} />;
  if (["Clipping", "Vibe Motion", "Recast", "AI Influencer"].includes(active)) return <div className="studio-output-surface" data-output-kind="video"><FeatureStudio active={active} onGenerate={onGenerate} /><OutputStrip kind="video" onGenerate={onGenerate} /></div>;
  return <FeatureStudio active={active} onGenerate={onGenerate} />;
}

function ConsentImageStudio({ tab, setTab, prompt, setPrompt, onGenerate }: { tab: string; setTab: (tab: string) => void; prompt: string; setPrompt: (prompt: string) => void; onGenerate: Generate }) {
  const guardedGenerate: Generate = (label, inputs = {}) => {
    if (inputs.mode === "Identity") {
      if (typeof window === "undefined" || !window.confirm("Confirm you have consent to use this person’s identity.")) return;
      onGenerate(label, { ...inputs, consent: true });
      return;
    }
    onGenerate(label, inputs);
  };
  return <ImageStudio tab={tab} setTab={setTab} prompt={prompt} setPrompt={setPrompt} onGenerate={guardedGenerate} />;
}

function ImageStudio({ tab, setTab, prompt, setPrompt, onGenerate }: { tab: string; setTab: (tab: string) => void; prompt: string; setPrompt: (prompt: string) => void; onGenerate: Generate }) {
  const tabs = ["Create", "Edit", "Upscale", "Identity"];
  const capability = tab === "Edit" ? "image.edit.mask" : tab === "Upscale" ? "image.upscale" : tab === "Identity" ? "character.profile" : "image.generate";
  const [model, setModel] = useState("Flux Field");
  const [ratio, setRatio] = useState("3:4");
  const [quality, setQuality] = useState("high");
  const [fileName, setFileName] = useState("");
  const [fileAssetId, setFileAssetId] = useState("");
  const [maskFileName, setMaskFileName] = useState("");
  const [maskAssetId, setMaskAssetId] = useState("");
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([]);
  const [variationCount, setVariationCount] = useState("1");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [seed, setSeed] = useState("42");
  const [guidance, setGuidance] = useState("7");
  const [negativePrompt, setNegativePrompt] = useState("");
  return <div className="studio-layout"><section className="stage image-stage"><div className="stage-grid" /><div className="stage-message"><span className="empty-orbit">◌</span><p>{tab === "Create" ? "Your next image starts here." : `${tab} mode is ready.`}</p><small>Dry-run mode keeps references and outputs local to this preview.</small></div><OutputStrip kind="image" onGenerate={onGenerate} /><div className="composer"><div className="studio-tabs" role="tablist" aria-label="Image modes">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div><div className="composer-row"><label className="asset-add" aria-label="Add reference asset">+<input type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { setFileName(file.name); void registerDryAsset(file, "image").then(setFileAssetId).catch(() => setFileAssetId("")); } }} /></label>{tab === "Edit" && <label className="asset-add" aria-label="Add mask asset">⌁<input type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { setMaskFileName(file.name); void registerDryAsset(file, "image").then(setMaskAssetId).catch(() => setMaskAssetId("")); } }} /></label>}<ReferencePicker kind="image" selected={referenceAssetIds} onChange={setReferenceAssetIds} /><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={tab === "Edit" ? "Describe the change and add a mask..." : tab === "Identity" ? "Describe the character identity and details..." : "Describe the image you want to make..."} aria-label="Image prompt" />{fileName && <small className="file-chip">{fileName}</small>}{maskFileName && tab === "Edit" && <small className="file-chip">mask: {maskFileName}</small>}<label className="control-select">Model<select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Image model"><option>Flux Field</option><option>Seed Image</option><option>Draft Image</option></select></label><label className="control-select">Ratio<select value={ratio} onChange={(event) => setRatio(event.target.value)} aria-label="Image ratio"><option>3:4</option><option>1:1</option><option>16:9</option></select></label><label className="control-select">Count<select value={variationCount} onChange={(event) => setVariationCount(event.target.value)} aria-label="Image variation count"><option value="1">1x</option><option value="2">2x</option><option value="4">4x</option></select></label><button className="control-pill" type="button" onClick={() => setAdvancedOpen((value) => !value)} aria-expanded={advancedOpen}>Advanced</button><label className="control-select">Quality<select value={quality} onChange={(event) => setQuality(event.target.value)} aria-label="Image quality"><option value="high">High</option><option value="draft">Draft</option></select></label><button className="generate-button" onClick={() => onGenerate(`${tab} image`, { prompt, model, ratio, quality, fileName, assetId: fileAssetId, maskAssetId, referenceAssetIds, mode: tab, count: Number(variationCount), advanced: advancedOpen, seed: Number(seed), guidance: Number(guidance), negativePrompt })}>{tab} <Icon>✦</Icon></button>{advancedOpen && <div className="advanced-panel"><label>Seed<input type="number" value={seed} onChange={(event) => setSeed(event.target.value)} aria-label="Image seed" /></label><label>Guidance<input type="number" value={guidance} onChange={(event) => setGuidance(event.target.value)} aria-label="Image guidance" /></label><label>Negative prompt<input value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} placeholder="Optional exclusions" aria-label="Negative prompt" /></label></div>}</div></div></section><aside className="inspector"><div className="panel-heading"><span>IMAGE STUDIO</span><span className="live-label">READY</span></div><div className="inspector-block"><small>CAPABILITY</small><strong>{capability}</strong><p>Bounded workflow with reproducible settings and lineage.</p></div><div className="inspector-block"><small>SUPPORTED INPUTS</small><div className="tag-row"><span>Prompt</span><span>Image</span><span>{tab === "Edit" ? "Mask" : "Reference"}</span></div></div><div className="inspector-block"><small>OUTPUT</small><p>{tab === "Upscale" ? "Enhanced resolution" : `${ratio} · ${quality} quality`}</p></div></aside></div>;
}

function VideoStudio({ active, tab, setTab, onGenerate }: { active: Studio; tab: string; setTab: (tab: string) => void; onGenerate: Generate }) {
  const tabs = active === "Shorts" ? ["Create Shorts", "Clip", "History"] : active === "Explainer" ? ["Script", "Storyboard", "History"] : active === "UGC" ? ["Brief", "Presenter", "Variants"] : active === "Influencer" ? ["Character", "Motion", "Export"] : active === "Video" ? ["Create Video", "Edit Video", "Motion Control", "Upscale", "Interpolate", "Style", "History", "How it works"] : ["Create", "Edit", "Motion", "History", "How it works"];
  const selectedTab = tabs.includes(tab) ? tab : tabs[0];
  const workflowId = active === "Explainer" ? "explainer-scene" : active === "UGC" ? "campaign-shot" : active === "Influencer" ? "character-profile" : active === "Shorts" && selectedTab === "Clip" ? "video-v2v" : selectedTab === "Upscale" ? "video-upscale" : selectedTab === "Interpolate" ? "video-interpolate" : selectedTab === "Style" ? "video-style" : selectedTab === "Edit" || selectedTab === "Edit Video" || selectedTab === "Clip" ? "video-v2v" : selectedTab === "Motion" || selectedTab === "Motion Control" ? "video-motion" : "video-i2v";
  const declaredInputs = workflowInputs(workflowId);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("Seed Field");
  const [duration, setDuration] = useState("5");
  const [ratio, setRatio] = useState("9:16");
  const [quality, setQuality] = useState("high");
  const [resolution, setResolution] = useState("1080p");
  const [bitrate, setBitrate] = useState("standard");
  const [useElements, setUseElements] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileAssetId, setFileAssetId] = useState("");
  const [consent, setConsent] = useState(false);
  const [clipStart, setClipStart] = useState("0");
  const [clipEnd, setClipEnd] = useState("5");
  const [scriptVoice, setScriptVoice] = useState("Field narrator");
  const [sceneCount, setSceneCount] = useState("3");
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([]);
  const [presetId, setPresetId] = useState("360 Orbit");
  return <div className="studio-layout"><section className="stage video-stage"><div className="video-backdrop"><span className="video-line line-a" /><span className="video-line line-b" /><span className="video-title">{active === "Explainer" ? "MAKE IT CLEAR" : active === "Shorts" ? "CUT THROUGH" : "MOVE THE FRAME"}</span></div><div className="video-steps"><span className="active">01 Input</span><span>02 Direction</span><span>03 Render</span></div><VideoModePanel active={active} tab={selectedTab} clipStart={clipStart} setClipStart={setClipStart} clipEnd={clipEnd} setClipEnd={setClipEnd} scriptVoice={scriptVoice} setScriptVoice={setScriptVoice} sceneCount={sceneCount} setSceneCount={setSceneCount} /></section><aside className="control-rail"><div className="studio-tabs" role="tablist" aria-label={`${active} modes`}>{tabs.map((item) => <button key={item} role="tab" aria-selected={selectedTab === item} className={selectedTab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div><SchemaSummary workflowId={workflowId} /><label className="upload-box"><span>＋</span><strong>{fileName || "Upload media"}</strong><small>Image, video, or audio · choose a local file</small><input type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { setFileName(file.name); void registerDryAsset(file, "video").then(setFileAssetId).catch(() => setFileAssetId("")); } }} /></label>{(declaredInputs.includes("referenceAssetIds") || declaredInputs.includes("productAssetIds")) && <ReferencePicker kind="image" selected={referenceAssetIds} onChange={setReferenceAssetIds} />}<label>Prompt<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={active === "Explainer" ? "Explain a concept in a visual way..." : "Describe the movement and mood..."} aria-label={`${active} prompt`} /></label><div className="control-grid"><label>Model<select value={model} onChange={(event) => setModel(event.target.value)} aria-label={`${active} model`}><option>Seed Field</option><option>Flux Motion</option><option>Video Draft</option></select></label><label>Duration<select value={duration} onChange={(event) => setDuration(event.target.value)} aria-label={`${active} duration`}><option value="3">3 sec</option><option value="5">5 sec</option><option value="10">10 sec</option></select></label><label>Ratio<select value={ratio} onChange={(event) => setRatio(event.target.value)} aria-label={`${active} ratio`}><option>9:16</option><option>16:9</option><option>1:1</option></select></label><label>Quality<select value={quality} onChange={(event) => setQuality(event.target.value)} aria-label={`${active} quality`}><option value="draft">Draft</option><option value="high">High</option></select></label><label>Resolution<select value={resolution} onChange={(event) => setResolution(event.target.value)} aria-label={`${active} resolution`}><option>720p</option><option>1080p</option><option>4K</option></select></label><label>Bitrate<select value={bitrate} onChange={(event) => setBitrate(event.target.value)} aria-label={`${active} bitrate`}><option value="draft">Draft</option><option value="standard">Standard</option><option value="high">High</option></select></label>{declaredInputs.includes("presetId") && <label>Motion preset<select value={presetId} onChange={(event) => setPresetId(event.target.value)} aria-label="Motion preset">{motionPresets.slice(0, 8).map((preset) => <option key={preset}>{preset}</option>)}</select></label>}</div><label className="consent-toggle"><input type="checkbox" checked={useElements} onChange={(event) => setUseElements(event.target.checked)} /> Use reference elements</label>{active === "Influencer" && selectedTab === "Character" && <label className="consent-toggle"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I have consent to use this person’s identity.</label>}<button className="generate-button full" disabled={active === "Influencer" && selectedTab === "Character" && !consent} onClick={() => onGenerate(`${active} ${selectedTab}`, schemaInputs(workflowId, { prompt, model, duration, ratio, quality, resolution, bitrate, useElements, fileName, assetId: fileAssetId, referenceAssetIds, productAssetIds: referenceAssetIds, presetId, mode: selectedTab, consent, clipStart: Number(clipStart), clipEnd: Number(clipEnd), scriptVoice, sceneCount: Number(sceneCount) }))}>Generate <Icon>✦</Icon></button><div className="rail-note"><span className="status-light" /> Dry preview mode · {duration} sec · {quality} · estimated 18 credits</div></aside></div>;
}

function CharacterProfilePanel() {
  const [name, setName] = useState("Field character");
  const [assetId, setAssetId] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  async function save() {
    if (!name.trim() || !assetId || !consent) { setStatus("Add an identity asset and confirm consent before saving."); return; }
    const response = await fetch("/api/characters", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim(), assetIds: [assetId], consentRecordId: `ui-${Date.now()}` }) });
    const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
    setStatus(response.ok ? "Character profile saved to dry workspace." : body.error?.message ?? "Could not save character profile.");
  }
  return <section className="utility-panel character-profile-panel"><div><p className="eyebrow">CHARACTER LAB</p><h3>Save a reusable identity profile</h3><p>Record consent and source lineage once, then reuse the profile in ComfyUI-ready character workflows.</p></div><label>Character profile name<input value={name} onChange={(event) => setName(event.target.value)} aria-label="Character profile name" /></label><label className="upload-box"><span>＋</span><strong>{assetId ? "Identity asset attached" : "Upload identity reference"}</strong><small>Image asset required for a profile</small><input type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void registerDryAsset(file, "image").then(setAssetId).catch(() => setAssetId("")); }} /></label><label className="consent-toggle"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I have consent to use this person’s identity.</label><button className="primary-button" type="button" onClick={() => void save()}>Save character profile <Icon>↗</Icon></button>{status && <small className="guided-status">{status}</small>}</section>;
}

function VideoModePanel({ active, tab, clipStart, setClipStart, clipEnd, setClipEnd, scriptVoice, setScriptVoice, sceneCount, setSceneCount }: { active: Studio; tab: string; clipStart: string; setClipStart: (value: string) => void; clipEnd: string; setClipEnd: (value: string) => void; scriptVoice: string; setScriptVoice: (value: string) => void; sceneCount: string; setSceneCount: (value: string) => void }) {
  const special = ["History", "How it works", "Clip", "Edit Video", "Motion Control", "Upscale", "Interpolate", "Style", "Script", "Storyboard"].includes(tab);
  const [opened, setOpened] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; label: string; state: string }>>([]);
  useEffect(() => { if (tab === "History") void fetch("/api/jobs").then((response) => response.ok ? response.json() : null).then((body: { jobs?: Array<{ id: string; label?: string; state: string }> } | null) => setHistory((body?.jobs ?? []).slice(-6).reverse().map((job) => ({ id: job.id, label: job.label ?? "Dry generation", state: job.state })))); }, [tab]);
  if (!special) return null;
  const title = tab === "History" ? "Run history" : tab === "How it works" ? "How the field moves" : tab === "Edit Video" ? "Refine the source" : tab === "Motion Control" ? "Direct the motion" : tab === "Upscale" ? "Clean up the output" : tab === "Interpolate" ? "Smooth the motion" : tab === "Style" ? "Apply a visual treatment" : tab === "Clip" ? "Build a short from clips" : tab === "Script" ? "Write the explanation" : "Arrange the storyboard";
  const copy = tab === "History" ? "Recent dry runs, retryable inputs, and reusable outputs stay attached to this studio." : tab === "How it works" ? "Upload a source, describe direction, review the bounded workflow, then queue a reproducible run." : tab === "Edit Video" ? "Trim or restyle a source clip while keeping the original asset and edit bounds in the run record." : tab === "Motion Control" ? "Attach a motion reference, describe the camera move, then review the bounded video-motion workflow." : tab === "Upscale" ? "Enhance a finished video while preserving source lineage and output settings." : tab === "Interpolate" ? "Increase temporal smoothness with a bounded frame-interpolation workflow." : tab === "Style" ? "Apply a reusable mixed-media treatment while preserving the source lineage." : tab === "Clip" ? "Choose a source clip, trim the moment, and send the selection into the Shorts workflow." : tab === "Script" ? "Turn a concise script into scenes, narration, and visual beats." : "Drag scene beats into order before rendering the explainer.";
  return <section className="video-mode-panel"><p className="eyebrow">{active.toUpperCase()} / {tab.toUpperCase()}</p><h3>{title}</h3><p>{copy}</p>{tab === "History" && <div className="mode-checklist">{history.length ? history.map((job) => <span key={job.id}>{job.label} · {job.state}</span>) : <span>No runs in this studio yet.</span>}</div>}{(tab === "Clip" || tab === "Edit Video") && <div className="mode-fields"><label>Start <input type="number" value={clipStart} onChange={(event) => setClipStart(event.target.value)} aria-label="Clip start" /></label><label>End <input type="number" value={clipEnd} onChange={(event) => setClipEnd(event.target.value)} aria-label="Clip end" /></label></div>}{tab === "Script" && <div className="mode-fields"><label>Voice <select value={scriptVoice} onChange={(event) => setScriptVoice(event.target.value)} aria-label="Explainer voice"><option>Field narrator</option><option>Warm guide</option></select></label><label>Scenes <select value={sceneCount} onChange={(event) => setSceneCount(event.target.value)} aria-label="Explainer scene count"><option value="3">3</option><option value="5">5</option><option value="8">8</option></select></label></div>}{tab === "Storyboard" && <div className="mode-checklist"><span>01 · Opening beat</span><span>02 · Evidence beat</span><span>03 · Turn</span><span>04 · Close</span></div>}{tab !== "Clip" && tab !== "Edit Video" && tab !== "Motion Control" && tab !== "Script" && tab !== "Storyboard" && tab !== "History" && <div className="mode-checklist"><span>01 · Input attached</span><span>02 · Direction saved</span><span>03 · Dry render ready</span></div>}{tab === "Motion Control" && <div className="mode-checklist"><span>01 · Motion reference attached</span><span>02 · Camera direction saved</span><span>03 · Dry render ready</span></div>}<button className="ghost-button" type="button" onClick={() => setOpened((value) => !value)}>{opened ? "Close" : "Open"} {tab === "History" ? "history" : "guide"} ↗</button>{opened && <small className="guided-status">{tab === "History" ? `${history.length} API-backed runs shown above.` : "Guide opened in dry mode · no worker required."}</small>}</section>;
}

function AudioStudio({ onGenerate }: { onGenerate: Generate }) {
  const [mode, setMode] = useState("Lipsync");
  const workflowId = mode === "Speech" ? "audio-speech" : mode === "Soundtrack" ? "audio-soundtrack" : mode === "Translate" ? "audio-translate" : "audio-lipsync";
  const declaredInputs = workflowInputs(workflowId);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("Voice Field");
  const [quality, setQuality] = useState("high");
  const [fileName, setFileName] = useState("");
  const [fileAssetId, setFileAssetId] = useState("");
  const [voice, setVoice] = useState("Field narrator");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("10");
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  return <div className="studio-layout"><section className="stage audio-stage"><div className="audio-wave">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 17) % 52)}px` }} />)}</div><div className="stage-message"><p>Give the frame a voice.</p><small>Upload a face, generate speech, or bring your own audio.</small></div></section><aside className="control-rail"><div className="panel-heading"><span>{mode.toUpperCase()} / AUDIO</span><span className="live-label">READY</span></div><div className="studio-tabs" role="tablist" aria-label="Audio modes">{["Lipsync", "Speech", "Soundtrack", "Translate"].map((item) => <button key={item} role="tab" aria-selected={mode === item} className={mode === item ? "selected" : ""} onClick={() => setMode(item)}>{item}</button>)}</div><SchemaSummary workflowId={workflowId} />{mode === "Lipsync" && <ReferencePicker kind="image" selected={referenceAssetIds} onChange={setReferenceAssetIds} />}<label className="upload-box"><span>＋</span><strong>{fileName || (mode === "Lipsync" ? "Upload an audio track" : "Upload audio")}</strong><small>Drag and drop or browse</small><input type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { setFileName(file.name); void registerDryAsset(file, "audio").then(setFileAssetId).catch(() => setFileAssetId("")); } }} /></label><button className="audio-input" onClick={() => setPrompt((value) => value || "Generate a natural spoken delivery") }><span>◉</span><div><strong>Generate speech</strong><small>or upload audio</small></div></button><label>Prompt<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={mode === "Translate" ? "Paste dialogue to translate..." : mode === "Soundtrack" ? "Describe the sound bed..." : mode === "Speech" ? "Write the delivery..." : "Write what the character should say..."} aria-label="Audio prompt" /></label><div className="control-grid"><label>Model<select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Audio model"><option>Voice Field</option><option>Natural Voice</option><option>Dialogue Draft</option></select></label><label>Quality<select value={quality} onChange={(event) => setQuality(event.target.value)} aria-label="Audio quality"><option value="draft">Draft</option><option value="high">High</option></select></label>{declaredInputs.includes("voice") && <label>Voice<select value={voice} onChange={(event) => setVoice(event.target.value)} aria-label="Speech voice"><option>Field narrator</option><option>Warm guide</option><option>Studio host</option></select></label>}{declaredInputs.includes("language") && <label>Language<select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Translation language"><option>English</option><option>Spanish</option><option>Japanese</option><option>French</option></select></label>}{declaredInputs.includes("duration") && <label>Duration<select value={duration} onChange={(event) => setDuration(event.target.value)} aria-label="Audio duration"><option value="5">5 sec</option><option value="10">10 sec</option><option value="30">30 sec</option></select></label>}</div>{mode === "Lipsync" && <label className="consent-toggle"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I have consent to animate this person’s identity.</label>}<button className="generate-button full" disabled={mode === "Lipsync" && !consent} onClick={() => onGenerate(`${mode} generation`, schemaInputs(workflowId, { prompt, model, quality, fileName, assetId: fileAssetId, referenceAssetIds, characterAssetId: referenceAssetIds, audioAssetId: fileAssetId, consent, mode, voice, language, duration: Number(duration) }))}>Generate <Icon>✦</Icon></button></aside></div>;
}

const agentTemplates = [
  ["Storyboard Planner", "Turns a brief into ordered scenes and shot beats.", "Cinema"],
  ["Campaign Director", "Keeps product, audience, and variants aligned.", "Marketing"],
  ["Image Curator", "Selects references and proposes visual directions.", "Image"],
  ["Comfy Workflow Builder", "Maps approved inputs to a ComfyUI workflow.", "MCP & CLI"],
];

function AgentStudio({ onGenerate: onGenerateBase }: { onGenerate: Generate }) {
  const [tab, setTab] = useState("Templates");
  const [selected, setSelected] = useState(agentTemplates[0][0]);
  const [agentName, setAgentName] = useState("Field assistant");
  const [instructions, setInstructions] = useState("Plan creative work, then ask for approval before a run.");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Array<{ role: "you" | "agent"; text: string }>>([]);
  const [agentId, setAgentId] = useState("agent_dry_field");
  const [runs, setRuns] = useState<Array<{ id: string; state: string; prompt: string }>>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const agentWorkflowId = "agent-plan";
  const onGenerate: Generate = (label, inputs = {}) => onGenerateBase(label, { workflowId: agentWorkflowId, ...schemaInputs(agentWorkflowId, inputs) });
  useEffect(() => {
    let mounted = true;
    void fetch(`/api/agents?id=${encodeURIComponent(agentId)}`).then((response) => response.ok ? response.json() : null).then((body: { agent?: { messages?: Array<{ role: "user" | "agent"; text: string }>; runs?: Array<{ id: string; state: string; prompt: string }> } } | null) => {
      if (!mounted || !body?.agent) return;
      setChat((body.agent.messages ?? []).map((item) => ({ role: item.role === "user" ? "you" : "agent", text: item.text })));
      setRuns(body.agent.runs ?? []);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [agentId]);
  const saveAgent = async () => {
    setSaveStatus("Saving agent…");
    const response = await fetch("/api/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: agentName, template: selected, instructions, idempotencyKey: `${agentName}:${selected}` }) });
    const body: { agent?: { id?: string }; error?: { message?: string } } = await response.json().catch(() => ({}));
    if (response.ok && body.agent?.id) setAgentId(body.agent.id);
    setSaveStatus(response.ok ? "Agent saved to dry workspace." : body.error?.message ?? "Could not save agent.");
  };
  const send = async () => {
    const text = message.trim();
    if (!text) return;
    const response = await fetch("/api/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: agentId, action: "message", text }) });
    const body = await response.json().catch(() => ({})) as { agent?: { messages?: Array<{ role: "user" | "agent"; text: string }> }; error?: { message?: string } };
    if (response.ok && body.agent?.messages) setChat(body.agent.messages.map((item) => ({ role: item.role === "user" ? "you" : "agent", text: item.text })));
    else setSaveStatus(body.error?.message ?? "Could not send message.");
    setMessage("");
  };
  const createRun = async () => {
    const response = await fetch("/api/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: agentId, action: "run", prompt: `${agentName || "Agent"} plan` }) });
    const body = await response.json().catch(() => ({})) as { run?: { id: string; state: string; prompt: string }; error?: { message?: string } };
    if (response.ok && body.run) setRuns((items) => [...items, body.run!]);
    else setSaveStatus(body.error?.message ?? "Could not create run.");
  };
  const approveRun = async (runId: string) => {
    const response = await fetch("/api/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: agentId, action: "approve", runId }) });
    const body = await response.json().catch(() => ({})) as { run?: { id: string; state: string; prompt: string }; error?: { message?: string } };
    if (response.ok && body.run) setRuns((items) => items.map((item) => item.id === body.run!.id ? body.run! : item));
    else setSaveStatus(body.error?.message ?? "Could not approve run.");
  };
  return <div className="agent-layout">
    <section className="agent-main">
      <div className="agent-heading"><div><p className="eyebrow">BOSONFIELD / AGENT STUDIO</p><h2>Build a creative copilot.</h2><p>Start from a template, shape its instructions, and keep every execution approval-gated.</p></div><span className="agent-status"><i className="status-light" /> DRY / SAFE</span></div>
      <div className="studio-tabs" role="tablist" aria-label="Agent Studio modes">{["Templates", "My agents", "Chats", "Runs"].map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === "Templates" && <><div className="agent-template-grid">{agentTemplates.map(([name, description, route]) => <button key={name} className={selected === name ? "agent-template selected" : "agent-template"} onClick={() => setSelected(name)}><span className="agent-glyph">{name.slice(0, 2).toUpperCase()}</span><strong>{name}</strong><small>{description}</small><em>{route} tools ↗</em></button>)}</div><div className="agent-detail"><div><p className="eyebrow">SELECTED TEMPLATE</p><h3>{selected}</h3><p>Uses registered Bosonfield capabilities only. Inputs, assets, and estimated credits remain visible before queueing.</p></div><button className="primary-button" onClick={() => { setTab("My agents"); setAgentName(selected); setSaveStatus(""); }}>Customize <Icon>↗</Icon></button></div></>}
      {tab === "My agents" && <div className="agent-editor"><label>Agent name<input value={agentName} onChange={(event) => { setAgentName(event.target.value); setSaveStatus(""); }} aria-label="Agent name" /></label><label>Instructions<textarea value={instructions} onChange={(event) => { setInstructions(event.target.value); setSaveStatus(""); }} aria-label="Agent instructions" /></label><div className="agent-permissions"><span>Allowed capabilities</span><div className="tag-row"><span>Plan</span><span>Read library</span><span>Draft workflow</span><span>Queue with approval</span></div></div><div className="utility-actions"><button className="ghost-button" onClick={() => void saveAgent()}>Save agent</button><button className="primary-button" onClick={() => onGenerate(`${agentName || "Agent"} plan`, { agentName, instructions, template: selected, approvalRequired: true })}>Run dry plan <Icon>✦</Icon></button></div>{saveStatus && <small className="guided-status">{saveStatus}</small>}</div>}
      {tab === "Chats" && <div className="agent-chat"><div className="chat-history">{chat.length ? chat.map((item, index) => <div className={`chat-bubble ${item.role}`} key={`${item.role}-${index}`}><small>{item.role === "you" ? "YOU" : agentName.toUpperCase()}</small><p>{item.text}</p></div>) : <div className="history-empty"><span className="empty-orbit">◌</span><p>Ask your agent to shape an idea.</p><small>Responses are local dry planning hints until a run is approved.</small></div>}</div><div className="chat-compose"><textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); send(); } }} placeholder="Describe what you want to make..." aria-label="Agent message" /><button className="primary-button" onClick={send}>Send <Icon>↗</Icon></button></div></div>}
      {tab === "Runs" && <div className="agent-runs"><div className="agent-run-row"><span className="state-dot complete" /><div><strong>Approval-gated execution</strong><small>Plans remain pending until you approve them.</small></div><span className="run-badge">COMFY READY</span></div>{runs.map((run) => <div className="agent-run-row" key={run.id}><span className={`state-dot ${run.state === "queued" ? "queued" : "complete"}`} /><div><strong>{run.prompt}</strong><small>{run.state === "pending_approval" ? "Awaiting approval" : "Queued for ComfyUI"}</small></div>{run.state === "pending_approval" && <button className="ghost-button" onClick={() => void approveRun(run.id)}>Approve</button>}</div>)}<button className="ghost-button" onClick={() => void createRun()}>Create dry run <Icon>✦</Icon></button></div>}
    </section>
    <aside className="agent-sidebar"><div className="panel-heading"><span>AGENT CONTRACT</span><span className="live-label">BOUNDED</span></div><div className="inspector-block"><small>MODEL BACKEND</small><strong>ComfyUI adapter</strong><p>Workflow execution stays behind the approved job boundary.</p></div><div className="inspector-block"><small>SAFETY</small><div className="tag-row"><span>No arbitrary code</span><span>Explicit approval</span><span>Asset lineage</span></div></div></aside>
  </div>;
}

function DesignAgent({ onGenerate: onGenerateBase }: { onGenerate: Generate }) {
  const [tab, setTab] = useState("Brief");
  const [brief, setBrief] = useState("");
  const [audience, setAudience] = useState("Independent creators");
  const [format, setFormat] = useState("Campaign key art");
  const [mood, setMood] = useState("Quiet intensity");
  const [beats, setBeats] = useState(["Open with the subject", "Reveal the product", "End on a clear action"]);
  const [designId, setDesignId] = useState("design_dry_field");
  const [savedDesigns, setSavedDesigns] = useState<Array<{ id: string; name: string; brief: string; audience: string; format: string; mood: string; beats: string[] }>>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const designWorkflowId = "design-plan";
  const onGenerate: Generate = (label, inputs = {}) => onGenerateBase(label, { workflowId: designWorkflowId, ...schemaInputs(designWorkflowId, inputs) });
  useEffect(() => {
    let mounted = true;
    void fetch(`/api/designs?id=${encodeURIComponent(designId)}`).then((response) => response.ok ? response.json() : null).then((body: { design?: { id: string; brief: string; audience: string; format: string; mood: string; beats: string[] } } | null) => {
      if (!mounted || !body?.design) return;
      const design = body.design;
      setBrief(design.brief); setAudience(design.audience); setFormat(design.format); setMood(design.mood); setBeats(design.beats);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [designId]);
  useEffect(() => {
    let mounted = true;
    void fetch("/api/designs").then((response) => response.ok ? response.json() : null).then((body: { designs?: Array<{ id: string; name: string; brief: string; audience: string; format: string; mood: string; beats: string[] }> } | null) => {
      if (mounted) setSavedDesigns(body?.designs ?? []);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [saveStatus]);
  const openDesign = (design: typeof savedDesigns[number]) => {
    setDesignId(design.id); setBrief(design.brief); setAudience(design.audience); setFormat(design.format); setMood(design.mood); setBeats(design.beats); setTab("Brief"); setSaveStatus("Design loaded.");
  };
  const addBeat = () => setBeats((items) => [...items, `New scene beat ${items.length + 1}`]);
  const saveDesign = async () => {
    if (!brief.trim()) { setSaveStatus("Add a creative brief before saving."); return; }
    setSaveStatus("Saving design…");
    const response = await fetch("/api/designs", { method: designId === "design_dry_field" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: designId === "design_dry_field" ? undefined : designId, name: format, brief, audience, format, mood, beats, idempotencyKey: `${format}:${brief}` }) });
    const body = await response.json().catch(() => ({})) as { design?: { id?: string }; error?: { message?: string } };
    if (response.ok && body.design?.id) setDesignId(body.design.id);
    setSaveStatus(response.ok ? "Design saved to dry workspace." : body.error?.message ?? "Could not save design.");
  };
  return <div className="design-layout"><section className="design-main"><div className="agent-heading"><div><p className="eyebrow">BOSONFIELD / DESIGN AGENT</p><h2>Brief to visual system.</h2><p>Shape a direction, arrange the beats, and hand a clean plan to ComfyUI workflows.</p></div><span className="agent-status"><i className="status-light" /> PLAN MODE</span></div><div className="studio-tabs" role="tablist" aria-label="Design Agent modes">{["Brief", "Board", "Workflow", "Review", "Saved"].map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>{tab === "Brief" && <div className="design-brief"><label>Creative brief<textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="What should the audience feel, see, and do?" aria-label="Creative brief" /></label><div className="control-grid"><label>Audience<select value={audience} onChange={(event) => setAudience(event.target.value)}><option>Independent creators</option><option>Product teams</option><option>Film audience</option></select></label><label>Output<select value={format} onChange={(event) => setFormat(event.target.value)}><option>Campaign key art</option><option>Short film board</option><option>Social video system</option></select></label><label>Mood<select value={mood} onChange={(event) => setMood(event.target.value)}><option>Quiet intensity</option><option>Playful surreal</option><option>Documentary real</option></select></label></div><button className="primary-button" onClick={() => setTab("Board")}>Build board <Icon>↗</Icon></button></div>}{tab === "Board" && <div className="design-board"><div className="board-toolbar"><span>SCENE BEATS / {beats.length}</span><button className="ghost-button" onClick={addBeat}>+ Add beat</button></div><div className="board-grid">{beats.map((beat, index) => <article className="board-card" key={`${beat}-${index}`}><span>0{index + 1}</span><input value={beat} onChange={(event) => setBeats((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} aria-label={`Scene beat ${index + 1}`} /><small>Reference slot · direction · output</small></article>)}</div><button className="primary-button" onClick={() => setTab("Workflow")}>Map workflow <Icon>↗</Icon></button></div>}{tab === "Workflow" && <div className="design-workflow"><div className="workflow-node"><span>01</span><strong>Brief parser</strong><small>Extract intent and constraints</small></div><i className="workflow-connector">↓</i><div className="workflow-node"><span>02</span><strong>Scene planner</strong><small>{beats.length} ordered beats · {format}</small></div><i className="workflow-connector">↓</i><div className="workflow-node"><span>03</span><strong>ComfyUI render queue</strong><small>Approval required · dry graph until connected</small></div><button className="primary-button" onClick={() => setTab("Review")}>Review plan <Icon>↗</Icon></button></div>}{tab === "Review" && <div className="design-review"><div className="review-card"><p className="eyebrow">READY FOR APPROVAL</p><h3>{format}</h3><p>{brief || "A visual system assembled from your brief."}</p><div className="tag-row"><span>{audience}</span><span>{mood}</span><span>{beats.length} beats</span></div></div><div className="utility-actions"><button className="ghost-button" onClick={() => setTab("Brief")}>Edit brief</button><button className="ghost-button" onClick={() => void saveDesign()}>Save design</button><button className="primary-button" onClick={() => onGenerate("Design Agent plan", { brief, audience, format, mood, sceneCount: beats.length, sceneBeats: beats, approvalRequired: true })}>Approve dry plan <Icon>✦</Icon></button></div>{saveStatus && <small className="guided-status">{saveStatus}</small>}</div>}{tab === "Saved" && <div className="utility-panel"><div><p className="eyebrow">SAVED DESIGNS</p><h3>Reopen a visual system</h3><p>Load a saved dry design and continue editing its brief, beats, or ComfyUI handoff.</p></div><div className="catalog-mini">{savedDesigns.map((design) => <button key={design.id} className={design.id === designId ? "selected" : ""} onClick={() => openDesign(design)}><strong>{design.name}</strong><small>{design.format} · {design.beats.length} beats</small><span>↗</span></button>)}{!savedDesigns.length && <small>No saved designs yet.</small>}</div>{saveStatus && <small className="guided-status">{saveStatus}</small>}</div>}</section><aside className="agent-sidebar"><div className="panel-heading"><span>DESIGN CONTRACT</span><span className="live-label">READY</span></div><div className="inspector-block"><small>DELIVERABLE</small><strong>Brief · board · workflow</strong><p>Every scene remains editable before queueing.</p></div><div className="inspector-block"><small>COMFYUI HANDOFF</small><div className="tag-row"><span>Prompt graph</span><span>References</span><span>Shot metadata</span></div></div></aside></div>;
}

function FeatureStudio({ active, onGenerate }: { active: Studio; onGenerate: Generate }) {
  const descriptions: Record<string, [string, string, string]> = {
    Cinema: ["Direct the whole shot.", "Scenes, characters, locations, and camera language in one project workspace.", "Open a project"],
    "MCP & CLI": ["Bring the field to your agent.", "Connect approved Bosonfield capabilities to an MCP client with explicit approval.", "View tools"],
    Academy: ["Learn the craft.", "Short lessons, workflow guides, and reproducible project recipes.", "Browse lessons"],
    Supercomputer: ["Brief to production plan.", "A constrained planner turns a creative brief into inspectable shots and cost.", "Draft a plan"],
    Community: ["See what is moving.", "Public projects, prompts, presets, and provenance from the Bosonfield community.", "Explore projects"],
    Plugins: ["Stay in your tools.", "Host adapters return approved assets to your creative application.", "View adapters"],
    Marketing: ["Build a campaign, not a clip.", "Product profile, brief, shot plan, approval, and variants.", "Create campaign"],
    Canvas: ["Think in scenes.", "Lay out assets, references, and project relationships spatially.", "Open canvas"],
    Originals: ["A place for finished worlds.", "Editorial collections for original Bosonfield stories and experiments.", "Browse originals"],
    UGC: ["Make the brief feel human.", "Product context, presenter direction, and social-ready variants over the shared video workflows.", "Create UGC brief"],
    Influencer: ["Build a consistent presence.", "Character identity, outfit, product, and motion stay connected across scenes.", "Open character lab"],
    "AI Influencer": ["Build an AI creator.", "Define a repeatable persona, voice, visual identity, and publishing-ready variations.", "Create influencer"],
    Clipping: ["Find the moment.", "Turn a long source into short, framed clips with timestamps, captions, and aspect-ratio variants.", "Create clips"],
    "Vibe Motion": ["Direct the vibe.", "Transfer camera energy and movement language onto a reference without losing the subject.", "Shape motion"],
    Recast: ["Recast the scene.", "Swap a performer or visual identity while preserving timing, composition, and shot intent.", "Recast video"],
  };
  const [title, desc, action] = descriptions[active] ?? descriptions.Cinema;
  const modes: Record<string, string[]> = {
    Cinema: ["Scenes", "Characters", "Locations", "Storyboard"],
    "MCP & CLI": ["Generate", "Queue", "History", "Skills"],
    Academy: ["Courses", "Workflow guides", "Toolkit", "FAQ"],
    Supercomputer: ["Brief", "Shot list", "Review", "Project files"],
    Community: ["Projects", "Generations", "Presets", "Creators"],
    Plugins: ["Photoshop", "Premiere", "After Effects", "Figma"],
    Marketing: ["UGC", "Product demo", "TV spot", "Virtual try-on"],
    Canvas: ["Board", "References", "Scenes", "Versions"],
    Originals: ["Higgsfield choice", "First look", "On our radar", "Coming soon"],
    UGC: ["Product review", "Tutorial", "Unboxing", "Wildcard"],
    Influencer: ["Character", "Outfit", "Product", "Motion"],
    "AI Influencer": ["Persona", "Voice", "Content", "Export"],
    Clipping: ["Select", "Captions", "Variants", "History"],
    "Vibe Motion": ["Reference", "Motion", "Camera", "Render"],
    Recast: ["Source", "Identity", "Timing", "Export"],
  };
  const modeList = modes[active] ?? ["Create", "Edit", "Explore", "History"];
  const [selectedMode, setSelectedMode] = useState(modeList[0]);
  const currentMode = modeList.includes(selectedMode) ? selectedMode : modeList[0];
  return <div className="feature-layout"><section className="feature-hero"><div className="feature-sigil">{active.slice(0, 2).toUpperCase()}</div><p className="eyebrow">BOSONFIELD / {active.toUpperCase()}</p><h2>{title}</h2><p>{desc}</p><button className="primary-button" onClick={() => onGenerate(`${active} dry run`)}>{action} <Icon>↗</Icon></button><div className="feature-modes" role="tablist" aria-label={`${active} feature modes`}>{modeList.map((mode) => <button key={mode} role="tab" aria-selected={currentMode === mode} className={currentMode === mode ? "selected" : ""} onClick={() => setSelectedMode(mode)}>{mode}<span>↗</span></button>)}</div><div className="feature-mode-detail" role="tabpanel"><p className="eyebrow">{active.toUpperCase()} / {currentMode.toUpperCase()}</p><h3>{currentMode}</h3><p>{currentMode === "History" ? "Review, retry, duplicate, or cancel runs from this studio." : currentMode === "Review" ? "Inspect the bounded plan, inputs, and estimated credit cost before approval." : currentMode === "Skills" ? "Use approved workflow skills with explicit permissions and provenance." : `${currentMode} stays connected to the shared assets, projects, and dry job history.`}</p><button className="ghost-button" onClick={() => onGenerate(`${active} · ${currentMode}`)}>Open {currentMode} <Icon>↗</Icon></button></div></section>{["Clipping", "Vibe Motion", "Recast", "AI Influencer"].includes(active) && <FeatureLabPanel active={active} onGenerate={onGenerate} />}{["Marketing", "UGC"].includes(active) && <GuidedPanel kind="campaign" onGenerate={onGenerate} />}{["Cinema", "Supercomputer"].includes(active) && <GuidedPanel kind="shot-plan" onGenerate={onGenerate} />}{active === "Supercomputer" && <WorkerStatusPanel />}{active === "Canvas" && <GuidedPanel kind="canvas" onGenerate={onGenerate} />}{active === "MCP & CLI" && <McpPanel onGenerate={onGenerate} />}{active === "Community" && <CommunityPanel />}{active === "Plugins" && <PluginsPanel />}{active === "Academy" && <AcademyPanel />}{active === "Originals" && <OriginalsPanel />}<section className="feature-cards"><div className="feature-card"><small>CAPABILITIES</small><strong>{active === "Marketing" || active === "UGC" ? "Product → brief → shots" : active === "Community" ? "Projects · Generations · Presets" : active === "Supercomputer" ? "Brief → plan → approved runs" : "Registered workflows"}</strong><span>→</span></div><div className="feature-card"><small>PUBLIC SURFACE</small><strong>{modeList.length} feature areas mapped</strong><span className="status-light" /></div><div className="feature-card"><small>PROVENANCE</small><strong>Every output traceable</strong><span>↗</span></div></section></div>;
}

type WorkerSnapshot = {
  mode?: string;
  configured?: boolean;
  healthy?: boolean;
  message?: string;
  queue?: { queue_pending?: unknown[]; queue_running?: unknown[] } | null;
};

function WorkerStatusPanel() {
  const [snapshot, setSnapshot] = useState<WorkerSnapshot | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [nodeCount, setNodeCount] = useState<number | null>(null);
  const [templateCount, setTemplateCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all([
        fetch("/api/worker"),
        fetch("/api/worker/system_stats"),
        fetch("/api/worker/object_info"),
        fetch("/api/worker/workflow_templates"),
      ]);
      const bodies = await Promise.all(responses.map(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof body?.error?.message === "string" ? body.error.message : "Worker capability unavailable");
        return body as Record<string, unknown>;
      }));
      const [worker, system, nodes, templates] = bodies;
      setSnapshot(worker as WorkerSnapshot);
      setStats((system.value ?? {}) as Record<string, unknown>);
      const nodeValue = nodes.value;
      const templateValue = templates.value;
      setNodeCount(nodeValue && typeof nodeValue === "object" && !Array.isArray(nodeValue) ? Object.keys(nodeValue).length : Array.isArray(nodeValue) ? nodeValue.length : 0);
      setTemplateCount(Array.isArray(templateValue) ? templateValue.length : templateValue && typeof templateValue === "object" ? Object.keys(templateValue).length : 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Worker capability unavailable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, []);
  const system = stats?.system && typeof stats.system === "object" && !Array.isArray(stats.system) ? stats.system as Record<string, unknown> : {};
  const queue = snapshot?.queue;
  const healthy = snapshot?.healthy !== false && !error;
  return <section className="utility-panel worker-status-panel" aria-label="ComfyUI worker status"><div><p className="eyebrow">COMFYUI / WORKER</p><h3>Worker health & capabilities</h3><p>{snapshot?.message ?? "Official ComfyUI probes stay visible before a production run."}</p></div><div className="worker-health"><span className={`status-light ${healthy ? "" : "offline"}`} /><strong>{loading ? "CHECKING" : healthy ? "READY" : "UNAVAILABLE"}</strong><small>{snapshot?.mode ?? "dry-run"}{snapshot?.configured ? " · configured" : " · simulated"}</small></div><button className="ghost-button" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"} ↻</button>{error && <small className="worker-error">{error}</small>}<div className="worker-metrics"><div><small>QUEUE</small><strong>{(queue?.queue_running?.length ?? 0)} running · {(queue?.queue_pending?.length ?? 0)} pending</strong></div><div><small>SYSTEM</small><strong>{String(system.os ?? "dry-run")} · {String(system.mode ?? snapshot?.mode ?? "simulated")}</strong></div><div><small>NODES</small><strong>{nodeCount === null ? "—" : `${nodeCount} discovered`}</strong></div><div><small>TEMPLATES</small><strong>{templateCount === null ? "—" : `${templateCount} available`}</strong></div></div><small className="guided-status">Uses ComfyUI <code>/queue</code>, <code>/system_stats</code>, <code>/object_info</code>, and <code>/workflow_templates</code>. Dry mode remains model-free.</small></section>;
}

function FeatureLabPanel({ active, onGenerate: onGenerateBase }: { active: Studio; onGenerate: Generate }) {
  const [prompt, setPrompt] = useState("");
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileAssetId, setFileAssetId] = useState("");
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([]);
  const [end, setEnd] = useState("15");
  const [captionStyle, setCaptionStyle] = useState("Clean");
  const [voice, setVoice] = useState("Neutral");
  const [identity, setIdentity] = useState("New identity");
  const onGenerate: Generate = (label, inputs = {}) => {
    if (["Recast", "AI Influencer"].includes(active)) {
      if (typeof window === "undefined" || !window.confirm("Confirm you have consent to use this person’s identity.")) return;
      const defaults = active === "Recast" ? { duration: 5, ratio: "9:16", quality: "draft" } : { model: "Seed Field", duration: 5, ratio: "9:16", quality: "draft", resolution: "720p" };
      onGenerateBase(label, { ...defaults, ...inputs, consent: true });
      return;
    }
    const defaults = active === "Clipping" ? { ratio: "9:16", quality: "draft" } : active === "Vibe Motion" ? { presetId: "Orbit 360", duration: 5, ratio: "9:16", quality: "draft", resolution: "720p" } : {};
    onGenerateBase(label, { ...defaults, ...inputs });
  };
  const data = active === "Clipping" ? { eyebrow: "CLIP EXTRACTION", title: "Select a moment, then multiply it.", hint: "Source video is preserved; clip bounds remain editable before queueing." } : active === "Vibe Motion" ? { eyebrow: "MOTION TRANSFER", title: "Reference movement, keep the idea.", hint: "Use a motion reference and a short direction to build a bounded video-motion job." } : active === "Recast" ? { eyebrow: "IDENTITY RECAST", title: "Change who is in frame.", hint: "Consent and source lineage travel with every recast preview." } : { eyebrow: "AI INFLUENCER", title: "Persona to publishable variants.", hint: "Keep persona, voice, and output format together as a reusable profile." };
  return <section className="utility-panel feature-lab-panel"><div><p className="eyebrow">{data.eyebrow}</p><h3>{data.title}</h3><p>{data.hint}</p></div><div className="control-grid">{active !== "AI Influencer" && <><label>Source<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Library asset or URL" aria-label={`${active} source`} /></label><label className="upload-box"><span>＋</span><strong>{fileName || "Upload source"}</strong><small>Stored as dry Library metadata</small><input type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { setFileName(file.name); void registerDryAsset(file, "video").then(setFileAssetId).catch(() => setFileAssetId("")); } }} /></label></>}{active === "Clipping" && <><label>End seconds<input type="number" min="1" value={end} onChange={(event) => setEnd(event.target.value)} aria-label="Clip end seconds" /></label><label>Captions<select value={captionStyle} onChange={(event) => setCaptionStyle(event.target.value)}><option>Clean</option><option>Bold</option><option>Burned in</option></select></label></>}{active === "Recast" && <label>Identity<input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="Reference identity" aria-label="Recast identity" /></label>}{active === "AI Influencer" && <><label>Persona<input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="Creator persona" aria-label="Influencer persona" /></label><ReferencePicker kind="image" selected={referenceAssetIds} onChange={setReferenceAssetIds} /><label>Voice<select value={voice} onChange={(event) => setVoice(event.target.value)}><option>Neutral</option><option>Warm</option><option>Energetic</option></select></label></>}</div><label>Direction<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={active === "Clipping" ? "What should the clip emphasize?" : "Describe the look, pacing, and intent..."} aria-label={`${active} direction`} /></label><button className="primary-button" onClick={() => onGenerate(`${active} ${active === "Clipping" ? "selection" : "preview"}`, { prompt, sourceAssetId: fileAssetId || source, identity, persona: identity, referenceAssetIds, voice, captionStyle, clipStart: 0, clipEnd: Number(end), mode: active })}>Queue dry preview <Icon>✦</Icon></button><small className="guided-status">Manifest-bound inputs · ComfyUI handoff remains model-free in this preview.</small></section>;
}

function AcademyPanel() {
  const lessons = ["Project setup", "Prompting for scenes", "Character continuity", "Camera language", "Review and iteration", "Final assembly"];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => {
    if (typeof window === "undefined") return "";
    const slug = new URLSearchParams(window.location.search).get("lesson");
    return lessons.find((lesson) => lesson.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug) ?? "";
  });
  const [opened, setOpened] = useState(false);
  const [linkStatus, setLinkStatus] = useState("");
  const filtered = lessons.filter((lesson) => lesson.toLowerCase().includes(query.toLowerCase()));
  const copyLessonLink = async () => { if (!selected) return; const slug = selected.toLowerCase().replace(/[^a-z0-9]+/g, "-"); const url = `${window.location.origin}/?lesson=${encodeURIComponent(slug)}`; try { await navigator.clipboard.writeText(url); setLinkStatus("Lesson link copied"); } catch { setLinkStatus(url); } };
  const openedLesson = useRef("");
  useEffect(() => {
    if (!opened || !selected) { openedLesson.current = ""; return; }
    if (openedLesson.current === selected) return;
    openedLesson.current = selected;
    const slug = selected.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    void fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "academy-lesson", inputs: { lesson: selected, mode: "academy", label: `${selected} lesson` }, idempotencyKey: `academy-${slug}` }) })
      .then((response) => response.ok ? setLinkStatus("Lesson opened in dry mode · workflow notes ready.") : setLinkStatus("Lesson preview unavailable"))
      .catch(() => setLinkStatus("Lesson preview unavailable"));
  }, [opened, selected]);
  return <section className="utility-panel"><div><p className="eyebrow">ACADEMY TOOLKIT</p><h3>Learn the craft in small steps</h3><p>Short lessons connect directly to the same project, scene, and workflow vocabulary.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons" aria-label="Academy lesson search" /><div className="catalog-mini">{filtered.map((lesson) => <button key={lesson} className={selected === lesson ? "selected" : ""} onClick={() => { setSelected(lesson); setOpened(false); setLinkStatus(""); }}>{lesson}<span>↗</span></button>)}</div>{selected && <div className="utility-result"><strong>{selected}</strong><small>12 min · guided dry lesson · project vocabulary and reproducible workflow notes</small><div className="utility-actions"><button className="ghost-button" onClick={() => setOpened((value) => !value)}>{opened ? "Close lesson" : "Open lesson"} ↗</button><button className="ghost-button" onClick={() => void copyLessonLink()}>Copy lesson link</button></div>{opened && <small className="guided-status">Lesson opened in dry mode · workflow notes ready.</small>}{linkStatus && <small className="guided-status">{linkStatus}</small>}</div>}</section>;
}

function OriginalsPanel() {
  const collections = ["Field Notes", "First Light", "Strange Machines", "Creator Experiments"];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => {
    if (typeof window === "undefined") return "";
    const slug = new URLSearchParams(window.location.search).get("original");
    return collections.find((collection) => collection.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug) ?? "";
  });
  const [opened, setOpened] = useState(false);
  const [linkStatus, setLinkStatus] = useState("");
  const filtered = collections.filter((collection) => collection.toLowerCase().includes(query.toLowerCase()));
  const copyOriginalLink = async () => { if (!selected) return; const slug = selected.toLowerCase().replace(/[^a-z0-9]+/g, "-"); const url = `${window.location.origin}/?original=${encodeURIComponent(slug)}`; try { await navigator.clipboard.writeText(url); setLinkStatus("Original link copied"); } catch { setLinkStatus(url); } };
  return <section className="utility-panel"><div><p className="eyebrow">ORIGINAL COLLECTIONS</p><h3>Finished worlds and experiments</h3><p>Editorial discovery stays separate from generation execution and uses original Bosonfield metadata.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search collections" aria-label="Originals collection search" /><div className="catalog-mini">{filtered.map((collection) => <button key={collection} className={selected === collection ? "selected" : ""} onClick={() => { setSelected(collection); setOpened(false); setLinkStatus(""); }}>{collection}<span>↗</span></button>)}</div>{selected && <div className="utility-result"><strong>{selected}</strong><small>4 episodes · original Bosonfield editorial collection · no generation dependency</small><div className="utility-actions"><button className="ghost-button" onClick={() => setOpened((value) => !value)}>{opened ? "Close collection" : "Open collection"} ↗</button><button className="ghost-button" onClick={() => void copyOriginalLink()}>Copy original link</button></div>{opened && <small className="guided-status">Collection opened in dry mode · episode metadata ready.</small>}{linkStatus && <small className="guided-status">{linkStatus}</small>}</div>}</section>;
}

function McpPanel({ onGenerate }: { onGenerate: Generate }) {
  const [workflows, setWorkflows] = useState<Array<{ id: string; label: string; capability: string }>>([]);
  const [workflowId, setWorkflowId] = useState("image-basic");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [planReady, setPlanReady] = useState(false);
  useEffect(() => { void fetch("/api/mcp").then((response) => response.ok ? response.json() as Promise<{ capabilities?: Array<{ id: string; label: string; capability: string }> }> : null).then((body) => { const available = body?.capabilities ?? []; setWorkflows(available); if (available.length) setWorkflowId(available[0].id); }).catch(() => undefined); }, []);
  async function plan() {
    const response = await fetch("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "plan", workflowId, prompt }) });
    setPlanReady(response.ok);
    setStatus(response.ok ? "Plan ready · approval required before queue" : "Add a prompt to create a plan");
  }
  async function approve() {
    const response = await fetch("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve", workflowId, prompt }) });
    if (!response.ok) { setStatus("Approval failed"); return; }
    const body = await response.json() as { job?: { id: string } };
    setStatus(body.job ? `Approval accepted · queued ${body.job.id}` : "Approval accepted · queued through jobs API");
  }
  return <section className="utility-panel"><div><p className="eyebrow">APPROVAL-GATED TOOLING</p><h3>Plan before an agent spends</h3><p>MCP can prepare a bounded workflow plan, but never receives raw ComfyUI graph execution.</p></div><label>Workflow<select value={workflowId} onChange={(event) => { setWorkflowId(event.target.value); setPlanReady(false); }} aria-label="MCP workflow">{(workflows.length ? workflows : [{ id: "image-basic", label: "Image generation", capability: "image.generate" }]).map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.label} · {workflow.capability}</option>)}</select></label><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the generation an agent should plan..." aria-label="MCP generation prompt" /><div className="utility-actions"><button className="primary-button" onClick={() => void plan()}>Create plan <Icon>↗</Icon></button><button className="ghost-button" disabled={!planReady} onClick={() => void approve()}>Approve & queue <Icon>✦</Icon></button><button className="ghost-button" onClick={() => onGenerate("MCP workflow preview", { workflowId, prompt })}>Dry preview <Icon>✦</Icon></button></div>{status && <small className="guided-status">{status}</small>}</section>;
}

function CommunityPanel() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string; brief: string; status: string; visibility: string; scenes: Array<{ id: string; title: string; brief: string; order: number; status: string; assetIds: string[] }>; assetIds: string[] }>>([]);
  const [projectId, setProjectId] = useState("project_dry_public_01");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [detailTab, setDetailTab] = useState("Assets");
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; body: string; author: string }>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  useEffect(() => { void fetch("/api/projects?visibility=public&limit=8").then((response) => response.ok ? response.json() : null).then((body: { projects?: typeof projects; nextCursor?: string | null } | null) => { const next = body?.projects ?? []; setProjects(next); setNextCursor(body?.nextCursor ?? null); if (next.length) setProjectId((current) => next.some((project) => project.id === current) ? current : next[0].id); }); }, []);
  async function loadMoreProjects() {
    if (!nextCursor || loadingProjects) return;
    setLoadingProjects(true);
    const response = await fetch(`/api/projects?visibility=public&limit=8&cursor=${encodeURIComponent(nextCursor)}`);
    const body = response.ok ? await response.json() as { projects?: typeof projects; nextCursor?: string | null } : null;
    if (body?.projects?.length) setProjects((current) => [...current, ...body.projects!]);
    setNextCursor(body?.nextCursor ?? null);
    setLoadingProjects(false);
  }
  useEffect(() => { void fetch(`/api/projects/${projectId}/comments`).then((response) => response.ok ? response.json() : null).then((body: { comments?: Array<{ id: string; body: string; author: string }> } | null) => setComments(body?.comments ?? [])); }, [projectId]);
  const socialReady = useRef(false);
  useEffect(() => {
    socialReady.current = false;
    void fetch(`/api/projects/${projectId}/social`).then((response) => response.ok ? response.json() : null).then((body: { social?: { following: boolean; liked: boolean } } | null) => {
      setFollowing(body?.social?.following ?? false);
      setLiked(body?.social?.liked ?? false);
      socialReady.current = true;
    });
  }, [projectId]);
  useEffect(() => {
    if (!socialReady.current) return;
    void Promise.all([
      fetch(`/api/projects/${projectId}/social`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "follow", active: following }) }),
      fetch(`/api/projects/${projectId}/social`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "like", active: liked }) }),
    ]);
  }, [following, liked, projectId]);
  const selectedProject = projects.find((project) => project.id === projectId) ?? projects[0];
  const visibleProjects = projects.filter((project) => `${project.name} ${project.brief}`.toLowerCase().includes(query.toLowerCase()));
  async function postComment() {
    const response = await fetch(`/api/projects/${projectId}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: comment }) });
    if (!response.ok) { setStatus("Write a comment first"); return; }
    const body = await response.json() as { comment?: { id: string; body: string; author: string } };
    if (body.comment) setComments((current) => [...current, body.comment!]);
    setComment("");
    setStatus("Comment added to the dry project");
  }
  async function publish() { const response = await fetch(`/api/projects/${projectId}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visibility: "public" }) }); setStatus(response.ok ? "Publish review requested" : "Publish unavailable"); }
  const copyProjectLink = async () => {
    if (!selectedProject) return;
    const url = `${window.location.origin}/?project=${encodeURIComponent(selectedProject.id)}`;
    try { await navigator.clipboard.writeText(url); setStatus("Project link copied"); } catch { setStatus(url); }
  };
  return <section className="utility-panel"><div><p className="eyebrow">COMMUNITY SIGNAL</p><h3>Projects, presets, and provenance</h3><p>Browse public projects, inspect their lineage, and leave feedback without exposing private prompts or assets.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or creators" aria-label="Community search" /><div className="community-project-grid" aria-label="Public projects">{visibleProjects.map((project) => <button type="button" key={project.id} className={project.id === selectedProject?.id ? "selected" : ""} onClick={() => { setProjectId(project.id); setDetailTab("Assets"); setStatus(""); }}><strong>{project.name}</strong><small>{project.scenes.length} scenes · {project.visibility} · {project.brief}</small></button>)}{!visibleProjects.length && <small>No public projects match this search.</small>}</div>{nextCursor && <button className="ghost-button" type="button" onClick={() => void loadMoreProjects()} disabled={loadingProjects}>{loadingProjects ? "Loading public projects…" : "Load more public projects"}</button>}{selectedProject && <><div className="utility-result"><strong>{selectedProject.name}</strong><small>{selectedProject.scenes.length} scenes · approved preview · provenance attached</small></div><div className="detail-tabs" role="tablist" aria-label="Community project detail">{["Assets", "Brief", "Details", "Comments"].map((tab) => <button key={tab} role="tab" aria-selected={detailTab === tab} className={detailTab === tab ? "selected" : ""} onClick={() => setDetailTab(tab)}>{tab}</button>)}</div>{detailTab === "Comments" ? <><div className="comment-list">{comments.map((item) => <span key={item.id}>{item.author}: {item.body}</span>)}</div><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Leave a constructive comment..." aria-label="Community comment" /><button className="primary-button" onClick={() => void postComment()}>Comment <Icon>↗</Icon></button></> : <div className="utility-result"><strong>{detailTab === "Assets" ? `${selectedProject.assetIds.length} source assets · ${selectedProject.scenes.length} scene outputs` : detailTab === "Brief" ? selectedProject.brief : "video-i2v · version 1 · 18 credits estimated"}</strong><small>{detailTab === "Assets" ? "Public preview lineage" : detailTab === "Brief" ? "Original brief and scene intent" : "Workflow provenance and creator metadata"}</small></div>}<div className="utility-actions"><button className="ghost-button" onClick={() => setFollowing((value) => !value)}>{following ? "Following" : "Follow creator"}</button><button className="ghost-button" onClick={() => setLiked((value) => !value)}>{liked ? "Liked" : "Like"}</button><button className="ghost-button" onClick={() => void copyProjectLink()}>Copy project link</button><button className="primary-button" onClick={() => void publish()}>Publish review <Icon>↗</Icon></button></div></>}{status && <small className="guided-status">{status}</small>}</section>;
}

function PluginsPanel() {
  const [plugins, setPlugins] = useState<Array<{ host: string; capabilities: string[] }>>([]);
  const [host, setHost] = useState("Photoshop");
  const [operation, setOperation] = useState("Generate image");
  const [status, setStatus] = useState("");
  useEffect(() => { void fetch("/api/plugins").then((response) => response.ok ? response.json() : null).then((body: { plugins?: Array<{ host: string; capabilities: string[] }> } | null) => { const available = body?.plugins ?? []; setPlugins(available); if (available[0]?.host) setHost((current) => available.some((plugin) => plugin.host === current) ? current : available[0].host); }); }, []);
  async function prepare() { const response = await fetch("/api/plugins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ host, operation }) }); setStatus(response.ok ? `${host} adapter prepared for ${operation}` : "Adapter request failed"); }
  const capabilities = plugins.find((plugin) => plugin.host === host)?.capabilities ?? [];
  return <section className="utility-panel"><div><p className="eyebrow">HOST ADAPTERS</p><h3>Prepare an approved host action</h3><p>Adapters call the same asset and job APIs; they never connect directly to a worker or store host credentials.</p></div><select value={host} onChange={(event) => setHost(event.target.value)} aria-label="Plugin host">{(plugins.length ? plugins : [{ host: "Photoshop", capabilities: [] }]).map((plugin) => <option key={plugin.host}>{plugin.host}</option>)}</select><select value={operation} onChange={(event) => setOperation(event.target.value)} aria-label="Plugin operation"><option>Generate image</option><option>Prompt edit</option><option>Background removal</option><option>Upscale</option></select>{capabilities.length > 0 && <small className="guided-status">Capabilities: {capabilities.join(" · ")}</small>}<button className="primary-button" onClick={() => void prepare()}>Prepare adapter <Icon>↗</Icon></button>{status && <small className="guided-status">{status}</small>}</section>;
}

function GuidedPanel({ kind, onGenerate }: { kind: "campaign" | "shot-plan" | "canvas"; onGenerate: Generate }) {
  type Campaign = { id: string; name: string; productTitle: string; format: string; sourceUrl?: string | null; productImages: string[]; hook?: string | null; avatar: string; referenceAd?: string | null; variants: number };
  type ShotPlan = { id: string; title: string; shots: Array<{ brief: string }> };
  type CanvasNode = { id: string; type: string; x: number; y: number; assetId?: string };
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [productImages, setProductImages] = useState("");
  const [hook, setHook] = useState("");
  const [avatar, setAvatar] = useState("No presenter");
  const [referenceAd, setReferenceAd] = useState("");
  const [format, setFormat] = useState("product-demo");
  const [variants, setVariants] = useState("3");
  const [operator, setOperator] = useState("Field operator");
  const [model, setModel] = useState("Approved video workflow");
  const [memory, setMemory] = useState("Standard");
  const [schedule, setSchedule] = useState("Now");
  const [status, setStatus] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [shotPlans, setShotPlans] = useState<ShotPlan[]>([]);
  const [shotPlanId, setShotPlanId] = useState("");
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [canvasNodeId, setCanvasNodeId] = useState("");
  const [canvasType, setCanvasType] = useState("reference");
  const [canvasX, setCanvasX] = useState("120");
  const [canvasY, setCanvasY] = useState("80");
  const projectId = typeof window === "undefined" ? "project_dry_01" : new URLSearchParams(window.location.search).get("project") || "project_dry_01";
  useEffect(() => {
    if (kind !== "campaign") return;
    void fetch("/api/campaigns").then((response) => response.ok ? response.json() : null).then((body: { campaigns?: Campaign[] } | null) => setCampaigns(body?.campaigns ?? []));
  }, [kind]);
  useEffect(() => {
    if (kind !== "shot-plan") return;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/shot-plans`).then((response) => response.ok ? response.json() : null).then((body: { plans?: ShotPlan[] } | null) => setShotPlans(body?.plans ?? []));
  }, [kind, projectId]);
  useEffect(() => {
    if (kind !== "canvas") return;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/canvas`).then((response) => response.ok ? response.json() : null).then((body: { nodes?: CanvasNode[] } | null) => setCanvasNodes(body?.nodes ?? []));
  }, [kind, projectId]);
  function reopenCampaign(id: string) {
    const campaign = campaigns.find((entry) => entry.id === id);
    if (!campaign) return;
    setCampaignId(campaign.id); setTitle(campaign.name); setBrief(campaign.productTitle); setFormat(campaign.format); setSourceUrl(campaign.sourceUrl ?? ""); setProductImages(campaign.productImages.join(", ")); setHook(campaign.hook ?? ""); setAvatar(campaign.avatar); setReferenceAd(campaign.referenceAd ?? ""); setVariants(String(campaign.variants)); setStatus("Campaign reopened");
  }
  function newCampaign() { setCampaignId(""); setTitle(""); setBrief(""); setSourceUrl(""); setProductImages(""); setHook(""); setReferenceAd(""); setStatus("New campaign draft"); }
  function reopenShotPlan(id: string) { const plan = shotPlans.find((entry) => entry.id === id); if (!plan) return; setShotPlanId(plan.id); setTitle(plan.title); setBrief(plan.shots[0]?.brief ?? ""); setStatus("Shot plan reopened"); }
  function newShotPlan() { setShotPlanId(""); setTitle(""); setBrief(""); setStatus("New shot plan draft"); }
  function reopenCanvasNode(id: string) { const node = canvasNodes.find((entry) => entry.id === id); if (!node) return; setCanvasNodeId(node.id); setCanvasType(node.type); setCanvasX(String(node.x)); setCanvasY(String(node.y)); setStatus(`Canvas node reopened`); }
  function newCanvasNode() { setCanvasNodeId(""); setCanvasType("reference"); setCanvasX("120"); setCanvasY("80"); setStatus("New canvas node"); }
  async function submit() {
    const endpoint = kind === "campaign" ? "/api/campaigns" : kind === "shot-plan" ? `/api/projects/${encodeURIComponent(projectId)}/shot-plans` : `/api/projects/${encodeURIComponent(projectId)}/canvas`;
    const body = kind === "campaign" ? { ...(campaignId ? { id: campaignId } : {}), name: title, productTitle: brief, format, sourceUrl, productImages: productImages.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 5), hook, avatar, referenceAd, variants: Number(variants) } : kind === "shot-plan" ? { ...(shotPlanId ? { id: shotPlanId } : {}), title, brief, shotCount: 3, operator, model, memory, schedule } : { type: canvasType, x: Number(canvasX), y: Number(canvasY) };
    const requestBody = kind === "canvas" && canvasNodeId ? { ...body, id: canvasNodeId } : body;
    const response = await fetch(endpoint, { method: (kind === "campaign" && campaignId) || (kind === "shot-plan" && shotPlanId) || (kind === "canvas" && canvasNodeId) ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) });
    const result = await response.json().catch(() => null) as { campaign?: Campaign; plan?: ShotPlan; node?: CanvasNode } | null;
    setStatus(response.ok ? kind === "campaign" && campaignId ? "Campaign updated" : kind === "shot-plan" && shotPlanId ? "Shot plan updated" : "Draft saved" : "Check the required fields");
    if (response.ok && kind === "campaign" && result?.campaign) { setCampaignId(result.campaign.id); setCampaigns((current) => current.some((entry) => entry.id === result.campaign!.id) ? current.map((entry) => entry.id === result.campaign!.id ? result.campaign! : entry) : [...current, result.campaign!]); }
    if (response.ok && kind === "shot-plan" && result?.plan) { setShotPlanId(result.plan.id); setShotPlans((current) => current.some((entry) => entry.id === result.plan!.id) ? current.map((entry) => entry.id === result.plan!.id ? result.plan! : entry) : [...current, result.plan!]); }
    if (response.ok && kind === "canvas" && result?.node) { setCanvasNodeId(result.node.id); setCanvasNodes((current) => current.some((entry) => entry.id === result.node!.id) ? current.map((entry) => entry.id === result.node!.id ? result.node! : entry) : [...current, result.node!]); }
    if (response.ok) onGenerate(kind === "campaign" ? "Campaign shot plan" : kind === "shot-plan" ? "Shot plan preview" : "Canvas node preview");
  }
  return <section className="guided-panel"><div><p className="eyebrow">GUIDED DRAFT</p><h3>{kind === "campaign" ? "Product profile → campaign brief" : kind === "shot-plan" ? "Brief → editable shot plan" : "Storyboard node"}</h3><p>{kind === "canvas" ? "Place a reference on the project board." : "Create a structured dry-run record before any generation is queued."}</p></div>{kind === "campaign" && <div className="guided-saved-row"><label>Saved campaigns<select value={campaignId} onChange={(event) => reopenCampaign(event.target.value)} aria-label="Saved campaigns"><option value="">New campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label><button className="ghost-button" type="button" onClick={newCampaign}>New</button></div>}{kind === "canvas" && <><div className="guided-saved-row"><label>Saved canvas nodes<select value={canvasNodeId} onChange={(event) => reopenCanvasNode(event.target.value)} aria-label="Saved canvas nodes"><option value="">New canvas node</option>{canvasNodes.map((node) => <option key={node.id} value={node.id}>{node.type} · {node.id}</option>)}</select></label><button className="ghost-button" type="button" onClick={newCanvasNode}>New</button></div><div className="control-grid"><label>Node type<input value={canvasType} onChange={(event) => setCanvasType(event.target.value)} aria-label="Canvas node type" /></label><label>X<input type="number" value={canvasX} onChange={(event) => setCanvasX(event.target.value)} aria-label="Canvas node x" /></label><label>Y<input type="number" value={canvasY} onChange={(event) => setCanvasY(event.target.value)} aria-label="Canvas node y" /></label></div></>}{kind !== "canvas" && <><SchemaSummary workflowId={kind === "campaign" ? "campaign-shot" : "explainer-scene"} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "campaign" ? "Campaign name" : "Plan title"} aria-label="Draft title" /><textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder={kind === "campaign" ? "Product title / creative brief" : "Creative brief"} aria-label="Draft brief" />{kind === "campaign" && <><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="Product URL or asset reference" aria-label="Product URL" /><input value={productImages} onChange={(event) => setProductImages(event.target.value)} placeholder="Up to 5 image refs, comma separated" aria-label="Product image references" /><input value={hook} onChange={(event) => setHook(event.target.value)} placeholder="Hook or opening line" aria-label="Campaign hook" /><input value={referenceAd} onChange={(event) => setReferenceAd(event.target.value)} placeholder="Reference ad / inspiration" aria-label="Reference ad" /><select value={avatar} onChange={(event) => setAvatar(event.target.value)} aria-label="Campaign avatar"><option>No presenter</option><option>Field presenter</option><option>Consented character</option></select><select value={format} onChange={(event) => setFormat(event.target.value)} aria-label="Campaign format"><option value="product-demo">Product demo</option><option value="ugc">UGC</option><option value="tv-spot">TV spot</option><option value="vertical">Vertical social</option></select><select value={variants} onChange={(event) => setVariants(event.target.value)} aria-label="Campaign variants"><option value="1">1 variant</option><option value="3">3 variants</option><option value="5">5 variants</option></select></>}{kind === "shot-plan" && <><div className="guided-saved-row"><label>Saved shot plans<select value={shotPlanId} onChange={(event) => reopenShotPlan(event.target.value)} aria-label="Saved shot plans"><option value="">New shot plan</option>{shotPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label><button className="ghost-button" type="button" onClick={newShotPlan}>New</button></div><input value={operator} onChange={(event) => setOperator(event.target.value)} placeholder="Operator / employee" aria-label="Planner operator" /><select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Planner model"><option>Approved video workflow</option><option>Approved image workflow</option><option>Storyboard planner</option></select><select value={memory} onChange={(event) => setMemory(event.target.value)} aria-label="Planner memory"><option>Standard</option><option>High context</option></select><select value={schedule} onChange={(event) => setSchedule(event.target.value)} aria-label="Planner schedule"><option>Now</option><option>Queue later</option><option>Review first</option></select></>}</>}<button className="primary-button" onClick={() => void submit()}>{kind === "canvas" ? (canvasNodeId ? "Update node" : "Add reference") : campaignId ? "Update campaign" : shotPlanId ? "Update shot plan" : "Save draft"} <Icon>↗</Icon></button>{status && <small className="guided-status">{status}</small>}</section>;
}

function WorkspaceView({ active, onGenerate: onGenerateBase }: { active: Studio; onGenerate: Generate }) {
  const requestCounter = useRef(0);
  const [selected, setSelected] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedAssetKind, setSelectedAssetKind] = useState("");
  const [detailNotice, setDetailNoticeState] = useState("");
  const setDetailNotice = (message: string) => { if (message === "Download prepared in dry mode") { void downloadSelectedAsset(); return; } setDetailNoticeState(message); };
  const [libraryAssets, setLibraryAssets] = useState<Array<{ id: string; name: string; kind: string; categories?: string[]; provenance?: { jobId?: string; workflowId?: string } }>>([]);
  const [libraryProjects, setLibraryProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [libraryTargetProjectId, setLibraryTargetProjectId] = useState("project_dry_01");
  const [projectAssets, setProjectAssets] = useState<Array<{ id: string; name: string; kind: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; brief: string; status: string; visibility: string; scenes: Array<{ id: string; title: string; brief: string; order: number; status: string; assetIds: string[] }> }>>([]);
  const [projectScenes, setProjectScenes] = useState<Array<{ id: string; title: string; brief: string; order: number; status: string; assetIds: string[] }>>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [projectDraftName, setProjectDraftName] = useState("");
  const [projectDraftBrief, setProjectDraftBrief] = useState("");
  const [sceneDraftBrief, setSceneDraftBrief] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("all");
  const [librarySearch, setLibrarySearch] = useState("");
  const [favoriteAssetIds, setFavoriteAssetIds] = useState<string[]>(() => { if (typeof window === "undefined") return []; try { return JSON.parse(window.localStorage.getItem("bosonfield.favoriteAssets") ?? "[]"); } catch { return []; } });
  const libraryCategories = [["all", "All"], ["image", "Images"], ["video", "Videos"], ["audio", "Audio"], ["reference", "Characters"], ["shorts", "Shorts Studio"], ["explainer", "Explainer"], ["marketing", "Marketing"], ["lipsync", "Lipsync"], ["favorites", "Favorites"]];
  const isLibrary = active === "Library";
  const isProjects = active === "Projects";
  const activeProject = projects.find((project) => project.id === activeProjectId);
  const title = isLibrary ? "Your field notes." : isProjects ? "Projects in motion." : active === "Team" ? "Create together." : active === "Billing" ? "Keep the math visible." : "Your account, your controls.";
  const description = isLibrary ? "Every input, output, reference, and lineage record in one place." : isProjects ? "Scenes, assets, briefs, and versions stay connected." : active === "Team" ? "Shared workspaces, permissions, comments, and review-ready provenance." : active === "Billing" ? "Dry account with transparent estimates and no payment provider connected." : "Privacy, connected sessions, and identity controls for your workspace.";
  useEffect(() => { if (!isLibrary) return; void fetch("/api/library").then((response) => response.ok ? response.json() : null).then((body: { assets?: Array<{ id: string; name: string; kind: string }> } | null) => setLibraryAssets(body?.assets ?? [])); }, [isLibrary]);
  useEffect(() => {
    if (!isLibrary) return;
    void fetch("/api/projects").then((response) => response.ok ? response.json() : null).then((body: { projects?: Array<{ id: string; name: string }> } | null) => {
      const nextProjects = body?.projects ?? [];
      setLibraryProjects(nextProjects);
      setLibraryTargetProjectId((current) => nextProjects.some((project) => project.id === current) ? current : nextProjects[0]?.id ?? "project_dry_01");
    });
  }, [isLibrary]);
  useEffect(() => {
    if (!isLibrary || !libraryTargetProjectId) return;
    void fetch(`/api/projects/${libraryTargetProjectId}/assets`).then((response) => response.ok ? response.json() : null).then((body: { assets?: Array<{ id: string; name: string; kind: string }> } | null) => setProjectAssets(body?.assets ?? []));
  }, [isLibrary, libraryTargetProjectId]);
  useEffect(() => {
    if (!isLibrary || !libraryAssets.length) return;
    const requestedAssetId = new URLSearchParams(window.location.search).get("asset");
    const requestedAsset = requestedAssetId ? libraryAssets.find((asset) => asset.id === requestedAssetId) : undefined;
    if (requestedAsset) selectAsset(requestedAsset);
  }, [isLibrary, libraryAssets]);
  useEffect(() => {
    if (!isProjects) return;
    void fetch("/api/projects").then((response) => response.ok ? response.json() : null).then((body: { projects?: Array<{ id: string; name: string; brief: string; status: string; visibility: string; scenes: Array<{ id: string; title: string; brief: string; order: number; status: string; assetIds: string[] }> }> } | null) => {
      const nextProjects = body?.projects ?? [];
      setProjects(nextProjects);
      const requestedProjectId = new URLSearchParams(window.location.search).get("project");
      const draftProject = nextProjects.find((project) => project.id === requestedProjectId) ?? nextProjects.find((project) => project.id === activeProjectId) ?? nextProjects[0];
      if (draftProject) { setProjectDraftName(draftProject.name); setProjectDraftBrief(draftProject.brief); setSelected(draftProject.name); }
      setActiveProjectId((current) => draftProject?.id ?? (nextProjects.some((project) => project.id === current) ? current : nextProjects[0]?.id ?? ""));
    });
  }, [isProjects, activeProjectId]);
  useEffect(() => {
    if (!isProjects || !activeProjectId) return;
    void Promise.all([
      fetch(`/api/projects/${activeProjectId}/assets`).then((response) => response.ok ? response.json() : null),
      fetch(`/api/projects/${activeProjectId}/scenes`).then((response) => response.ok ? response.json() : null),
    ]).then(([assets, scenes]: [{ assets?: Array<{ id: string; name: string; kind: string }> } | null, { scenes?: Array<{ id: string; title: string; brief: string; order: number; status: string; assetIds: string[] }> } | null]) => {
      setProjectAssets(assets?.assets ?? []);
      setProjectScenes(scenes?.scenes ?? []);
    });
  }, [isProjects, activeProjectId]);
  const visibleLibraryAssets = libraryAssets.filter((asset) => (libraryFilter === "all" || (libraryFilter === "favorites" ? favoriteAssetIds.includes(asset.id) : (asset.categories ?? [asset.kind]).includes(libraryFilter))) && asset.name.toLowerCase().includes(librarySearch.toLowerCase()));
  function toggleFavoriteAsset() { if (!selectedAssetId) return; setFavoriteAssetIds((current) => { const next = current.includes(selectedAssetId) ? current.filter((id) => id !== selectedAssetId) : [...current, selectedAssetId]; window.localStorage.setItem("bosonfield.favoriteAssets", JSON.stringify(next)); return next; }); setDetailNoticeState(favoriteAssetIds.includes(selectedAssetId) ? "Removed from favorites" : "Added to favorites"); }
  async function addScene() {
    if (!activeProjectId) return;
    const response = await fetch(`/api/projects/${activeProjectId}/scenes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: `Scene ${projectScenes.length + 1}`, brief: sceneDraftBrief, order: projectScenes.length, idempotencyKey: `ui-${++requestCounter.current}` }) });
    const body = await response.json().catch(() => null) as { scene?: { id: string; title: string; brief: string; order: number; status: string; assetIds: string[] } } | null;
    if (response.ok && body?.scene) {
      setProjectScenes((current) => [...current, body.scene!]);
      setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, scenes: [...project.scenes, body.scene!] } : project));
      setSceneDraftBrief("");
      setDetailNotice("Scene draft added");
    } else setDetailNotice("Scene could not be added");
  }
  async function createProject() {
    const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "New dry project", brief: "A new Bosonfield production workspace", idempotencyKey: `ui-${++requestCounter.current}` }) });
    const body = await response.json().catch(() => null) as { project?: { id: string; name: string; brief: string; status: string; visibility: string; scenes: Array<{ id: string; title: string; brief: string; order: number; status: string; assetIds: string[] }> } } | null;
    if (response.ok && body?.project) {
      setProjects((current) => [...current, body.project!]);
      setActiveProjectId(body.project.id);
      setProjectDraftName(body.project.name);
      setProjectDraftBrief(body.project.brief);
      setSelected(body.project.name);
      setDetailNotice("Project draft created");
    } else setDetailNotice("Project could not be created");
  }
  async function toggleProjectVisibility() {
    if (!activeProjectId || !activeProject) return;
    const nextVisibility = activeProject.visibility === "public" ? "private" : "public";
    const endpoint = nextVisibility === "public" ? "publish" : "unpublish";
    const response = await fetch(`/api/projects/${activeProjectId}/${endpoint}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visibility: nextVisibility }) });
    if (!response.ok) { setDetailNotice("Project visibility could not be changed"); return; }
    setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, visibility: nextVisibility } : project));
    setDetailNotice(nextVisibility === "public" ? "Project submitted for public review" : "Project returned to private");
  }
  async function saveProjectDetails() {
    if (!activeProjectId) return;
    const response = await fetch(`/api/projects/${activeProjectId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: projectDraftName, brief: projectDraftBrief }) });
    const body = await response.json().catch(() => null) as { project?: { name: string; brief: string } } | null;
    if (!response.ok || !body?.project) { setDetailNotice("Project details could not be saved"); return; }
    setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, name: body.project!.name, brief: body.project!.brief } : project));
    setSelected(body.project.name);
    setDetailNotice("Project details saved");
  }
  const copyProjectLink = async () => { if (!activeProjectId) return; const url = `${window.location.origin}/?project=${encodeURIComponent(activeProjectId)}`; try { await navigator.clipboard.writeText(url); setDetailNotice("Project link copied"); } catch { setDetailNotice(url); } };
  const copyAssetLink = async () => { if (!selectedAssetId) return; const url = `${window.location.origin}/?asset=${encodeURIComponent(selectedAssetId)}`; try { await navigator.clipboard.writeText(url); setDetailNotice("Asset link copied"); } catch { setDetailNotice(url); } };
  async function attachSelectedAsset() {
    if (!selectedAssetId) return;
    const targetProjectId = (isProjects ? activeProjectId : libraryTargetProjectId) || "project_dry_01";
    const currentProjectAssets = projectAssets.length || isProjects ? projectAssets : ((await fetch(`/api/projects/${targetProjectId}/assets`).then((response) => response.ok ? response.json() : null).catch(() => null)) as { assets?: Array<{ id: string; name: string; kind: string }> } | null)?.assets ?? [];
    const attached = currentProjectAssets.some((entry) => entry.id === selectedAssetId);
    const response = await fetch(`/api/projects/${targetProjectId}/assets/${selectedAssetId}`, attached ? { method: "DELETE" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ relationship: "output", sceneId: projectScenes[0]?.id }) });
    if (!response.ok) { setDetailNotice("Asset could not be attached"); return; }
    const asset = libraryAssets.find((entry) => entry.id === selectedAssetId);
    setProjectAssets((current) => attached ? current.filter((entry) => entry.id !== selectedAssetId) : asset && !current.some((entry) => entry.id === asset.id) ? [...current, asset] : current);
    setDetailNotice(attached ? "Asset detached from project" : "Asset attached to the opening scene");
  }
  async function detachProjectAsset(assetId: string) {
    if (!activeProjectId) return;
    const response = await fetch(`/api/projects/${activeProjectId}/assets/${assetId}`, { method: "DELETE" });
    if (!response.ok) { setDetailNotice("Asset could not be detached"); return; }
    setProjectAssets((current) => current.filter((asset) => asset.id !== assetId));
    setDetailNotice("Asset detached from project");
  }
  function selectAsset(asset: { id: string; name: string; kind: string }) { setSelected(asset.name); setSelectedAssetId(asset.id); setSelectedAssetKind(asset.kind); }
  const selectedAssetInputs = selectedAssetId ? { workflowId: selectedAssetKind === "video" ? "video-v2v" : selectedAssetKind === "audio" ? "audio-speech" : "image-basic", sourceAssetId: selectedAssetId, assetId: selectedAssetId } : {};
  const onGenerate = (label?: string, inputs: Record<string, unknown> = {}) => {
    const operation = label?.toLowerCase() ?? "";
    const workflowId = active === "Library" && selectedAssetId && operation.includes("upscale")
      ? selectedAssetKind === "video" ? "video-upscale" : selectedAssetKind === "audio" ? "audio-speech" : "image-enhance"
      : active === "Library" && selectedAssetId && operation.includes("edit")
        ? selectedAssetKind === "video" ? "video-v2v" : selectedAssetKind === "audio" ? "audio-speech" : "image-edit"
        : undefined;
    onGenerateBase(label, { ...selectedAssetInputs, ...inputs, ...(workflowId ? { workflowId } : {}) });
  };
  async function downloadSelectedAsset() {
    if (!selectedAssetId) { setDetailNotice("Select a library asset first"); return; }
    try {
      const response = await fetch(`/api/assets/${encodeURIComponent(selectedAssetId)}/download`);
      if (!response.ok) { setDetailNotice("Download could not be prepared"); return; }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedAssetId}-provenance.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDetailNotice("Provenance export downloaded");
    } catch {
      setDetailNotice("Download could not be prepared");
    }
  }
  return <div className="workspace-view">{isProjects && <input value={sceneDraftBrief} onChange={(event) => setSceneDraftBrief(event.target.value)} placeholder="Next scene brief" aria-label="Next scene brief" />}
    {isLibrary && <label className="library-project-picker">Attach target <select value={libraryTargetProjectId} onChange={(event) => setLibraryTargetProjectId(event.target.value)} aria-label="Library attachment project">{libraryProjects.length ? libraryProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>) : <option value="project_dry_01">The quiet machine</option>}</select></label>}
    <section className="workspace-hero"><p className="eyebrow">BOSONFIELD / {active.toUpperCase()}</p><h2>{title}</h2><p>{description}</p>{isLibrary && <div className="library-filters"><input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search library" aria-label="Library search" /><div className="library-chips" role="tablist" aria-label="Library categories">{libraryCategories.map(([value, label]) => <button key={value} role="tab" aria-selected={libraryFilter === value} className={libraryFilter === value ? "selected" : ""} onClick={() => setLibraryFilter(value)}>{label}</button>)}</div><select value={libraryFilter} onChange={(event) => setLibraryFilter(event.target.value)} aria-label="Library category">{libraryCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}{isLibrary && <button className="primary-button" onClick={() => onGenerate("Library variation")}>Generate from selection <Icon>✦</Icon></button>}{isProjects && <button className="primary-button" disabled={!activeProject} onClick={() => void addScene()}>New scene <Icon>✦</Icon></button>}{isProjects && <button className="ghost-button" onClick={() => void createProject()}>New project <Icon>↗</Icon></button>}</section>
    <div className="workspace-grid">{isLibrary ? (visibleLibraryAssets.length ? visibleLibraryAssets.map((asset) => <WorkspaceCard key={asset.id} art={asset.kind === "video" ? "art-video" : asset.kind === "audio" ? "art-marketing" : "art-image"} title={asset.name} meta={`${asset.kind} · ready`} onOpen={() => selectAsset(asset)} />) : <div className="library-empty"><strong>No {libraryFilter === "all" ? "library" : libraryCategories.find(([value]) => value === libraryFilter)?.[1] ?? "matching"} assets yet</strong><small>Dry outputs will appear here when this category has a result.</small></div>) : isProjects ? (projects.length ? projects.map((project, index) => <WorkspaceCard key={project.id} art={index % 3 === 0 ? "art-explainer" : index % 3 === 1 ? "art-video" : "art-character"} title={project.name} meta={`${project.scenes.length} scenes · ${project.status}`} onOpen={() => { setActiveProjectId(project.id); setProjectDraftName(project.name); setProjectDraftBrief(project.brief); setSelected(project.name); }} />) : <div className="library-empty"><strong>No projects yet</strong><small>Create a project to start a scene board.</small></div>) : <WorkspaceCard art="art-image" title={active === "Team" ? "Personal workspace" : active === "Billing" ? "480 credits" : "Bosonfield profile"} meta={active === "Team" ? "Owner · private" : active === "Billing" ? "Dry ledger · no charge" : "Connected · secure"} onOpen={() => setSelected(active)} />}</div>
    {(selected || (isProjects && activeProject)) && <section className="workspace-detail"><div><p className="eyebrow">SELECTED RECORD</p><h3>{isProjects ? activeProject?.name : selected}</h3>{isProjects && <div className="project-edit-fields"><input value={projectDraftName} onChange={(event) => setProjectDraftName(event.target.value)} aria-label="Project name" /><textarea value={projectDraftBrief} onChange={(event) => setProjectDraftBrief(event.target.value)} aria-label="Project brief" /><button className="ghost-button" onClick={() => void saveProjectDetails()}>Save details <Icon>↗</Icon></button></div>}<p>{isProjects ? `${activeProject?.brief || "No brief yet"} · ${projectScenes.length} scenes · ${projectAssets.length} attached assets · ${activeProject?.visibility} by default` : isLibrary ? "Source asset · workflow provenance · reusable output" : "Workspace settings and access controls"}</p>{isProjects && <div className="member-roster">{projectScenes.length ? [...projectScenes].sort((a, b) => a.order - b.order).map((scene) => <span key={scene.id}>{String(scene.order + 1).padStart(2, "0")} · {scene.title} · {scene.status} · {scene.assetIds.length} assets</span>) : <span>No scenes yet — add the opening beat.</span>}{projectAssets.map((asset) => <span key={asset.id}>{asset.name} · {asset.kind} · attached <button className="ghost-button" onClick={() => void detachProjectAsset(asset.id)}>Detach</button></span>)}</div>}</div>{isProjects && <><button className="primary-button" onClick={() => void addScene()}>Add scene <Icon>✦</Icon></button><button className="ghost-button" onClick={() => void toggleProjectVisibility()}>{activeProject?.visibility === "public" ? "Make private" : "Publish review"} <Icon>↗</Icon></button><button className="ghost-button" onClick={() => void copyProjectLink()}>Copy project link</button></>}{isLibrary && <div className="utility-actions"><button className="primary-button" onClick={() => onGenerate(`${selected} reuse`)}>Reuse</button><button className="ghost-button" onClick={() => onGenerate(`${selected} edit`)}>Edit</button><button className="ghost-button" onClick={() => onGenerate(`${selected} remix`)}>Variation</button><button className="ghost-button" onClick={() => onGenerate(`${selected} upscale`)}>Upscale</button><button className="ghost-button" onClick={() => void attachSelectedAsset()}>Attach to project</button><button className="ghost-button" onClick={() => void copyAssetLink()}>Copy asset link</button><button className="ghost-button" onClick={() => void toggleFavoriteAsset()}>{favoriteAssetIds.includes(selectedAssetId) ? "Remove favorite" : "Add favorite"}</button><button className="ghost-button" onClick={() => setDetailNotice("Download prepared in dry mode")}>Download</button><button className="ghost-button" onClick={() => { void navigator.clipboard?.writeText(selected); setDetailNotice("Prompt copied"); }}>Copy prompt</button></div>}<button className="ghost-button" onClick={() => { setSelected(""); setSelectedAssetId(""); }}>Close</button>{detailNotice && <small className="guided-status">{detailNotice}</small>}</section>}
    {active === "Team" && <TeamPanel />}{active === "Billing" && <BillingPanel />}{active === "Account" && <AccountPanel />}
  </div>;
}

function TeamPanel() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [status, setStatus] = useState("");
  const [members, setMembers] = useState<Array<{ id: string; email: string; role: string; status: string }>>([]);
  useEffect(() => { void fetch("/api/workspaces/workspace_dry_studio/members").then((response) => response.ok ? response.json() : null).then((body: { members?: Array<{ id: string; email: string; role: string; status: string }> } | null) => setMembers(body?.members ?? [])); }, []);
  async function invite() {
    const response = await fetch("/api/workspaces/workspace_dry_studio/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) });
    setStatus(response.ok ? `Invite sent to ${email}` : "Enter a valid email");
  }
  return <section className="platform-panel"><div><p className="eyebrow">TEAM ACCESS</p><h3>Studio beta · {members.length || 3} members</h3><p>Invite collaborators with explicit roles; generation permissions stay scoped to the workspace.</p></div><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="collaborator@example.com" aria-label="Collaborator email" /><select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Collaborator role"><option value="member">Member</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select><button className="primary-button" onClick={() => void invite()}>Invite <Icon>↗</Icon></button><div className="member-roster">{members.map((member) => <span key={member.id}>{member.email} · {member.role} · {member.status}</span>)}</div>{status && <small className="guided-status">{status}</small>}</section>;
}

function BillingPanel() {
  const [amount, setAmount] = useState("18");
  const [balance, setBalance] = useState(480);
  const [status, setStatus] = useState("");
  const [ledgerOpen, setLedgerOpen] = useState(false);
  useEffect(() => { void fetch("/api/credits").then((response) => response.ok ? response.json() : null).then((body: { balance?: number } | null) => { if (typeof body?.balance === "number") setBalance(body.balance); }); }, []);
  async function reserve() {
    const response = await fetch("/api/credits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: Number(amount), jobId: `ui-${Date.now()}` }) });
    const body = await response.json() as { remaining?: number };
    if (typeof body.remaining === "number") setBalance(body.remaining);
    setStatus(response.ok ? `${amount} credits reserved for the next dry run` : "Reservation failed");
  }
  return <section className="platform-panel"><div><p className="eyebrow">CREDIT LEDGER</p><h3>{balance} credits available</h3><p>Dry billing keeps estimates visible and never charges a payment provider.</p></div><select value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Credit reservation amount"><option value="5">5 credits</option><option value="18">18 credits</option><option value="50">50 credits</option></select><button className="primary-button" onClick={() => void reserve()}>Reserve credits <Icon>✦</Icon></button><button className="ghost-button" onClick={() => setLedgerOpen((value) => !value)}>{ledgerOpen ? "Hide ledger" : "View ledger"}</button>{ledgerOpen && <div className="member-roster"><span>Current plan · Dry Starter · active</span><span>Balance · {balance} credits</span><span>Payment portal · not connected</span></div>}{status && <small className="guided-status">{status}</small>}</section>;
}

function AccountPanel() {
  const [displayName, setDisplayName] = useState("Bosonfield Creator");
  const [visibility, setVisibility] = useState("private");
  const [allowPublicComments, setAllowPublicComments] = useState(true);
  const [allowDiscovery, setAllowDiscovery] = useState(false);
  const [retentionDays, setRetentionDays] = useState("30");
  const [status, setStatus] = useState("");
  const [signedIn, setSignedIn] = useState(true);
  useEffect(() => { void Promise.all([fetch("/api/profile"), fetch("/api/settings/privacy"), fetch("/api/auth/session")]).then(async ([profileResponse, privacyResponse, sessionResponse]) => { const profile = profileResponse.ok ? await profileResponse.json() as { profile?: { displayName?: string } } : null; const privacy = privacyResponse.ok ? await privacyResponse.json() as { privacy?: { defaultProjectVisibility?: string; allowPublicComments?: boolean; allowDiscovery?: boolean; retentionDays?: number } } : null; const session = sessionResponse.ok ? await sessionResponse.json() as { authenticated?: boolean } : null; if (profile?.profile?.displayName) setDisplayName(profile.profile.displayName); if (privacy?.privacy?.defaultProjectVisibility) setVisibility(privacy.privacy.defaultProjectVisibility); if (typeof privacy?.privacy?.allowPublicComments === "boolean") setAllowPublicComments(privacy.privacy.allowPublicComments); if (typeof privacy?.privacy?.allowDiscovery === "boolean") setAllowDiscovery(privacy.privacy.allowDiscovery); if (typeof privacy?.privacy?.retentionDays === "number") setRetentionDays(String(privacy.privacy.retentionDays)); if (typeof session?.authenticated === "boolean") setSignedIn(session.authenticated); }).catch(() => undefined); }, []);
  async function save() {
    const profile = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName }) });
    const privacy = await fetch("/api/settings/privacy", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ defaultProjectVisibility: visibility, allowPublicComments, allowDiscovery, retentionDays: Number(retentionDays) }) });
    setStatus(profile.ok && privacy.ok ? "Profile and privacy settings saved" : "Settings could not be saved");
  }
  async function signOut() { const response = await fetch("/api/auth/session", { method: "DELETE" }); setSignedIn(!response.ok ? signedIn : false); setStatus(response.ok ? "Session ended in the dry workspace" : "Could not end session"); }
  async function signIn() { const response = await fetch("/api/auth/session", { method: "POST" }); setSignedIn(response.ok); setStatus(response.ok ? "Signed in to the dry workspace" : "Could not start session"); }
  return <section className="platform-panel"><div><p className="eyebrow">ACCOUNT SETTINGS</p><h3>Identity and privacy</h3><p>Keep new work private by default and change the public display name used by community surfaces.</p></div><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} aria-label="Display name" /><select value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Default project visibility"><option value="private">Private by default</option><option value="unlisted">Unlisted by default</option></select><label className="consent-toggle"><input type="checkbox" checked={allowPublicComments} onChange={(event) => setAllowPublicComments(event.target.checked)} /> Allow public comments</label><label className="consent-toggle"><input type="checkbox" checked={allowDiscovery} onChange={(event) => setAllowDiscovery(event.target.checked)} /> Allow profile discovery</label><label>Retention<select value={retentionDays} onChange={(event) => setRetentionDays(event.target.value)} aria-label="Retention days"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option></select></label><button className="primary-button" onClick={() => void save()}>Save settings <Icon>↗</Icon></button><button className="ghost-button" onClick={() => void (signedIn ? signOut() : signIn())}>{signedIn ? "Sign out" : "Sign in"}</button>{status && <small className="guided-status">{status}</small>}</section>;
}

type StudioWorkflow = { id: string; label: string; description?: string; capability?: string; status?: string; version?: number; inputs?: string[]; graph?: Record<string, unknown>; published?: boolean; updatedAt?: string };

function WorkflowStudio({ onGenerate }: { onGenerate: Generate }) {
  const [tab, setTab] = useState<"Templates" | "My Workflows" | "Published">("Templates");
  const [workflows, setWorkflows] = useState<StudioWorkflow[]>([]);
  const [selected, setSelected] = useState<StudioWorkflow | null>(null);
  const [label, setLabel] = useState("Untitled workflow");
  const [description, setDescription] = useState("");
  const [graphText, setGraphText] = useState('{\n  "1": {\n    "class_type": "CLIPTextEncode",\n    "inputs": { "text": "${prompt}" }\n  }\n}');
  const [status, setStatus] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  useEffect(() => { void loadWorkflows().then((items) => { const id = new URLSearchParams(window.location.search).get("workflow"); const workflow = id ? items.find((item) => item.id === id) : undefined; if (workflow) edit(workflow); }); }, []);
  async function loadWorkflows(): Promise<StudioWorkflow[]> {
    const response = await fetch("/api/workflows");
    if (!response.ok) return [];
    const items = (await response.json() as { workflows?: StudioWorkflow[] }).workflows ?? [];
    setWorkflows(items);
    return items;
  }
  function edit(workflow: StudioWorkflow) {
    setSelected(workflow); setLabel(workflow.label); setDescription(workflow.description ?? "");
    setGraphText(JSON.stringify(workflow.graph ?? { "1": { class_type: "CLIPTextEncode", inputs: { text: "${prompt}" } } }, null, 2)); setValid(null); setStatus("");
  }
  function newWorkflow() { setSelected(null); setLabel("Untitled workflow"); setDescription(""); setGraphText('{\n  "1": {\n    "class_type": "CLIPTextEncode",\n    "inputs": { "text": "${prompt}" }\n  }\n}'); setValid(null); setStatus(""); }
  async function validate() {
    try {
      const graph = JSON.parse(graphText);
      const response = await fetch("/api/workflows/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: selected?.id, prompt: graph }) });
      const body = await response.json() as { valid?: boolean; error?: { message?: string } };
      setValid(Boolean(response.ok && body.valid)); setStatus(response.ok && body.valid ? "Valid ComfyUI API graph · DAG checks passed" : body.error?.message ?? "Graph needs a class_type and inputs object");
    } catch { setValid(false); setStatus("Graph JSON is invalid"); }
  }
  async function save() {
    let graph: Record<string, unknown>;
    try { graph = JSON.parse(graphText); } catch { setStatus("Graph JSON is invalid"); return; }
    const response = await fetch("/api/workflows", { method: selected ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected?.id, label, description, graph, published: selected?.published ?? false }) });
    const body = await response.json() as { workflow?: StudioWorkflow; error?: { message?: string } };
    if (!response.ok || !body.workflow) { setStatus(body.error?.message ?? "Workflow could not be saved"); return; }
    setSelected(body.workflow); setStatus("Workflow saved locally"); await loadWorkflows(); setTab("My Workflows");
  }
  async function remove() {
    if (!selected) return;
    const response = await fetch(`/api/workflows?id=${encodeURIComponent(selected.id)}`, { method: "DELETE" });
    if (response.ok) { setStatus("Workflow deleted"); newWorkflow(); await loadWorkflows(); }
  }
  async function publish() {
    if (!selected) return;
    const response = await fetch("/api/workflows", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected.id, published: !selected.published }) });
    if (response.ok) { const body = await response.json() as { workflow: StudioWorkflow }; setSelected(body.workflow); setStatus(body.workflow.published ? "Published to the community tab" : "Removed from Published"); await loadWorkflows(); }
  }
  async function downloadWorkflow() {
    if (!selected) return;
    const response = await fetch(`/api/workflows/export?id=${encodeURIComponent(selected.id)}`);
    if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: { message?: string } }; setStatus(body.error?.message ?? "Workflow export unavailable"); return; }
    const blob = await response.blob();
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = `${selected.id}.api.json`; anchor.click(); URL.revokeObjectURL(anchor.href); setStatus("ComfyUI API workflow downloaded");
  }
  const copyWorkflowLink = async () => { if (!selected) return; const url = `${window.location.origin}/?workflow=${encodeURIComponent(selected.id)}`; try { await navigator.clipboard.writeText(url); setStatus("Workflow link copied"); } catch { setStatus(url); } };
  const visible = tab === "Templates" ? workflows.filter((workflow) => !workflow.id.startsWith("wf_")) : tab === "Published" ? workflows.filter((workflow) => workflow.published) : workflows.filter((workflow) => workflow.id.startsWith("wf_"));
  return <div className="workflow-studio"><section className="workflow-browser"><div className="catalog-header"><div><p className="eyebrow">BOSONFIELD / WORKFLOW STUDIO</p><h2>Compose the graph.</h2><p>Use ComfyUI API-format graphs as portable, inspectable recipes. Edit, validate, save, and dry-run without downloading a model.</p></div><button className="primary-button" onClick={newWorkflow}>New workflow <Icon>＋</Icon></button></div><div className="workflow-tabs" role="tablist" aria-label="Workflow collections">{(["Templates", "My Workflows", "Published"] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}<small>{item === "Templates" ? workflows.filter((workflow) => !workflow.id.startsWith("wf_")).length : item === "Published" ? workflows.filter((workflow) => workflow.published).length : workflows.filter((workflow) => workflow.id.startsWith("wf_")).length}</small></button>)}</div><div className="workflow-card-grid">{visible.map((workflow) => <button className="workflow-card" key={workflow.id} onClick={() => edit(workflow)}><span className="catalog-number">{workflow.id}</span><strong>{workflow.label}</strong><small>{workflow.capability ?? "custom.graph"} · {workflow.status ?? "saved"}</small><span className="catalog-arrow">↗</span></button>)}{!visible.length && <div className="workflow-empty">No saved workflows yet. Start with a template or create a new graph.</div>}</div></section><section className="workflow-editor" aria-label="Workflow editor"><div className="panel-heading"><span>{selected ? "EDIT WORKFLOW" : "NEW WORKFLOW"}</span><span className="live-label">{valid ? "VALID" : "LOCAL"}</span></div><label>Name<input value={label} onChange={(event) => setLabel(event.target.value)} aria-label="Workflow name" /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this graph make?" aria-label="Workflow description" /></label><label>ComfyUI API graph<small className="editor-help">Node map · class_type + inputs · connections use [nodeId, outputIndex]</small><textarea className="graph-editor" value={graphText} onChange={(event) => { setGraphText(event.target.value); setValid(null); }} spellCheck={false} aria-label="ComfyUI API graph JSON" /></label><div className="workflow-actions"><button className="ghost-button" onClick={() => void validate()}>Validate graph</button><button className="primary-button" onClick={() => void save()}>Save workflow</button>{selected && <><button className="ghost-button" onClick={() => void publish()}>{selected.published ? "Unpublish" : "Publish"}</button><button className="ghost-button" onClick={() => void copyWorkflowLink()}>Copy workflow link</button><button className="ghost-button" onClick={() => void downloadWorkflow()}>Download API graph</button><button className="ghost-button danger-button" onClick={() => void remove()}>Delete</button></>}</div>{selected && <button className="generate-button full" onClick={() => onGenerate(`${selected.label} dry run`, { workflowId: selected.id, prompt: selected.label, workflowSource: selected.id })}>Execute dry run <Icon>✦</Icon></button>}{status && <small className="guided-status">{status}</small>}</section></div>;
}

function CatalogView({ active, onGenerate: onGenerateBase }: { active: Studio; onGenerate: Generate }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState("");
  if (active === "Presets") return <ViralPresetsView onGenerate={onGenerateBase} />;
  const entries = active === "Apps" ? appCatalog : category === "motion" ? motionPresets : category === "mixed" ? mixedPresets : [...motionPresets, ...mixedPresets];
  const filtered = entries.filter((entry) => entry.toLowerCase().includes(query.toLowerCase()) && (active !== "Apps" || category === "all" || (category === "ads" ? /ad|product|packshot|billboard/.test(entry) : category === "identity" ? /face|character|outfit|stylist/.test(entry) : category === "enhance" ? /enhance|upscale|relight|background/.test(entry) : category === "video" ? /video|clip|transition|motion/.test(entry) : true)));
  const workflowEntries = active === "Apps" ? manifestCatalog.filter((workflow) => `${workflow.id} ${workflow.label} ${workflow.capability}`.toLowerCase().includes(query.toLowerCase())) : [];
  const onGenerate: Generate = (label, inputs = {}) => {
    const workflow = active === "Apps" && label ? workflowEntries.find((entry) => label.startsWith(entry.label)) : undefined;
    onGenerateBase(label, workflow ? { ...inputs, workflowId: workflow.id } : inputs);
  };
  return <div className="catalog-view"><section className="catalog-header"><div><p className="eyebrow">BOSONFIELD / {active.toUpperCase()}</p><h2>{active === "Apps" ? "One task. One focused tool." : "Shape the motion."}</h2><p>{active === "Apps" ? "A data-driven catalog of focused workflows. Every card resolves to a bounded manifest and the same studio shell." : "Camera language, physical action, and mixed-media treatments as reusable records."}</p></div><div className="catalog-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active.toLowerCase()}...`} aria-label={`Search ${active.toLowerCase()}`} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label={`${active} category`}><option value="all">All</option>{active === "Apps" ? <><option value="ads">Ads / products</option><option value="identity">Identity</option><option value="enhance">Enhance / style</option><option value="video">Video tools</option></> : <><option value="motion">Motion</option><option value="mixed">Mixed media</option></>}</select><span>{active === "Apps" ? workflowEntries.length + filtered.length : filtered.length} records</span></div></section>{active === "Apps" && <><div className="catalog-subheading"><span>WORKFLOW CONTRACTS</span><small>Manifest-backed · {workflowEntries.length} registered</small></div><section className="catalog-grid workflow-contract-grid">{workflowEntries.map((workflow, index) => <button className="catalog-card workflow-contract" key={`${workflow.id}-${workflow.version}`} onClick={() => { setSelected(workflow.id); onGenerate(`${workflow.label} preview`, { workflowId: workflow.id }); }}><span className="catalog-number">W{String(index + 1).padStart(2, "0")}</span><strong>{workflow.label}</strong><small>{workflow.capability} · {workflow.status}</small><span className="catalog-arrow">↗</span></button>)}</section></>}<div className="catalog-subheading"><span>{active === "Apps" ? "DISCOVERED TEMPLATES" : "PRESET LIBRARY"}</span><small>Dry-run metadata · no model download</small></div><section className="catalog-grid">{filtered.map((entry, index) => <button className="catalog-card" key={entry} onClick={() => { setSelected(entry); onGenerate(`${entry} preview`); }}><span className="catalog-number">{String(index + 1).padStart(2, "0")}</span><strong>{entry.replaceAll("-", " ")}</strong><small>{active === "Apps" ? "Preset app · dry workflow" : mixedPresets.includes(entry) ? "Mixed media · style transfer" : "Motion · camera / action"}</small><span className="catalog-arrow">↗</span></button>)}</section>{selected && <section className="workspace-detail"><div><p className="eyebrow">SELECTED PRESET</p><h3>{selected.replaceAll("-", " ")}</h3>{(() => { const workflow = manifestCatalog.find((item) => item.id === selected); return workflow ? <p>{workflow.capability} · v{workflow.version} · {workflow.inputs.length} declared inputs · {workflow.status}</p> : <p>Dry manifest · approved inputs · original Bosonfield provenance</p>; })()}</div><button className="ghost-button" onClick={() => setSelected("")}>Close</button></section>}</div>;
}

function ViralPresetsView({ onGenerate }: { onGenerate: Generate }) {
  type ShowcasePreset = { id: string; name: string; category: string; premium: boolean; workflowId: string; graphId?: string; workflowReady?: boolean; comfyAppUrl?: string; workflowUrl?: string; launchUrl?: string; status?: string; imageInput?: boolean; promptSpec?: { positive: string; negative: string }; defaults: Record<string, unknown> };
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("All presets");
  const [linkInput, setLinkInput] = useState("");
  const [linkStatus, setLinkStatus] = useState("");
  const [inputImage, setInputImage] = useState<{ id: string; name: string } | null>(null);
  // Same-tab navigation is deliberate: embedded browsers commonly block popup
  // windows, making a valid Comfy share look like a dead card click.
  const setComfyWindow = (preset: ShowcasePreset | null) => { const target = preset?.comfyAppUrl; if (target) window.location.assign(target); };
  const [presets, setPresets] = useState<ShowcasePreset[]>(viralPresetCatalog as ShowcasePreset[]);
  useEffect(() => { let mounted = true; void fetch("/api/presets").then((response) => response.ok ? response.json() : null).then((body: { presets?: Array<{ id: string; kind?: string; name?: string; title?: string; category?: string; premium?: boolean; workflowId?: string; graphId?: string; workflowReady?: boolean; comfyAppUrl?: string | null; workflowUrl?: string | null; launchUrl?: string; status?: string; imageInput?: boolean; promptSpec?: { positive: string; negative: string }; defaults?: Record<string, unknown> }> } | null) => { const viral = body?.presets?.filter((preset) => preset.kind === "viral") ?? []; if (!mounted || !viral.length) return; const next = viral.map((preset) => ({ id: preset.id, name: preset.name ?? preset.title ?? preset.id, category: preset.category ?? "Workflow", premium: preset.premium ?? false, workflowId: preset.workflowId ?? preset.id.replace(/^preset_/, ""), graphId: preset.graphId, workflowReady: preset.workflowReady, comfyAppUrl: preset.comfyAppUrl ?? undefined, workflowUrl: preset.workflowUrl ?? undefined, launchUrl: preset.launchUrl, status: preset.status, imageInput: preset.imageInput ?? true, promptSpec: preset.promptSpec, defaults: preset.defaults ?? { presetId: preset.id, mode: "Viral preset", duration: 5, ratio: "9:16" } })); setPresets(next); const requested = new URLSearchParams(window.location.search).get("preset"); const deepLinked = next.find((preset) => preset.id === requested); if (deepLinked) { setSelected(deepLinked.name); setLinkInput(deepLinked.comfyAppUrl ?? deepLinked.workflowUrl ?? ""); } }); return () => { mounted = false; }; }, []);
  const visible = presets.filter((preset) => preset.name.toLowerCase().includes(query.toLowerCase()) && (filter === "All presets" || (filter === "Premium" ? preset.premium : preset.category === filter)));
  const selectedPreset = (() => { const preset = presets.find((entry) => entry.name === selected); return preset ? { ...preset, defaults: { ...preset.defaults, ...(preset.promptSpec ? { prompt: preset.promptSpec.positive, negativePrompt: preset.promptSpec.negative } : {}) } } : undefined; })();
  async function saveComfyLink(nextValue = linkInput) {
    if (!selectedPreset) return;
    const comfyAppUrl = nextValue.trim() || null;
    const response = await fetch("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: selectedPreset.id, comfyAppUrl }) });
    const body = await response.json().catch(() => null) as { preset?: { comfyAppUrl?: string | null }; error?: { message?: string } } | null;
    if (!response.ok) { setLinkStatus(body?.error?.message ?? "Enter a valid Comfy URL"); return; }
    setPresets((current) => current.map((preset) => preset.id === selectedPreset.id ? { ...preset, comfyAppUrl: body?.preset?.comfyAppUrl ?? undefined } : preset));
    setLinkStatus(comfyAppUrl ? "Comfy link saved" : "Comfy link removed");
  }
  const selectPreset = (preset: ShowcasePreset) => { if (preset.comfyAppUrl) { setComfyWindow(preset); return; } setSelected(preset.name); setLinkStatus(preset.workflowUrl || preset.workflowReady ? "Comfy App link pending publication" : "No Comfy workflow/app is published for this preset yet"); };
  const requiresImage = selectedPreset?.imageInput !== false;
  const uploadInputImage = async (file: File) => { try { setLinkStatus("Preparing photo…"); const id = await registerDryAsset(file, "image"); setInputImage({ id, name: file.name }); setLinkStatus("Photo ready for this preset"); } catch { setLinkStatus("Photo could not be added"); } };
  const copyComfyLink = async () => { if (!selectedPreset?.comfyAppUrl) return; try { await navigator.clipboard.writeText(selectedPreset.comfyAppUrl); setLinkStatus("Comfy app link copied"); } catch { setLinkStatus(selectedPreset.comfyAppUrl); } };
  const copyCatalogLink = async () => { if (!selectedPreset) return; const url = `${window.location.origin}/?preset=${encodeURIComponent(selectedPreset.id)}`; try { await navigator.clipboard.writeText(url); setLinkStatus("Bosonfield preset link copied"); } catch { setLinkStatus(url); } };
  return <div className="viral-presets-page"><header className="viral-presets-header"><div><p className="eyebrow">BOSONFIELD / VIRAL PRESETS</p><h2>Make the moment move.</h2><p>Discover presets and open them in Comfy. Bosonfield provides the catalog; Comfy hosts the runtime and input controls.</p></div><div className="viral-presets-count"><strong>{presets.length}</strong><span>presets</span></div></header><div className="viral-presets-toolbar"><div className="viral-preset-filters">{["All presets", "Motion", "Transform", "Cinematic", "Premium"].map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="viral-search">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search presets" aria-label="Search viral presets" /></label></div>{linkStatus && <p className="guided-status" role="status">{linkStatus}</p>}<div className="viral-preset-grid">{visible.map((preset, index) => <button className="viral-preset-card" key={preset.id} onClick={() => selectPreset(preset)} aria-label={`${preset.name}${preset.comfyAppUrl ? " · open Comfy app" : " · app link pending"}`}><span className={`viral-preset-art art-${index % 8}`}><i>{String(index + 1).padStart(2, "0")}</i>{preset.premium && <b>Premium</b>}</span><strong>{preset.name}</strong><small>{preset.category} · {preset.workflowId}</small><span className="viral-preset-host">{preset.comfyAppUrl ? "Comfy app linked" : "App link pending"}</span><span className="viral-preset-arrow">↗</span></button>)}</div>{!visible.length && <div className="viral-presets-empty"><strong>No presets match that search.</strong><small>Try another trend or clear the filter.</small></div>}</div>;
}

function WorkspaceCard({ art, title, meta, onOpen }: { art: string; title: string; meta: string; onOpen?: () => void }) {
  return <article className="workspace-card"><span className={`card-art ${art}`}><i /></span><strong>{title}</strong><small>{meta}</small><button aria-label={`Open ${title}`} onClick={onOpen}>↗</button></article>;
}











