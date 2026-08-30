/**
 * Access Code Service — ma vao cho giam dinh.
 *
 * Y tuong: mot ma la mot **o cham diem da duoc troi san**. Cam ma la vao thang
 * dung giai / dung san / dung vi tri, khong con vong chon giai nao nua.
 *
 * Nguoi thi chi go **2 SO CUA GIAI**; san va vi tri thi ho cham vao man hinh
 * (`positionsForPrefix` bay ra dung nhung o co that), roi app moi ghep du ma.
 * Go it di mot nua thi cung it di mot nua cho de go nham — ma go nham mot chu
 * so thi vao dung mot ban cham that cua nguoi khac, khong ai bao loi.
 *
 * Luong khoa chat:
 *   biet ma -> claim ma (ghi `claimedUid`) -> tao `codeSession/{uid}`
 *   -> rules doc `slot` tu `codeSession` de quyet dinh cho ghi o dau.
 * Khong tu bia `slot` duoc: rules bat no phai khop dung `slot` cua ma da claim.
 */
import {
  ref, get, set, update, remove, child, onValue, off,
} from 'firebase/database';
import { database } from '../firebase';
import type { TournamentId } from '../types';

/**
 * Ma la **4 so**: `[2 so cua giai][san][vi tri giam dinh]`.
 *
 * Vi du giai so 83: San A GD1 = 8311, San A GD2 = 8312, San B GD2 = 8322.
 * So MON khong nam trong ma — giam dinh chon "cham gi" ngay luc vao. Doi lai
 * chu giai chi phai nho **dung mot so** thay vi 12-24 so roi rac.
 *
 * Hai so cuoi la thu **may ghep**, khong phai thu nguoi go: giam dinh go 2 so
 * dau roi cham chon san va vi tri. Ma van du 4 so vi day la khoa ma security
 * rules soi (`claimedUid` + `slot`) — doi no thanh 2 so la ca giai chung mot
 * cua, ai cam so cua giai cung ghi duoc vao moi o.
 *
 * Tran: 2 so dau = 99 giai mo cung luc. Kho ma phang, khong tach theo giai —
 * tach thi giam dinh lai phai chon giai truoc khi go, dung cai buoc muon bo.
 *
 * Rules khong quan tam do dai ma, nen doi 2 -> 3 chi sua dung dong duoi,
 * KHONG phai deploy lai rules.
 */
export const PREFIX_LENGTH = 2;

/** Do dai ma day du: 2 so cua giai + 1 so san + 1 so vi tri giam dinh */
export const SHARED_CODE_LENGTH = PREFIX_LENGTH + 2;

/** Bo cuoc sau ngan nay lan random trung ma da co */
export const MAX_CODE_ATTEMPTS = 50;

/** Qua ngan nay lan random lai la kho ma sap day — canh bao nguoi dung */
export const CODE_PRESSURE_WARN = 5;

const SESSION_CACHE_KEY = 'cocvuong_code_session';

export type ArenaKind = 'combat' | 'martial';

export interface CodeSlot {
  /** Khoa giai — CHUOI mo, xem `TournamentId` */
  t: TournamentId;
  kind: ArenaKind;
  /** 0 = San A, 1 = San B */
  a: number;
  /** Vi tri giam dinh, **0-based** — dung index that trong DB, khong phai so hien thi */
  r: number;
}

export interface AccessCode {
  /**
   * Vang o node **giu cho 2 so dau** (`reserved`) — node do khong phai ma vao
   * duoc, chi de khong giai nao khac nhan trung 2 so ay.
   */
  slot?: string;
  t: TournamentId;
  kind?: ArenaKind;
  a?: number;
  r?: number;
  /**
   * Ban sao dang CHUOI cua `t` va `kind`+`a`.
   *
   * Rules phai noi chuoi de dung toi `tournament/{t}/...` va
   * `assignments/{kind}{a}`; giu san hai truong chuoi nay de moi phep noi
   * trong rules la chuoi + chuoi, khong phu thuoc vao viec engine co ep kieu
   * so sang chuoi hay khong.
   */
  tKey: string;
  arenaKey: string;
  label: string;
  ownerUid: string;
  claimedUid?: string;
  claimedAt?: number;

  /**
   * MOT ma cho ca hai mon o cung mot o — dung cho moi ma 4 so.
   *
   * `slot` van giu mot slot cu the (mon dau tien co that o vi tri nay) de rules
   * cu khong phai doi; hai truong duoi la day du cac slot ma nguoi cam ma nay
   * duoc phep vao. Giam dinh chon mon o man xac nhan. Ma 2 so cua giai cu
   * khong co truong nay — chung chi mo dung mot o.
   */
  shared?: boolean;
  slotCombat?: string;
  slotMartial?: string;

  /** Node giu cho 2 so dau cua mot giai — go vao chi hien goi y, khong vao duoc */
  reserved?: boolean;
  prefix?: string;
}

export interface CodeSession {
  code: string;
  slot: string;
}

/** Ban sao cuc bo cua phien — de mo lai duoc khi mat mang */
export interface CachedSession {
  code: string;
  slot: string;
  label: string;
  tournamentName: string;
}

// ==================== Slot ====================

export function arenaKey(kind: ArenaKind, a: number): string {
  return `${kind}${a}`;
}

export function arenaName(a: number): string {
  return a === 0 ? 'Sân A' : 'Sân B';
}

export function kindName(kind: ArenaKind): string {
  return kind === 'combat' ? 'Đối kháng' : 'Thi quyền';
}

/** Chuoi khoa ma rules so khop: `giai:mon:vai:san:vitri` */
export function slotString(s: CodeSlot): string {
  return `${s.t}:${s.kind}:gd:${s.a}:${s.r}`;
}

export function parseSlot(raw: string | null | undefined): CodeSlot | null {
  if (!raw) return null;
  const parts = String(raw).split(':');
  if (parts.length !== 5 || parts[2] !== 'gd') return null;
  const [t, kind, , a, r] = parts;
  // `t` giu nguyen dang CHUOI. Khoa giai khong bao gio chua ':' — khoa cu la
  // so, khoa moi la `push` key (chi chu, so, '-' va '_') — nen cat 5 doan van
  // dung, va slot cu "5:combat:gd:0:1" van doc ra dung giai "5".
  if (!t) return null;
  if (kind !== 'combat' && kind !== 'martial') return null;
  const nums = [Number(a), Number(r)];
  if (nums.some((n) => Number.isNaN(n))) return null;
  return { t, kind, a: nums[0], r: nums[1] };
}

/** "Thi quyền · Sân B · GĐ2" — dong chu giam dinh doc de xac nhan truoc khi vao */
export function slotLabel(s: CodeSlot): string {
  return `${kindName(s.kind)} · ${arenaName(s.a)} · GĐ${s.r + 1}`;
}

/** "Sân B · GĐ2" — ma dung chung khong biet mon, mon do giam dinh chon */
export function positionLabel(a: number, r: number): string {
  return `${arenaName(a)} · GĐ${r + 1}`;
}

/**
 * Nhung o cham diem mot ma mo duoc.
 *
 * Ma 4 so: mot hoac hai o (doi khang / thi quyen) cung san cung vi tri — day
 * chinh la cai giam dinh phai chon luc vao. Ma 2 so cua giai cu: dung mot o.
 */
export function availableSlots(data: AccessCode | null): CodeSlot[] {
  if (!data || data.reserved) return [];
  const raw = data.shared ? [data.slotCombat, data.slotMartial] : [data.slot];
  const out: CodeSlot[] = [];
  for (const one of raw) {
    const slot = parseSlot(one);
    if (slot) out.push(slot);
  }
  return out;
}

/** Tach chu so de doc to cho nhau nghe: "30" -> "3 0" */
export function spacedCode(code: string): string {
  return code.split('').join(' ');
}

// ==================== Sinh ma ====================

/**
 * Ma cua mot o: `[2 so cua giai][san][vi tri]`.
 *
 * San va vi tri deu **dem tu 1** cho de doc to: San A = 1, San B = 2;
 * GD1 = 1. Toi da 2 san x 5 giam dinh nen luon vua dung mot chu so.
 */
export function sharedCodeFor(prefix: string, a: number, r: number): string {
  return `${prefix}${a + 1}${r + 1}`;
}

/** 2 so dau cua mot ma dung chung, de hien "Số của giải: 83" */
export function prefixOf(code: string): string {
  return code.slice(0, PREFIX_LENGTH);
}

function randomPrefix(): string {
  let out = '';
  for (let i = 0; i < PREFIX_LENGTH; i++) out += String(Math.floor(Math.random() * 10));
  return /^0+$/.test(out) ? randomPrefix() : out;
}

/** Con trong hay khong — dung cho o "Đổi số" de bao ngay tai cho */
export async function isPrefixFree(prefix: string): Promise<boolean> {
  const snap = await get(child(ref(database), `accessCode/${prefix}`));
  return !snap.exists();
}

/**
 * Giu cho 2 so dau bang mot node ngay trong kho ma.
 *
 * Giai khac khong nhan trung 2 so nay nua (cung mot phep kiem "da ton tai
 * chua" voi ma cua giai cu). Giam dinh go dung 2 so nay thi ra node giu cho
 * -> man hinh bao "gõ tiếp 2 số nữa" thay vi bao ma sai.
 */
async function writePrefixHolder(
  prefix: string,
  t: TournamentId,
  ownerUid: string,
  tournamentName: string
): Promise<void> {
  await set(ref(database, `accessCode/${prefix}`), {
    reserved: true,
    prefix,
    t,
    tKey: String(t),
    arenaKey: arenaKey('combat', 0),
    label: `${tournamentName} · 2 số của giải`,
    ownerUid,
  });
}

export class PrefixTakenError extends Error {
  constructor(prefix: string) {
    super(`Số ${prefix} đang có giải khác dùng. Chọn 2 số khác giúp.`);
    this.name = 'PrefixTakenError';
  }
}

export class CodePoolFullError extends Error {
  constructor() {
    super(
      `Kho mã đã đầy — thử ${MAX_CODE_ATTEMPTS} lần đều trùng mã đang dùng. ` +
      `Đóng những giải đã thi đấu xong để trả mã về kho.`
    );
    this.name = 'CodePoolFullError';
  }
}

// ==================== Bo ma cua mot giai ====================

export interface TournamentCodePlan {
  /** So giam dinh doi khang (3 hoac 5) */
  combatReferees: number;
  /** So giam dinh thi quyen (3 hoac 5) */
  martialReferees: number;
  /** Co dung San B hay khong */
  useArenaB: boolean;
  tournamentName: string;
}

/** Mot o cua bang ma: mot vi tri giam dinh, dung duoc cho 1-2 mon */
export interface SharedPosition {
  t: TournamentId;
  a: number;
  r: number;
  /**
   * Nhung mon vi tri nay co that. Doi khang 5 giam dinh ma thi quyen 3 thi
   * GD4 va GD5 chi cham duoc doi khang — khong bay ra cho ho chon thi quyen.
   */
  kinds: ArenaKind[];
}

export function sharedPositions(t: TournamentId, plan: TournamentCodePlan): SharedPosition[] {
  const arenas = plan.useArenaB ? [0, 1] : [0];
  const most = Math.max(plan.combatReferees, plan.martialReferees);
  const out: SharedPosition[] = [];
  for (const a of arenas) {
    for (let r = 0; r < most; r++) {
      const kinds: ArenaKind[] = [];
      if (r < plan.combatReferees) kinds.push('combat');
      if (r < plan.martialReferees) kinds.push('martial');
      if (kinds.length) out.push({ t, a, r, kinds });
    }
  }
  return out;
}

// ==================== 2 so cua giai ====================

/** 2 so dau cua giai, nam canh chi muc ma */
export interface CodeMeta {
  /** Vang o giai cu chua duoc cap lai theo kieu 4 so */
  prefix?: string;
}

const META_KEY = 'meta';

/**
 * Chu giai doc duoc; giam sat thi KHONG (rules chi mo dung nhanh san ho truc).
 * Man giam sat khong can den: 2 so dau doc thang tu chinh ma dang hien.
 */
export async function getCodeMeta(t: TournamentId): Promise<CodeMeta | null> {
  const snap = await get(child(ref(database), `tournamentCodeIndex/${t}/${META_KEY}`));
  return snap.val();
}

async function setCodeMeta(t: TournamentId, meta: CodeMeta): Promise<void> {
  const payload: CodeMeta = {};
  if (meta.prefix) payload.prefix = meta.prefix;
  await set(ref(database, `tournamentCodeIndex/${t}/${META_KEY}`), payload);
}

/** Moi ma dang co cua mot giai (bo qua node `meta`, bo trung) */
async function codesOfTournament(t: TournamentId): Promise<string[]> {
  const snap = await get(child(ref(database), `tournamentCodeIndex/${t}`));
  const index = snap.val() as Record<string, unknown> | null;
  if (!index) return [];

  const out = new Set<string>();
  for (const [key, byReferee] of Object.entries(index)) {
    if (key === META_KEY) continue;
    for (const code of Object.values((byReferee || {}) as Record<string, string>)) {
      if (code) out.add(code);
    }
  }
  return [...out];
}

/**
 * 2 so cua giai — vang neu day la giai cu, cap ma tu thoi con kieu "moi o mot
 * ma 2 so ngau nhien". Chua tu y doi so o day: doi la moi ma dang cam chet
 * ngay, phai do nguoi goi quyet dinh.
 */
export async function resolveCodeMeta(t: TournamentId): Promise<CodeMeta> {
  try {
    const meta = await getCodeMeta(t);
    if (meta?.prefix) return { prefix: meta.prefix };
  } catch {
    /* khong doc duoc meta thi doc nguoc tu chinh bo ma */
  }

  // Mat node `meta` nhung ma van con: doc nguoc 2 so tu chinh ma dang chay.
  // Khong lam vay thi mot node bien mat la ca giai phai doc lai so.
  return { prefix: prefixFromCodes(await codesOfTournament(t)) };
}

/**
 * 2 so cua giai suy nguoc tu bo ma dang co — `undefined` neu day khong phai
 * mot bo ma 4 so cung chung mot dau (giai cu, hoac bo ma da lan lon).
 */
function prefixFromCodes(codes: string[]): string | undefined {
  if (!codes.length || !codes.every((c) => c.length === SHARED_CODE_LENGTH)) return undefined;
  const prefixes = new Set(codes.map(prefixOf));
  return prefixes.size === 1 ? [...prefixes][0] : undefined;
}

export interface EnsureCodesResult {
  created: number;
  kept: number;
  /** So ma bi go vi o do khong con trong thiet dat nua */
  removed: number;
  maxRetries: number;
  /** True khi kho ma sap het — hien canh bao cho nguoi dung */
  poolPressure: boolean;
  prefix?: string;
  /** True khi phai bo bo ma kieu cu cua giai de cap lai theo 2 so cua giai */
  migrated: boolean;
}

/**
 * Bao dam moi o cham diem cua giai deu co ma.
 *
 * Goi ngay LUC TAO GIAI, khong bat bam them mot buoc: mo Thiet dat ra la da
 * co ma san de doc cho giam dinh.
 *
 * Giai cu (ma 2 so roi rac, chua co "so cua giai") thi phai **don sach truoc**:
 * de nguyen thi mot o cham diem co hai duong vao — ma cu va ma moi — con ma cu
 * thi nam giu cho trong kho toi luc dong giai.
 */
export async function ensureTournamentCodes(
  t: TournamentId,
  plan: TournamentCodePlan,
  ownerUid: string
): Promise<EnsureCodesResult> {
  const meta = await resolveCodeMeta(t);
  const migrated = !meta.prefix && (await codesOfTournament(t)).length > 0;
  if (migrated) await revokeTournamentCodes(t);
  const res = await ensureSharedCodes(t, plan, ownerUid, meta.prefix);
  return { ...res, migrated };
}

export interface SyncCodesResult extends EnsureCodesResult {
  /** True khi day la giai cu chua co so cua giai — khong tu y dong bo */
  skipped: boolean;
}

/**
 * Dong bo bo ma theo dung thiet dat hien tai — goi NGAY SAU khi luu thiet dat.
 *
 * So giam dinh la thu chu giai doi duoc bat cu luc nao; bo ma phai chay theo
 * mot cach im lang. Khong co ham nay thi bat 5 giam dinh xong, GD4 va GD5 go
 * dung cong thuc van bi bao "khong co ma nay" — va chu giai phai biet den mot
 * nut "cap ma" de vao vet, thu ma le ra ho khong bao gio phai nghi den.
 *
 * Giai cu (con ma kieu moi o mot so, chua co so cua giai) thi **bo qua**: don
 * sang kieu moi la moi ma dang cam chet ngay, viec do phai chu giai bam.
 */
export async function syncTournamentCodes(
  t: TournamentId,
  plan: TournamentCodePlan,
  ownerUid: string
): Promise<SyncCodesResult> {
  const meta = await resolveCodeMeta(t);
  if (!meta.prefix && (await codesOfTournament(t)).length > 0) {
    return {
      created: 0, kept: 0, removed: 0, maxRetries: 0,
      poolPressure: false, migrated: false, skipped: true,
    };
  }
  return { ...(await ensureSharedCodes(t, plan, ownerUid, meta.prefix)), skipped: false };
}

/**
 * Cap mot ma dung chung cho mot vi tri giam dinh.
 *
 * Chi muc duoc ghi vao **ca hai** nhanh mon cua vi tri do: giam sat doi khang
 * va giam sat thi quyen moi nguoi chi doc duoc nhanh san minh truc, nen ma
 * phai co mat o ca hai cho thi ca hai moi mo bang ma ra xem duoc.
 */
async function createSharedCode(
  prefix: string,
  pos: SharedPosition,
  ownerUid: string,
  tournamentName: string
): Promise<string> {
  const code = sharedCodeFor(prefix, pos.a, pos.r);
  const primary = pos.kinds[0];
  const payload: AccessCode = {
    slot: slotString({ t: pos.t, kind: primary, a: pos.a, r: pos.r }),
    t: pos.t,
    kind: primary,
    a: pos.a,
    r: pos.r,
    tKey: String(pos.t),
    arenaKey: arenaKey(primary, pos.a),
    label: `${tournamentName} · ${positionLabel(pos.a, pos.r)}`,
    ownerUid,
    shared: true,
  };
  if (pos.kinds.includes('combat')) {
    payload.slotCombat = slotString({ t: pos.t, kind: 'combat', a: pos.a, r: pos.r });
  }
  if (pos.kinds.includes('martial')) {
    payload.slotMartial = slotString({ t: pos.t, kind: 'martial', a: pos.a, r: pos.r });
  }

  await set(ref(database, `accessCode/${code}`), payload);
  for (const kind of pos.kinds) {
    await set(
      ref(database, `tournamentCodeIndex/${pos.t}/${arenaKey(kind, pos.a)}/${pos.r}`),
      code
    );
  }
  return code;
}

/** Node ma nay co dung nhung mon ma vi tri do dang co hay khong */
function matchesKinds(data: AccessCode, kinds: ArenaKind[]): boolean {
  return kinds.includes('combat') === !!data.slotCombat
    && kinds.includes('martial') === !!data.slotMartial;
}

/**
 * Go nhung ma khong con nam trong thiet dat.
 *
 * Ha 5 giam dinh xuong 3 ma de nguyen thi ma cua GD4, GD5 van mo duoc mot o
 * cham diem khong con ai nhin — mot cua vao thua nam mo giua giai. Bo ma phai
 * la ban sao dung cua thiet dat, khong phai cai chi biet dai them ra.
 *
 * `keep`: `{sanKey}/{vi tri}` -> ma dung cho o do.
 */
async function pruneStaleCodes(t: TournamentId, keep: Map<string, string>): Promise<number> {
  const snap = await get(child(ref(database), `tournamentCodeIndex/${t}`));
  const index = snap.val() as Record<string, Record<string, string>> | null;
  if (!index) return 0;

  // Mot ma nam o ca hai nhanh mon: chi xoa node ma khi khong nhanh nao con giu
  const live = new Set(keep.values());
  let removed = 0;

  for (const [sanKey, byReferee] of Object.entries(index)) {
    if (sanKey === META_KEY) continue;
    for (const [r, code] of Object.entries(byReferee || {})) {
      if (keep.get(`${sanKey}/${r}`) === code) continue;
      await remove(ref(database, `tournamentCodeIndex/${t}/${sanKey}/${r}`));
      if (!live.has(code)) {
        await remove(ref(database, `accessCode/${code}`));
        removed++;
      }
    }
  }
  return removed;
}

async function ensureSharedCodes(
  t: TournamentId,
  plan: TournamentCodePlan,
  ownerUid: string,
  known?: string
): Promise<EnsureCodesResult> {
  let prefix = known;
  let retries = 0;

  if (!prefix) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const candidate = randomPrefix();
      if (!(await isPrefixFree(candidate))) continue;
      await writePrefixHolder(candidate, t, ownerUid, plan.tournamentName);
      prefix = candidate;
      retries = attempt;
      break;
    }
    if (!prefix) throw new CodePoolFullError();
  }

  // Node giu cho 2 so dau GIO LA CUA VAO: giam dinh go dung no roi moi chon
  // cho ngoi. Mat no thi ca doan dung ngoai cua trong khi bang ma van hien
  // binh thuong — nen kiem lai moi lan dong bo, khong chi luc cap so moi.
  const holder = await get(child(ref(database), `accessCode/${prefix}`));
  const owned = holder.val() as AccessCode | null;
  if (!owned) {
    await writePrefixHolder(prefix, t, ownerUid, plan.tournamentName);
  } else if (owned.tKey !== String(t)) {
    // Giai khac dang giu 2 so nay — de nguyen, ghi de la cuop cua ho
    throw new PrefixTakenError(prefix);
  }

  let created = 0;
  let kept = 0;
  const keep = new Map<string, string>();

  for (const pos of sharedPositions(t, plan)) {
    const code = sharedCodeFor(prefix, pos.a, pos.r);
    for (const kind of pos.kinds) keep.set(`${arenaKey(kind, pos.a)}/${pos.r}`, code);

    // Doc ca node chu khong moi `tKey`: doi thi quyen 5 -> 3 thi ma o GD3 van
    // dung giai nhung khong con la ma hai mon nua, phai ghi lai chu khong giu
    const snap = await get(child(ref(database), `accessCode/${code}`));
    const data = snap.val() as AccessCode | null;
    if (data?.tKey === String(t) && matchesKinds(data, pos.kinds)) {
      kept++;
      continue;
    }
    await createSharedCode(prefix, pos, ownerUid, plan.tournamentName);
    created++;
  }

  const removed = await pruneStaleCodes(t, keep);

  await setCodeMeta(t, { prefix });
  return {
    created, kept, removed, maxRetries: retries,
    poolPressure: retries >= CODE_PRESSURE_WARN,
    prefix, migrated: false,
  };
}

/**
 * Doi 2 so cua giai, cap lai toan bo ma theo so moi.
 *
 * **Moi ma cu chet ngay**: may giam dinh dang cam ma cu se bi day ra man
 * "Mã đã bị thu hồi" va phai go so moi. Chi dung truoc gio thi.
 */
export async function reissueTournamentCodes(
  t: TournamentId,
  plan: TournamentCodePlan,
  ownerUid: string,
  prefix: string
): Promise<EnsureCodesResult> {
  const current = await resolveCodeMeta(t);
  if (prefix !== current.prefix && !(await isPrefixFree(prefix))) {
    throw new PrefixTakenError(prefix);
  }

  await revokeTournamentCodes(t);
  await writePrefixHolder(prefix, t, ownerUid, plan.tournamentName);
  return ensureSharedCodes(t, plan, ownerUid, prefix);
}

/**
 * Thu hoi TOAN BO ma cua mot giai — goi khi dong giai.
 *
 * Vi ma la kho dung chung co tran, "xong giai la bam Dong giai" khong con la
 * chuyen gon gang ma la **bat buoc**: khong dong thi ma nam giu cho mai.
 */
export async function revokeTournamentCodes(t: TournamentId): Promise<number> {
  const codes = await codesOfTournament(t);

  let prefix: string | undefined;
  try {
    prefix = (await getCodeMeta(t))?.prefix;
  } catch {
    /* khong doc duoc meta thi van xoa duoc ma theo chi muc */
  }

  // 2 so dau cung chiem mot node trong kho ma — khong tra lai thi giai sau
  // khong bao gio nhan duoc so ay nua
  const target = prefix || prefixFromCodes(codes);
  if (target) codes.push(target);

  let n = 0;
  for (const code of codes) {
    await remove(ref(database, `accessCode/${code}`));
    n++;
  }
  await remove(ref(database, `tournamentCodeIndex/${t}`));
  return n;
}

export async function getCodeForSlot(slot: CodeSlot): Promise<string | null> {
  const snap = await get(
    child(ref(database), `tournamentCodeIndex/${slot.t}/${arenaKey(slot.kind, slot.a)}/${slot.r}`)
  );
  return snap.val();
}

// ==================== Doc bang ma ====================

export type CodeIndex = Record<string, Record<string, string>>;

/**
 * Chu giai: bang ma CA GIAI.
 *
 * Giam sat KHONG dung ham nay duoc — rules chi cho ho doc dung nhanh san minh
 * (`tournamentCodeIndex/{t}/{sanKey}`), doc ca `{t}` se bi tu choi.
 * Man giam sat phai dung `subscribeArenaCodeIndex`.
 */
export function subscribeCodeIndex(
  t: TournamentId,
  cb: (index: CodeIndex) => void,
  onError?: (err: Error) => void
): () => void {
  const r = ref(database, `tournamentCodeIndex/${t}`);
  onValue(
    r,
    (snap) => {
      // `meta` (kieu danh so + 2 so dau) nam chung nhanh nhung khong phai san —
      // loc ngay tai day de moi noi dung bang ma khoi phai nho ma tranh no
      const { [META_KEY]: _meta, ...arenas } = (snap.val() || {}) as Record<string, unknown>;
      cb(arenas as CodeIndex);
    },
    (err) => onError?.(err)
  );
  return () => off(r);
}

/** Giam sat: chi doc duoc dung san minh duoc phan cong */
export function subscribeArenaCodeIndex(
  t: TournamentId,
  sanKey: string,
  cb: (byReferee: Record<string, string>) => void,
  onError?: (err: Error) => void
): () => void {
  const r = ref(database, `tournamentCodeIndex/${t}/${sanKey}`);
  onValue(r, (snap) => cb(snap.val() || {}), (err) => onError?.(err));
  return () => off(r);
}

export async function getCode(code: string): Promise<AccessCode | null> {
  const snap = await get(child(ref(database), `accessCode/${code}`));
  return snap.val();
}

/**
 * Theo doi chinh ma minh dang giu.
 *
 * Bat buoc cho man cham diem: chu giai dong giai (ma bi xoa) hoac giam sat bam
 * Mo khoa (mat `claimedUid`) thi phai hien man hinh ro rang, khong de giam dinh
 * bam vao hu khong roi loi am tham.
 */
export function subscribeCode(code: string, cb: (data: AccessCode | null) => void): () => void {
  const r = ref(database, `accessCode/${code}`);
  onValue(r, (snap) => cb(snap.val()));
  return () => off(r);
}

// ==================== Tu so cua giai ra o cham diem ====================

/**
 * Tran cua ma dung chung: `sharedCodeFor` danh cho san va vi tri moi ben DUNG
 * MOT chu so, nen khong bao gio co san thu 3 hay giam dinh thu 6.
 */
export const MAX_ARENAS = 2;
export const MAX_REFEREES = 5;

/** Mot o cham diem chon duoc tu man hinh, sau khi go 2 so cua giai */
export interface OpenPosition {
  a: number;
  r: number;
  code: string;
  /** Nhung mon o nay cham duoc — 2 thi con phai hoi giam dinh mot cau */
  slots: CodeSlot[];
  /** Da co may khac cam o nay */
  claimedUid?: string;
}

/**
 * Giai co nhung o cham diem nao — do thang tu kho ma.
 *
 * Giam dinh chi go 2 SO CUA GIAI; san va vi tri thi ho **cham vao man hinh**
 * chu khong go. De bay ra dung nhung o co that, man hinh phai biet giai nay co
 * may san, may giam dinh — ma `tournamentCodeIndex` thi chi chu giai doc duoc,
 * con `tournament/{t}/setting` la mot cay nang.
 *
 * Nen doc nguoc tu chinh cac node ma: ma la `so giai + san + vi tri` nen thu
 * het 2 x 5 to hop la ra dung bo o cua giai — kem luon "o nay co ai cam chua"
 * va "o nay cham duoc mon gi". Khong them mot ban sao thiet dat nao de lech.
 *
 * `t` de chan mot truong hop hiem ma dat: giai cu dong chua sach ma, giai moi
 * nhan trung 2 so — o do se tro ve giai da chet.
 */
export async function positionsForPrefix(prefix: string, t: TournamentId): Promise<OpenPosition[]> {
  const wanted: { a: number; r: number; code: string }[] = [];
  for (let a = 0; a < MAX_ARENAS; a++) {
    for (let r = 0; r < MAX_REFEREES; r++) {
      wanted.push({ a, r, code: sharedCodeFor(prefix, a, r) });
    }
  }

  const found = await Promise.all(wanted.map(async (w): Promise<OpenPosition | null> => {
    let data: AccessCode | null = null;
    try {
      data = await getCode(w.code);
    } catch {
      return null;
    }
    if (!data || data.reserved || data.tKey !== String(t)) return null;
    const slots = availableSlots(data);
    if (!slots.length) return null;
    return { ...w, slots, claimedUid: data.claimedUid };
  }));

  return found.filter((p): p is OpenPosition => p !== null);
}

/**
 * Doc lai dung mot o — dung ngay luc giam dinh cham vao o dang co nguoi.
 *
 * Giam sat vua bam "Mo khoa" xong thi cham lai phat nua la vao duoc, khong
 * phai thoat ra go lai so.
 */
export async function refreshPosition(pos: OpenPosition): Promise<OpenPosition | null> {
  const data = await getCode(pos.code);
  if (!data || data.reserved) return null;
  const slots = availableSlots(data);
  if (!slots.length) return null;
  return { ...pos, slots, claimedUid: data.claimedUid };
}

// ==================== Claim / mo khoa ====================

export class CodeError extends Error {
  code: 'not-found' | 'taken';
  constructor(kind: 'not-found' | 'taken', message: string) {
    super(message);
    this.name = 'CodeError';
    this.code = kind;
  }
}

/**
 * Nhan ma ve thiet bi nay, roi mo phien cham diem.
 *
 * Hai buoc **noi tiep**, khong gop duoc: rules cua `codeSession` doc
 * `accessCode/{code}/claimedUid` tu `root` (trang thai TRUOC khi ghi), nen
 * claim phai vao DB xong thi phien moi ghi duoc.
 */
export async function claimCode(
  code: string,
  uid: string,
  /** Kieu dung chung: mon giam dinh vua chon. Ma chi mo duoc mot o thi bo trong. */
  chosen?: CodeSlot
): Promise<AccessCode> {
  const data = await getCode(code);
  if (!data || data.reserved) {
    throw new CodeError('not-found', 'Số không đúng. Kiểm tra lại giúp — số do giám sát đọc cho.');
  }

  // Ma dung chung mo duoc 2 o (doi khang / thi quyen). Khong tu chon ho: vao
  // nham mon la ca ban diem do vao lam khac, khong ai nhin ra ngay duoc.
  const options = availableSlots(data);
  const target = chosen ? options.find((s) => slotString(s) === slotString(chosen)) : options[0];
  if (!target || (options.length > 1 && !chosen)) {
    throw new CodeError('not-found', 'Mã hỏng — nhờ giám sát cấp lại mã mới.');
  }

  if (data.claimedUid && data.claimedUid !== uid) {
    throw new CodeError(
      'taken',
      'Chỗ này đã có máy khác dùng. Nhờ giám sát bấm "Mở khoá" rồi chọn lại.'
    );
  }

  if (data.claimedUid !== uid) {
    try {
      await update(ref(database, `accessCode/${code}`), {
        claimedUid: uid,
        claimedAt: Date.now(),
      });
    } catch {
      // `claimedAt` chi de xem cho biet. Rules bat buoc phai cho ghi
      // `claimedUid` — con `claimedAt` thi khong duoc phep chan duong vao ban
      // cham cua giam dinh giua tran.
      await set(ref(database, `accessCode/${code}/claimedUid`), uid);
    }
  }

  await set(ref(database, `codeSession/${uid}`), { code, slot: slotString(target) });
  return { ...data, claimedUid: uid };
}

/**
 * Mo khoa: **giu nguyen so ma**, chi go `claimedUid`.
 *
 * Cap ma moi thi giua giai lai phai doc so moi cho giam dinh — de loan. Doi
 * may / het pin / xoa du lieu trinh duyet deu ve day: bam mot cai roi go lai
 * dung ma cu.
 */
export async function unlockCode(code: string): Promise<void> {
  await update(ref(database, `accessCode/${code}`), {
    claimedUid: null,
    claimedAt: null,
  });
}

export function subscribeSession(uid: string, cb: (s: CodeSession | null) => void): () => void {
  if (!uid) {
    cb(null);
    return () => undefined;
  }
  const r = ref(database, `codeSession/${uid}`);
  onValue(r, (snap) => cb(snap.val()), () => cb(null));
  return () => off(r);
}

export async function getSession(uid: string): Promise<CodeSession | null> {
  if (!uid) return null;
  const snap = await get(child(ref(database), `codeSession/${uid}`));
  return snap.val();
}

/**
 * Chan uid rong o day chu khong o cho goi.
 *
 * `codeSession/${''}` la duong dan `codeSession/` — tro thang vao node goc, tuc
 * la xoa phien cua MOI NGUOI. Rules chan viec do, nhung mot ham xoa khong duoc
 * phep dua vao rules de khoi hong.
 */
export async function clearSession(uid: string): Promise<void> {
  clearCachedSession();
  if (!uid) return;
  await remove(ref(database, `codeSession/${uid}`));
}

// ==================== Ban sao cuc bo (mo lai khi mat mang) ====================

/**
 * Mat khau cu duoc cache 6 tieng nen mat mang van vao duoc man cham diem.
 * Ban moi khong duoc kem hon: cache lai `slot` de vao thang, ghi vao hang doi
 * cua `offlineService`.
 */
export function cacheSession(s: CachedSession): void {
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(s));
  } catch {
    /* che do rieng tu chan storage - chap nhan mat cache */
  }
}

export function getCachedSession(): CachedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCachedSession(): void {
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

// ==================== Phien cham diem cua giam dinh ====================

export interface RefereeSession {
  uid: string;
  code: string;
  slot: CodeSlot;
  tournamentName: string;
  /** True khi doc tu ban sao cuc bo vi khong ra duoc mang */
  fromCache: boolean;
}

/**
 * Lay phien cham diem hien tai cho man giam dinh.
 *
 * Uu tien DB (biet duoc ma da bi mo khoa hay giai da dong chua). Khong ra duoc
 * mang thi dung ban sao cuc bo — mat khau cu cache 6 tieng nen mat mang van vao
 * duoc; ban moi khong duoc kem hon.
 */
export async function resolveRefereeSession(
  uid: string,
  expectKind?: ArenaKind
): Promise<RefereeSession | null> {
  if (!uid) return null;

  let code: string | null = null;
  let slotRaw: string | null = null;
  let fromCache = false;

  try {
    const s = await getSession(uid);
    if (s) {
      code = s.code;
      slotRaw = s.slot;
    }
  } catch {
    /* khong doc duoc DB — roi xuong ban sao cuc bo */
  }

  const cached = getCachedSession();
  if (!code && cached) {
    code = cached.code;
    slotRaw = cached.slot;
    fromCache = true;
  }

  const slot = parseSlot(slotRaw);
  if (!code || !slot) return null;
  if (expectKind && slot.kind !== expectKind) return null;

  let tournamentName = cached?.tournamentName || '';
  if (!fromCache) {
    try {
      const snap = await get(child(ref(database), `tournament/${slot.t}/setting/tournamentName`));
      tournamentName = snap.val() || tournamentName;
    } catch {
      /* giu ten tu ban sao */
    }
  }

  return { uid, code, slot, tournamentName, fromCache };
}
