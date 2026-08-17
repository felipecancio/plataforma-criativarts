/**
 * Asaas keys start with `$` (e.g. $aact_...). Next.js (@next/env) strips quotes
 * then runs dotenv-expand, which treats `$word` as variable interpolation and
 * empties the value. Escape every `$` as `\$` so the key survives load.
 */
const fs = require("fs");

const path = ".env.local";
const raw = fs.readFileSync(path, "utf8");
const lines = raw.split(/\r?\n/);

function unwrap(value) {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith("`") && v.endsWith("`"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

/** Undo previous escapes, then escape every `$` for Next dotenv-expand. */
function escapeForNext(value) {
  const plain = value.replace(/\\\$/g, "$");
  return plain.replace(/\$/g, "\\$");
}

const out = lines.map((line) => {
  const m = line.match(/^(ASAAS_API_KEY|ASAAS_WEBHOOK_TOKEN)=(.*)$/);
  if (!m) return line;
  const value = unwrap(m[2]);
  return `${m[1]}=${escapeForNext(value)}`;
});

fs.writeFileSync(path, out.join("\n"));

const keyLine = out.find((l) => l.startsWith("ASAAS_API_KEY="));
const stored = keyLine.slice("ASAAS_API_KEY=".length);
const effective = stored.replace(/\\\$/g, "$");
console.log({
  storedPrefix: stored.slice(0, 14),
  effectiveLen: effective.length,
  startsWithDollar: effective.startsWith("$"),
});
