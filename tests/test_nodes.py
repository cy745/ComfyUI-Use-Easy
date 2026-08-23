"""Backend node unit tests for ComfyUI-Use-Easy.

The node uses ComfyUI's Node 2.0 IO API (``comfy_api``), which is only available
inside a ComfyUI Python environment. On CI runners (no ComfyUI) these tests skip.

Run from the repository root:

    python -m unittest discover -s tests
"""

import importlib
import os
import sys
import unittest

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.dirname(HERE))

try:
    import comfy_api  # noqa: F401 - only available inside a ComfyUI env

    _mod = importlib.import_module("nodes")
    UseEasyImageCompare = _mod.UseEasyImageCompare
    HAS = True
except Exception:  # pragma: no cover
    UseEasyImageCompare = None
    HAS = False


@unittest.skipUnless(HAS, "ComfyUI comfy_api not available; skipping")
class TestUseEasyImageCompare(unittest.TestCase):
    def test_schema_node_id(self):
        schema = UseEasyImageCompare.define_schema()
        self.assertEqual(schema.node_id, "UseEasyImageCompare")

    def test_schema_display_and_category(self):
        schema = UseEasyImageCompare.define_schema()
        self.assertEqual(schema.display_name, "UseEasy Image Compare")
        self.assertEqual(schema.category, "UseEasy")

    def test_is_output_node(self):
        schema = UseEasyImageCompare.define_schema()
        self.assertTrue(schema.is_output_node)

    def test_inputs_have_image_a_b_and_compare_view(self):
        schema = UseEasyImageCompare.define_schema()
        ids = [input.id for input in schema.inputs]
        self.assertIn("image_a", ids)
        self.assertIn("image_b", ids)
        self.assertIn("compare_view", ids)


if __name__ == "__main__":
    unittest.main()
