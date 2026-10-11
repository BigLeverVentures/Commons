import { bindings, defineConfig, defineWorker, triggers } from "cf/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? "production", process.cwd(), "");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const notificationsEnabled = env.COMMONS_NOTIFICATIONS_ENABLED === 'true';
  if (!url || !key) {
    throw new Error("Cloudflare builds require NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return {
    worker: defineWorker({
      name: "commons",
      domains: ["commons.example.org", "www.commons.example.org"],
      workersDev: true,
      entrypoint: "./src/worker.ts",
      triggers: [triggers.scheduled({ schedule: "*/5 * * * *" })],
      compatibilityDate: "2026-10-07",
      compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
      assets: { notFoundHandling: "none" },
      env: {
        ASSETS: bindings.assets(),
        NOTIFICATIONS_ENABLED: bindings.text(String(notificationsEnabled)),
        CRON_SECRET: bindings.secret(),
        ...(notificationsEnabled ? {
          RESEND_API_KEY: bindings.secret(),
          EMAIL_FROM: bindings.secret(),
        } : {}),
        NEXT_PUBLIC_SUPABASE_URL: bindings.text(url),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: bindings.text(key),
        SUPABASE_SERVICE_ROLE_KEY: bindings.secret(),
        APP_URL: bindings.text("https://commons.example.org"),
      },
    }),
  };
});
