import { GET as workerCapabilities } from "../route";

type RouteContext = { params: Promise<{ capability: string }> };

/** REST-shaped aliases for the official ComfyUI introspection routes. */
export async function GET(request: Request, context: RouteContext) {
  const { capability } = await context.params;
  const url = new URL(request.url);
  url.searchParams.set("capability", capability);
  return workerCapabilities(new Request(url, request));
}
