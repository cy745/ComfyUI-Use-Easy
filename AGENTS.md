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
__init__.py               # exposes comfy_entrypoint + mounts dist/ frontend
nodes.py                  # Node 2.0 IO node (PreviewImage.save_images -> ui a_images/b_images)
subgraphs/                # subgraph blueprints
ui/                       # React+TS frontend source (ui/dist -> ../dist)
└─ src/nodeExtension.ts   # nodeCreated hook feeds the native IO.ImageCompare Vue widget
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

`UseEasyImageCompare` is a **Node 2.0** `IO.ComfyNode` (registered via
`comfy_entrypoint`), not a classic node. Its display uses ComfyUI's native
`IO.ImageCompare` Vue widget. See "Frontend custom node UI" below. The classic
contract below applies to any future classic nodes you add.

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

`UseEasyImageCompare` is a **Node 2.0** `IO.ComfyNode` that renders with
ComfyUI's **native `IO.ImageCompare` Vue widget** (an interactive slider). This
works under ComfyUI's Node 2.0 rendering, where the classic
`onDrawForeground` / `onMouseMove` canvas hooks are NOT called.

The data flow (mirrors ComfyUI's own `Compare Images` node):

1. **Backend** (`nodes.py`) saves both images via
   `nodes.PreviewImage().save_images(...)` and returns their references in the
   `ui` output:
   ```python
   return IO.NodeOutput(ui={"a_images": [...], "b_images": [...]})
   ```
2. **Frontend** (`ui/src/nodeExtension.ts`) registers a `nodeCreated` hook that,
   for `node.constructor.comfyClass === 'UseEasyImageCompare'`, intercepts
   `onExecuted`, reads `a_images`/`b_images`, builds `/view` URLs, and sets the
   `imagecompare`-type widget's value to `{ beforeImages, afterImages }`:
   ```ts
   const widget = node.widgets?.find((w) => w.type === 'imagecompare')
   if (widget) { widget.value = { beforeImages, afterImages }; widget.callback?.(widget.value) }
   ```

> **Key gotcha:** ComfyUI's core `imageCompare.ts` only feeds the widget for the
> built-in `ImageCompare` node (`nodeCreated` checks `comfyClass ===
> 'ImageCompare'`). A custom node with a different class MUST provide its own
> `nodeCreated` / `onExecuted` hook to set the widget value, or the slider stays
> empty ("no images to compare"). Also, the node must be registered via
> `comfy_entrypoint` (see below), or the Node 2.0 widget won't render.

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
- **Node class names must be globally unique.** The `NODE_CLASS_MAPPINGS` key
  (the Python class name) is a global registry — if another installed custom
  node already uses the same name, whichever loads last silently overwrites the
  other. Symptom: your node/category vanishes and the colliding node's def shows
  under the shared name. Pick a namespaced name (e.g. `UseEasyImageCompare`,
  not `ImageCompare`) and check `http://127.0.0.1:8188/object_info/<YourName>`
  after restart.
- **Register a Node 2.0 `IO.ComfyNode` via `comfy_entrypoint`.** Expose
  `async def comfy_entrypoint()` returning a `ComfyExtension`, and have
  `__init__.py` re-export it — **do not** define `NODE_CLASS_MAPPINGS` in
  `__init__.py` (if you do, ComfyUI takes the classic branch and the Node 2.0
  widget won't render). And for the `IO.ImageCompare` widget to receive images,
  provide a `nodeCreated` hook that sets the widget value (core only does this
  for the built-in `ImageCompare` class).
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
