import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { PdfContent } from '../parser/scheduleParser';
import { unpackPdfContent, type PackedPdfContent } from './extractorScript';
import { PDF_ENGINE_HTML } from './webviewHtml';

/**
 * Скрытый WebView с pdf.js. React Native сам не умеет читать PDF, а pdf.js
 * одинаково работает в WKWebView (iOS) и Android System WebView — поэтому
 * разбор PDF ведёт себя одинаково на обеих платформах и не требует нативного кода
 * (работает даже в Expo Go).
 */

type ExtractFn = (pdfBase64: string) => Promise<PdfContent>;

const PdfEngineContext = createContext<ExtractFn | null>(null);

const EXTRACT_TIMEOUT_MS = 90_000;

type Pending = {
  base64: string;
  resolve: (c: PdfContent) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  sent: boolean;
};

export function PdfEngineProvider({ children }: { children: ReactNode }) {
  const webviewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef(new Map<string, Pending>());
  const seqRef = useRef(0);
  // Смена key пересоздаёт WebView — так восстанавливаемся после падения его процесса
  const [instance, setInstance] = useState(0);

  const send = useCallback((id: string, p: Pending) => {
    if (!readyRef.current || !webviewRef.current || p.sent) return;
    p.sent = true;
    // base64 содержит только [A-Za-z0-9+/=], поэтому его можно вставлять в строку как есть
    webviewRef.current.injectJavaScript(`window.__extractPdf(${JSON.stringify(id)}, "${p.base64}"); true;`);
  }, []);

  const failAll = useCallback((error: Error) => {
    for (const [id, p] of pendingRef.current) {
      clearTimeout(p.timer);
      p.reject(error);
      pendingRef.current.delete(id);
    }
  }, []);

  const restart = useCallback(
    (reason: string) => {
      readyRef.current = false;
      failAll(new Error(reason));
      setInstance((n) => n + 1);
    },
    [failAll],
  );

  const extract = useCallback<ExtractFn>(
    (base64) =>
      new Promise<PdfContent>((resolve, reject) => {
        const id = `pdf-${++seqRef.current}`;
        const timer = setTimeout(() => {
          pendingRef.current.delete(id);
          reject(new Error('Разбор PDF занял слишком много времени'));
        }, EXTRACT_TIMEOUT_MS);
        const p: Pending = { base64, resolve, reject, timer, sent: false };
        pendingRef.current.set(id, p);
        send(id, p);
      }),
    [send],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: { type: string; id?: string; data?: PackedPdfContent; message?: string };
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (msg.type === 'ready') {
        readyRef.current = true;
        for (const [id, p] of pendingRef.current) send(id, p);
        return;
      }

      const p = msg.id ? pendingRef.current.get(msg.id) : undefined;
      if (!p || !msg.id) {
        if (msg.type === 'error') console.warn('[PdfEngine]', msg.message);
        return;
      }
      pendingRef.current.delete(msg.id);
      clearTimeout(p.timer);

      if (msg.type === 'result' && msg.data) {
        try {
          p.resolve(unpackPdfContent(msg.data));
        } catch (e) {
          p.reject(e instanceof Error ? e : new Error(String(e)));
        }
      } else {
        p.reject(new Error(msg.message || 'Не удалось прочитать PDF'));
      }
    },
    [send],
  );

  const source = useMemo(() => ({ html: PDF_ENGINE_HTML }), []);

  return (
    <PdfEngineContext.Provider value={extract}>
      {children}
      <View style={styles.hidden} pointerEvents="none">
        <WebView
          key={instance}
          ref={webviewRef}
          source={source}
          originWhitelist={['*']}
          javaScriptEnabled
          onMessage={onMessage}
          onLoadStart={() => {
            readyRef.current = false;
          }}
          onError={(e) => failAll(new Error(`WebView: ${e.nativeEvent.description}`))}
          // Android: процесс рендера WebView убит системой (нехватка памяти и т.п.)
          onRenderProcessGone={() => restart('Процесс WebView завершился')}
          // iOS: аналогично для WKWebView
          onContentProcessDidTerminate={() => restart('Процесс WebView завершился')}
          cacheEnabled={false}
          incognito
        />
      </View>
    </PdfEngineContext.Provider>
  );
}

export function usePdfExtractor(): ExtractFn {
  const ctx = useContext(PdfEngineContext);
  if (!ctx) throw new Error('usePdfExtractor должен вызываться внутри <PdfEngineProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -10, top: -10 },
});
