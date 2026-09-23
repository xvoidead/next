/**
 * Проверка парсера на реальных PDF с сайта — без телефона и эмулятора.
 *
 *   npm run check-parser                 # все недели: сводка + подозрительные ячейки
 *   npm run check-parser -- 184615       # плюс расписание конкретной группы
 *   npm run check-parser -- 184615 file.pdf   # локальный PDF вместо сайта
 *
 * PDF читается тем же кодом извлечения, что и в WebView (src/pdf/extractorScript.ts).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

import { downloadPdfBase64, fetchWeekLinks } from '../src/api/narfuSite';
import { EXTRACT_FUNCTION_SOURCE, unpackPdfContent } from '../src/pdf/extractorScript';
import { WEEKDAYS, parseSchedule } from '../src/parser/scheduleParser';

const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
// eslint-disable-next-line no-new-func
const extractPdfContent = new Function(`${EXTRACT_FUNCTION_SOURCE}; return extractPdfContent;`)();

async function checkPdf(title: string, bytes: Uint8Array, group?: string) {
  const started = Date.now();
  const week = parseSchedule(unpackPdfContent(await extractPdfContent(pdfjs, bytes)));
  const groups = Object.values(week.groups);

  let lessons = 0;
  const suspicious: string[] = [];
  for (const g of groups) {
    for (const d of g.days) {
      for (const l of d.lessons) {
        lessons++;
        if (!l.time || !l.subject || !l.teachers.length || /ауд\./.test(l.subject)) {
          suspicious.push(`${g.group} ${WEEKDAYS[d.weekday]} пара ${l.pair}: ${l.raw}`);
        }
      }
    }
  }
  const empty = groups.filter((g) => g.days.every((d) => d.lessons.length === 0)).map((g) => g.group);

  console.log(`\n== ${title}`);
  console.log(
    `неделя ${week.weekStart} – ${week.weekEnd}; групп: ${groups.length}; пар: ${lessons}; ` +
      `пустых групп: ${empty.length}${empty.length ? ` (${empty.join(', ')})` : ''}; ${Date.now() - started} мс`,
  );
  if (suspicious.length) {
    console.log(`проверить вручную (${suspicious.length}):`);
    for (const s of suspicious.slice(0, 20)) console.log(`  ${s}`);
  }

  const g = group ? week.groups[group] : undefined;
  if (group && !g) console.log(`группа ${group} не найдена`);
  if (g) {
    for (const d of g.days) {
      console.log(`  ${WEEKDAYS[d.weekday]} ${d.date ?? ''}`);
      for (const l of d.lessons) {
        console.log(`    ${l.pair}. ${l.time}  ${l.subject} | ${l.teachers.join(', ')} | ${l.rooms.join(', ')}`);
      }
    }
  }
}

async function main() {
  const [group, file] = process.argv.slice(2);
  if (file) {
    await checkPdf(file, new Uint8Array(fs.readFileSync(file)), group);
    return;
  }
  const links = await fetchWeekLinks();
  console.log(`на сайте недель: ${links.length}`);
  for (const link of links) {
    const bytes = Uint8Array.from(Buffer.from(await downloadPdfBase64(link.url), 'base64'));
    await checkPdf(`${link.title}\n   ${link.url}`, bytes, group);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
