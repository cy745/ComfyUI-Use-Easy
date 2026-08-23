"""Backend node unit tests for ComfyUI-Use-Easy.

The node imports ComfyUI modules (folder_paths) and torch/PIL, so on CI runners
(no ComfyUI/env) these tests skip.

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
    import torch  # noqa: F401 - requires a ComfyUI python env
    import PIL  # noqa: F401
    import folder_paths  # noqa: F401 - ComfyUI module

    _mod = importlib.import_module("nodes")
    UseEasyImageCompare = _mod.UseEasyImageCompare
    NODE_CLASS_MAPPINGS = _mod.NODE_CLASS_MAPPINGS
    HAS = True
except Exception:  # pragma: no cover
    UseEasyImageCompare = None
    HAS = False


@unittest.skipUnless(HAS, "ComfyUI env (torch/PIL/folder_paths) not available; skipping")
class TestUseEasyImageCompare(unittest.TestCase):
    def test_input_types_have_two_images(self):
        required = UseEasyImageCompare.INPUT_TYPES()["required"]
        self.assertIn("image_a", required)
        self.assertIn("image_b", required)
        self.assertEqual(required["image_a"][0], "IMAGE")
        self.assertEqual(required["image_b"][0], "IMAGE")

    def test_return_types_single_image(self):
        self.assertEqual(UseEasyImageCompare.RETURN_TYPES, ("IMAGE",))
        self.assertTrue(UseEasyImageCompare.OUTPUT_NODE)

    def test_registration(self):
        self.assertIn("UseEasyImageCompare", NODE_CLASS_MAPPINGS)


if __name__ == "__main__":
    unittest.main()
