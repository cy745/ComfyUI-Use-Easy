"""Backend node unit tests (stdlib unittest, no ComfyUI or torch needed).

Run from the repository root:

    python -m unittest discover -s tests
"""

import os
import sys
import unittest

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.dirname(HERE))

from nodes import UseEasyImageCompare  # noqa: E402


class TestUseEasyImageCompare(unittest.TestCase):
    def setUp(self):
        self.node = UseEasyImageCompare()

    def test_passthrough_returns_both_images(self):
        image_a = object()
        image_b = object()
        out = self.node.compare(image_a, image_b)
        self.assertEqual(len(out), 2)
        self.assertIs(out[0], image_a)
        self.assertIs(out[1], image_b)

    def test_input_types_have_two_images(self):
        required = UseEasyImageCompare.INPUT_TYPES()["required"]
        self.assertIn("image_a", required)
        self.assertIn("image_b", required)
        self.assertEqual(required["image_a"][0], "IMAGE")
        self.assertEqual(required["image_b"][0], "IMAGE")

    def test_return_types_two_images(self):
        self.assertEqual(UseEasyImageCompare.RETURN_TYPES, ("IMAGE", "IMAGE"))


if __name__ == "__main__":
    unittest.main()

