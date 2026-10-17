import { bindings, defineConfig, defineWorker, triggers } from "cf/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? "production", process.cwd(), "");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cpuSetting = env.COMMONS_WORKER_CPU_MS?.trim()
  const cpuMs = cpuSetting ? Number(cpuSetting) : undefined
  if (cpuMs !== undefined && (!/^\d+$/.test(cpuSetting!) || !Number.isInteger(cpuMs) || cpuMs < 1 || cpuMs > 300000)) {
    throw new Error("COMMONS_WORKER_CPU_MS must be an integer between 1 and 300000; custom limits require Workers Paid.")
  }
  const notificationsEnabled = env.COMMONS_NOTIFICATIONS_ENABLED === 'true';
  if (!url || !key) {
    throw new Error("Cloudflare builds require NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return {
    worker: defineWorker({
      name: env.CLOUDFLARE_WORKER_NAME || "commons",
      domains: (env.CLOUDFLARE_DOMAINS || "").split(",").map(domain => domain.trim()).filter(Boolean),
      workersDev: true,
      entrypoint: "./src/worker.ts",
      triggers: [triggers.scheduled({ schedule: "*/5 * * * *" })],
      compatibilityDate: "2026-10-07",
      compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
      assets: { notFoundHandling: "none" },
      ...(cpuMs !== undefined ? { limits: { cpuMs } } : {}),
      observability: {
        enabled: true,
        headSamplingRate: 1,
        redactQueryString: true,
        logs: { enabled: true, invocationLogs: true, persist: true },
        traces: { enabled: false },
      },
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
        APP_URL: bindings.text(env.APP_URL || "https://commons.example.org"),
      },
    }),
  };
});
