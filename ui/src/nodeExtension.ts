// Node 2.0-compatible comparison widget for the UseEasy `UseEasyImageCompare` node.
//
// Key point: under ComfyUI's "Node 2.0 rendering", the classic `onDrawForeground`
// hook is NOT called (that's why the previous onDrawForeground version showed
// nothing). But an `addCustomWidget` widget's `draw(...)` IS rendered. So we
// render the live comparison inside a custom widget, and load the two temp images
// in `onExecuted` (which fires, confirmed).

// @ts-ignore - ComfyUI serves these at runtime; vite leaves them external.
import { app } from '/scripts/app.js';

const NODE_NAME = 'UseEasyImageCompare';

const loadImage = (name: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `/view?filename=${encodeURIComponent(name)}&type=temp&subfolder=&t=${Date.now()}`;
  });

app.registerExtension({
  name: 'UseEasy.ImageCompare',

  beforeRegisterNodeDef(nodeType: any, nodeData: any, _app: any): void {
    if (nodeData.name !== NODE_NAME) return;

    // The comparison widget. Its `draw` is called by the (Node 2.0) renderer.
    const widget = {
      type: 'custom',
      name: 'compare_view',
      value: 0.5,
      draw(ctx: CanvasRenderingContext2D, node: any, width: number, y: number) {
        const nodeH = node.size[1];
        const h = Math.max(20, nodeH - y);
        ctx.fillStyle = '#222';
        ctx.fillRect(0, y, width, h);

        if (!node.imgA || !node.imgB) {
          ctx.fillStyle = '#888';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('运行工作流后显示对比', width / 2, y + h / 2);
          ctx.fillText('Run the workflow to compare', width / 2, y + h / 2 + 18);
          return;
        }

        const [baseW, baseH] = node.baseSize;
        const scale = Math.min(width / baseW, h / baseH);
        const renderW = baseW * scale;
        const renderH = baseH * scale;
        const renderX = (width - renderW) / 2;
        const renderY = y + (h - renderH) / 2;

        // Image B as base.
        ctx.drawImage(node.imgB, renderX, renderY, renderW, renderH);
        // Image A clipped to the split (foreground).
        ctx.save();
        ctx.beginPath();
        if (node.splitDirection === 'horizontal') {
          ctx.rect(renderX, renderY, renderW, renderH * node.splitRatio);
        } else {
          ctx.rect(renderX, renderY, renderW * node.splitRatio, renderH);
        }
        ctx.clip();
        ctx.drawImage(node.imgA, renderX, renderY, renderW, renderH);
        ctx.restore();

        // Divider.
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (node.splitDirection === 'horizontal') {
          const yLine = renderY + renderH * node.splitRatio;
          ctx.moveTo(renderX, yLine);
          ctx.lineTo(renderX + renderW, yLine);
        } else {
          const xLine = renderX + renderW * node.splitRatio;
          ctx.moveTo(xLine, renderY);
          ctx.lineTo(xLine, renderY + renderH);
        }
        ctx.stroke();

        // A / B labels.
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(renderX + 6, renderY + 6, 16, 16);
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', renderX + 14, renderY + 15);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(renderX + renderW - 22, renderY + 6, 16, 16);
        ctx.fillStyle = '#fff';
        ctx.fillText('B', renderX + renderW - 14, renderY + 15);
      },
      computeSize(width: number) {
        return [width, 300];
      },
    };

    // Capture previous onNodeCreated BEFORE overriding (avoid recursion).
    const origOnNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (this: any) {
      const res = origOnNodeCreated?.apply(this, arguments);
      this.imgA = null;
      this.imgB = null;
      this.splitRatio = 0.5;
      this.splitDirection = 'vertical';
      this.baseSize = [0, 0];
      this.addCustomWidget(widget);
      if (!this.size || this.size[0] < 300) this.size = [400, 440];
      return res;
    };

    nodeType.prototype.onExecuted = async function (this: any, output: any) {
      const aName = output?.img_a_filename?.[0];
      const bName = output?.img_b_filename?.[0];
      if (!aName || !bName) return;
      const [imgA, imgB] = await Promise.all([loadImage(aName), loadImage(bName)]);
      if (!imgA || !imgB) return;
      this.imgA = imgA;
      this.imgB = imgB;
      this.baseSize = [imgA.width, imgA.height];
      this.splitDirection = output?.split_direction?.[0] || 'vertical';
      this.splitRatio = Math.max(0, Math.min(1, output?.split_ratio?.[0] ?? 0.5));
      this.setDirtyCanvas(true, true);
    };

    // Mouse control (may or may not fire under Node 2.0; harmless if not).
    nodeType.prototype.onMouseMove = function (this: any, _e: any, pos: number[]) {
      if (!this.imgA || !this.imgB) return;
      const [nodeW, nodeH] = this.size;
      const margin = 10;
      const widgetAreaHeight = 111;
      const drawArea = { x: margin, y: widgetAreaHeight, width: nodeW - margin * 2, height: nodeH - widgetAreaHeight - margin };
      const [baseW, baseH] = this.baseSize;
      const scale = Math.min(drawArea.width / baseW, drawArea.height / baseH);
      const renderW = baseW * scale;
      const renderH = baseH * scale;
      const renderX = drawArea.x + (drawArea.width - renderW) / 2;
      const renderY = drawArea.y + (drawArea.height - renderH) / 2;
      const relX = Math.max(0, Math.min(pos[0] - renderX, renderW));
      const relY = Math.max(0, Math.min(pos[1] - renderY, renderH));
      if (this.splitDirection === 'horizontal') {
        this.splitRatio = Math.max(0, Math.min(relY / renderH, 1));
      } else {
        this.splitRatio = Math.max(0, Math.min(relX / renderW, 1));
      }
      this.setDirtyCanvas(true, true);
    };

    nodeType.prototype.onMouseEnter = function (this: any) {
      this.isPointerOver = true;
      this.setDirtyCanvas(true, true);
    };
    nodeType.prototype.onMouseLeave = function (this: any) {
      this.isPointerOver = false;
      this.setDirtyCanvas(true, true);
    };
  },
});
