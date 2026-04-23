// Runtime-safe access to public app config.
// `NEXT_PUBLIC_APP_NAME` is inlined at build time by Next.js, so this
// value is available on both the server and the client.
export const APP_NAME: string =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "AR Banquets";
