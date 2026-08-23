// "Export to Markdown Note" DOM widget for the UseEasy `UseEasyMarkdownExport`
// node.
//
// Under Node 2.0 the classic canvas hooks are not called, so (like the compare
// widget) we use `addDOMWidget`; DOM click events work fine under Node 2.0.
//
// The button assembles the prompts + result image into markdown, builds a real
// `MarkdownNote` node (created via `window.LiteGraph` so its serialization
// matches exactly what ComfyUI's own Ctrl+C produces), and writes it into
// ComfyUI's canvas clipboard store (`litegrapheditor_clipboard` in
// localStorage, the same key `LGraphCanvas.copyToClipboard` uses). The user
// then presses Ctrl+V (or right-click -> Paste) to drop the note anywhere.

// @ts-ignore - ComfyUI serves these at runtime; vite leaves them external.
import { app } from '/scripts/app.js';
// @ts-ignore
import { api } from '/scripts/api.js';

const NODE_CLASS = 'UseEasyMarkdownExport';
const CLIPBOARD_KEY = 'litegrapheditor_clipboard';

/** Read a widget value by name, falling back to widgets_values by index. */
function readWidgetValue(node: any, name: string): any {
  const widgets = node.widgets ?? [];
  const index = widgets.findIndex((w: any) => w.name === name);
  if (index >= 0) {
    const value = widgets[index]?.value;
    if (value !== undefined && value !== null) return value;
  }
  const values = node.widgets_values ?? [];
  return values[index];
}

/**
 * Read the value of a text input. When the input is connected (link input),
 * follow the link upstream and extract the source node's string value (its
 * matching widget, named widget value, or first string widget). Otherwise fall
 * back to the node's own widget (legacy / unconnected).
 */
function readTextInput(node: any, inputName: string): string {
  const input = (node.inputs ?? []).find((i: any) => i.name === inputName);
  const linkId = input?.link;
  if (linkId != null && node.graph) {
    const graph = node.graph;
    const link = graph._links?.get
      ? graph._links.get(linkId)
      : graph._links?.[linkId] ?? graph.links?.[linkId];
    if (link?.origin_id != null) {
      const originNode = graph.getNodeById?.(Number(link.origin_id)) ?? graph.getNodeById?.(link.origin_id);
      if (originNode) {
        const output = originNode.outputs?.[link.origin_slot];
        const byName = (originNode.widgets ?? []).find(
          (w: any) => w.name === output?.name || w.name === output?.display_name
        );
        if (byName && typeof byName.value === 'string') return byName.value;
        const named = originNode.widgets_values_named?.[output?.name];
        if (typeof named === 'string') return named;
        const firstString = (originNode.widgets ?? []).find((w: any) => typeof w.value === 'string');
        if (firstString) return String(firstString.value ?? '');
      }
    }
  }
  return String(readWidgetValue(node, inputName) ?? '');
}

/** Show a toast through whichever API this frontend version supports. */
function notify(severity: string, summary: string, detail: string) {
  const ext = (app as any).extensionManager;
  if (ext?.toast?.add?.call) {
    ext.toast.add({ severity, summary, detail, life: 6000 });
    return;
  }
  // Legacy frontends expose app.ui.toast instead.
  const ui = (app as any).ui;
  if (ui?.toast?.add?.call) {
    ui.toast.add({ message: detail, style: severity === 'success' ? 'success' : 'info' });
    return;
  }
  console.warn(`[UseEasy] ${detail}`);
}

function buildMarkdown(positive: string, negative: string, imageUrls: string[]): string {
  const fence = '````';
  const parts: string[] = [
    '## 正向提示词 (Positive)',
    '',
    fence,
    positive.trim() || '（空 / empty）',
    fence,
    '',
    '## 负向提示词 (Negative)',
    '',
    fence,
    negative.trim() || '（空 / empty）',
    fence,
  ];
  if (imageUrls.length > 0) {
    parts.push('', '## 结果图片 (Result)', '');
    imageUrls.forEach((url, i) => {
      parts.push(`![result-${i + 1}](${url})`);
    });
  }
  return parts.join('\n');
}

/**
 * Serialize a MarkdownNote node the same way ComfyUI's own clipboard does.
 * Preferred path: create the real node via LiteGraph and serialize it, so the
 * widget format is always correct for this frontend version.
 */
function buildMarkdownNoteNode(markdown: string): any {
  try {
    const LiteGraph = (window as any).LiteGraph;
    if (LiteGraph?.createNode) {
      const note = LiteGraph.createNode('MarkdownNote');
      note.properties ||= {};
      note.properties.text = markdown;
      const widget = (note.widgets ?? []).find((w: any) => w.name === 'text');
      if (widget) widget.value = markdown;
      // Cover both the classic (indexed) and named widget restore paths.
      note.widgets_values = [markdown];
      note.widgets_values_named = { text: markdown };
      const serialized = note.serialize();
      if (serialized.id == null) serialized.id = 0;
      serialized.pos = [0, 0];
      if (serialized.type !== 'MarkdownNote') serialized.type = 'MarkdownNote';
      return serialized;
    }
  } catch (error) {
    console.warn('[UseEasy] MarkdownNote creation failed, using plain payload', error);
  }
  return {
    id: 0,
    type: 'MarkdownNote',
    pos: [0, 0],
    size: [720, 480],
    flags: {},
    order: 0,
    mode: 0,
    inputs: [],
    outputs: [],
    properties: { text: markdown },
    widgets_values: [markdown],
    widgets_values_named: { text: markdown },
  };
}

app.registerExtension({
  name: 'UseEasy.MarkdownExport',

  nodeCreated(node: any) {
    if (node.constructor?.comfyClass !== NODE_CLASS) return;

    let imageUrls: string[] = [];
    let lastWasBase64 = false;

    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:6px 2px;width:100%;';

    const button = document.createElement('button');
    button.textContent = '📋 复制为 Markdown Note';
    button.style.cssText =
      'width:100%;padding:8px 10px;border:1px solid #4a4a4a;border-radius:6px;' +
      'background:#2b2b2b;color:#eee;font-size:13px;cursor:pointer;';
    button.addEventListener('click', () => {
      const positive = readTextInput(node, 'text_positive');
      const negative = readTextInput(node, 'text_negative');
      const useBase64 = readWidgetValue(node, 'use_base64') === true;
      const noPrompt = !positive.trim() && !negative.trim();
      const markdown = buildMarkdown(positive, negative, imageUrls);

      const note = buildMarkdownNoteNode(markdown);
      const payload = {
        nodes: [note],
        groups: [],
        reroutes: [],
        links: [],
        subgraphs: [],
      };
      localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(payload));

      // Move focus back to the canvas so the next Ctrl+V lands on the graph
      // (not in whatever text box was focused last).
      try {
        (app as any).canvas?.canvas?.focus?.();
      } catch (error) {
        // focus is best-effort
      }

      if (imageUrls.length === 0) {
        notify(
          'info',
          'UseEasy',
          '已复制 Markdown Note（未包含图片：请先运行该节点）。到画布 Ctrl+V 粘贴'
        );
      } else if (useBase64 && !lastWasBase64) {
        notify(
          'info',
          'UseEasy',
          '已复制 Markdown Note（当前为链接图片；要内嵌 base64 请开启开关后重新运行）。Ctrl+V 粘贴'
        );
      } else {
        notify(
          'success',
          'UseEasy',
          `已复制 Markdown Note（${lastWasBase64 ? 'base64 512px 图片' : '含图片链接'}）。Ctrl+V 粘贴`
        );
      }
      if (noPrompt) {
        notify(
          'warn',
          'UseEasy',
          '提示词为空：请把文本连线到“正向提示词/负向提示词”输入（如 easy positive 输出），或填写文本内容后再复制'
        );
      }
    });
    el.appendChild(button);

    const hint = document.createElement('div');
    hint.textContent = '提示词可连线文本源（如 easy positive），或直接填写；点击后 Ctrl+V 粘贴出 Markdown Note';
    hint.style.cssText = 'font-size:11px;color:#888;text-align:center;';
    el.appendChild(hint);

    node.addDOMWidget('export_button', 'custom', el, {
      getMinHeight: () => 64,
    });

    const [w, h] = node.size;
    node.setSize([Math.max(w, 340), Math.max(h, 220)]);

    // Cache the last execution's image references (same data flow as compare):
    // a_base64 -> data URLs, otherwise a_images -> /view URLs.
    const onExecuted = node.onExecuted;
    node.onExecuted = function (this: any, output: any) {
      onExecuted?.call(this, output);
      if (output?.a_base64?.length) {
        lastWasBase64 = true;
        imageUrls = output.a_base64.map(
          (encoded: string) => `data:image/webp;base64,${encoded}`
        );
        return;
      }
      lastWasBase64 = false;
      const rand = app.getRandParam();
      imageUrls = (output?.a_images ?? []).map((record: Record<string, string>) => {
        return api.apiURL(`/view?${new URLSearchParams(record)}${rand}`);
      });
    };
  },
});
