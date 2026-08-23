# AGENTS.md — ComfyUI-Use-Easy

Guidance for AI agents (and humans) working in this repository. Follow this so
your changes stay consistent and your releases keep working.

## What this repo is

A standards-compliant **ComfyUI custom node** that combines:

- **Backend nodes** in `nodes.py` (standard ComfyUI node contract).
- **Subgraph blueprints** in `subgraphs/` (reusable node groups served via
  `/global_subgraphs`).
- **React/TypeScript frontend** in `ui/` (built with Vite into `dist/`).

Published to the **Comfy Registry** under publisher `lalilu`. License:
**Apache-2.0**.

## Repository layout

```
AGENTS.md                 # this file
__init__.py               # exports NODE_CLASS_MAPPINGS + mounts dist/ frontend
nodes.py                  # backend node classes (ImageCompare is a thin passthrough)
subgraphs/                # subgraph blueprints
ui/                       # React+TS frontend source (ui/dist -> ../dist)
└─ src/imageCompare.ts    # custom node widget: beforeRegisterNodeDef + onDrawForeground
dist/                     # built frontend (committed so git installs work)
tests/test_nodes.py       # backend unit tests (stdlib unittest)
pyproject.toml            # package metadata + [tool.comfy]
requirements.txt
LICENSE                   # Apache-2.0
.comfyignore              # files excluded from the published archive
.github/workflows/ci.yml       # push/PR to main: build + test (never publishes)
.github/workflows/release.yml  # tag vX.Y.Z: build UI + publish to Comfy Registry
```

## Node contract (backend)

Follow the standard ComfyUI custom-node contract in `nodes.py`:

- `@classmethod INPUT_TYPES` returning `{"required": {...}, "optional": {...},
  "hidden": {...}}`, where each value is `(TYPE, {params})`.
- `RETURN_TYPES` / `RETURN_NAMES` (tuple, trailing comma for single), `CATEGORY`,
  `FUNCTION`.
- The function returns a tuple matching `RETURN_TYPES`.
- Register new nodes in `NODE_CLASS_MAPPINGS` and `NODE_DISPLAY_NAME_MAPPINGS`.
- Prefer the modern typed inputs (`io.Combo`, `io.Autogrow`, `io.DynamicCombo`)
  where they fit; the classic dict form is always safe.

Keep node logic small and pure — extract core work into plain functions so it can
be unit-tested without launching ComfyUI.

## Local development

### Backend (Python)

Custom-node Python is loaded at ComfyUI startup, so **restart ComfyUI after
editing `.py`**. For the fastest loop, unit-test the node function directly
instead of restarting.

```bash
python -m unittest discover -s tests     # backend node tests
```

Run ComfyUI (this machine uses a portable install):

```bash
python_embeded\python.exe main.py --port 8188
```

### Frontend (React + TypeScript)

```bash
cd ui
npm install
npm run build      # -> ../dist ; REQUIRED for the UI to appear
npm run watch      # dev loop: rebuild + auto-reload while editing
npm test           # frontend unit tests
```

> **Critical:** the frontend will not show until `dist/` exists (`npm run
> build`). Keep `dist/` committed so users can `git clone` and run without
> building.

## Frontend custom node UI

`ui/src/imageCompare.ts` customizes the `ImageCompare` node's UI. It uses:

- `app.registerExtension({ beforeRegisterNodeDef(nodeType, nodeData, app) })`
  and guards on `nodeData.name === 'ImageCompare'`.
- `nodeType.prototype.onDrawForeground` to render the two images from
  `node.imgs` (one `HTMLImageElement` per IMAGE output) with a draggable divider.
- `onMouseDown` / `onMouseMove` / `onMouseUp` to drag the divider.
- The divider position is **transient** (in-memory only, node var like
  `__useEasySplit`); it never re-runs the backend. The backend is a thin
  pass-through of the two images.
- `setDirtyCanvas(true, true)` to trigger a redraw after changes.

`node.imgs` is only populated after the workflow runs once (the IMAGE outputs
must be computed). Until then the widget draws a "Run the workflow" placeholder.

## Release / publish spec (MUST follow exactly)

### 1. Versioning

Semantic version in `pyproject.toml`:

```toml
[project]
version = "0.1.1"   # bump this for every release
```

### 2. Pre-publish validation

```bash
comfy node validate
```

This runs security + config checks and must pass before publishing.

### 3. Publishing — two paths (publish is tag-gated)

- **Manual** (one-off): from the repo root
  ```bash
  comfy node publish --token <REGISTRY_API_KEY>
  ```
- **Automated (preferred) — only on a version tag.** Regular pushes to `main`
  run `.github/workflows/ci.yml` (build + tests) and **never publish**. To
  publish:
  1. Bump `version` in `pyproject.toml`, commit, and push to `main` (CI green).
  2. Create and push a matching semantic version tag:
     ```bash
     git tag v0.1.2 && git push origin v0.1.2
     ```
  3. `.github/workflows/release.yml` (triggers on `vX.Y.Z` tags) builds `ui/`,
     **verifies the tag matches the pyproject `version`**, then publishes.

  Tag and pyproject `version` must agree; `release.yml` fails loudly otherwise.

### 4. Registry metadata

Keep `[tool.comfy]` in `pyproject.toml` correct:

```toml
[tool.comfy]
PublisherId = "lalilu"        # must match your registry publisher
DisplayName = "ComfyUI Use Easy"
Icon = ""
includes = ["dist/"]          # ship the built frontend
```

### 5. CI secret (if the API key changes)

The workflow publishes with `secrets.REGISTRY_ACCESS_TOKEN`.

⚠️ **Set it with `--body` — never with a PowerShell/pipe.** Piping into
`gh secret set` adds a trailing `\r\n`, which the Registry rejects as
`Invalid personal access token`:

```bash
gh secret set REGISTRY_ACCESS_TOKEN -R cy745/ComfyUI-Use-Easy --body "$(cat path/to/key.txt)"
```

## Standards / hard rules (Comfy Registry)

- **No `eval`/`exec`** in published code (RCE risk).
- **No runtime `subprocess` pip installs**; declare deps in `pyproject.toml`.
- **No code obfuscation.**
- Deriving from another project requires a distinct name and meaningful
  differences. This repo does **not** copy GPLv3 code (e.g.
  `ComfyUI-Easy-Use`) — reference its interfaces/ideas only, never its source.
- Keep `LICENSE` (Apache-2.0) and attribution intact.

## Critical gotchas (from real experience)

- **Pushing `.github/workflows/` requires the `workflow` scope** on the gh
  token. If a push is rejected, run:
  `gh auth refresh -h github.com -s workflow` and retry.
- **Secret newline bug:** see CI secret note above. A trailing newline makes the
  token invalid even though the same token works locally.
- **Name collisions in `__init__.py`.** ComfyUI exposes a top-level `nodes`
  module that holds `EXTENSION_WEB_DIRS`. Import it aliased
  (`import nodes as comfy_nodes`) and use `comfy_nodes.EXTENSION_WEB_DIRS`.
  A plain `import nodes` fought with `from .nodes import ...` (your own
  `nodes.py` submodule shadowed it) and raised
  `AttributeError: ...ComfyUI-Use-Easy.nodes has no attribute 'EXTENSION_WEB_DIRS'`.
- **`import { app } from '/scripts/app.js'` needs `// @ts-ignore`.** TypeScript
  can't resolve the absolute module specifier, but Vite leaves it external
  (config `external: ['/scripts/app.js', '/scripts/api.js']`) and ComfyUI serves
  it at runtime. Register extensions this way (at module top level) so
  `beforeRegisterNodeDef` fires before nodes register.
- **dist must be built/committed**, or the React UI won't appear when installed.
- **`.comfyignore`** keeps `tests/` and `ui/node_modules/` out of the published
  archive (good; keep it).
- Newly published versions show `NodeVersionStatusPending` briefly, then become
  installable in ComfyUI-Manager.

## If ComfyUI evolves

`__init__.py` registers the React extension via `EXTENSION_WEB_DIRS` + static
routes. If a future ComfyUI changes the frontend extension mechanism, verify:
- `nodes.EXTENSION_WEB_DIRS[project_name]` is still the correct hook, and
- the built routes (`/use_easy/`, `/locales/`) still resolve.

## Release checklist (before you release)

- [ ] `comfy node validate` passes
- [ ] `version` bumped in `pyproject.toml`, committed and pushed to `main`
  (`ci.yml` turns green; no publish happens here)
- [ ] `cd ui && npm run build` produced `dist/` (if frontend changed)
- [ ] create tag `v<version>` and push it (`git tag v0.1.2 && git push origin v0.1.2`)
  → `release.yml` builds and publishes
- [ ] confirm the node is in the registry:
  `https://api.comfy.org/nodes/comfyui_use_easy`
