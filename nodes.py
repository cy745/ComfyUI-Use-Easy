"""Backend node definitions for ComfyUI-Use-Easy.

The classes here follow the standard ComfyUI custom-node contract:
``INPUT_TYPES`` (required/optional/hidden) + ``RETURN_TYPES`` /
``RETURN_NAMES`` / ``CATEGORY`` / ``FUNCTION``, where the function returns a
tuple matching ``RETURN_TYPES``.
"""

from __future__ import annotations


class ImageCompare:
    """Preview node for side-by-side image comparison.

    The backend only passes the two images through unchanged. All the compare
    UI (overlay + draggable divider) is rendered by the frontend extension
    (see ``ui/src/imageCompare.ts``), which reads the node's IMAGE outputs via
    ``node.imgs``.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_a": ("IMAGE",),
                "image_b": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("image_a", "image_b")
    FUNCTION = "compare"
    CATEGORY = "UseEasy/image"

    def compare(self, image_a, image_b):
        # Zero computation: just route the two images to the frontend.
        return (image_a, image_b)


NODE_CLASS_MAPPINGS = {
    "ImageCompare": ImageCompare,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageCompare": "UseEasy Image Compare",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
