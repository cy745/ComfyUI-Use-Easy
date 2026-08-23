"""Backend IO (Node 2.0) node definitions for ComfyUI-Use-Easy.

This mirrors ComfyUI's native ``ImageCompare`` (comfy_extras/nodes_image_compare.py):
a Node 2.0 ``IO.ComfyNode`` that saves both input images via
``nodes.PreviewImage().save_images`` and returns their references in the ``ui``
output (``a_images`` / ``b_images``). The frontend extension (ui/src/nodeExtension.ts)
reads those and feeds the native ``IO.ImageCompare`` Vue widget, which renders the
interactive slider comparison.
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
            description="Compares two images side by side with a slider.",
            category="UseEasy",
            essentials_category="Image Tools",
            is_experimental=False,
            is_output_node=True,
            inputs=[
                IO.Image.Input("image_a", optional=True),
                IO.Image.Input("image_b", optional=True),
                IO.ImageCompare.Input("compare_view"),
            ],
            outputs=[],
        )

    @classmethod
    def execute(cls, image_a=None, image_b=None, compare_view=None) -> IO.NodeOutput:
        result = {"a_images": [], "b_images": []}

        preview_node = nodes.PreviewImage()

        if image_a is not None and len(image_a) > 0:
            saved = preview_node.save_images(image_a, "use_easy.compare.a")
            result["a_images"] = saved["ui"]["images"]

        if image_b is not None and len(image_b) > 0:
            saved = preview_node.save_images(image_b, "use_easy.compare.b")
            result["b_images"] = saved["ui"]["images"]

        return IO.NodeOutput(ui=result)


class UseEasyImageCompareExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [
            UseEasyImageCompare,
        ]


async def comfy_entrypoint() -> UseEasyImageCompareExtension:
    return UseEasyImageCompareExtension()


__all__ = ["UseEasyImageCompare", "comfy_entrypoint"]
