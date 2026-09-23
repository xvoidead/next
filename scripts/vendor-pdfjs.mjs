// Встраивает pdf.js (legacy-сборку) в JS-бандл приложения строками, чтобы WebView
// не зависел от CDN и работал офлайн. Запускается автоматически после npm install.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pkgDir = path.dirname(require.resolve('pdfjs-dist/package.json', { paths: [root] }));
const { version } = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));

const read = (file) =>
  fs
    .readFileSync(path.join(pkgDir, 'legacy/build', file), 'utf8')
    // код попадёт внутрь <script> — не даём ему закрыть тег раньше времени
    .replace(/<\/script/gi, '<\\/script');

const out = path.join(root, 'src/pdf/pdfjsBundle.generated.ts');
fs.writeFileSync(
  out,
  [
    `// Сгенерировано scripts/vendor-pdfjs.mjs из pdfjs-dist@${version}. Не редактировать вручную.`,
    `export const PDFJS_VERSION = ${JSON.stringify(version)};`,
    `export const PDFJS_MAIN = ${JSON.stringify(read('pdf.min.js'))};`,
    `export const PDFJS_WORKER = ${JSON.stringify(read('pdf.worker.min.js'))};`,
    '',
  ].join('\n'),
);
console.log(`pdf.js ${version} -> ${path.relative(root, out)}`);
