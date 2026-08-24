/**
 * Report — assertion + log + cơ chế đánh dấu bug đã biết (xfail)
 *
 * Ý tưởng: bộ test phải XANH khi code đang ở trạng thái đã biết, để dùng làm
 * lưới an toàn khi sửa code. Những case tái hiện bug CHƯA sửa được đánh dấu
 * `knownBug`. Nếu sau này anh sửa bug, case đó chuyển sang XPASS và nhắc gỡ cờ.
 */

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m', dim: '\x1b[2m', bold: '\x1b[1m',
};

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/** Chuẩn hoá để so sánh không phụ thuộc thứ tự key (Firebase trả key đã sắp) */
function normalize(v: any): any {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const k of Object.keys(v).sort()) out[k] = normalize(v[k]);
    return out;
  }
  return v;
}

const MAX_DIFF = 240;
const show = (v: any): string => {
  const s = typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(normalize(v));
  return s === undefined ? String(v)
    : s.length <= MAX_DIFF ? s
    : s.slice(0, MAX_DIFF) + ` …(${s.length} ký tự)`;
};

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(normalize(actual)) !== JSON.stringify(normalize(expected))) {
    throw new AssertionError(`${message}\n      mong đợi: ${show(expected)}\n      thực tế : ${show(actual)}`);
  }
}

/**
 * So sánh sâu, không phụ thuộc thứ tự key, và chỉ in ra ĐƯỜNG DẪN đầu tiên bị
 * lệch thay vì dump cả cây — để log còn đọc được.
 */
export function assertDeepEqual(actual: any, expected: any, message: string): void {
  const diff = firstDiff(normalize(actual), normalize(expected), '');
  if (diff) {
    throw new AssertionError(
      `${message}\n      lệch tại: ${diff.path}\n      mong đợi: ${show(diff.expected)}\n      thực tế : ${show(diff.actual)}`
    );
  }
}

function firstDiff(a: any, b: any, path: string): { path: string; actual: any; expected: any } | null {
  if (a === b) return null;
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
  const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb) return { path: path || '(gốc)', actual: a, expected: b };
  if (ta === 'array') {
    if (a.length !== b.length) return { path: `${path}.length`, actual: a.length, expected: b.length };
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (ta === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      const d = firstDiff(a[k], b[k], path ? `${path}.${k}` : k);
      if (d) return d;
    }
    return null;
  }
  return { path: path || '(gốc)', actual: a, expected: b };
}

export function assertTrue(cond: boolean, message: string): void {
  if (!cond) throw new AssertionError(message);
}

export function assertNotNull<T>(v: T | null | undefined, message: string): asserts v is T {
  if (v === null || v === undefined) throw new AssertionError(`${message} — nhận được ${v}`);
}

/** Không còn ô W.x / L.x nào chưa được điền tên VĐV thật */
export function assertNoPlaceholder(name: string, where: string): void {
  if (/^[WL]\.\d+$/.test(String(name))) {
    throw new AssertionError(`${where}: vẫn còn placeholder "${name}" — VĐV chưa được điền vào`);
  }
}

// ==================== Log ====================

let currentIndent = 0;
const pad = () => '  '.repeat(currentIndent + 1);

export function logSuite(name: string): void {
  console.log(`\n${C.bold}${C.cyan}━━━ ${name} ━━━${C.reset}`);
}
export function logCase(name: string): void {
  console.log(`\n${C.bold}▸ ${name}${C.reset}`);
}
export function logStep(s: string): void {
  console.log(`${pad()}${C.blue}·${C.reset} ${s}`);
}
export function logPass(s: string): void {
  console.log(`${pad()}${C.green}✓${C.reset} ${s}`);
}
export function logFail(s: string): void {
  console.log(`${pad()}${C.red}✗${C.reset} ${s}`);
}
export function logInfo(s: string): void {
  console.log(`${pad()}${C.dim}${s}${C.reset}`);
}
export function logWarn(s: string): void {
  console.log(`${pad()}${C.yellow}!${C.reset} ${s}`);
}

// ==================== Kết quả ====================

export type Outcome = 'pass' | 'fail' | 'xfail' | 'xpass';

export interface TestCase {
  /** Tên hiển thị */
  name: string;
  /** Nhóm để lọc bằng --only= */
  group: string;
  /**
   * Đánh dấu case này đang tái hiện một bug CHƯA sửa.
   * Case sẽ được tính là XFAIL (không làm đỏ suite) khi nó fail.
   */
  knownBug?: string;
  fn: () => Promise<void>;
}

export interface CaseResult {
  name: string;
  group: string;
  outcome: Outcome;
  knownBug?: string;
  error?: string;
  ms: number;
}

export async function runCase(tc: TestCase): Promise<CaseResult> {
  logCase(tc.name + (tc.knownBug ? `  ${C.yellow}[bug đã biết: ${tc.knownBug}]${C.reset}` : ''));
  const t0 = Date.now();
  try {
    await tc.fn();
    const ms = Date.now() - t0;
    if (tc.knownBug) {
      logWarn(`XPASS — bug "${tc.knownBug}" KHÔNG còn tái hiện.`);
      logWarn(`Nếu anh vừa sửa bug này: gỡ cờ knownBug để test bảo vệ phần sửa đó.`);
      return { name: tc.name, group: tc.group, outcome: 'xpass', knownBug: tc.knownBug, ms };
    }
    logPass(`OK (${ms}ms)`);
    return { name: tc.name, group: tc.group, outcome: 'pass', ms };
  } catch (err: any) {
    const ms = Date.now() - t0;
    const msg = err?.message ?? String(err);
    if (tc.knownBug) {
      logWarn(`XFAIL — tái hiện đúng bug "${tc.knownBug}" như dự kiến:`);
      logInfo(msg.split('\n').join('\n' + pad() + '  '));
      return { name: tc.name, group: tc.group, outcome: 'xfail', knownBug: tc.knownBug, error: msg, ms };
    }
    logFail(msg);
    if (err?.stack && !(err instanceof AssertionError)) {
      logInfo(String(err.stack).split('\n').slice(1, 4).join('\n' + pad()));
    }
    return { name: tc.name, group: tc.group, outcome: 'fail', error: msg, ms };
  }
}

export function printSummary(results: CaseResult[], mode: string): number {
  const n = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const pass = n('pass'), fail = n('fail'), xfail = n('xfail'), xpass = n('xpass');

  console.log(`\n${C.bold}═══ Kết quả (${mode}) ═══${C.reset}`);
  for (const r of results) {
    const icon =
      r.outcome === 'pass' ? `${C.green}✅${C.reset}` :
      r.outcome === 'fail' ? `${C.red}❌${C.reset}` :
      r.outcome === 'xfail' ? `${C.yellow}⚠️ ${C.reset}` :
      `${C.magenta}🎉${C.reset}`;
    const tag =
      r.outcome === 'xfail' ? ` ${C.dim}(bug đã biết: ${r.knownBug})${C.reset}` :
      r.outcome === 'xpass' ? ` ${C.magenta}(bug "${r.knownBug}" có vẻ ĐÃ ĐƯỢC SỬA — gỡ cờ knownBug)${C.reset}` : '';
    console.log(`  ${icon} ${r.name}${tag}  ${C.dim}${r.ms}ms${C.reset}`);
  }

  console.log('');
  console.log(`  ${C.green}${pass} pass${C.reset}   ${fail ? C.red : C.dim}${fail} fail${C.reset}   ${C.yellow}${xfail} xfail${C.reset}   ${xpass ? C.magenta : C.dim}${xpass} xpass${C.reset}`);

  if (xfail > 0) {
    console.log(`\n${C.yellow}${C.bold}  ⚠️  ${xfail} bug đã biết vẫn đang tái hiện:${C.reset}`);
    const seen = new Set<string>();
    for (const r of results.filter((x) => x.outcome === 'xfail')) {
      if (r.knownBug && !seen.has(r.knownBug)) {
        seen.add(r.knownBug);
        console.log(`     ${C.yellow}•${C.reset} ${r.knownBug}`);
      }
    }
  }

  if (fail === 0 && xpass === 0) {
    console.log(`\n${C.green}${C.bold}  Không có hồi quy.${C.reset}\n`);
  } else if (fail > 0) {
    console.log(`\n${C.red}${C.bold}  ${fail} test HỎNG — có hồi quy.${C.reset}\n`);
  } else {
    console.log(`\n${C.magenta}${C.bold}  Có bug đã biết được sửa — cập nhật cờ knownBug.${C.reset}\n`);
  }

  return fail > 0 ? 1 : 0;
}
