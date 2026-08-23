// Live-comparison extension for the UseEasy `UseEasyImageCompare` node.
//
// Pattern mirrors the working community ImageAB-Compare writeup's approach:
// the backend saves the two images to the temp dir and returns their filenames
// in the `ui` output; `onExecuted` loads them via /view?type=temp and we render
// a split comparison in `onDrawForeground`, re-split on mouse move.

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

    nodeType.prototype.onNodeCreated = function (this: any) {
      const orig = nodeType.prototype.onNodeCreated?.call(this);
      this.imgA = null;
      this.imgB = null;
      this.splitRatio = 0.5;
      this.splitDirection = 'vertical';
      this.baseSize = [0, 0];
      this.isPointerOver = false;
      if (!this.size || this.size[0] < 300) this.size = [400, 440];
      return orig;
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
      this.isPointerOver = true;
      this.setDirtyCanvas(true, true);
    };

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

    nodeType.prototype.onMouseLeave = function (this: any) {
      this.isPointerOver = false;
      this.setDirtyCanvas(true, true);
    };

    nodeType.prototype.onDrawForeground = function (this: any, ctx: CanvasRenderingContext2D) {
      const [nodeW, nodeH] = this.size;
      const margin = 10;
      const widgetAreaHeight = 111;
      const drawArea = { x: margin, y: widgetAreaHeight, width: nodeW - margin * 2, height: nodeH - widgetAreaHeight - margin };

      ctx.fillStyle = '#222';
      ctx.fillRect(drawArea.x, drawArea.y, drawArea.width, drawArea.height);

      if (!this.imgA || !this.imgB) {
        ctx.fillStyle = '#888';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('运行工作流后显示对比', drawArea.x + drawArea.width / 2, drawArea.y + drawArea.height / 2);
        ctx.fillText('Run the workflow to compare', drawArea.x + drawArea.width / 2, drawArea.y + drawArea.height / 2 + 18);
        return;
      }

      const [baseW, baseH] = this.baseSize;
      const scale = Math.min(drawArea.width / baseW, drawArea.height / baseH);
      const renderW = baseW * scale;
      const renderH = baseH * scale;
      const renderX = drawArea.x + (drawArea.width - renderW) / 2;
      const renderY = drawArea.y + (drawArea.height - renderH) / 2;

      // Image B as the base.
      ctx.drawImage(this.imgB, renderX, renderY, renderW, renderH);

      // Image A clipped to the split (foreground).
      ctx.save();
      ctx.beginPath();
      if (this.splitDirection === 'horizontal') {
        const h = renderH * this.splitRatio;
        ctx.rect(renderX, renderY, renderW, h);
      } else {
        const w = renderW * this.splitRatio;
        ctx.rect(renderX, renderY, w, renderH);
      }
      ctx.clip();
      ctx.drawImage(this.imgA, renderX, renderY, renderW, renderH);
      ctx.restore();

      // Divider line + labels.
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (this.splitDirection === 'horizontal') {
        const y = renderY + renderH * this.splitRatio;
        ctx.moveTo(renderX, y);
        ctx.lineTo(renderX + renderW, y);
      } else {
        const x = renderX + renderW * this.splitRatio;
        ctx.moveTo(x, renderY);
        ctx.lineTo(x, renderY + renderH);
      }
      ctx.stroke();

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
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('B', renderX + renderW - 14, renderY + 15);
    };
  },
});
