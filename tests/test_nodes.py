"""Backend node unit tests (stdlib unittest, no ComfyUI needed).

Run from the repository root:

    python -m unittest discover -s tests
"""

import os
import sys
import unittest

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.dirname(HERE))

try:
    import torch

    from nodes import UseEasyImageRotate  # noqa: E402

    HAS_TORCH = True
except Exception:  # pragma: no cover - CI runners may lack torch
    torch = None
    UseEasyImageRotate = None
    HAS_TORCH = False


@unittest.skipUnless(HAS_TORCH, "torch is not installed; skipping backend tests")
class TestUseEasyImageRotate(unittest.TestCase):
    def setUp(self):
        self.node = UseEasyImageRotate()

    def test_angle_90(self):
        image = torch.arange(4).reshape(1, 2, 2).float()
        out = self.node.rotate(image, "90")[0]
        expected = torch.rot90(image, k=1, dims=[-2, -1])
        self.assertTrue(torch.equal(out, expected))

    def test_angle_270_is_three_quarter_turn(self):
        image = torch.arange(6).reshape(1, 2, 3).float()
        out = self.node.rotate(image, "270")[0]
        expected = torch.rot90(image, k=3, dims=[-2, -1])
        self.assertTrue(torch.equal(out, expected))

    def test_output_type(self):
        image = torch.zeros(1, 4, 4)
        out = self.node.rotate(image, "180")[0]
        self.assertIsInstance(out, torch.Tensor)


if __name__ == "__main__":
    unittest.main()
