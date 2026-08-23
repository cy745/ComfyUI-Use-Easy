# ComfyUI-Use-Easy

A standards-compliant ComfyUI custom-node starting point that combines:

- **Backend nodes** (`nodes.py`) — standard `INPUT_TYPES` / `RETURN_TYPES` /
  `CATEGORY` / `FUNCTION` contract.
- **Subgraph blueprints** (`subgraphs/`) — reusable node groups served to the
  global "Subgraph" menu via `/global_subgraphs`.
- **React/TypeScript frontend** (`ui/`) — a real extension (sidebar tab, bottom
  panel, commands, keybindings, i18n) built with Vite, shipped as `dist/`.

It is scaffolded from the official
[ComfyUI-React-Extension-Template](https://github.com/Comfy-Org/ComfyUI-React-Extension-Template)
and published under the Apache License 2.0.

## Repository layout

```
ComfyUI-Use-Easy/
├─ __init__.py            # exports NODE_CLASS_MAPPINGS + mounts dist/ frontend
├─ nodes.py               # backend node classes
├─ subgraphs/             # subgraph blueprints (optional but recommended)
├─ ui/                    # React + TypeScript frontend (source)
│   ├─ src/               # App.tsx, main.tsx, i18n, tests
│   └─ dist/              # built extension (generated / committed)
├─ pyproject.toml         # package metadata + [tool.comfy]
├─ requirements.txt
├─ LICENSE                # Apache 2.0
├─ .comfyignore           # files excluded from the published archive
└─ .github/workflows/     # build + publish to the Comfy Registry
```

## Install (for users)

**From ComfyUI-Manager (if published to the Registry)**
Search for `ComfyUI Use Easy` in the Manager and install.

**From GitHub (no build needed)**
The built frontend (`dist/`) is committed, so a plain `git clone` works:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/cy745/ComfyUI-Use-Easy.git
```

Then restart ComfyUI. The `UseEasy` sidebar tab and the `UseEasy/image`
category appear.

## Local development

### Backend nodes

Custom-node Python is loaded at ComfyUI startup, so **restart ComfyUI after
editing `.py`**:

```bash
# portable install example (uses the bundled python)
python_embeded\python.exe main.py --port 8188
```

> Tip: unit-test your node function directly instead of restarting
> (`python -m unittest` / `pytest`) for the fastest backend loop.

### Frontend (React extension)

The source lives in `ui/`; the build output in `ui/dist/`.

```bash
cd ui
npm install
npm run watch        # dev: rebuild + auto-reload while you edit
npm run build        # production build -> ../dist (required for the UI to appear)
```

- `npm run watch` gives a seamless dev loop.
- **The UI will not show until `dist/` exists** (`npm run build`).

### Editing the ComfyUI frontend itself (rare)

Only needed if you change the core frontend. Use
[`ComfyUI_frontend`](https://github.com/Comfy-Org/ComfyUI_frontend) with
`pnpm dev`, keep the backend at `python main.py --port 8188`, and point ComfyUI
at a local build with `--front-end-root`.

## Adding a subgraph blueprint

Put a frontend-format workflow JSON under `subgraphs/` (e.g.
`subgraphs/MyBlueprints/My_component.json`). ComfyUI scans custom-node
directories and serves them via `/global_subgraphs` so users can insert the group
from the Subgraph menu. See
[Subgraph blueprints](https://docs.comfy.org/custom-nodes/subgraph_blueprints).

## Publishing

1. Set up a [Comfy Registry](https://registry.comfy.org) account and create a
   **publisher** (your publisher id is found after the `@` on your profile).
2. Create a **Registry publishing API key** at
   <https://registry.comfy.org/nodes>.
3. Fill in `pyproject.toml`:
   ```toml
   [tool.comfy]
   PublisherId = "YOUR_PUBLISHER_ID"
   DisplayName = "ComfyUI Use Easy"
   includes = ["dist/"]
   ```
4. Publish:
   ```bash
   pip install comfy-cli
   comfy node publish
   ```
   or push to `main` — the included GitHub Action builds `ui/` and publishes
   automatically (needs a `REGISTRY_ACCESS_TOKEN` repo secret).

## Standards

- Node metadata is declared in `pyproject.toml` (`comfy node init` compatible).
- `.comfyignore` keeps `tests/` and `ui/node_modules/` out of the archive.
- No `eval`/`exec`, no runtime `subprocess` pip installs, no obfuscated code.

## License

Apache License 2.0. See [LICENSE](LICENSE).
