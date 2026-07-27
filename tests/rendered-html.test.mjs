import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function request(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("Sticker Peel native app template always exposes an image upload", async () => {
  const workflow = JSON.parse(await readFile(new URL("../workflows/apps/bosonfield-sticker-peel.app.json", import.meta.url), "utf8"));
  assert.equal(workflow.extra.linearMode, true);
  assert.deepEqual(workflow.extra.linearData.inputs, [["1", "image"]]);
  assert.equal(workflow.nodes.find((node) => node.id === 1)?.type, "LoadImage");
  assert.deepEqual(workflow.nodes.find((node) => node.id === 3)?.inputs, [{ name: "images", type: "IMAGE", link: 1 }]);
});

test("server-renders only the viral preset catalog", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Bosonfield — Creative systems for strange worlds<\/title>/i);
  assert.match(html, /BOSONFIELD/);
  assert.match(html, /BOSONFIELD \/ VIRAL PRESETS/);
  assert.match(html, /Make the moment move/);
  assert.match(html, /Sticker Peel/);
  assert.match(html, /Search viral presets/);
  assert.doesNotMatch(html, /Product navigation/);
  assert.doesNotMatch(html, /Workspace navigation/);
  assert.doesNotMatch(html, /Dry-run mode/);
  assert.doesNotMatch(html, /credits/);
  const originalDeepLink = await request("/?original=field-notes", { headers: { accept: "text/html" } });
  assert.equal(originalDeepLink.status, 200);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|SkeletonPreview/);
});

test("the public shell omits non-preset product tabs", async () => {
  const html = await (await request("/", { headers: { accept: "text/html" } })).text();
  for (const label of [
    "Explore", "AI Influencer", "Vibe Motion", "Library", "Run history",
  ]) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[&]/g, "&amp;")));
  }
});

test("apps directory exposes Comfy App View links without hosting the runtime", async () => {
  const listed = await request("/api/apps");
  assert.equal(listed.status, 200);
  const apps = await listed.json();
  assert.equal(apps.mode, "dry-run");
  assert.equal(apps.linkedCount + apps.unlinkedCount, apps.apps.length);
  assert.ok(apps.unlinkedCount > 0);
  assert.ok(apps.apps.some((app) => app.id === "app_create-image"));
  assert.ok(apps.apps.length >= 24);
  assert.ok(apps.apps.some((app) => app.title === "Talking Avatar"));
  assert.ok(apps.apps.some((app) => app.title === "Product Placement"));
  const viralApps = apps.apps.filter((app) => app.group === "Viral Presets");
  assert.equal(viralApps.length, 62);
  const stickerApp = viralApps.find((app) => app.title === "Sticker Peel");
  assert.match(stickerApp.prompt, /horizontal peel edge/);
  assert.match(stickerApp.negativePrompt, /hand covering face/);
  assert.equal(stickerApp.promptObserved, true);
  assert.equal(viralApps.filter((app) => app.promptObserved === true).length, 55);
  assert.equal(viralApps.filter((app) => app.promptObserved === false).length, 7);
  const viralPresetRecords = (await (await request("/api/presets")).json()).presets.filter((entry) => entry.kind === "viral");
  assert.equal(viralPresetRecords.filter((entry) => entry.comfyAppUrl).length, 62);
  assert.equal(viralPresetRecords.find((entry) => entry.name === "Sketch to Fabric").comfyAppUrl, "https://cloud.comfy.org/?share=674f97d9c785");
  assert.equal(viralPresetRecords.find((entry) => entry.name === "Sticker Peel").comfyAppUrl, "https://cloud.comfy.org/?share=8187173ab139");
  assert.equal(viralPresetRecords.find((entry) => entry.name === "Float Spin").comfyAppUrl, "https://cloud.comfy.org/?share=acff0561888a");
  assert.equal(viralPresetRecords.find((entry) => entry.name === "Earth Zoom").comfyAppUrl, "https://cloud.comfy.org/?share=ed04a5119f2b");
  assert.equal(viralPresetRecords.find((entry) => entry.name === "Ice Statue").comfyAppUrl, "https://cloud.comfy.org/?share=b63c2c6a693c");
  assert.equal(apps.apps.find((app) => app.id === "app_animate-image").comfyAppUrl, null);
  const appRecord = await request("/api/apps/app_create-image");
  assert.equal(appRecord.status, 200);
  assert.equal((await appRecord.json()).app.id, "app_create-image");
  assert.equal((await request("/api/apps/app_create-image").then((response) => response.json())).app.catalogPath, "/?app=create-image");
  assert.equal((await request("/api/apps/app_create-image").then((response) => response.json())).app.sharePath, "/api/share/apps/app_create-image");
  const missingAppRecord = await request("/api/apps/app_missing");
  assert.equal(missingAppRecord.status, 404);
  const linked = await request("/api/apps", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appId: "app_create-image", comfyAppUrl: "https://cloud.comfy.org/apps/create-image" }),
  });
  assert.equal(linked.status, 200);
  assert.equal((await linked.json()).app.comfyAppUrl, "https://cloud.comfy.org/apps/create-image");
  const merged = await request("/api/apps");
  assert.equal((await merged.json()).apps.find((app) => app.id === "app_create-image").comfyAppUrl, "https://cloud.comfy.org/apps/create-image");
  const trimmedLink = await request("/api/apps", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appId: "app_create-image", comfyAppUrl: "  https://cloud.comfy.org/apps/create-image  " }),
  });
  assert.equal(trimmedLink.status, 200);
  assert.equal((await trimmedLink.json()).app.comfyAppUrl, "https://cloud.comfy.org/apps/create-image");
  const appShare = await request("/api/share/apps/app_create-image", { redirect: "manual" });
  assert.equal(appShare.status, 302);
  assert.equal(appShare.headers.get("location"), "https://cloud.comfy.org/apps/create-image");
  const missingAppShare = await request("/api/share/apps/app_animate-image");
  assert.equal(missingAppShare.status, 409);
  const unverifiedViralAppShare = await request("/api/share/apps/app_viral_float-spin");
  assert.equal(unverifiedViralAppShare.status, 409);
  const verifiedViralAppShare = await request("/api/share/apps/app_viral_sticker-peel", { redirect: "manual" });
  assert.equal(verifiedViralAppShare.status, 302);
  assert.equal(verifiedViralAppShare.headers.get("location"), "https://cloud.comfy.org/?share=8187173ab139");
  const unsafe = await request("/api/apps", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appId: "app_create-image", comfyAppUrl: "javascript:alert(1)" }),
  });
  assert.equal(unsafe.status, 400);
  const credentialLink = await request("/api/apps", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appId: "app_create-image", comfyAppUrl: "https://user:pass@cloud.comfy.org/apps/create-image" }),
  });
  assert.equal(credentialLink.status, 400);
  const customApp = await request("/api/admin/apps", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Custom Comfy App", description: "A shared custom app", studio: "Image", group: "Custom", comfyAppUrl: "https://cloud.comfy.org/apps/custom-comfy" }),
  });
  assert.equal(customApp.status, 201);
  const customAppBody = await customApp.json();
  assert.match(customAppBody.app.id, /^app_custom_/);
  const customAppList = await request("/api/apps");
  assert.ok((await customAppList.json()).apps.some((app) => app.id === customAppBody.app.id));
  const customAppDetail = await request(`/api/apps/${customAppBody.app.id}`);
  assert.equal(customAppDetail.status, 200);
  assert.equal((await customAppDetail.json()).app.comfyAppUrl, "https://cloud.comfy.org/apps/custom-comfy");
  const customAppShare = await request(`/api/share/apps/${customAppBody.app.id}`, { redirect: "manual" });
  assert.equal(customAppShare.status, 302);
  assert.equal(customAppShare.headers.get("location"), "https://cloud.comfy.org/apps/custom-comfy");
  const customAppUpdate = await request("/api/admin/apps", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ appId: customAppBody.app.id, title: "Updated Comfy App", comfyAppUrl: "https://cloud.comfy.org/apps/custom-updated" }) });
  assert.equal(customAppUpdate.status, 200);
  assert.equal((await customAppUpdate.json()).app.title, "Updated Comfy App");
  const updatedCustomShare = await request(`/api/share/apps/${customAppBody.app.id}`, { redirect: "manual" });
  assert.equal(updatedCustomShare.headers.get("location"), "https://cloud.comfy.org/apps/custom-updated");
  const deletedCustomApp = await request(`/api/admin/apps?id=${encodeURIComponent(customAppBody.app.id)}`, { method: "DELETE" });
  assert.equal(deletedCustomApp.status, 200);
  assert.equal((await request(`/api/apps/${customAppBody.app.id}`)).status, 404);
});

test("dry-run workflow and job APIs expose stable contracts", async () => {
  const listedJobs = await request("/api/jobs");
  assert.equal(listedJobs.status, 200);
  assert.equal((await listedJobs.json()).mode, "dry-run");
  const workflows = await request("/api/workflows");
  assert.equal(workflows.status, 200);
  const workflowBody = await workflows.json();
  assert.equal(workflowBody.mode, "dry-run");
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "image-basic"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "audio-speech"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "audio-translate"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "video-v2v"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "video-motion"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "video-clipping"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "video-vibe-motion"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "video-recast"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "video-upscale"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "video-interpolate"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "video-style"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "ai-influencer"));
  assert.ok(workflowBody.workflows.some((workflow) => workflow.id === "cinema-shot"));

  const exported = await request("/api/workflows/export?id=image-basic");
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get("content-disposition") ?? "", /image-basic\.api\.json/);
  assert.ok((await exported.json())["1"].class_type === "CheckpointLoaderSimple");
  const unreadyExport = await request("/api/workflows/export?id=video-i2v");
  assert.equal(unreadyExport.status, 409);
  assert.equal((await unreadyExport.json()).error.code, "WORKFLOW_NOT_READY");

  const savedWorkflow = await request("/api/workflows", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label: "Test graph", description: "A saved dry graph", graph: { "1": { class_type: "CLIPTextEncode", inputs: { text: "${prompt}" } } } }),
  });
  assert.equal(savedWorkflow.status, 201);
  const savedBody = await savedWorkflow.json();
  assert.match(savedBody.workflow.id, /^wf_/);
  const customJob = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: savedBody.workflow.id, inputs: { workflowId: "image-basic", workflowSource: savedBody.workflow.id, prompt: "custom graph" }, idempotencyKey: "custom-workflow-test" }),
  });
  assert.equal(customJob.status, 202);
  const customJobBody = await customJob.json();
  assert.equal(customJobBody.job.workflowId, savedBody.workflow.id);
  assert.deepEqual(customJobBody.job.inputs, { prompt: "custom graph" });
  for (const [workflowId, inputs] of [["agent-plan", { agentName: "Field assistant", instructions: "Plan a bounded run.", template: "Creative director", approvalRequired: true }], ["design-plan", { brief: "A quiet field study", audience: "Independent creators", format: "Short film board", mood: "Quiet intensity", sceneCount: 3, sceneBeats: ["Open", "Reveal"], approvalRequired: true }], ["cinema-shot", { title: "Opening sequence", brief: "A quiet machine wakes", shotCount: 3, operator: "Field operator", model: "Approved video workflow", memory: "Standard", schedule: "Now" }], ["video-interpolate", { sourceAssetId: "asset_dry_video_01", quality: "high", resolution: "1080p" }], ["video-style", { sourceAssetId: "asset_dry_video_01", presetId: "Orbit 360", quality: "high", resolution: "1080p" }]]) {
    const planJob = await request("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId, inputs, idempotencyKey: `${workflowId}-contract` }) });
    assert.equal(planJob.status, 202);
    assert.equal((await planJob.json()).job.workflowId, workflowId);
  }
  const customMcpCapabilities = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "list_capabilities" }) });
  assert.ok((await customMcpCapabilities.json()).capabilities.some((item) => item.id === savedBody.workflow.id));
  const customMcpPlan = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "plan", workflowId: savedBody.workflow.id, prompt: "custom MCP graph" }) });
  assert.equal(customMcpPlan.status, 200);
  const customMcpApproval = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve", workflowId: savedBody.workflow.id, prompt: "custom MCP graph" }) });
  assert.equal(customMcpApproval.status, 202);
  const customExport = await request(`/api/workflows/export?id=${encodeURIComponent(savedBody.workflow.id)}`);
  assert.equal(customExport.status, 200);
  assert.equal((await customExport.json())["1"].class_type, "CLIPTextEncode");
  const catalogIdOverride = await request("/api/workflows", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "image-basic", label: "Saved image override", graph: { "1": { class_type: "CLIPTextEncode", inputs: { text: "override" } } } }),
  });
  assert.equal(catalogIdOverride.status, 201);
  const overrideExport = await request("/api/workflows/export?id=image-basic");
  assert.equal(overrideExport.status, 200);
  assert.equal((await overrideExport.json())["1"].inputs.text, "override");
  assert.equal((await request("/api/workflows?id=image-basic", { method: "DELETE" })).status, 200);
  const publishedWorkflow = await request("/api/workflows", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: savedBody.workflow.id, published: true }),
  });
  assert.equal(publishedWorkflow.status, 200);
  const publishedList = await request("/api/workflows?published=true");
  assert.ok((await publishedList.json()).workflows.some((workflow) => workflow.id === savedBody.workflow.id));
  const deletedWorkflow = await request(`/api/workflows?id=${encodeURIComponent(savedBody.workflow.id)}`, { method: "DELETE" });
  assert.equal(deletedWorkflow.status, 200);

  const agent = await request("/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test copilot", template: "Creative director", instructions: "Plan a bounded image run.", idempotencyKey: "test-agent" }),
  });
  assert.equal(agent.status, 201);
  const agentBody = await agent.json();
  assert.equal(agentBody.agent.approvalRequired, true);
  const agentRead = await request(`/api/agents?id=${encodeURIComponent(agentBody.agent.id)}`);
  assert.equal(agentRead.status, 200);

  const design = await request("/api/designs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test visual system", brief: "A quiet field study", beats: ["Open", "Reveal"] }),
  });
  assert.equal(design.status, 201);
  const designBody = await design.json();
  assert.equal(designBody.design.beats.length, 2);
  const reviewed = await request("/api/designs", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: designBody.design.id, status: "review" }) });
  assert.equal((await reviewed.json()).design.status, "review");

  const invalid = await request("/api/jobs", { method: "POST", body: "{}" });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "INPUT_INVALID");

  const undeclaredControl = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", inputs: { prompt: "orbital field", arbitraryControl: true } }),
  });
  assert.equal(undeclaredControl.status, 400);
  assert.match((await undeclaredControl.json()).error.message, /does not declare input/);

  const lipsyncWithoutConsent = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "audio-lipsync", inputs: { prompt: "speak" }, idempotencyKey: "lipsync-no-consent" }),
  });
  assert.equal(lipsyncWithoutConsent.status, 400);
  assert.equal((await lipsyncWithoutConsent.json()).error.code, "CONSENT_REQUIRED");
  const lipsyncWithoutAssets = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "audio-lipsync", inputs: { prompt: "speak", consent: true }, idempotencyKey: "lipsync-no-assets" }),
  });
  assert.equal(lipsyncWithoutAssets.status, 400);
  assert.equal((await lipsyncWithoutAssets.json()).error.code, "ASSET_REQUIRED");
  const lipsyncWithConsent = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "audio-lipsync", inputs: { prompt: "speak", consent: true, characterAssetId: ["asset_dry_image_01"], audioAssetId: "asset_dry_video_01" }, idempotencyKey: "lipsync-with-consent" }),
  });
  assert.equal(lipsyncWithConsent.status, 202);
  const identityWithoutConsent = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "character-profile", inputs: { prompt: "portrait" }, idempotencyKey: "identity-no-consent" }),
  });
  assert.equal(identityWithoutConsent.status, 400);
  assert.equal((await identityWithoutConsent.json()).error.code, "CONSENT_REQUIRED");

  const accepted = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", inputs: { prompt: "orbital field", ratio: "1:1", costEstimate: 18 }, idempotencyKey: "test-1" }),
  });
  assert.equal(accepted.status, 202);
  const jobBody = await accepted.json();
  assert.equal(jobBody.job.state, "queued");
  assert.equal(jobBody.job.mode, "dry-run");
  assert.equal(jobBody.job.capability, "image.generate");
  assert.equal(jobBody.job.workflowVersion, 1);
  assert.equal(jobBody.job.adapter, "dry-run");
  assert.equal(jobBody.job.promptPrepared, true);
  assert.equal(jobBody.job.costEstimate, 18);
  const acceptedDetail = await request(`/api/jobs/${jobBody.job.id}`);
  assert.equal((await acceptedDetail.json()).job.costEstimate, 18);
  assert.equal(jobBody.job.label, "Create Image");
  assert.deepEqual(jobBody.job.inputs, { prompt: "orbital field", ratio: "1:1", costEstimate: 18 });
  const reserved = await request("/api/credits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 1, jobId: "reservation-lifecycle-job" }) });
  assert.equal(reserved.status, 201);
  const reservationId = (await reserved.json()).reservation.id;
  const reservedJob = await request("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "image-basic", inputs: { reservationId }, idempotencyKey: "reservation-lifecycle-job" }) });
  const reservedJobBody = await reservedJob.json();
  assert.equal(reservedJobBody.job.reservationId, reservationId);
  const reservedCancelled = await request(`/api/jobs/${reservedJobBody.job.id}`, { method: "POST" });
  assert.equal(reservedCancelled.status, 200);
  assert.equal((await reservedCancelled.json()).job.creditRelease, "released");
  assert.equal((await (await request(`/api/jobs/${reservedJobBody.job.id}`)).json()).job.reservationId, null);
  const editWithMask = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-edit", inputs: { prompt: "replace the sky", sourceAssetId: "asset_source", maskAssetId: "asset_mask" }, idempotencyKey: "mask-test" }),
  });
  assert.equal(editWithMask.status, 202);
  assert.equal((await editWithMask.json()).job.inputs.maskAssetId, "asset_mask");
  const failureCandidate = await request("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "image-basic", inputs: { simulateFailure: true }, idempotencyKey: "failure-test" }) });
  assert.equal(failureCandidate.status, 202);

  const repeat = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", idempotencyKey: "test-1" }),
  });
  assert.equal((await repeat.json()).job.id, jobBody.job.id);

  const unknown = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "not-a-workflow" }),
  });
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error.code, "WORKFLOW_NOT_FOUND");

  const detail = await request("/api/workflows?id=image-basic");
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).workflow.capability, "image.generate");

  const jobState = await request(`/api/jobs/${jobBody.job.id}`);
  assert.equal(jobState.status, 200);
  assert.equal((await jobState.json()).job.mode, "dry-run");

  const events = await request(`/api/jobs/${jobBody.job.id}/events`);
  assert.equal(events.status, 200);
  assert.deepEqual((await events.json()).events.map((event) => event.state), ["queued", "running", "succeeded"]);

  const cancelled = await request(`/api/jobs/${jobBody.job.id}`, { method: "POST" });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).job.state, "cancelled");

  const retried = await request(`/api/jobs/${jobBody.job.id}/retry`, { method: "POST" });
  assert.equal(retried.status, 202);
  const retriedBody = await retried.json();
  assert.equal(retriedBody.job.sourceJobId, jobBody.job.id);
  assert.equal(retriedBody.job.costEstimate, 18);
  assert.equal(retriedBody.job.reservationId, null);

  const duplicated = await request(`/api/jobs/${jobBody.job.id}/duplicate`, { method: "POST" });
  assert.equal(duplicated.status, 201);
  const duplicatedBody = await duplicated.json();
  assert.equal(duplicatedBody.draft.editable, true);
  assert.equal(duplicatedBody.draft.costEstimate, 18);
  assert.equal(duplicatedBody.draft.inputs.reservationId, undefined);

  const missingStatus = await request("/api/jobs/not-a-job");
  assert.equal(missingStatus.status, 404);
  assert.equal((await missingStatus.json()).error.code, "JOB_NOT_FOUND");
  const missingDryStatus = await request("/api/jobs/dry_missing");
  assert.equal(missingDryStatus.status, 404);
  assert.equal((await missingDryStatus.json()).error.code, "JOB_NOT_FOUND");

  const missingRetry = await request("/api/jobs/not-a-job/retry", { method: "POST" });
  assert.equal(missingRetry.status, 404);
  const missingDryRetry = await request("/api/jobs/dry_missing/retry", { method: "POST" });
  assert.equal(missingDryRetry.status, 404);
  const missingDryDuplicate = await request("/api/jobs/dry_missing/duplicate", { method: "POST" });
  assert.equal(missingDryDuplicate.status, 404);
  const missingAssetComplete = await request("/api/assets/asset_dry_missing/complete", { method: "POST" });
  assert.equal(missingAssetComplete.status, 404);
  const cancelAlias = await request(`/api/jobs/${jobBody.job.id}/cancel`, { method: "POST" });
  assert.equal(cancelAlias.status, 200);
  assert.equal((await cancelAlias.json()).job.cancellation, "acknowledged");
  assert.equal((await (await request(`/api/jobs/${jobBody.job.id}`)).json()).job.state, "cancelled");
});

test("dry-run asset and project APIs expose private deterministic contracts", async () => {
  const assets = await request("/api/assets?kind=image");
  assert.equal(assets.status, 200);
  const assetBody = await assets.json();
  assert.equal(assetBody.mode, "dry-run");
  assert.equal(assetBody.assets[0].kind, "image");
  assert.equal(assetBody.assets[0].visibility, "private");

  const upload = await request("/api/assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "reference", kind: "reference", mimeType: "image/png", idempotencyKey: "asset-test" }),
  });
  assert.equal(upload.status, 201);
  const uploadBody = await upload.json();
  assert.equal(uploadBody.asset.state, "uploading");
  assert.equal(uploadBody.upload.url, null);
  const pendingScene = await request("/api/projects/project_dry_01/scenes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Pending reference", assetIds: [uploadBody.asset.id] }),
  });
  assert.equal(pendingScene.status, 409);
  assert.equal((await pendingScene.json()).error.code, "ASSET_NOT_READY");
  const pendingCanvas = await request("/api/projects/project_dry_01/canvas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "reference", assetId: uploadBody.asset.id }),
  });
  assert.equal(pendingCanvas.status, 409);
  const pendingAttachment = await request(`/api/projects/project_dry_01/assets/${uploadBody.asset.id}`, { method: "POST" });
  assert.equal(pendingAttachment.status, 409);
  const completedUpload = await request(`/api/assets/${uploadBody.asset.id}/complete`, { method: "POST" });
  assert.equal(completedUpload.status, 200);
  assert.equal((await completedUpload.json()).asset.state, "ready");
  const readyScene = await request("/api/projects/project_dry_01/scenes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Ready reference", assetIds: [uploadBody.asset.id] }),
  });
  assert.equal(readyScene.status, 201);
  const uploadRepeat = await request("/api/assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "reference", kind: "reference", mimeType: "image/png", idempotencyKey: "asset-test" }),
  });
  assert.equal((await uploadRepeat.json()).asset.id, uploadBody.asset.id);

  const projects = await request("/api/projects");
  assert.equal(projects.status, 200);
  const projectBody = await projects.json();
  assert.equal(projectBody.projects[0].visibility, "private");
  const project = await request("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Dry scene", brief: "A test brief", idempotencyKey: "project-test" }),
  });
  assert.equal(project.status, 201);
  const createdProject = await project.json();
  assert.equal(createdProject.project.status, "draft");

  const detail = await request("/api/projects/project_dry_01");
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).project.scenes[0].id, "scene_dry_01");
  const scene = await request("/api/projects/project_dry_01/scenes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Dry opening", brief: "Reveal the first machine detail.", idempotencyKey: "scene-test" }),
  });
  assert.equal(scene.status, 201);
  const sceneBody = await scene.json();
  assert.equal(sceneBody.scene.status, "draft");
  assert.equal(sceneBody.scene.brief, "Reveal the first machine detail.");
  const scenes = await request("/api/projects/project_dry_01/scenes");
  assert.equal(scenes.status, 200);
  assert.equal((await scenes.json()).projectId, "project_dry_01");
  const attachment = await request("/api/projects/project_dry_01/assets/asset_dry_image_01", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ relationship: "output", sceneId: "scene_dry_01" }),
  });
  assert.equal(attachment.status, 201);
  assert.equal((await attachment.json()).relationship, "output");
  const projectAssets = await request("/api/projects/project_dry_01/assets");
  assert.equal(projectAssets.status, 200);
  assert.equal((await projectAssets.json()).projectId, "project_dry_01");
  const scopedLibrary = await request("/api/library?projectId=project_dry_01");
  assert.equal(scopedLibrary.status, 200);
  assert.deepEqual((await scopedLibrary.json()).assets.map((asset) => asset.id), ["asset_dry_image_01"]);
  const detached = await request("/api/projects/project_dry_01/assets/asset_dry_image_01", { method: "DELETE" });
  assert.equal(detached.status, 200);
  assert.equal((await detached.json()).detached, true);
  assert.deepEqual((await (await request("/api/library?projectId=project_dry_01")).json()).assets, []);
  await request("/api/projects/project_dry_01/assets/asset_dry_image_01", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ relationship: "output", sceneId: "scene_dry_01" }) });
  const missingLibraryProject = await request("/api/library?projectId=not-a-project");
  assert.equal(missingLibraryProject.status, 404);
  const missingProject = await request("/api/projects/not-a-project");
  assert.equal(missingProject.status, 404);
  assert.equal((await missingProject.json()).error.code, "PROJECT_NOT_FOUND");
});

test("ComfyUI integration stays dry by default and validates candidate graphs", async () => {
  const worker = await request("/api/worker");
  assert.equal(worker.status, 200);
  const workerBody = await worker.json();
  assert.equal(workerBody.mode, "dry-run");
  assert.deepEqual(workerBody.queue.queue_pending, []);
  assert.ok(workerBody.capabilities.includes("history"));
  assert.ok(workerBody.capabilities.includes("interrupt"));
  const features = await request("/api/worker?capability=features");
  assert.equal(features.status, 200);
  assert.equal((await features.json()).value.supports.apiFormat, true);
  const templates = await request("/api/worker?capability=workflow_templates");
  assert.equal(templates.status, 200);
  assert.deepEqual((await templates.json()).value, []);
  const models = await request("/api/worker?capability=models");
  assert.equal(models.status, 200);
  assert.deepEqual((await models.json()).value, []);
  const unknownCapability = await request("/api/worker?capability=unknown");
  assert.equal(unknownCapability.status, 404);
  assert.equal((await unknownCapability.json()).error.code, "CAPABILITY_NOT_FOUND");

  const invalid = await request("/api/workflows/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", prompt: {} }),
  });
  assert.equal(invalid.status, 400);

  const malformed = await request("/api/workflows/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", prompt: { "1": { inputs: {} } } }),
  });
  assert.equal(malformed.status, 400);

  const valid = await request("/api/workflows/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", prompt: { "1": { class_type: "CheckpointLoaderSimple", inputs: {} } } }),
  });
  assert.equal(valid.status, 200);
  const validBody = await valid.json();
  assert.equal(validBody.valid, true);
  assert.equal(validBody.mode, "dry-run");

  const linked = await request("/api/workflows/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", prompt: {
      "1": { class_type: "CheckpointLoaderSimple", inputs: {} },
      "2": { class_type: "KSampler", inputs: { model: ["1", 0] } },
    } }),
  });
  assert.equal(linked.status, 200);

  const dangling = await request("/api/workflows/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", prompt: { "1": { class_type: "KSampler", inputs: { model: ["missing", 0] } } } }),
  });
  assert.equal(dangling.status, 400);

  const cyclic = await request("/api/workflows/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", prompt: {
      "1": { class_type: "NodeA", inputs: { source: ["2", 0] } },
      "2": { class_type: "NodeB", inputs: { source: ["1", 0] } },
    } }),
  });
  assert.equal(cyclic.status, 400);
});

test("configured ComfyUI mode sends a compiled API graph and supports history/cancel", async () => {
  const previousBaseUrl = process.env.COMFYUI_BASE_URL;
  const previousCloudBaseUrl = process.env.COMFY_CLOUD_BASE_URL;
  const previousApiKey = process.env.COMFYUI_API_KEY;
  const previousFetch = globalThis.fetch;
  const calls = [];
  let comfyHistoryStatus = { completed: true, status_str: "success" };
  process.env.COMFYUI_BASE_URL = "http://comfy.test/";
  process.env.COMFYUI_API_KEY = "test-comfy-key";
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    calls.push({ target, init });
    if (target.endsWith("/prompt")) return new Response(JSON.stringify({ prompt_id: "comfy_test_prompt" }), { status: 200, headers: { "content-type": "application/json" } });
    if (target.endsWith("/history/comfy_test_prompt")) return new Response(JSON.stringify({ comfy_test_prompt: { status: comfyHistoryStatus, outputs: { "3": { images: [{ filename: "field.png", subfolder: "bosonfield", type: "output" }] } } } }), { status: 200, headers: { "content-type": "application/json" } });
    if (target.endsWith("/interrupt")) return new Response("{}", { status: 200 });
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const configuredValidation = await request("/api/workflows/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId: "image-basic", prompt: { "1": { class_type: "CheckpointLoaderSimple", inputs: {} } } }),
    });
    assert.equal(configuredValidation.status, 200);
    assert.equal((await configuredValidation.json()).mode, "comfyui");
    const configuredEstimate = await request("/api/jobs/estimate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId: "image-basic", inputs: { count: 1 } }),
    });
    assert.equal(configuredEstimate.status, 200);
    assert.equal((await configuredEstimate.json()).mode, "comfyui");
    const unverifiedQueue = await request("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId: "video-i2v", inputs: { prompt: "candidate" } }),
    });
    assert.equal(unverifiedQueue.status, 409);
    assert.equal((await unverifiedQueue.json()).error.code, "WORKFLOW_NOT_READY");

    const idempotencyKey = `comfy-test-${Date.now()}`;
    const created = await request("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId: "image-basic", idempotencyKey, inputs: { prompt: "a test image", model: "model.pending", ratio: "1:1", count: 1 } }),
    });
    assert.equal(created.status, 202);
    const createdBody = await created.json();
    assert.equal(createdBody.job.comfyPromptId, "comfy_test_prompt");
    assert.equal(createdBody.job.mode, "comfyui");
    assert.equal(createdBody.job.adapter, "comfyui");
    assert.equal(createdBody.job.message, "Queued on the configured ComfyUI worker.");
    const idempotent = await request("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId: "image-basic", idempotencyKey, inputs: { prompt: "a test image", model: "model.pending", ratio: "1:1", count: 1 } }),
    });
    const idempotentBody = await idempotent.json();
    assert.equal(idempotentBody.job.id, createdBody.job.id);
    assert.equal(idempotentBody.job.mode, "comfyui");
    assert.equal(idempotentBody.job.adapter, "comfyui");
    assert.equal(idempotentBody.job.message, "Queued on the configured ComfyUI worker.");
    const queueCall = calls.find((call) => call.target.endsWith("/prompt"));
    assert.ok(queueCall, "configured mode should call ComfyUI /prompt");
    assert.equal(queueCall.init.headers["X-API-Key"], "test-comfy-key");
    const queuedPayload = JSON.parse(queueCall.init.body);
    assert.equal(queuedPayload.prompt["1"].class_type, "CheckpointLoaderSimple");
    assert.equal(queuedPayload.prompt["2"].inputs.text, "a test image");
    assert.equal(queuedPayload.prompt.__dry_run__, undefined);

    const history = await request(`/api/jobs/${createdBody.job.id}`);
    assert.equal(history.status, 200);
    const historyBody = await history.json();
    assert.equal(historyBody.job.state, "complete");
    assert.deepEqual(historyBody.job.outputFiles, [{ nodeId: "3", filename: "field.png", subfolder: "bosonfield", type: "output", url: `/api/jobs/${createdBody.job.id}/output?filename=field.png&subfolder=bosonfield&type=output` }]);
    const configuredLibrary = await request("/api/library?kind=image");
    assert.ok((await configuredLibrary.json()).assets.some((asset) => asset.provenance?.jobId === createdBody.job.id && asset.name === "field.png"), "completed Comfy output should enter the Library");
    const localOutput = await request(historyBody.job.outputFiles[0].url);
    assert.equal(localOutput.status, 200);
    const beforeUnknownOutput = calls.length;
    const unknownOutput = await request(`/api/jobs/${createdBody.job.id}/output?filename=other.png&subfolder=bosonfield&type=output`);
    assert.equal(unknownOutput.status, 404, "output proxy must not expose files outside the job history");
    assert.equal(calls.length, beforeUnknownOutput, "unknown output references must not reach ComfyUI");
    const traversalOutput = await request(`/api/jobs/${createdBody.job.id}/output?filename=field.png&subfolder=${encodeURIComponent("bosonfield/../private")}&type=output`);
    assert.equal(traversalOutput.status, 400);

    comfyHistoryStatus = { completed: false, status_str: "running" };
    const runningEvents = await request(`/api/jobs/${createdBody.job.id}/events`);
    assert.equal(runningEvents.status, 200);
    const runningEventsBody = await runningEvents.json();
    assert.equal(runningEventsBody.transport, "history");
    assert.deepEqual(runningEventsBody.events.map((event) => event.state), ["running"]);
    assert.ok(calls.filter((call) => call.target.endsWith("/history/comfy_test_prompt")).length >= 2, "events should reconcile from official ComfyUI history");

    comfyHistoryStatus = { completed: true, status_str: "error" };
    const failedHistory = await request(`/api/jobs/${createdBody.job.id}`);
    assert.equal(failedHistory.status, 200);
    assert.equal((await failedHistory.json()).job.state, "failed", "completed Comfy error records must remain failed");
    const failedEvents = await request(`/api/jobs/${createdBody.job.id}/events`);
    assert.equal(failedEvents.status, 200);
    assert.equal((await failedEvents.json()).events[0].state, "failed", "history events must preserve Comfy failures");

    const cancelled = await request(`/api/jobs/${createdBody.job.id}/cancel`, { method: "POST" });
    assert.equal(cancelled.status, 200);
    assert.ok(calls.some((call) => call.target.endsWith("/interrupt")), "cancel should interrupt the ComfyUI prompt");

    delete process.env.COMFYUI_BASE_URL;
    // Official docs use https://cloud.comfy.org; the adapter adds the /api prefix.
    process.env.COMFY_CLOUD_BASE_URL = "https://cloud.comfy.org";
    const cloudCreated = await request("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "image-basic", idempotencyKey: `cloud-test-${Date.now()}`, inputs: { prompt: "cloud test", model: "model.pending", ratio: "1:1", count: 1 } }) });
    assert.equal(cloudCreated.status, 202);
    const cloudBody = await cloudCreated.json();
    assert.ok(calls.some((call) => call.target === "https://cloud.comfy.org/api/prompt"), "bare Comfy Cloud base should use the official /api route");
    const cloudHistory = await request(`/api/jobs/${cloudBody.job.id}`);
    const cloudOutputUrl = (await cloudHistory.json()).job.outputFiles[0].url;
    assert.match(cloudOutputUrl, new RegExp(`^/api/jobs/${cloudBody.job.id}/output\\?`));
    const cloudOutput = await request(cloudOutputUrl);
    assert.equal(cloudOutput.status, 200);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBaseUrl === undefined) delete process.env.COMFYUI_BASE_URL;
    else process.env.COMFYUI_BASE_URL = previousBaseUrl;
    if (previousCloudBaseUrl === undefined) delete process.env.COMFY_CLOUD_BASE_URL;
    else process.env.COMFY_CLOUD_BASE_URL = previousCloudBaseUrl;
    if (previousApiKey === undefined) delete process.env.COMFYUI_API_KEY;
    else process.env.COMFYUI_API_KEY = previousApiKey;
  }
});

test("publishing, comments, workspaces, and credits stay explicit and dry", async () => {
  const publish = await request("/api/projects/project_dry_01/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ visibility: "public" }),
  });
  assert.equal(publish.status, 200);
  assert.equal((await publish.json()).moderation, "pending");

  const comment = await request("/api/projects/project_dry_01/comments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body: "A useful variation." }),
  });
  assert.equal(comment.status, 201);
  const commentBody = await comment.json();
  const comments = await request("/api/projects/project_dry_01/comments");
  assert.ok((await comments.json()).comments.some((entry) => entry.id === commentBody.comment.id));

  const workspaces = await request("/api/workspaces");
  assert.equal(workspaces.status, 200);
  assert.equal((await workspaces.json()).workspaces[1].kind, "team");
  const invite = await request("/api/workspaces/workspace_dry_invite/members", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "New.Collab@Example.com", role: "member" }),
  });
  assert.equal(invite.status, 201);
  assert.equal((await invite.json()).member.email, "new.collab@example.com");
  const duplicateInvite = await request("/api/workspaces/workspace_dry_invite/members", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "new.collab@example.com", role: "member" }),
  });
  assert.equal(duplicateInvite.status, 409);
  const invalidInvite = await request("/api/workspaces/workspace_dry_invite/members", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "owner@", role: "owner" }),
  });
  assert.equal(invalidInvite.status, 400);

  const credits = await request("/api/credits");
  assert.equal(credits.status, 200);
  assert.equal((await credits.json()).balance, 480);

  const reserve = await request("/api/credits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: 18, jobId: "dry_job_01" }),
  });
  assert.equal(reserve.status, 201);
  const reserveBody = await reserve.json();
  assert.equal(reserveBody.reservation.state, "reserved");
  assert.equal((await (await request("/api/credits")).json()).balance, 462);
  assert.equal((await (await request("/api/billing")).json()).credits.available, 462);
  const overdraw = await request("/api/credits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: 9999 }) });
  assert.equal(overdraw.status, 409);
  const released = await request(`/api/credits/${reserveBody.reservation.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "release" }) });
  assert.equal(released.status, 200);
  assert.equal((await released.json()).remaining, 480);
  const releasedAgain = await request(`/api/credits/${reserveBody.reservation.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "release" }) });
  assert.equal((await releasedAgain.json()).remaining, 480);
  assert.equal((await (await request("/api/billing")).json()).credits.reserved, 0);
});

test("account, admin, plugins, and MCP surfaces are constrained dry-run contracts", async () => {
  const session = await request("/api/auth/session");
  assert.equal(session.status, 200);
  assert.equal((await session.json()).authenticated, true);
  const endedSession = await request("/api/auth/session", { method: "DELETE" });
  assert.equal(endedSession.status, 200);
  assert.equal((await endedSession.json()).authenticated, false);
  assert.equal((await (await request("/api/auth/session")).json()).authenticated, false);
  const startedSession = await request("/api/auth/session", { method: "POST" });
  assert.equal(startedSession.status, 200);
  assert.equal((await startedSession.json()).authenticated, true);
  const profile = await request("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: "Field operator" }) });
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).profile.displayName, "Field operator");
  assert.equal((await request("/api/profile")).status, 200);
  assert.equal((await (await request("/api/profile")).json()).profile.displayName, "Field operator");
  const privacy = await request("/api/settings/privacy", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ defaultProjectVisibility: "unlisted" }) });
  assert.equal(privacy.status, 200);
  assert.equal((await (await request("/api/settings/privacy")).json()).privacy.defaultProjectVisibility, "unlisted");
  const privacyOptions = await request("/api/settings/privacy", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ allowPublicComments: false, allowDiscovery: true, retentionDays: 90 }) });
  assert.equal(privacyOptions.status, 200);
  assert.deepEqual((await privacyOptions.json()).privacy, { defaultProjectVisibility: "unlisted", allowPublicComments: false, allowDiscovery: true, retentionDays: 90 });
  const invalidPrivacy = await request("/api/settings/privacy", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ retentionDays: 0 }) });
  assert.equal(invalidPrivacy.status, 400);
  assert.equal((await request("/api/billing")).status, 200);
  assert.equal((await request("/api/plugins")).status, 200);
  const pluginPrep = await request("/api/plugins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ host: "Photoshop", operation: "Generate image" }) });
  assert.equal(pluginPrep.status, 201);
  assert.equal((await pluginPrep.json()).adapter.status, "prepared");
  const academyLesson = await request("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "academy-lesson", inputs: { lesson: "Project setup", mode: "academy" }, idempotencyKey: "academy-project-setup" }) });
  assert.equal(academyLesson.status, 202);
  assert.equal((await academyLesson.json()).job.workflowId, "academy-lesson");
  assert.equal((await request("/api/admin/workflows")).status, 200);
  const adminPreset = await request("/api/admin/presets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Dry glow", capability: "image.generate" }) });
  assert.equal(adminPreset.status, 201);
  const adminPresetBody = await adminPreset.json();
  assert.ok((await (await request("/api/admin/presets")).json()).presets.some((entry) => entry.id === adminPresetBody.preset.id));
  const customPresetId = adminPresetBody.preset.id;
  const customPresetLink = await request("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: customPresetId, comfyAppUrl: "https://cloud.comfy.org/shared/custom-dry-glow" }) });
  assert.equal(customPresetLink.status, 200);
  assert.equal((await customPresetLink.json()).preset.comfyAppUrl, "https://cloud.comfy.org/shared/custom-dry-glow");
  const customPresetCatalog = await request(`/api/presets/${customPresetId}`);
  assert.equal(customPresetCatalog.status, 200);
  assert.equal((await customPresetCatalog.json()).preset.kind, "admin");
  const customPresetShare = await request(`/api/share/presets/${customPresetId}`, { redirect: "manual" });
  assert.equal(customPresetShare.status, 302);
  assert.equal(customPresetShare.headers.get("location"), "https://cloud.comfy.org/shared/custom-dry-glow");
  const customPresetUpdate = await request("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: customPresetId, name: "Updated dry glow" }) });
  assert.equal(customPresetUpdate.status, 200);
  assert.equal((await customPresetUpdate.json()).preset.title, "Updated dry glow");
  const deletedCustomPreset = await request(`/api/admin/presets?id=${encodeURIComponent(customPresetId)}`, { method: "DELETE" });
  assert.equal(deletedCustomPreset.status, 200);
  assert.equal((await request(`/api/presets/${customPresetId}`)).status, 404);
  const workflowReview = await request("/api/admin/workflows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "image-basic", action: "retire" }) });
  assert.equal(workflowReview.status, 200);
  assert.equal((await (await request("/api/admin/workflows")).json()).workflows.find((entry) => entry.id === "image-basic").status, "retired");
  const mcp = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "plan", workflowId: "image-basic", prompt: "a dry test" }) });
  assert.equal(mcp.status, 200);
  assert.equal((await mcp.json()).approvalRequired, true);
  const mcpCapabilitiesGet = await request("/api/mcp");
  assert.equal(mcpCapabilitiesGet.status, 200);
  assert.ok((await mcpCapabilitiesGet.json()).capabilities.some((item) => item.id === "image-basic"));
  const approved = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve", workflowId: "image-basic", prompt: "approved dry test" }) });
  assert.equal(approved.status, 202);
  const approvedBody = await approved.json();
  assert.equal(approvedBody.execution, "queued");
  assert.equal(approvedBody.job.costEstimate, 1);
  const capabilities = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "list_capabilities" }) });
  assert.equal(capabilities.status, 200);
  assert.ok((await capabilities.json()).capabilities.some((item) => item.id === "audio-speech"));
  const preset = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "get_preset", workflowId: "image-basic" }) });
  assert.equal(preset.status, 200);
  const mcpJob = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "get_job", jobId: "dry_example" }) });
  assert.equal(mcpJob.status, 404);
  const createdMcpJob = await request("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "image-basic", idempotencyKey: "mcp-job" }) });
  const mcpJobDetail = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "get_job", jobId: (await createdMcpJob.json()).job.id }) });
  assert.equal(mcpJobDetail.status, 200);
  const mcpAssets = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "list_project_assets", projectId: "project_dry_01" }) });
  assert.deepEqual((await mcpAssets.json()).assets.map((asset) => asset.id), ["asset_dry_image_01"]);
});

test("guided production contracts cover campaigns, consented characters, shot plans, and canvas", async () => {
  const badCharacter = await request("/api/characters", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "No consent", assetIds: ["asset_dry_image_01"] }) });
  assert.equal(badCharacter.status, 400);
  assert.equal((await badCharacter.json()).error.code, "CONSENT_REQUIRED");

  const campaign = await request("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Launch", productTitle: "Field device", format: "unboxing", productImages: ["asset-1", "asset-2"], variants: 3 }) });
  assert.equal(campaign.status, 201);
  const campaignBody = await campaign.json();
  assert.equal(campaignBody.campaign.status, "draft");
  assert.equal(campaignBody.campaign.productImages.length, 2);
  const campaigns = await request("/api/campaigns");
  assert.ok((await campaigns.json()).campaigns.some((entry) => entry.id === campaignBody.campaign.id));
  const updatedCampaign = await request("/api/campaigns", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: campaignBody.campaign.id, name: "Launch revision", variants: 5 }) });
  assert.equal(updatedCampaign.status, 200);
  assert.equal((await updatedCampaign.json()).campaign.name, "Launch revision");
  const reopenedCampaigns = await request("/api/campaigns");
  assert.equal((await reopenedCampaigns.json()).campaigns.find((entry) => entry.id === campaignBody.campaign.id).variants, 5);
  const missingCampaignUpdate = await request("/api/campaigns", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "campaign_missing", name: "Nope" }) });
  assert.equal(missingCampaignUpdate.status, 404);

  const character = await request("/api/characters", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Presenter", assetIds: ["asset_dry_image_01"], consentRecordId: "consent_dry_01" }) });
  assert.equal(character.status, 201);
  const characterBody = await character.json();
  assert.equal(characterBody.character.consentStatus, "recorded");
  assert.ok((await (await request("/api/characters")).json()).characters.some((entry) => entry.id === characterBody.character.id));

  const plan = await request("/api/projects/project_dry_01/shot-plans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Launch sequence", brief: "Open on the product in a blue field", shotCount: 2 }) });
  assert.equal(plan.status, 201);
  const planBody = await plan.json();
  assert.equal(planBody.plan.shots.length, 2);
  const updatedPlan = await request("/api/projects/project_dry_01/shot-plans", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: planBody.plan.id, title: "Launch sequence v2", brief: "Updated opening beat" }) });
  assert.equal(updatedPlan.status, 200);
  assert.equal((await updatedPlan.json()).plan.title, "Launch sequence v2");
  const plans = await request("/api/projects/project_dry_01/shot-plans");
  assert.ok((await plans.json()).plans.some((entry) => entry.title === "Launch sequence v2"));
  const unknownShotPlanProject = await request("/api/projects/not-a-project/shot-plans");
  assert.equal(unknownShotPlanProject.status, 404);
  const invalidShotCount = await request("/api/projects/project_dry_01/shot-plans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Bad count", brief: "No shots", shotCount: 0 }) });
  assert.equal(invalidShotCount.status, 400);

  const node = await request("/api/projects/project_dry_01/canvas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "reference", x: 20, y: 30, assetId: "asset_dry_image_01" }) });
  assert.equal(node.status, 201);
  const nodeBody = await node.json();
  assert.equal(nodeBody.node.type, "reference");
  const updatedNode = await request("/api/projects/project_dry_01/canvas", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: nodeBody.node.id, type: "hero", x: 48, y: 72 }) });
  assert.equal(updatedNode.status, 200);
  assert.equal((await updatedNode.json()).node.type, "hero");
  const canvas = await request("/api/projects/project_dry_01/canvas");
  assert.ok((await canvas.json()).nodes.some((entry) => entry.type === "hero"));
  const unknownCanvasProject = await request("/api/projects/not-a-project/canvas");
  assert.equal(unknownCanvasProject.status, 404);
  const unknownCanvasAsset = await request("/api/projects/project_dry_01/canvas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "reference", assetId: "not-an-asset" }) });
  assert.equal(unknownCanvasAsset.status, 404);
});

test("library, presets, estimates, and reversible publishing are exposed", async () => {
  const library = await request("/api/library?kind=image");
  assert.equal(library.status, 200);
  assert.equal((await library.json()).assets[0].kind, "image");
  const shortsLibrary = await request("/api/library?kind=shorts");
  assert.equal(shortsLibrary.status, 200);
  assert.ok((await shortsLibrary.json()).assets.some((asset) => asset.id === "asset_dry_video_01"), "video outputs should be discoverable in Shorts Studio");
  const presets = await request("/api/presets?capability=image.generate");
  assert.equal(presets.status, 200);
  assert.ok((await presets.json()).presets.length >= 1);
  const viralPresets = await request("/api/presets?kind=viral");
  assert.equal(viralPresets.status, 200);
  const viralBody = await viralPresets.json();
  assert.ok(viralBody.presets.length >= 40);
  assert.ok(viralBody.presets.some((preset) => preset.name === "Earth Zoom" && preset.workflowId === "video-vibe-motion"));
  assert.ok(viralBody.presets.every((preset) => preset.kind === "viral" && preset.defaults.mode === "Viral preset"));
  assert.ok(viralBody.presets.every((preset) => preset.imageInput === true && preset.visibleControls.includes("sourceAssetId")), "viral presets must expose their required image input contract");
  const stickerPreset = viralBody.presets.find((preset) => preset.id === "preset_sticker-peel");
  assert.equal(stickerPreset.status, "dry-validated");
  assert.equal(stickerPreset.launchUrl, "/api/share/presets/preset_sticker-peel");
  assert.ok(viralBody.presets.every((preset) => preset.imageInput === true), "viral presets must advertise their required source photo");
  const earthPreset = viralBody.presets.find((preset) => preset.name === "Earth Zoom");
  const floatPreset = viralBody.presets.find((preset) => preset.name === "Float Spin");
  assert.ok(earthPreset?.promptSpec?.positive && floatPreset?.promptSpec?.positive && earthPreset.promptSpec.positive !== floatPreset.promptSpec.positive, "viral presets must retain distinct prompt specs");
  assert.ok(viralBody.presets.every((preset) => preset.imageInput === true && preset.promptSpec?.positive && /^\/api\/share\/presets\//.test(preset.launchUrl)), "every viral preset must launch through its verified App View redirect");
  for (const preset of viralBody.presets) {
    if (!preset.comfyAppUrl) {
      if (preset.status === "needs-publish") {
      assert.match(preset.launchUrl, /^\/?\?preset=/, `${preset.id} should stay in the catalog until its App-mode link is verified`);
        assert.ok(preset.workflowReady || /^https:\/\/cloud\.comfy\.org\//.test(preset.workflowUrl ?? ""), `${preset.id} should retain a candidate Comfy graph for publishing`);
        continue;
      }
      assert.equal(preset.status, "needs-link", `${preset.id} must report a missing link`);
      assert.match(preset.launchUrl, /^\/?\?preset=/, `${preset.id} must fall back to its catalog page`);
      continue;
    }
    assert.match(preset.launchUrl, /^\/api\/share\/presets\//, `${preset.id} must use the local redirect contract`);
    const redirect = await request(preset.launchUrl, { redirect: "manual" });
    assert.equal(redirect.status, 302, `${preset.id} must redirect to Comfy App View`);
    assert.match(redirect.headers.get("location") ?? "", ["preset_sticker-peel", "preset_float-spin", "preset_earth-zoom", "preset_ice-statue", "preset_sketch-to-fabric", "preset_selfie-twin", "preset_moonwalk", "preset_face-punch", "preset_orbit-360", "preset_mighty-fighter", "preset_orbital-presence", "preset_football-invader", "preset_summer-haze", "preset_kung-fu-hit", "preset_storm-giant", "preset_zombie-dance", "preset_golf-major", "preset_race-track", "preset_nightline", "preset_free-fall", "preset_red-carpet", "preset_neon-city", "preset_soul-fighter", "preset_tuscan-yoga", "preset_in-the-dark", "preset_red-thread", "preset_exit-the-dream", "preset_ending-fairy", "preset_dragon-fantasy", "preset_fan-meeting", "preset_magic-spell", "preset_me-and-pet-transformation", "preset_night-vision", "preset_office-cctv", "preset_race-winner", "preset_still-world", "preset_superfast-flight", "preset_sword-and-sorcery", "preset_wrestle", "preset_final-serve", "preset_2000s-paparazzi", "preset_3d-render", "preset_action-figure", "preset_android-assemble", "preset_animal-chase", "preset_animal-ride", "preset_apex-hunter", "preset_arena-zero", "preset_baseball-game", "preset_blue-depth", "preset_candid-paparazzi", "preset_cardboard-cutout", "preset_cgi-breakdown", "preset_drown-in-music", "preset_disintegration", "preset_casual-monster-slayer", "preset_clay-figurine", "preset_drift-racing", "preset_earth-zoom-in", "preset_earth-zoom-out", "preset_elevate", "preset_fairytale-castle"].includes(preset.id) ? /^https:\/\/cloud\.comfy\.org\/\?share=/ : /^http:\/\/127\.0\.0\.1:8188\/\?cmcpApp=/, `${preset.id} must point at its configured Comfy App View`);
  }
  assert.match(viralBody.presets.find((preset) => preset.name === "Animal Chase").promptSpec.positive, /playful chase/);
  assert.match(viralBody.presets.find((preset) => preset.name === "Earth Zoom In").promptSpec.positive, /push the camera continuously/);
  const workflowPresets = await request("/api/presets?kind=workflow");
  assert.equal(workflowPresets.status, 200);
  const workflowPreset = (await workflowPresets.json()).presets[0];
  assert.ok(workflowPreset?.id?.startsWith("preset_"));
  assert.equal(workflowPreset.catalogPath, `/?preset=${workflowPreset.id}`);
  assert.equal(workflowPreset.sharePath, `/api/share/presets/${workflowPreset.id}`);
  assert.equal((await request(`/api/presets/${workflowPreset.id}`).then((response) => response.json())).preset.kind, "workflow");
  assert.equal((await request(`/api/share/presets/${workflowPreset.id}`)).status, 409);
  const linkedWorkflowPreset = await request("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: workflowPreset.id, comfyAppUrl: "https://cloud.comfy.org/shared/image-basic" }) });
  assert.equal(linkedWorkflowPreset.status, 200);
  assert.equal((await linkedWorkflowPreset.json()).preset.comfyAppUrl, "https://cloud.comfy.org/shared/image-basic");
  const workflowPresetShare = await request(`/api/share/presets/${workflowPreset.id}`, { redirect: "manual" });
  assert.equal(workflowPresetShare.status, 302);
  assert.equal(workflowPresetShare.headers.get("location"), "https://cloud.comfy.org/shared/image-basic");
  const unlinkedWorkflowPreset = await request("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: workflowPreset.id, comfyAppUrl: null }) });
  assert.equal(unlinkedWorkflowPreset.status, 200);
  const linkedPreset = await request("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: "preset_earth-zoom", comfyAppUrl: "https://cloud.comfy.org/shared/earth-zoom" }) });
  assert.equal(linkedPreset.status, 200);
  const linkedBody = await linkedPreset.json();
  assert.equal(linkedBody.preset.comfyAppUrl, "https://cloud.comfy.org/shared/earth-zoom");
  const linkedList = await request("/api/presets?kind=viral");
  assert.equal((await linkedList.json()).presets.find((preset) => preset.id === "preset_earth-zoom").comfyAppUrl, "https://cloud.comfy.org/shared/earth-zoom");
  assert.match((await (await request("/api/presets?kind=viral")).json()).presets.find((preset) => preset.id === "preset_sketch-to-fabric").launchUrl, /^\/api\/share\/presets\//);
  assert.equal((await (await request("/api/presets?kind=viral")).json()).presets.find((preset) => preset.id === "preset_sticker-peel").comfyAppUrl, "https://cloud.comfy.org/?share=8187173ab139");
  const presetShare = await request("/api/share/presets/preset_earth-zoom", { redirect: "manual" });
  assert.equal(presetShare.status, 302);
  assert.equal(presetShare.headers.get("location"), "https://cloud.comfy.org/shared/earth-zoom");
  const verifiedPresetShare = await request("/api/share/presets/preset_float-spin", { redirect: "manual" });
  assert.equal(verifiedPresetShare.status, 302);
  assert.equal(verifiedPresetShare.headers.get("location"), "https://cloud.comfy.org/?share=acff0561888a");
  const verifiedEarthShare = await request("/api/share/presets/preset_earth-zoom", { redirect: "manual" });
  assert.equal(verifiedEarthShare.status, 302);
  const verifiedIceShare = await request("/api/share/presets/preset_ice-statue", { redirect: "manual" });
  assert.equal(verifiedIceShare.status, 302);
  assert.equal(verifiedIceShare.headers.get("location"), "https://cloud.comfy.org/?share=b63c2c6a693c");
  const sketchShare = await request("/api/share/presets/preset_sketch-to-fabric", { redirect: "manual" });
  assert.equal(sketchShare.status, 302);
  assert.equal(sketchShare.headers.get("location"), "https://cloud.comfy.org/?share=674f97d9c785");
  const paparazziShare = await request("/api/share/presets/preset_2000s-paparazzi", { redirect: "manual" });
  assert.equal(paparazziShare.status, 302);
  assert.equal(paparazziShare.headers.get("location"), "https://cloud.comfy.org/?share=ed83dd8b3f43");
  const render3dShare = await request("/api/share/presets/preset_3d-render", { redirect: "manual" });
  assert.equal(render3dShare.status, 302);
  assert.equal(render3dShare.headers.get("location"), "https://cloud.comfy.org/?share=b526ac79c0bc");
  const actionFigureShare = await request("/api/share/presets/preset_action-figure", { redirect: "manual" });
  assert.equal(actionFigureShare.status, 302);
  assert.equal(actionFigureShare.headers.get("location"), "https://cloud.comfy.org/?share=2fbd48657c9f");
  const androidShare = await request("/api/share/presets/preset_android-assemble", { redirect: "manual" });
  assert.equal(androidShare.status, 302);
  assert.equal(androidShare.headers.get("location"), "https://cloud.comfy.org/?share=9afebef4c52a");
  const animalChaseShare = await request("/api/share/presets/preset_animal-chase", { redirect: "manual" });
  assert.equal(animalChaseShare.status, 302);
  assert.equal(animalChaseShare.headers.get("location"), "https://cloud.comfy.org/?share=0049ed2a6ae2");
  const animalRideShare = await request("/api/share/presets/preset_animal-ride", { redirect: "manual" });
  assert.equal(animalRideShare.status, 302);
  assert.equal(animalRideShare.headers.get("location"), "https://cloud.comfy.org/?share=955252c74034");
  const apexShare = await request("/api/share/presets/preset_apex-hunter", { redirect: "manual" });
  assert.equal(apexShare.status, 302);
  assert.equal(apexShare.headers.get("location"), "https://cloud.comfy.org/?share=1d6703698086");
  const arenaShare = await request("/api/share/presets/preset_arena-zero", { redirect: "manual" });
  assert.equal(arenaShare.status, 302);
  assert.equal(arenaShare.headers.get("location"), "https://cloud.comfy.org/?share=9355624943cb");
  const baseballShare = await request("/api/share/presets/preset_baseball-game", { redirect: "manual" });
  assert.equal(baseballShare.status, 302);
  assert.equal(baseballShare.headers.get("location"), "https://cloud.comfy.org/?share=1ec66504197e");
  const blueDepthShare = await request("/api/share/presets/preset_blue-depth", { redirect: "manual" });
  assert.equal(blueDepthShare.status, 302);
  assert.equal(blueDepthShare.headers.get("location"), "https://cloud.comfy.org/?share=2c97c474672b");
  const candidShare = await request("/api/share/presets/preset_candid-paparazzi", { redirect: "manual" });
  assert.equal(candidShare.status, 302);
  assert.equal(candidShare.headers.get("location"), "https://cloud.comfy.org/?share=f302c8a489cb");
  const cardboardShare = await request("/api/share/presets/preset_cardboard-cutout", { redirect: "manual" });
  assert.equal(cardboardShare.status, 302);
  assert.equal(cardboardShare.headers.get("location"), "https://cloud.comfy.org/?share=b7545154ec6f");
  const cgiShare = await request("/api/share/presets/preset_cgi-breakdown", { redirect: "manual" });
  assert.equal(cgiShare.status, 302);
  assert.equal(cgiShare.headers.get("location"), "https://cloud.comfy.org/?share=e8926c97fb11");
  const drownShare = await request("/api/share/presets/preset_drown-in-music", { redirect: "manual" });
  assert.equal(drownShare.status, 302);
  assert.equal(drownShare.headers.get("location"), "https://cloud.comfy.org/?share=98154e375396");
  const driftShare = await request("/api/share/presets/preset_drift-racing", { redirect: "manual" });
  assert.equal(driftShare.status, 302);
  assert.equal(driftShare.headers.get("location"), "https://cloud.comfy.org/?share=db5626ee92f5");
  const earthInShare = await request("/api/share/presets/preset_earth-zoom-in", { redirect: "manual" });
  assert.equal(earthInShare.status, 302);
  assert.equal(earthInShare.headers.get("location"), "https://cloud.comfy.org/?share=8ef42264c123");
  const earthOutShare = await request("/api/share/presets/preset_earth-zoom-out", { redirect: "manual" });
  assert.equal(earthOutShare.status, 302);
  assert.equal(earthOutShare.headers.get("location"), "https://cloud.comfy.org/?share=b250a65f3e4d");
  const elevateShare = await request("/api/share/presets/preset_elevate", { redirect: "manual" });
  assert.equal(elevateShare.status, 302);
  assert.equal(elevateShare.headers.get("location"), "https://cloud.comfy.org/?share=47cfd283f3d3");
  const fairytaleShare = await request("/api/share/presets/preset_fairytale-castle", { redirect: "manual" });
  assert.equal(fairytaleShare.status, 302);
  assert.equal(fairytaleShare.headers.get("location"), "https://cloud.comfy.org/?share=3e36179d9048");
  const casualShare = await request("/api/share/presets/preset_casual-monster-slayer", { redirect: "manual" });
  assert.equal(casualShare.status, 302);
  assert.equal(casualShare.headers.get("location"), "https://cloud.comfy.org/?share=b9eed06f1d35");
  const clayShare = await request("/api/share/presets/preset_clay-figurine", { redirect: "manual" });
  assert.equal(clayShare.status, 302);
  assert.equal(clayShare.headers.get("location"), "https://cloud.comfy.org/?share=b9babbd26f41");
  const disintegrationShare = await request("/api/share/presets/preset_disintegration", { redirect: "manual" });
  assert.equal(disintegrationShare.status, 302);
  assert.equal(disintegrationShare.headers.get("location"), "https://cloud.comfy.org/?share=d44b96d8d2a7");
  const orbitShare = await request("/api/share/presets/preset_orbit-360", { redirect: "manual" });
  assert.equal(orbitShare.status, 302, "all viral presets now have an App View link");
  const presetRecord = await request("/api/presets/preset_earth-zoom");
  assert.equal(presetRecord.status, 200);
  assert.equal((await presetRecord.json()).preset.id, "preset_earth-zoom");
  assert.equal((await request("/api/presets/preset_earth-zoom").then((response) => response.json())).preset.catalogPath, "/?preset=preset_earth-zoom");
  assert.equal((await request("/api/presets/preset_earth-zoom").then((response) => response.json())).preset.sharePath, "/api/share/presets/preset_earth-zoom");
  const missingPresetRecord = await request("/api/presets/preset_missing");
  assert.equal(missingPresetRecord.status, 404);
  const assetDownload = await request("/api/assets/asset_dry_image_01/download");
  assert.equal(assetDownload.status, 200);
  assert.match(assetDownload.headers.get("content-disposition") ?? "", /attachment/);
  assert.equal((await assetDownload.json()).format, "bosonfield-dry-asset");
  const pendingAsset = await request("/api/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "pending download", kind: "reference", mimeType: "image/png", idempotencyKey: "pending-download" }) });
  const pendingAssetId = (await pendingAsset.json()).asset.id;
  assert.equal((await request(`/api/assets/${pendingAssetId}/download`)).status, 409);
  assert.equal((await request(`/api/assets/${pendingAssetId}/complete`, { method: "POST" })).status, 200);
  assert.equal((await request(`/api/assets/${pendingAssetId}/download`)).status, 200);
  const unsafeLink = await request("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: "preset_earth-zoom", comfyAppUrl: "javascript:alert(1)" }) });
  assert.equal(unsafeLink.status, 400);
  const credentialPresetLink = await request("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: "preset_earth-zoom", comfyAppUrl: "https://user:pass@cloud.comfy.org/shared/earth-zoom" }) });
  assert.equal(credentialPresetLink.status, 400);
  const queryCredentialLink = await request("/api/admin/presets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ presetId: "preset_earth-zoom", comfyAppUrl: "https://cloud.comfy.org/shared/earth-zoom?api_key=secret" }) });
  assert.equal(queryCredentialLink.status, 400);
  const estimate = await request("/api/jobs/estimate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "video-i2v", inputs: { duration: 5, count: 2 } }) });
  assert.equal(estimate.status, 200);
  assert.equal((await estimate.json()).estimate.credits, 10);
  const unpublish = await request("/api/projects/project_dry_01/unpublish", { method: "POST" });
  assert.equal(unpublish.status, 200);
  assert.equal((await unpublish.json()).visibility, "private");
});

test("team membership remains role-scoped and dry-run", async () => {
  const workspace = await request("/api/workspaces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Review room" }) });
  assert.equal(workspace.status, 201);
  const workspaceBody = await workspace.json();
  assert.ok((await (await request("/api/workspaces")).json()).workspaces.some((entry) => entry.id === workspaceBody.workspace.id));
  const members = await request("/api/workspaces/workspace_dry_studio/members");
  assert.equal(members.status, 200);
  assert.equal((await members.json()).members.length, 3);
  const invalidInvite = await request("/api/workspaces/workspace_dry_studio/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "not-an-email", role: "member" }) });
  assert.equal(invalidInvite.status, 400);
  const invite = await request("/api/workspaces/workspace_dry_studio/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "new@example.com", role: "viewer" }) });
  assert.equal(invite.status, 201);
  assert.equal((await invite.json()).member.status, "invited");
  const refreshedMembers = await request("/api/workspaces/workspace_dry_studio/members");
  assert.ok((await refreshedMembers.json()).members.some((member) => member.email === "new@example.com" && member.role === "viewer"));
});

test("completed dry output retains job provenance in the library", async () => {
  const accepted = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", inputs: { prompt: "lineage check" }, idempotencyKey: "lineage-check" }),
  });
  const jobId = (await accepted.json()).job.id;
  await new Promise((resolve) => setTimeout(resolve, 950));
  const detail = await request(`/api/jobs/${jobId}`);
  const job = (await detail.json()).job;
  assert.equal(job.state, "complete");
  assert.equal(job.outputFiles[0].nodeId, "dry-output");
  assert.match(job.outputFiles[0].url, new RegExp(`^/api/assets/${job.outputs[0]}/download$`));
  const library = await request("/api/library?kind=image");
  const output = (await library.json()).assets.find((asset) => asset.id === job.outputs[0]);
  assert.equal(output.provenance.jobId, jobId);
  assert.equal(output.provenance.workflowId, "image-basic");
  assert.equal(output.provenance.inputs.prompt, "lineage check");
  const cinema = await request("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "cinema-shot", inputs: { title: "Cinema lineage", brief: "A measured opening", shotCount: 1 }, idempotencyKey: "cinema-lineage" }) });
  const cinemaId = (await cinema.json()).job.id;
  await new Promise((resolve) => setTimeout(resolve, 950));
  const cinemaJob = (await (await request(`/api/jobs/${cinemaId}`)).json()).job;
  const cinemaOutput = (await (await request("/api/library?kind=video")).json()).assets.find((asset) => asset.id === cinemaJob.outputs[0]);
  assert.equal(cinemaOutput.kind, "video");
  const influencer = await request("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "ai-influencer", inputs: { persona: "Field host", consent: true }, idempotencyKey: "influencer-lineage" }) });
  const influencerId = (await influencer.json()).job.id;
  await new Promise((resolve) => setTimeout(resolve, 950));
  const influencerJob = (await (await request(`/api/jobs/${influencerId}`)).json()).job;
  const influencerOutput = (await (await request("/api/library?kind=video")).json()).assets.find((asset) => asset.id === influencerJob.outputs[0]);
  assert.equal(influencerOutput.kind, "video");
});

test("failed dry jobs release their credit reservation exactly once", async () => {
  const before = await (await request("/api/billing")).json();
  const reserved = await request("/api/credits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: 3, jobId: "failed-reservation" }),
  });
  const reservationId = (await reserved.json()).reservation.id;
  const created = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "image-basic", inputs: { simulateFailure: true, reservationId }, idempotencyKey: "failed-reservation" }),
  });
  const jobId = (await created.json()).job.id;
  await new Promise((resolve) => setTimeout(resolve, 950));
  const detail = await request(`/api/jobs/${jobId}`);
  assert.equal((await detail.json()).job.state, "failed");
  const after = await (await request("/api/billing")).json();
  assert.equal(after.credits.reserved, before.credits.reserved);
  const releaseAgain = await request(`/api/credits/${reservationId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "release" }) });
  const releaseBody = await releaseAgain.json();
  assert.equal(releaseBody.reservation.state, "released");
  assert.equal(releaseBody.remaining, after.credits.available);
});

test("project edits, visibility, and asset deletion persist in dry state", async () => {
  const project = await request("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Mutable project", brief: "before", idempotencyKey: "mutable-project" }) });
  const projectId = (await project.json()).project.id;
  const edited = await request(`/api/projects/${projectId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Edited project", brief: "after" }) });
  assert.equal((await edited.json()).project.name, "Edited project");
  assert.equal((await (await request(`/api/projects/${projectId}`)).json()).project.brief, "after");
  await request(`/api/projects/${projectId}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visibility: "public" }) });
  assert.equal((await (await request(`/api/projects/${projectId}`)).json()).project.visibility, "public");

  const upload = await request("/api/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "delete me", kind: "reference", mimeType: "image/png", idempotencyKey: "delete-me" }) });
  const assetId = (await upload.json()).asset.id;
  const deleted = await request(`/api/assets/${assetId}`, { method: "DELETE" });
  assert.equal((await deleted.json()).asset.state, "deleted");
  const deletedRepeat = await request(`/api/assets/${assetId}`, { method: "DELETE" });
  assert.equal(deletedRepeat.status, 200);
  assert.equal((await deletedRepeat.json()).asset.state, "deleted");
  assert.equal((await request(`/api/assets/${assetId}`)).status, 404);
});

test("community project feed filters public records and paginates", async () => {
  const first = await request("/api/projects?visibility=public&limit=1");
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.projects.length, 1);
  assert.equal(firstBody.projects[0].visibility, "public");
  assert.equal(firstBody.nextCursor, "1");
  const match = await request("/api/projects?visibility=public&q=blue%20field");
  assert.equal(match.status, 200);
  assert.ok((await match.json()).projects.some((project) => project.id === "project_dry_public_01"));
  const privateFeed = await request("/api/projects?visibility=private");
  assert.equal((await privateFeed.json()).projects[0].visibility, "private");
});

test("community social actions persist per public project", async () => {
  const initial = await request("/api/projects/project_dry_public_01/social");
  assert.deepEqual((await initial.json()).social, { following: false, liked: false, followers: 0, likes: 0 });
  const followed = await request("/api/projects/project_dry_public_01/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "follow", active: true }) });
  assert.equal((await followed.json()).social.followers, 1);
  const liked = await request("/api/projects/project_dry_public_01/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "like", active: true }) });
  assert.deepEqual((await liked.json()).social, { following: true, liked: true, followers: 1, likes: 1 });
  const repeated = await request("/api/projects/project_dry_public_01/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "like", active: true }) });
  assert.equal((await repeated.json()).social.likes, 1);
  const removed = await request("/api/projects/project_dry_public_01/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "like", active: false }) });
  assert.equal((await removed.json()).social.likes, 0);
  assert.equal((await request("/api/projects/project_dry_01/social")).status, 200);
  assert.equal((await request("/api/projects/project_dry_public_01/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "boost", active: true }) })).status, 400);
});
