// Custom frontend widget for the UseEasy `ImageCompare` node.
//
// Renders a live side-by-side comparison of the node's two IMAGE outputs with a
// draggable vertical divider. Everything here is frontend-only (per user choice
// A): the divider position lives in memory only and never re-runs the backend.
//
// The backend node passes `image_a` / `image_b` through untouched; ComfyUI's
// frontend exposes the rendered outputs on `node.imgs` (one HTMLImageElement per
// IMAGE output), which we draw into the node's body via `onDrawForeground`.

// @ts-ignore - ComfyUI serves /scripts/app.js at runtime; vite leaves it external.
import { app } from '/scripts/app.js';

const NODE_NAME = 'ImageCompare';

app.registerExtension({
  name: 'UseEasy.ImageCompare',

  beforeRegisterNodeDef(nodeType: any, nodeData: any, _app: any): void {
    if (nodeData.name !== NODE_NAME) return;

    const hasImages = (node: any): boolean =>
      Array.isArray(node.imgs) && node.imgs.length >= 2;

    const origOnNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (this: any) {
      const res = origOnNodeCreated?.apply(this, arguments);
      // Transient divider position (0..1) — not persisted (option A).
      this.__useEasySplit = 0.5;
      this.__useEasyDragging = false;
      if (!this.size || this.size[0] < 300) {
        this.size = [320, 320];
      }
      return res;
    };

    nodeType.prototype.onDrawForeground = function (
      this: any,
      ctx: CanvasRenderingContext2D
    ) {
      const [w, h] = this.size;

      if (!hasImages(this)) {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#888';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Run the workflow to compare', w / 2, h / 2);
        return;
      }

      const split = Math.max(0, Math.min(1, this.__useEasySplit ?? 0.5));
      const x = split * w;
      const imageA = this.imgs[0];
      const imageB = this.imgs[1];

      // Right side: image_b.
      ctx.drawImage(imageB, 0, 0, w, h);
      // Left side: image_a, clipped to the left of the divider.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, x, h);
      ctx.clip();
      ctx.drawImage(imageA, 0, 0, w, h);
      ctx.restore();

      // Divider line + handle.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(x, h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    };

    nodeType.prototype.onMouseDown = function (
      this: any,
      _e: any,
      pos: number[]
    ): boolean {
      if (!hasImages(this)) return false;
      const [w] = this.size;
      const dx = pos[0] - this.pos[0];
      const dividerX = (this.__useEasySplit ?? 0.5) * w;
      if (Math.abs(dx - dividerX) <= 8) {
        this.__useEasyDragging = true;
        this.setDirtyCanvas(true, true);
        return true; // intercept so the node isn't dragged
      }
      return false;
    };

    nodeType.prototype.onMouseMove = function (
      this: any,
      _e: any,
      pos: number[]
    ) {
      if (!this.__useEasyDragging) return;
      const [w] = this.size;
      const dx = pos[0] - this.pos[0];
      this.__useEasySplit = Math.max(0, Math.min(1, dx / w));
      this.setDirtyCanvas(true, true);
    };

    nodeType.prototype.onMouseUp = function (this: any) {
      if (this.__useEasyDragging) {
        this.__useEasyDragging = false;
        this.setDirtyCanvas(true, true);
      }
    };
  },
});
