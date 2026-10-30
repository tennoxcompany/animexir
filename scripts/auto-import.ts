// GitHub Actions tarafından 5 dakikada bir çalıştırılır (.github/workflows/anilist-auto-import.yml).
import { createClient } from "@supabase/supabase-js";
import { runAutoImport } from "../src/lib/autoImport";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} eksik`);
  return v;
};

const db = createClient(env("VITE_SUPABASE_URL"), env("VITE_SUPABASE_PUBLISHABLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await db.auth.signInWithPassword({
  email: env("AUTO_IMPORT_EMAIL"),
  password: env("AUTO_IMPORT_PASSWORD"),
});
if (error) throw new Error("Yönetici girişi başarısız: " + error.message);

const r = await runAutoImport(db);
console.log(
  r.skipped ? "Otomatik çekme kapalı, atlandı" : `Eklenen: ${r.added}, güncellenen: ${r.updated}`,
);
