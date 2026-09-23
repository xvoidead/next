import type { PdfContent } from '../parser/scheduleParser';

/**
 * JS-код, который выполняется внутри WebView (и в Node-скрипте проверки парсера).
 * Достаёт из PDF через pdf.js текстовые элементы и тонкие прямоугольники —
 * линии границ таблиц. Сам разбор расписания делается уже в RN (scheduleParser).
 *
 * Результат компактный (массивы вместо объектов), чтобы меньше гонять через мост:
 *   items: [page, str, x, y, w, h][], rects: [page, x, y, w, h][]
 * В объекты его превращает unpackPdfContent.
 *
 * Хранится строкой, потому что WebView получает его как HTML/JS.
 * Пишем на ES2017 без зависимостей: код должен работать в старых Android WebView.
 */
export const EXTRACT_FUNCTION_SOURCE = String.raw`
async function extractPdfContent(pdfjsLib, data) {
  var OPS = pdfjsLib.OPS;
  var doc = await pdfjsLib.getDocument({ data: data, isEvalSupported: false }).promise;
  var items = [];
  var rects = [];

  function mul(m, n) {
    return [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
    ];
  }
  function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  function r2(v) { return Math.round(v * 100) / 100; }

  function pushRect(page, ctm, x, y, w, h) {
    var a = apply(ctm, x, y), b = apply(ctm, x + w, y + h);
    var rx = Math.min(a[0], b[0]), ry = Math.min(a[1], b[1]);
    var rw = Math.abs(b[0] - a[0]), rh = Math.abs(b[1] - a[1]);
    // Нужны только тонкие вытянутые прямоугольники — это линии границ
    if (Math.min(rw, rh) > 3 || Math.max(rw, rh) < 1.5) return;
    rects.push([page, r2(rx), r2(ry), r2(rw), r2(rh)]);
  }

  for (var p = 1; p <= doc.numPages; p++) {
    var page = await doc.getPage(p);

    var tc = await page.getTextContent();
    for (var i = 0; i < tc.items.length; i++) {
      var it = tc.items[i];
      if (!it.str || !it.str.trim()) continue;
      items.push([p, it.str, r2(it.transform[4]), r2(it.transform[5]), r2(it.width), r2(it.height)]);
    }

    var ops = await page.getOperatorList();
    var ctm = [1, 0, 0, 1, 0, 0];
    var stack = [];
    var lineWidth = 1;
    for (var k = 0; k < ops.fnArray.length; k++) {
      var fn = ops.fnArray[k];
      var args = ops.argsArray[k];
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = mul(ctm, args);
      else if (fn === OPS.setLineWidth) lineWidth = args[0];
      else if (fn === OPS.constructPath) {
        var next = ops.fnArray[k + 1];
        var isFill = next === OPS.fill || next === OPS.eoFill || next === OPS.fillStroke || next === OPS.eoFillStroke ||
          next === OPS.closeFillStroke || next === OPS.closeEOFillStroke;
        var isStroke = next === OPS.stroke || next === OPS.closeStroke;
        if (!isFill && !isStroke) continue; // клипы и пр. — не линии

        var pathOps = args[0], coords = args[1], c = 0, cx = 0, cy = 0;
        for (var j = 0; j < pathOps.length; j++) {
          var op = pathOps[j];
          if (op === OPS.rectangle) {
            var rx0 = coords[c], ry0 = coords[c + 1], rw0 = coords[c + 2], rh0 = coords[c + 3];
            c += 4;
            if (isFill) pushRect(p, ctm, rx0, ry0, rw0, rh0);
            else {
              var t = lineWidth / 2;
              pushRect(p, ctm, rx0 - t, ry0 - t, rw0 + 2 * t, 2 * t);
              pushRect(p, ctm, rx0 - t, ry0 + rh0 - t, rw0 + 2 * t, 2 * t);
              pushRect(p, ctm, rx0 - t, ry0 - t, 2 * t, rh0 + 2 * t);
              pushRect(p, ctm, rx0 + rw0 - t, ry0 - t, 2 * t, rh0 + 2 * t);
            }
          } else if (op === OPS.moveTo) {
            cx = coords[c]; cy = coords[c + 1]; c += 2;
          } else if (op === OPS.lineTo) {
            var nx = coords[c], ny = coords[c + 1];
            c += 2;
            if (isStroke) {
              var hw = Math.max(lineWidth, 0.5) / 2;
              if (Math.abs(ny - cy) < 0.01) pushRect(p, ctm, Math.min(cx, nx), cy - hw, Math.abs(nx - cx), 2 * hw);
              else if (Math.abs(nx - cx) < 0.01) pushRect(p, ctm, cx - hw, Math.min(cy, ny), 2 * hw, Math.abs(ny - cy));
            }
            cx = nx; cy = ny;
          } else if (op === OPS.curveTo) c += 6;
          else if (op === OPS.curveTo2 || op === OPS.curveTo3) c += 4;
        }
      }
    }
    page.cleanup();
  }
  await doc.destroy();
  return { items: items, rects: rects };
}
`;

export type PackedPdfContent = {
  items: [number, string, number, number, number, number][];
  rects: [number, number, number, number, number][];
};

export function unpackPdfContent(packed: PackedPdfContent): PdfContent {
  return {
    items: packed.items.map(([page, str, x, y, w, h]) => ({ page, str, x, y, w, h })),
    rects: packed.rects.map(([page, x, y, w, h]) => ({ page, x, y, w, h })),
  };
}
