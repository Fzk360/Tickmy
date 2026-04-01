# Repository Structure

## Active source of truth

Use these files and directories as the canonical app source:

- `App.vue`
- `main.js`
- `pages.json`
- `pages/**/*.vue`
- `components/**/*.vue`
- `store/tikmy-store.js`
- `adapters/mini-program-storage.js`
- `data/seed.js`
- `utils/**/*.js`

## Archived files

Legacy snapshots and stage files moved out of the source tree live in:

- `archive/legacy-snapshots-2026-04-01/`

Do not edit archived files when making product changes.

## Generated output

- `unpackage/` is generated build output.
- Do not treat `unpackage/` as the source of truth.
- Rebuild it from the active source files when needed.

## Backup naming policy

Do not leave temporary stage files in the main source tree with names such as:

- `*.next.vue`
- `*.phase3.vue`
- `*.clean.js`
- `*.__new.vue`

If a temporary snapshot is needed, put it under `archive/` instead.
