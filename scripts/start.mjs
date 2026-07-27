import path from "node:path";

// ponytail: normalize Windows cache keys once; avoids forking the production server.
const nativeRelative = path.relative;
path.relative = (from, to) => nativeRelative(from, to).replaceAll("\\", "/");

const { startProdServer } = await import("vinext/server/prod-server");
await startProdServer({
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
});
