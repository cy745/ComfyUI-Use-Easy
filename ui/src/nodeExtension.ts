// Draggable comparison DOM widget for the UseEasy `UseEasyImageCompare` node.
//
// Under Node 2.0 the classic `onDrawForeground` / `onMouseMove` canvas hooks are
// not called, so we mount a real DOM element via `addDOMWidget`. DOM pointer
// events work under Node 2.0, letting us require an actual pointer-drag (no
// hover-follow). The two images are loaded in `onExecuted` from the `ui` output
// refs (a_images / b_images -> /view URLs) and drawn with a CSS clip-path split.

// @ts-ignore - ComfyUI serves these at runtime; vite leaves them external.
import { app } from '/scripts/app.js';
// @ts-ignore
import { api } from '/scripts/api.js';

const NODE_CLASS = 'UseEasyImageCompare';

app.registerExtension({
  name: 'UseEasy.ImageCompare',

  nodeCreated(node: any) {
    if (node.constructor?.comfyClass !== NODE_CLASS) return;

    // Build the comparison DOM element.
    const el = document.createElement('div') as HTMLDivElement & { _dragging?: boolean };
    el.className = 'uec-compare';
    el.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#222;';

    const after = document.createElement('img');
    after.className = 'uec-after';
    after.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
    el.appendChild(after);

    const before = document.createElement('img');
    before.className = 'uec-before';
    before.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;clip-path:inset(0 50% 0 0);';
    el.appendChild(before);

    const line = document.createElement('div');
    line.className = 'uec-line';
    line.style.cssText =
      'position:absolute;top:0;bottom:0;width:2px;background:#fff;left:50%;transform:translateX(-1px);cursor:ew-resize;box-shadow:0 0 4px rgba(0,0,0,.8);';
    el.appendChild(line);

    const handle = document.createElement('div');
    handle.className = 'uec-handle';
    handle.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #333;box-shadow:0 0 6px rgba(0,0,0,.6);cursor:ew-resize;';
    el.appendChild(handle);

    // Requires an actual pointer-down drag (no hover-follow).
    let ratio = 0.5;
    const setSplit = (r: number) => {
      ratio = Math.max(0, Math.min(1, r));
      const pct = (ratio * 100).toFixed(2);
      before.style.clipPath = `inset(0 ${100 - parseFloat(pct)}% 0 0)`;
      line.style.left = `${pct}%`;
      handle.style.left = `${pct}%`;
    };
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (rect.width) setSplit((e.clientX - rect.left) / rect.width);
      el.setPointerCapture?.(e.pointerId);
      el._dragging = true;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!el._dragging) return;
      const rect = el.getBoundingClientRect();
      if (rect.width) setSplit((e.clientX - rect.left) / rect.width);
    };
    const onPointerUp = () => {
      el._dragging = false;
    };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    // Minimal size.
    const [w, h] = node.size;
    node.setSize([Math.max(w, 400), Math.max(h, 440)]);

    node.addDOMWidget('compare_view', 'custom', el, {
      getMinHeight: () => 260,
    });

    // Feed images after execution.
    const onExecuted = node.onExecuted;
    node.onExecuted = function (this: any, output: any) {
      onExecuted?.call(this, output);
      const rand = app.getRandParam();
      const toUrl = (record: Record<string, string>) => {
        const params = new URLSearchParams(record);
        return api.apiURL(`/view?${params}${rand}`);
      };
      const a = output?.a_images?.length ? toUrl(output.a_images[0]) : '';
      const b = output?.b_images?.length ? toUrl(output.b_images[0]) : '';
      if (a) after.src = a;
      if (b) before.src = b;
      setSplit(0.5);
    };
  },
});
