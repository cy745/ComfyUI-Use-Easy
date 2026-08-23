// Feeds the native ComfyUI `IO.ImageCompare` Vue widget for our custom node.
//
// ComfyUI's core imageCompare.ts only feeds the widget for the built-in
// 'ImageCompare' node (by comfyClass). Our node is a different comfyClass, so we
// replicate that hook here: on `nodeCreated`, intercept `onExecuted`, read the
// `a_images` / `b_images` refs the backend saved, build `/view` URLs, and set the
// widget value `{ beforeImages, afterImages }`. This drives the native Node 2.0
// slider comparison.

// @ts-ignore - ComfyUI serves these at runtime; vite leaves them external.
import { app } from '/scripts/app.js';
// @ts-ignore
import { api } from '/scripts/api.js';

const NODE_CLASS = 'UseEasyImageCompare';

app.registerExtension({
  name: 'UseEasy.ImageCompare',

  nodeCreated(node: any) {
    if (node.constructor?.comfyClass !== NODE_CLASS) return;

    // Give the node a sensible minimum size.
    const [w, h] = node.size;
    node.setSize([Math.max(w, 400), Math.max(h, 350)]);

    const onExecuted = node.onExecuted;
    node.onExecuted = function (this: any, output: any) {
      onExecuted?.call(this, output);

      const { a_images: aImages, b_images: bImages } = output || {};
      const rand = app.getRandParam();

      const toUrl = (record: Record<string, string>) => {
        const params = new URLSearchParams(record);
        return api.apiURL(`/view?${params}${rand}`);
      };

      const beforeImages = aImages?.length ? aImages.map(toUrl) : [];
      const afterImages = bImages?.length ? bImages.map(toUrl) : [];

      const widget = node.widgets?.find((wid: any) => wid.type === 'imagecompare');
      if (widget) {
        widget.value = { beforeImages, afterImages };
        widget.callback?.(widget.value);
      }
    };
  },
});
