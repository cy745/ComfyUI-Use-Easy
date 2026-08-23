"""Backend node definitions for ComfyUI-Use-Easy.

The classes here follow the standard ComfyUI custom-node contract:
``INPUT_TYPES`` (required/optional/hidden) + ``RETURN_TYPES`` /
``RETURN_NAMES`` / ``CATEGORY`` / ``FUNCTION``, where the function returns a
tuple matching ``RETURN_TYPES``.
"""

from __future__ import annotations

import torch


class UseEasyImageRotate:
    """Rotate an IMAGE by 90/180/270 degrees using torch.rot90.

    Left as a small, dependency-free example of a backend node so you have a
    working baseline to expand on (blueprints, more nodes, etc.).
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "angle": (["90", "180", "270"], {"default": "90"}),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image_out",)
    FUNCTION = "rotate"
    CATEGORY = "UseEasy/image"

    def rotate(self, image: torch.Tensor, angle: str) -> tuple[torch.Tensor]:
        k = int(angle) // 90
        return (torch.rot90(image, k=k, dims=[-2, -1]),)


NODE_CLASS_MAPPINGS = {
    "UseEasyImageRotate": UseEasyImageRotate,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "UseEasyImageRotate": "UseEasy Image Rotate",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
