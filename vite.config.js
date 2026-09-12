import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Ganti "ra-translation" di bawah dengan NAMA REPO GitHub kamu persis.
// Contoh: kalau repo-nya github.com/username/novel-ku, ganti jadi "/novel-ku/"
export default defineConfig({
  plugins: [react()],
  base: "/Ra-translation/",
});
