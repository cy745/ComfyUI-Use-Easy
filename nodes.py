"""Backend IO (Node 2.0) node definitions for ComfyUI-Use-Easy.

This mirrors ComfyUI's native ``ImageCompare`` (comfy_extras/nodes_image_compare.py):
a Node 2.0 ``IO.ComfyNode`` that saves both input images via
``nodes.PreviewImage().save_images`` and returns their references in the ``ui``
output (``a_images`` / ``b_images``). The frontend extension
(ui/src/nodeExtension.ts) reads those refs and mounts a custom draggable DOM
widget to render the comparison.

``UseEasyMarkdownExport`` follows the same pattern: it saves the preview image
so the frontend (ui/src/markdownExport.ts) can embed a ``/view`` URL into a
Markdown Note copied to ComfyUI's clipboard.
"""

import base64
import io

import nodes

from PIL import Image
from typing_extensions import override

from comfy_api.latest import IO, ComfyExtension


class UseEasyImageCompare(IO.ComfyNode):
    """Compares two images with a slider interface."""

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="UseEasyImageCompare",
            display_name="UseEasy Image Compare",
            description="Compares two images with a draggable slider.",
            category="UseEasy",
            essentials_category="Image Tools",
            is_experimental=False,
            is_output_node=True,
            inputs=[
                IO.Image.Input("image_a", optional=True),
                IO.Image.Input("image_b", optional=True),
            ],
            outputs=[],
        )

    @classmethod
    def execute(cls, image_a=None, image_b=None) -> IO.NodeOutput:
        result = {"a_images": [], "b_images": []}

        preview_node = nodes.PreviewImage()

        if image_a is not None and len(image_a) > 0:
            saved = preview_node.save_images(image_a, "use_easy.compare.a")
            result["a_images"] = saved["ui"]["images"]

        if image_b is not None and len(image_b) > 0:
            saved = preview_node.save_images(image_b, "use_easy.compare.b")
            result["b_images"] = saved["ui"]["images"]

        return IO.NodeOutput(ui=result)


def _encode_webp_512(tensor, target_width: int = 512) -> str:
    """Downscale the first frame to ``target_width`` px and return WebP base64.

    WebP (lossy, quality 90) keeps the markdown note small: at 512px wide a
    photo-like image is ~56 KB vs ~404 KB as PNG. Big payloads are a real
    problem because the note text is stored inside the workflow draft, and
    those drafts live in localStorage (shared ~5 MB quota) - a single large
    PNG base64 can overflow it and trigger endless "save workflow draft
    failed" toasts.
    """
    array = tensor[0].cpu().numpy()
    array = (array.clip(0.0, 1.0) * 255.0).round().astype("uint8")
    mode = "RGBA" if array.shape[2] == 4 else "RGB"
    image = Image.fromarray(array, mode)

    width, height = image.size
    if width > target_width:
        new_height = max(1, round(height * target_width / width))
        image = image.resize((target_width, new_height), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=90)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


class UseEasyMarkdownExport(IO.ComfyNode):
    """Exports the prompts and result image into a ComfyUI Markdown Note.

    The node itself only saves the incoming image (so the frontend can reference
    it via a ``/view`` URL); all the markdown assembly and clipboard work happens
    in the frontend DOM widget (ui/src/markdownExport.ts).
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="UseEasyMarkdownExport",
            display_name="UseEasy Markdown Export",
            description=(
                "Builds a Markdown Note from the positive/negative prompts and "
                "the result image, then copies the note to ComfyUI's clipboard "
                "so it can be pasted (Ctrl+V) anywhere on the canvas."
            ),
            category="UseEasy",
            essentials_category="Image Tools",
            is_experimental=False,
            is_output_node=True,
            inputs=[
                IO.String.Input(
                    "text_positive",
                    display_name="正向提示词 (positive)",
                    multiline=True,
                    default="",
                    optional=True,
                    force_input=True,
                    tooltip=(
                        "Positive prompt. Connect any STRING output (e.g. "
                        "easy positive / GetNode) to receive it; leave "
                        "unconnected for an empty prompt."
                    ),
                ),
                IO.String.Input(
                    "text_negative",
                    display_name="负向提示词 (negative)",
                    multiline=True,
                    default="",
                    optional=True,
                    force_input=True,
                    tooltip="Negative prompt; same connection behavior as the positive prompt.",
                ),
                IO.Image.Input("image", optional=True),
                IO.Boolean.Input(
                    "use_base64",
                    default=False,
                    label_on="base64 (512px)",
                    label_off="view URL",
                    tooltip=(
                        "When enabled the image is downscaled to 512px wide "
                        "(aspect preserved) and embedded as a base64 WebP data "
                        "URL instead of a /view link (WebP keeps the workflow "
                        "draft small)."
                    ),
                ),
            ],
            outputs=[],
        )

    @classmethod
    def execute(
        cls, text_positive='', text_negative='', image=None, use_base64=False
    ) -> IO.NodeOutput:
        # The prompts are read client-side from the node widgets; only the
        # image needs the backend to turn it into something viewable.
        result = {"a_images": [], "a_base64": []}

        if image is not None and len(image) > 0:
            if use_base64:
                result["a_base64"] = [_encode_webp_512(image)]
            else:
                saved = nodes.PreviewImage().save_images(image, "use_easy.note")
                result["a_images"] = saved["ui"]["images"]

        return IO.NodeOutput(ui=result)


class UseEasyImageCompareExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [
            UseEasyImageCompare,
            UseEasyMarkdownExport,
        ]


async def comfy_entrypoint() -> UseEasyImageCompareExtension:
    return UseEasyImageCompareExtension()


__all__ = ["UseEasyImageCompare", "UseEasyMarkdownExport", "comfy_entrypoint"]
