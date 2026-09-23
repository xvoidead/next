import { EXTRACT_FUNCTION_SOURCE } from './extractorScript';
import { PDFJS_MAIN, PDFJS_WORKER } from './pdfjsBundle.generated';

/**
 * HTML-страница скрытого WebView, в которой работает pdf.js.
 *
 * Протокол:
 *   RN -> WebView: window.__extractPdf(id, base64) через injectJavaScript
 *   WebView -> RN: postMessage(JSON) с одним из типов:
 *     { type: 'ready' }
 *     { type: 'result', id, data: PackedPdfContent }
 *     { type: 'error', id?, message }
 *
 * pdf.worker подключается обычным <script> — pdf.js v3 тогда работает в главном
 * потоке без отдельного Worker. Это самый совместимый вариант для WebView
 * (нет проблем с origin у data:/about:blank страниц).
 */
export const PDF_ENGINE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body>
<script>${PDFJS_MAIN}</script>
<script>${PDFJS_WORKER}</script>
<script>
(function () {
  function send(msg) {
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  function base64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  ${EXTRACT_FUNCTION_SOURCE}

  window.__extractPdf = function (id, b64) {
    Promise.resolve()
      .then(function () { return extractPdfContent(window.pdfjsLib, base64ToBytes(b64)); })
      .then(function (data) { send({ type: 'result', id: id, data: data }); })
      .catch(function (e) { send({ type: 'error', id: id, message: String((e && e.message) || e) }); });
  };

  window.onerror = function (message) { send({ type: 'error', message: String(message) }); };

  if (!window.pdfjsLib) {
    send({ type: 'error', message: 'pdf.js не загрузился' });
  } else {
    send({ type: 'ready' });
  }
})();
</script>
</body>
</html>`;
