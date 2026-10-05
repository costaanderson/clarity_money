/**
 * Reorganization script: moves files to feature-based structure
 * and updates all imports across the codebase.
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

// ── 1. Create target directories ──────────────────────────────────────────────
const dirs = [
  "features/clients/lib",
  "features/clients/components",
  "features/pipeline",
  "features/tasks/lib",
  "features/tasks/components",
  "features/agenda/lib",
  "features/cockpit/lib",
  "features/week-panel/lib",
  "features/diagnostic/lib",
  "features/ai/lib",          // already has extract-text.ts
  "features/settings/lib",
  "features/activation-rules/lib",
  "shared/components/ui",
  "shared/hooks",
  "shared/lib",               // already has error-reporting.ts
  "shared/types",
  "shared/utils",
];
for (const d of dirs) {
  mkdirSync(join(SRC, d), { recursive: true });
}
console.log("✓ Directories created");

// ── 2. Move files ─────────────────────────────────────────────────────────────
const moves = [
  // clients
  ["lib/clients.functions.ts",             "features/clients/lib/clients.functions.ts"],
  ["lib/notes.functions.ts",               "features/clients/lib/notes.functions.ts"],
  ["lib/documents.functions.ts",           "features/clients/lib/documents.functions.ts"],
  ["components/clients/client-detail.tsx", "features/clients/components/client-detail.tsx"],
  ["components/clients/client-detail-sheet.tsx", "features/clients/components/client-detail-sheet.tsx"],
  ["components/clients/new-client-dialog.tsx",   "features/clients/components/new-client-dialog.tsx"],
  // tasks
  ["lib/tasks.functions.ts",               "features/tasks/lib/tasks.functions.ts"],
  ["components/tasks/task-edit-sheet.tsx", "features/tasks/components/task-edit-sheet.tsx"],
  // agenda
  ["lib/calendar.functions.ts",            "features/agenda/lib/calendar.functions.ts"],
  // cockpit
  ["lib/cockpit.functions.ts",             "features/cockpit/lib/cockpit.functions.ts"],
  // week-panel
  ["lib/dashboard.functions.ts",           "features/week-panel/lib/dashboard.functions.ts"],
  // ai (ai.functions; extract-text already exists)
  ["lib/ai.functions.ts",                  "features/ai/lib/ai.functions.ts"],
  // diagnostic
  ["lib/diagnostico.ts",                   "features/diagnostic/lib/diagnostico.ts"],
  ["lib/diagnostics.functions.ts",         "features/diagnostic/lib/diagnostics.functions.ts"],
  // activation-rules
  ["lib/rules.functions.ts",               "features/activation-rules/lib/rules.functions.ts"],
  // settings
  ["lib/categories.functions.ts",          "features/settings/lib/categories.functions.ts"],
  // hooks
  ["hooks/use-mobile.tsx",                 "shared/hooks/use-mobile.tsx"],
];

for (const [from, to] of moves) {
  const src = join(SRC, from);
  const dst = join(SRC, to);
  if (!existsSync(src)) {
    console.warn(`  ⚠ skip (not found): ${from}`);
    continue;
  }
  renameSync(src, dst);
  console.log(`  mv ${from} → ${to}`);
}

// Move all UI component files to shared/components/ui/
const uiSrc = join(SRC, "components/ui");
const uiDst = join(SRC, "shared/components/ui");
if (existsSync(uiSrc)) {
  for (const f of readdirSync(uiSrc)) {
    const s = join(uiSrc, f);
    const d = join(uiDst, f);
    if (statSync(s).isFile()) {
      renameSync(s, d);
    }
  }
  console.log("  mv components/ui/* → shared/components/ui/");
}

console.log("✓ Files moved");

// ── 3. Import replacements ────────────────────────────────────────────────────
// Map of old import path fragment → new import path fragment
const replacements = [
  // lib → features
  ["@/lib/clients.functions",           "@/features/clients/lib/clients.functions"],
  ["@/lib/notes.functions",             "@/features/clients/lib/notes.functions"],
  ["@/lib/documents.functions",         "@/features/clients/lib/documents.functions"],
  ["@/lib/tasks.functions",             "@/features/tasks/lib/tasks.functions"],
  ["@/lib/calendar.functions",          "@/features/agenda/lib/calendar.functions"],
  ["@/lib/cockpit.functions",           "@/features/cockpit/lib/cockpit.functions"],
  ["@/lib/dashboard.functions",         "@/features/week-panel/lib/dashboard.functions"],
  ["@/lib/ai.functions",                "@/features/ai/lib/ai.functions"],
  ["@/lib/diagnostico",                 "@/features/diagnostic/lib/diagnostico"],
  ["@/lib/diagnostics.functions",       "@/features/diagnostic/lib/diagnostics.functions"],
  ["@/lib/rules.functions",             "@/features/activation-rules/lib/rules.functions"],
  ["@/lib/categories.functions",        "@/features/settings/lib/categories.functions"],
  // components → features
  ["@/components/clients/client-detail-sheet", "@/features/clients/components/client-detail-sheet"],
  ["@/components/clients/client-detail",       "@/features/clients/components/client-detail"],
  ["@/components/clients/new-client-dialog",   "@/features/clients/components/new-client-dialog"],
  ["@/components/tasks/task-edit-sheet",       "@/features/tasks/components/task-edit-sheet"],
  // ui → shared/ui
  ["@/components/ui/",                  "@/shared/components/ui/"],
  // hooks → shared
  ["@/hooks/use-mobile",                "@/shared/hooks/use-mobile"],
];

function collectFiles(dir, exts = [".ts", ".tsx"]) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      results.push(...collectFiles(full, exts));
    } else if (exts.some((e) => full.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// Collect all source files (excluding node_modules, .git)
const allFiles = collectFiles(SRC);
let updatedCount = 0;

for (const file of allFiles) {
  let content = readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(file, content);
    updatedCount++;
    console.log(`  updated: ${file.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
  }
}

console.log(`✓ Imports updated in ${updatedCount} files`);
console.log("\nDone! Run npm run build to verify.");
