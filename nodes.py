"""Backend IO (Node 2.0) node definitions for ComfyUI-Use-Easy.

This node mirrors ComfyUI's native ``ImageCompare`` (``comfy_extras/nodes_image_compare.py``),
which renders a slider comparison using the Node 2.0 ``IO.ImageCompare`` widget.
That frontend path reliably displays images, unlike the legacy custom-canvas-widget
mechanism, so we adopt it under a unique node id.
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
            is_experimental=True,
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

        print(
            f"[UseEasy][compare] execute. image_a None={image_a is None} len={0 if image_a is None else len(image_a)} | "
            f"image_b None={image_b is None} len={0 if image_b is None else len(image_b)} | "
            f"compare_view None={compare_view is None}",
            flush=True,
        )

        preview_node = nodes.PreviewImage()

        if image_a is not None and len(image_a) > 0:
            saved = preview_node.save_images(image_a, "use_easy.compare.a")
            result["a_images"] = saved["ui"]["images"]
            print(f"[UseEasy][compare] saved a_images: {len(result['a_images'])}", flush=True)

        if image_b is not None and len(image_b) > 0:
            saved = preview_node.save_images(image_b, "use_easy.compare.b")
            result["b_images"] = saved["ui"]["images"]
            print(f"[UseEasy][compare] saved b_images: {len(result['b_images'])}", flush=True)

        print(f"[UseEasy][compare] result a={len(result['a_images'])} b={len(result['b_images'])}", flush=True)
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
