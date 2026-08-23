# Subgraph blueprints

Drop `.json` subgraph blueprints in this folder to publish reusable node groups.
They are served to the global "Subgraph" menu via `/global_subgraphs`.

How to add one:
1. Build a node group in the ComfyUI canvas.
2. Select the nodes → convert to a *subgraph*.
3. Export the subgraph as JSON.
4. Save it here (e.g. `MyBlueprints/My_component.json`).

Structure:
- `MyBlueprints/`  (one folder per blueprint collection, optional)
- `MyBlueprints/My_component.json`  (frontend-format workflow JSON)

See https://docs.comfy.org/custom-nodes/subgraph_blueprints
