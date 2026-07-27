export function GET() {
  return Response.json({ plugins: [{ id: "photoshop", host: "Photoshop", status: "planned", capabilities: ["image.generate", "image.edit", "image.enhance"] }, { id: "premiere", host: "Premiere Pro", status: "planned", capabilities: ["video.generate", "video.edit", "video.enhance"] }, { id: "figma", host: "Figma", status: "planned", capabilities: ["image.generate", "image.edit"] }], mode: "dry-run" });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { host?: string; operation?: string };
  if (!body.host?.trim() || !body.operation?.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "host and operation are required" } }, { status: 400 });
  return Response.json({ mode: "dry-run", adapter: { host: body.host, operation: body.operation, status: "prepared", credentialsRequested: false, execution: "approval-required" } }, { status: 201 });
}
