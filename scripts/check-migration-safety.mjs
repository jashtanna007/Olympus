import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(
  "supabase/migrations"
);

/*
 * Historical baseline migrations are allowed to contain DROP TABLE
 * only because they now contain the explicit production-data guard.
 */
const guardedBaselines = new Set([
  "create_match_core.sql",
  "create_cricket_tables.sql",
]);

const destructivePatterns = [
  {
    label: "DROP TABLE",
    regex: /\bDROP\s+TABLE\b/i,
  },
  {
    label: "TRUNCATE TABLE",
    regex: /\bTRUNCATE\s+(?:TABLE\s+)?/i,
  },
];

const files = fs
  .readdirSync(dir)
  .filter((name) =>
    name.endsWith(".sql")
  );

const failures = [];

for (const file of files) {
  const fullPath =
    path.join(dir, file);

  const sql =
    fs.readFileSync(
      fullPath,
      "utf8"
    );

  for (const pattern of destructivePatterns) {
    if (!pattern.regex.test(sql)) {
      continue;
    }

    if (guardedBaselines.has(file)) {
      const guarded =
        sql.includes(
          "SAFETY STOP: destructive baseline migration refused"
        );

      if (!guarded) {
        failures.push(
          `${file}: ${pattern.label} exists without the required data-protection guard`
        );
      }

      continue;
    }

    failures.push(
      `${file}: unexpected ${pattern.label}`
    );
  }
}

if (failures.length > 0) {
  console.error(
    "\nMigration safety audit FAILED:\n"
  );

  for (const failure of failures) {
    console.error(
      `  - ${failure}`
    );
  }

  process.exit(1);
}

console.log(
  "Migration safety audit passed."
);
