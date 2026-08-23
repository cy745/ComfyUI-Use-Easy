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

import nodes

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
                IO.String.Input("text_positive", multiline=True, default=""),
                IO.String.Input("text_negative", multiline=True, default=""),
                IO.Image.Input("image", optional=True),
            ],
            outputs=[],
        )

    @classmethod
    def execute(cls, text_positive='', text_negative='', image=None) -> IO.NodeOutput:
        # The prompts are read client-side from the node widgets; only the
        # image needs the backend to turn it into a viewable /view URL.
        result = {"a_images": []}

        if image is not None and len(image) > 0:
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
