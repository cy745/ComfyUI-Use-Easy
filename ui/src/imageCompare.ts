// Custom frontend widget for the UseEasy `UseEasyImageCompare` node.
//
// Renders a live side-by-side comparison of the node's two IMAGE outputs with a
// draggable vertical divider. Everything here is frontend-only (option A): the
// divider position lives in memory only and never re-runs the backend.
//
// We attach a custom widget via `addCustomWidget` (the mechanism rgthree and
// other extensions use), rather than patching `onDrawForeground` directly, which
// proved unreliable in this ComfyUI build.

// @ts-ignore - ComfyUI serves /scripts/app.js at runtime; vite leaves it external.
import { app } from '/scripts/app.js';

const NODE_NAME = 'UseEasyImageCompare';

interface CompareNode {
  __useEasySplit: number;
  __useEasyDragging: boolean;
  imgs?: HTMLImageElement[];
  size: number[];
  pos: number[];
  setDirtyCanvas: (f: boolean, b: boolean) => void;
  addCustomWidget: (w: any) => void;
}

app.registerExtension({
  name: 'UseEasy.ImageCompare',

  beforeRegisterNodeDef(nodeType: any, nodeData: any, _app: any): void {
    if (nodeData.name !== NODE_NAME) return;

    // A custom LiteGraph widget that draws the comparison into the node body.
    const widget = {
      type: 'custom',
      name: 'compare_view',
      value: 0.5,
      draw(ctx: CanvasRenderingContext2D, node: CompareNode, _width: number, _y: number) {
        const [w, h] = node.size;
        const imgs = node.imgs || [];

        if (imgs.length >= 2 && imgs[0]?.naturalWidth && imgs[1]?.naturalWidth) {
          const split = Math.max(0, Math.min(1, node.__useEasySplit ?? 0.5));
          const x = split * w;
          // Right side: image_b.
          ctx.drawImage(imgs[1], 0, 0, w, h);
          // Left side: image_a, clipped to the left of the divider.
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, x, h);
          ctx.clip();
          ctx.drawImage(imgs[0], 0, 0, w, h);
          ctx.restore();
          // Divider + handle.
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
        } else {
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#888';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Run the workflow to compare', w / 2, h / 2);
        }
      },
      computeSize(width: number) {
        return [width, 220];
      },
    };

    const origOnNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (this: CompareNode) {
      const res = origOnNodeCreated?.apply(this, arguments);
      this.__useEasySplit = 0.5;
      this.__useEasyDragging = false;
      this.addCustomWidget(widget);
      if (!this.size || this.size[0] < 300) {
        this.size = [320, 320];
      }
      return res;
    };

    nodeType.prototype.onMouseDown = function (
      this: CompareNode,
      _e: any,
      pos: number[]
    ): boolean {
      const [w] = this.size;
      const dx = pos[0] - this.pos[0];
      const dividerX = (this.__useEasySplit ?? 0.5) * w;
      if (Math.abs(dx - dividerX) <= 8) {
        this.__useEasyDragging = true;
        this.setDirtyCanvas(true, true);
        return true;
      }
      return false;
    };

    nodeType.prototype.onMouseMove = function (
      this: CompareNode,
      _e: any,
      pos: number[]
    ) {
      if (!this.__useEasyDragging) return;
      const [w] = this.size;
      const dx = pos[0] - this.pos[0];
      this.__useEasySplit = Math.max(0, Math.min(1, dx / w));
      this.setDirtyCanvas(true, true);
    };

    nodeType.prototype.onMouseUp = function (this: CompareNode) {
      if (this.__useEasyDragging) {
        this.__useEasyDragging = false;
        this.setDirtyCanvas(true, true);
      }
    };
  },
});
