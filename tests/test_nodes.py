"""Backend node unit tests for ComfyUI-Use-Easy.

The node uses ComfyUI's Node 2.0 IO API (``comfy_api``) and is only importable
inside a ComfyUI Python environment. On CI runners (no ComfyUI) these skip.

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
    UseEasyMarkdownExport = _mod.UseEasyMarkdownExport
    HAS = True
except Exception:  # pragma: no cover
    UseEasyImageCompare = None
    UseEasyMarkdownExport = None
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

    def test_inputs_have_two_images(self):
        schema = UseEasyImageCompare.define_schema()
        ids = [input.id for input in schema.inputs]
        self.assertIn("image_a", ids)
        self.assertIn("image_b", ids)
        self.assertNotIn("compare_view", ids)

    def test_comfy_entrypoint(self):
        self.assertTrue(callable(_mod.comfy_entrypoint))


@unittest.skipUnless(HAS, "ComfyUI comfy_api not available; skipping")
class TestUseEasyMarkdownExport(unittest.TestCase):
    def test_schema_node_id(self):
        schema = UseEasyMarkdownExport.define_schema()
        self.assertEqual(schema.node_id, "UseEasyMarkdownExport")

    def test_schema_display_and_category(self):
        schema = UseEasyMarkdownExport.define_schema()
        self.assertEqual(schema.display_name, "UseEasy Markdown Export")
        self.assertEqual(schema.category, "UseEasy")

    def test_is_output_node(self):
        schema = UseEasyMarkdownExport.define_schema()
        self.assertTrue(schema.is_output_node)

    def test_inputs(self):
        schema = UseEasyMarkdownExport.define_schema()
        ids = [input.id for input in schema.inputs]
        self.assertIn("text_positive", ids)
        self.assertIn("text_negative", ids)
        self.assertIn("image", ids)
        self.assertNotIn("export_button", ids)

    def test_no_outputs(self):
        schema = UseEasyMarkdownExport.define_schema()
        self.assertEqual(schema.outputs, [])

    def test_register_via_entrypoint(self):
        self.assertTrue(callable(_mod.comfy_entrypoint))


if __name__ == "__main__":
    unittest.main()
