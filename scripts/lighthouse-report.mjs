// Lighthouse CI 측정 결과 요약 — URL별 중앙값 markdown 표 출력
//
// lhci collect가 .lighthouseci/에 저장한 LHR(JSON)들을 읽어 URL별로 묶고,
// 8개 지표(Performance/Accessibility/Best Practices/SEO/FCP/LCP/TBT/CLS)의
// 측정 중앙값을 계산해 markdown 표로 출력한다.
//
// 프로젝트·패키지 매니저 무관 — 순수 Node 스크립트. 이식 시 scripts/로 복사한다.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const LHCI_DIR = '.lighthouseci';

// 숫자 배열의 중앙값 계산
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// LHR 하나에서 8개 지표 추출
function extractMetrics(lhr) {
  const categories = lhr.categories ?? {};
  const audits = lhr.audits ?? {};
  const score = (key) => (categories[key]?.score ?? 0) * 100;
  const numeric = (key) => audits[key]?.numericValue ?? 0;

  return {
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    fcp: numeric('first-contentful-paint'),
    lcp: numeric('largest-contentful-paint'),
    tbt: numeric('total-blocking-time'),
    cls: numeric('cumulative-layout-shift'),
  };
}

// .lighthouseci/의 LHR 파일들을 읽어 URL별로 그룹핑
async function loadResultsByUrl() {
  const files = await readdir(LHCI_DIR);
  const lhrFiles = files.filter((f) => f.startsWith('lhr-') && f.endsWith('.json'));

  if (lhrFiles.length === 0) {
    throw new Error(`${LHCI_DIR}/에 LHR(lhr-*.json) 파일이 없습니다. lhci collect를 먼저 실행하세요.`);
  }

  const byUrl = new Map();

  for (const file of lhrFiles) {
    const raw = await readFile(path.join(LHCI_DIR, file), 'utf-8');
    const lhr = JSON.parse(raw);
    const url = lhr.requestedUrl ?? lhr.finalUrl;
    if (!url) continue;

    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push(extractMetrics(lhr));
  }

  return byUrl;
}

// URL 그룹별 지표 중앙값을 markdown 표로 렌더
function renderTable(byUrl) {
  const header = '| 페이지 | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |';
  const divider = '|--------|-------------|---------------|----------------|-----|-----|-----|-----|-----|';
  const rows = [];

  for (const [url, runs] of byUrl) {
    const pageName = new URL(url).pathname;
    const pick = (key) => median(runs.map((r) => r[key]));
    const ms = (v) => `${Math.round(v)} ms`;

    rows.push(
      `| ${pageName} | ${Math.round(pick('performance'))} | ${Math.round(pick('accessibility'))} ` +
        `| ${Math.round(pick('bestPractices'))} | ${Math.round(pick('seo'))} ` +
        `| ${ms(pick('fcp'))} | ${ms(pick('lcp'))} | ${ms(pick('tbt'))} ` +
        `| ${pick('cls').toFixed(3)} |`
    );
  }

  return [header, divider, ...rows].join('\n');
}

async function main() {
  const byUrl = await loadResultsByUrl();
  const runCount = [...byUrl.values()][0]?.length ?? 0;

  console.log(`\n## Lighthouse 측정 결과 (URL별 ${runCount}회 측정 중앙값)\n`);
  console.log(renderTable(byUrl));
  console.log(`\n_측정일: ${new Date().toISOString().slice(0, 10)} · 점수는 0–100, 시간은 ms, CLS는 단위 없음_`);
}

main().catch((error) => {
  console.error(`[lighthouse-report] 실패: ${String(error)}`);
  process.exit(1);
});
