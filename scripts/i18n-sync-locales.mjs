#!/usr/bin/env node
// Sync every UI locale file to the shape of en.json.
//
// ui/src/i18n/locales.ts validates *every* locale against en.json at load time
// (assertValidLocaleMessages) and throws on any missing or extra key. So when a
// string is migrated into en.json, the same key must exist in all other locales.
//
// This script rewrites each non-English locale to exactly en.json's key shape:
//   - keeps an existing translated value when the key is still present,
//   - fills newly added keys with the English source value (a visible placeholder
//     awaiting translation),
//   - drops keys no longer present in English.
//
// Korean (ko.json) placeholders are then replaced with real translations by hand.
//
// Usage: node scripts/i18n-sync-locales.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "..", "ui", "src", "i18n", "locales");
const enPath = path.join(localesDir, "en.json");

const checkOnly = process.argv.includes("--check");

/** Build a node shaped like `reference`, preferring values from `candidate`. */
function syncNode(reference, candidate) {
  if (typeof reference === "string") {
    return typeof candidate === "string" ? candidate : reference;
  }
  const out = {};
  const candidateObj = candidate && typeof candidate === "object" ? candidate : {};
  for (const key of Object.keys(reference)) {
    out[key] = syncNode(reference[key], candidateObj[key]);
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const files = fs
  .readdirSync(localesDir)
  .filter((file) => file.endsWith(".json") && file !== "en.json")
  .sort();

let outOfSync = 0;
for (const file of files) {
  const filePath = path.join(localesDir, file);
  const current = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const synced = syncNode(en, current);
  const next = `${JSON.stringify(synced, null, 2)}\n`;
  if (next !== fs.readFileSync(filePath, "utf8")) {
    outOfSync += 1;
    if (checkOnly) {
      console.error(`out of sync: ${file}`);
    } else {
      fs.writeFileSync(filePath, next);
      console.log(`synced ${file}`);
    }
  }
}

if (checkOnly && outOfSync > 0) {
  console.error(`\n${outOfSync} locale file(s) out of sync. Run: node scripts/i18n-sync-locales.mjs`);
  process.exit(1);
}
console.log(checkOnly ? "All locales in sync." : `Done. ${outOfSync} locale(s) updated.`);
