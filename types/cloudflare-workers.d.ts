/* eslint-disable @typescript-eslint/no-explicit-any -- runtime bindings are injected by Cloudflare. */
type Fetcher = any;
type D1Database = any;

declare module "cloudflare:workers" {
  export const env: { DB?: D1Database };
}
