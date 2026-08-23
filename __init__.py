"""ComfyUI-Use-Easy custom node entry point.

Registers the backend nodes (``nodes.py``) and mounts the built React
frontend (``dist/``) so the extension UI is served by the ComfyUI server.
"""

import os

import folder_paths
import nodes
import server
from aiohttp import web

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

workspace_path = os.path.dirname(__file__)
dist_path = os.path.join(workspace_path, "dist/use_easy")
dist_locales_path = os.path.join(workspace_path, "dist/locales")

if os.path.exists(dist_path):
    # Serve the built React app assets.
    server.PromptServer.instance.app.add_routes([web.static("/use_easy/", dist_path)])

    if os.path.exists(dist_locales_path):
        server.PromptServer.instance.app.add_routes([web.static("/locales/", dist_locales_path)])
    else:
        print("[ComfyUI-Use-Easy] WARNING: locale directory not found")

    # Register as a ComfyUI frontend extension web dir so the UI is picked up.
    project_name = os.path.basename(workspace_path)
    try:
        from comfy_config import config_parser

        project_name = config_parser.extract_node_configuration(workspace_path).project.name
    except Exception as exc:
        print(f"[ComfyUI-Use-Easy] fell back to folder name for project: {exc}")

    nodes.EXTENSION_WEB_DIRS[project_name] = os.path.join(workspace_path, "dist")
else:
    print(
        "[ComfyUI-Use-Easy] dist/ not found. Run `cd ui && npm install && npm run build` "
        "to build the frontend extension."
    )
