"""Backend node definitions for ComfyUI-Use-Easy.

``UseEasyImageCompare`` follows the proven OUTPUT_NODE pattern (the same shape
as the community ImageAB-Compare / native save-preview approach): it saves the
two input images to the temp dir and hands their filenames to the frontend via a
``ui`` dict, which the JS extension reads in ``onExecuted`` and renders as a live
draggable comparison. It also emits a composite ``result`` image for export.
"""

from __future__ import annotations

import os
import uuid

import folder_paths
import numpy as np
import torch
from PIL import Image, ImageDraw


def tensor2pil(image):
    if len(image.shape) == 4:
        image = image[0]
    image_np = image.cpu().numpy()
    if image_np.dtype != np.uint8:
        if image_np.max() <= 1.0:
            image_np = (image_np * 255).astype(np.uint8)
        else:
            image_np = np.clip(image_np, 0, 255).astype(np.uint8)
    if len(image_np.shape) == 3 and image_np.shape[2] == 1:
        image_np = image_np.squeeze(2)
    return Image.fromarray(image_np)


def pil2tensor(image):
    return torch.from_numpy(np.array(image).astype(np.float32) / 255.0).unsqueeze(0)


class UseEasyImageCompare:
    """Interactive image comparison with a draggable split line (live preview)."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_a": ("IMAGE",),
                "image_b": ("IMAGE",),
                "split_direction": (["vertical", "horizontal"], {"default": "vertical"}),
                "split_ratio": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01}),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image_out",)
    FUNCTION = "compare_images"
    CATEGORY = "UseEasy/image"
    OUTPUT_NODE = True

    def compare_images(self, image_a, image_b, split_direction="vertical", split_ratio=0.5):
        img_a = tensor2pil(image_a)
        img_b = tensor2pil(image_b)
        base_w, base_h = img_a.size

        # Save the originals to the temp dir so the frontend can load them live.
        unique_id = str(uuid.uuid4())[:8]
        a_filename = f"use_easy_a_{unique_id}.png"
        b_filename = f"use_easy_b_{unique_id}.png"
        temp_dir = folder_paths.get_temp_directory()
        img_a.save(os.path.join(temp_dir, a_filename), format="PNG")
        img_b.save(os.path.join(temp_dir, b_filename), format="PNG")

        # Composite export image (reflects the current split).
        if split_direction == "horizontal":
            img_b_resized = img_b.resize((base_w, base_h), Image.Resampling.LANCZOS)
            result_img = Image.new("RGB", (base_w, base_h))
            split_y = int(base_h * split_ratio)
            result_img.paste(img_a.crop((0, 0, base_w, split_y)), (0, 0))
            result_img.paste(img_b_resized.crop((0, split_y, base_w, base_h)), (0, split_y))
            ImageDraw.Draw(result_img).line([(0, split_y), (base_w, split_y)], fill=(255, 0, 0), width=3)
        else:
            img_b_resized = img_b.resize((base_w, base_h), Image.Resampling.LANCZOS)
            result_img = Image.new("RGB", (base_w, base_h))
            split_x = int(base_w * split_ratio)
            result_img.paste(img_a.crop((0, 0, split_x, base_h)), (0, 0))
            result_img.paste(img_b_resized.crop((split_x, 0, base_w, base_h)), (split_x, 0))
            ImageDraw.Draw(result_img).line([(split_x, 0), (split_x, base_h)], fill=(255, 0, 0), width=3)

        return {
            "ui": {
                "img_a_filename": [a_filename],
                "img_b_filename": [b_filename],
                "split_direction": [split_direction],
                "split_ratio": [split_ratio],
                "base_size": [base_w, base_h],
            },
            "result": (pil2tensor(result_img),),
        }


NODE_CLASS_MAPPINGS = {
    "UseEasyImageCompare": UseEasyImageCompare,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "UseEasyImageCompare": "UseEasy Image Compare",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
