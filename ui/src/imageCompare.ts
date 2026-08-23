// Custom frontend widget for the UseEasy `UseEasyImageCompare` node.
//
// Renders a live side-by-side comparison of the node's two IMAGE outputs with a
// draggable vertical divider. Frontend-only (option A): the divider position
// lives in memory and never re-runs the backend.
//
// Images are loaded the way rgthree's comparer does: after execution the node's
// `onExecuted` receives the output image metadata (filename/subfolder/type) and
// we build `/view` URLs, load them into `node.imgs`, and draw.

// @ts-ignore - ComfyUI serves these at runtime; vite leaves them external.
import { app } from '/scripts/app.js';
// @ts-ignore
import { api } from '/scripts/api.js';

const NODE_NAME = 'UseEasyImageCompare';

const imageDataToUrl = (data: any): string =>
  api.apiURL(
    `/view?filename=${encodeURIComponent(data.filename)}&type=${data.type}&subfolder=${data.subfolder}${app.getPreviewFormatParam()}${app.getRandParam()}`
  );

interface CompareNode {
  id: string | number;
  __useEasySplit: number;
  __useEasyDragging: boolean;
  __useEasyLoading: boolean;
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

    const loadImages = (node: CompareNode, urls: string[]) => {
      if (node.__useEasyLoading || urls.length < 2) return;
      node.__useEasyLoading = true;
      const a = new Image();
      const b = new Image();
      a.src = urls[0];
      b.src = urls[1];
      let pending = 2;
      const done = () => {
        pending -= 1;
        if (pending <= 0) {
          node.imgs = [a, b];
          node.__useEasyLoading = false;
          node.setDirtyCanvas(true, true);
        }
      };
      a.onload = done;
      b.onload = done;
    };

    // A custom LiteGraph widget that draws the comparison into the node body.
    const widget = {
      type: 'custom',
      name: 'compare_view',
      value: 0.5,
      draw(ctx: CanvasRenderingContext2D, node: CompareNode, _width: number, _y: number) {
        const [w, h] = node.size;
        const imgs = node.imgs || [];
        const ready = imgs.length >= 2 && imgs[0]?.naturalWidth && imgs[1]?.naturalWidth;

        if (!ready) {
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#888';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Run the workflow to compare', w / 2, h / 2);
          return;
        }

        const split = Math.max(0, Math.min(1, node.__useEasySplit ?? 0.5));
        const x = split * w;
        ctx.drawImage(imgs[1], 0, 0, w, h); // right: image_b
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, x, h); // left: image_a clipped to divider
        ctx.clip();
        ctx.drawImage(imgs[0], 0, 0, w, h);
        ctx.restore();
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
      this.__useEasyLoading = false;
      this.addCustomWidget(widget);
      if (!this.size || this.size[0] < 300) {
        this.size = [320, 320];
      }
      return res;
    };

    // Called when the node finishes executing. ComfyUI hands us the output image
    // metadata keyed by output name (image_a / image_b here).
    nodeType.prototype.onExecuted = function (this: CompareNode, output: any) {
      // eslint-disable-next-line no-console
      console.log('[UseEasy] onExecuted output keys:', output ? Object.keys(output) : null, output?.image_a?.[0], output?.image_b?.[0]);
      const collect = (v: any): any[] => (Array.isArray(v) && v.length ? v : []);
      let a = collect(output?.image_a) || collect(output?.a_images);
      let b = collect(output?.image_b) || collect(output?.b_images);
      if (!a.length && !b.length) {
        const imgs = collect(output?.images || output?.images_0 || output?.images_1);
        a = imgs.slice(0, 1);
        b = imgs.slice(1, 2);
      }
      const urls: string[] = [];
      if (a[0]) urls.push(imageDataToUrl(a[0]));
      if (b[0]) urls.push(imageDataToUrl(b[0]));
      if (urls.length >= 2) loadImages(this, urls);
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
