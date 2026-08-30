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
 *
 * ## Khong con bang chi muc
 *
 * Truoc day moi ma con duoc chep vao `tournamentCodeIndex/{t}` de chu giai
 * dung lai bang ma. Bang do la thu **tinh ra duoc**: ma cua mot o luon bang
 * `prefix + (san+1) + (vi tri+1)`, nen biet 2 so cua giai va so san / so giam
 * dinh la dung lai duoc ca bang, khong sai mot mach.
 *
 * Nen gio kho chi giu **nhung gi khong tinh duoc**:
 *   · `accessCode/{prefix}`      2 so cua giai + so san + so giam dinh
 *   · `accessCode/{ma}`          cac slot ma no mo, va may nao dang cam
 *   · `tournamentCodePrefix/{t}` giai nay mang 2 so nao (chi chu giai va
 *                                giam sat cua giai doc duoc)
 *
 * Bo bang chi muc di keo theo: khong con node `meta`, khong con don rac chi
 * muc, khong con canh mot ma nam o hai nhanh mon roi phai khu trung.
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

/**
 * Tran cua ma dung chung: `sharedCodeFor` danh cho san va vi tri moi ben DUNG
 * MOT chu so, nen khong bao gio co san thu 3 hay giam dinh thu 6.
 */
export const MAX_ARENAS = 2;
export const MAX_REFEREES = 5;

const SESSION_CACHE_KEY = 'cocvuong_code_session';

/** Giai nay mang 2 so nao. Chu giai va giam sat cua giai doc duoc; nguoi ngoai khong. */
const PREFIX_PATH = 'tournamentCodePrefix';

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

/**
 * Mot node trong kho ma. Hai loai node dung chung mot hinh dang:
 *
 *   · **o cham diem** (`accessCode/8311`) — co `slotCombat` / `slotMartial`
 *   · **2 so cua giai** (`accessCode/83`) — co `reserved`, va mang ban thiet
 *     ke cua giai de man chon cho dung lai duoc bang o ma khong can doc them
 *
 * Moi truong o day deu co nguoi doc. Truoc day node nay con mang `kind`, `a`,
 * `r`, `label`, `ownerUid`, `claimedAt` — deu ghi roi khong ai doc lai, va
 * `label` con noi sai ten giai sau khi chu giai doi ten.
 */
export interface AccessCode {
  /**
   * Khoa giai, dang CHUOI.
   *
   * Rules phai noi chuoi de dung toi `tournament/{t}/...`, nen truong nay ton
   * tai de moi phep noi trong rules la chuoi + chuoi. App doc chinh no luon —
   * truoc day co them mot ban sao ten `t` y het, giu ca hai la thua mot cai.
   */
  tKey: TournamentId;
  /**
   * `combat0` / `martial1`… — rules dung de tra `tournamentStaff/{t}/{uid}/assignments/{arenaKey}`.
   * Rules khong ep duoc so sang chuoi nen khong tu ghep `kind + a` duoc.
   */
  arenaKey: string;
  claimedUid?: string;

  /** O cham diem: nhung slot ma nay mo. Giam dinh chon mon o man xac nhan. */
  slotCombat?: string;
  slotMartial?: string;

  /** Node 2 so cua giai — go vao chi hien bang chon, khong vao thang duoc */
  reserved?: boolean;
  /** Giai nay mo may san (1 hoac 2) — de man chon dung lai bang o, khong doc them */
  arenas?: number;
  refCombat?: number;
  refMartial?: number;
}

export interface CodeSession {
  code: string;
  slot: string;
}

/** Ban sao cuc bo cua phien — de mo lai duoc khi mat mang */
export interface CachedSession {
  code: string;
  slot: string;
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
 * Nhung o cham diem mot ma mo duoc — mot hoac hai (doi khang / thi quyen)
 * cung san cung vi tri. Day chinh la cai giam dinh phai chon luc vao.
 */
export function availableSlots(data: AccessCode | null): CodeSlot[] {
  if (!data || data.reserved) return [];
  const out: CodeSlot[] = [];
  for (const raw of [data.slotCombat, data.slotMartial]) {
    const slot = parseSlot(raw);
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

// ==================== Ban thiet ke cua mot giai ====================

export interface TournamentCodePlan {
  /** So giam dinh doi khang (3 hoac 5) */
  combatReferees: number;
  /** So giam dinh thi quyen (3 hoac 5) */
  martialReferees: number;
  /** Co dung San B hay khong */
  useArenaB: boolean;
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

function clampPlan(plan: TournamentCodePlan): TournamentCodePlan {
  return {
    combatReferees: Math.max(0, Math.min(MAX_REFEREES, plan.combatReferees)),
    martialReferees: Math.max(0, Math.min(MAX_REFEREES, plan.martialReferees)),
    useArenaB: plan.useArenaB,
  };
}

export function sharedPositions(t: TournamentId, plan: TournamentCodePlan): SharedPosition[] {
  const p = clampPlan(plan);
  const arenas = p.useArenaB ? [0, 1] : [0];
  const most = Math.max(p.combatReferees, p.martialReferees);
  const out: SharedPosition[] = [];
  for (const a of arenas) {
    for (let r = 0; r < most; r++) {
      const kinds: ArenaKind[] = [];
      if (r < p.combatReferees) kinds.push('combat');
      if (r < p.martialReferees) kinds.push('martial');
      if (kinds.length) out.push({ t, a, r, kinds });
    }
  }
  return out;
}

/**
 * Ban thiet ke doc nguoc tu node 2 so cua giai.
 *
 * Day la thu thay cho ca bang chi muc cu: ba con so nay du de dung lai chinh
 * xac bo o cua giai, o bat ky man nao — man chon cho cua giam dinh, bang ma
 * cua chu giai, trang quan tri.
 *
 * Giai cap truoc ban nay chua co ba truong do; coi nhu ban mac dinh (2 san,
 * 3 giam dinh) de man hinh khong trong troi — lan dong bo thiet dat ke tiep
 * se ghi so that vao.
 */
export function planOf(holder: AccessCode | null | undefined): TournamentCodePlan {
  return clampPlan({
    combatReferees: holder?.refCombat ?? 3,
    martialReferees: holder?.refMartial ?? 3,
    useArenaB: (holder?.arenas ?? MAX_ARENAS) > 1,
  });
}

/** Ba con so cua ban thiet ke, dang ghi xuong node 2 so cua giai */
function planFields(plan: TournamentCodePlan): Pick<AccessCode, 'arenas' | 'refCombat' | 'refMartial'> {
  const p = clampPlan(plan);
  return {
    arenas: p.useArenaB ? 2 : 1,
    refCombat: p.combatReferees,
    refMartial: p.martialReferees,
  };
}

// ==================== 2 so cua giai ====================

/**
 * Giai nay mang 2 so nao.
 *
 * Doc `tournamentCodePrefix/{t}`. Giai cap truoc ban nay giu so o node `meta`
 * cua bang chi muc cu — doc song song ca hai cho, cho nao co thi lay, roi lan
 * dong bo ke tiep ghi sang cho moi. Doc song song chu khong noi tiep: giai moi
 * nao cung tra loi "chua co" o ca hai cho, khong dang ton hai vong di-ve.
 */
export async function resolvePrefix(t: TournamentId): Promise<string | undefined> {
  const [fresh, legacy] = await Promise.all([
    get(child(ref(database), `${PREFIX_PATH}/${t}`)).then((s) => s.val()).catch(() => null),
    get(child(ref(database), `tournamentCodeIndex/${t}/meta/prefix`)).then((s) => s.val()).catch(() => null),
  ]);
  const found = fresh || legacy;
  return typeof found === 'string' && found ? found : undefined;
}

export function subscribePrefix(
  t: TournamentId,
  cb: (prefix: string | null) => void,
  onError?: (err: Error) => void
): () => void {
  const r = ref(database, `${PREFIX_PATH}/${t}`);
  onValue(r, (snap) => cb(snap.val()), (err) => onError?.(err));
  return () => off(r);
}

// ==================== Cap ma ====================

export interface EnsureCodesResult {
  created: number;
  kept: number;
  /** So NODE MA bi go vi o do khong con trong thiet dat nua */
  removed: number;
  maxRetries: number;
  /** True khi kho ma sap het — hien canh bao cho nguoi dung */
  poolPressure: boolean;
  prefix?: string;
}

/**
 * Payload cua mot o cham diem.
 *
 * `arenaKey` lay theo mon dau tien co that o vi tri nay — rules chi dung no de
 * tra phan cong giam sat, ma giam sat duoc phan cong san nao thi duoc ca hai
 * mon cua san do.
 */
function positionPayload(pos: SharedPosition): AccessCode {
  const payload: AccessCode = {
    tKey: pos.t,
    arenaKey: arenaKey(pos.kinds[0], pos.a),
  };
  if (pos.kinds.includes('combat')) {
    payload.slotCombat = slotString({ t: pos.t, kind: 'combat', a: pos.a, r: pos.r });
  }
  if (pos.kinds.includes('martial')) {
    payload.slotMartial = slotString({ t: pos.t, kind: 'martial', a: pos.a, r: pos.r });
  }
  return payload;
}

function holderPayload(t: TournamentId, prefix: string, plan: TournamentCodePlan): AccessCode {
  return {
    reserved: true,
    tKey: t,
    arenaKey: arenaKey('combat', 0),
    ...planFields(plan),
  };
}

/** Node 2 so cua giai da mang dung ban thiet ke chua */
function sameHolder(has: AccessCode | null, want: AccessCode): boolean {
  return !!has
    && has.reserved === true
    && has.tKey === want.tKey
    && has.arenaKey === want.arenaKey
    && has.arenas === want.arenas
    && has.refCombat === want.refCombat
    && has.refMartial === want.refMartial;
}

/** Node ma nay da dung hinh dang can co chua */
function upToDate(data: AccessCode | null, pos: SharedPosition): boolean {
  if (!data || data.tKey !== pos.t) return false;
  const want = positionPayload(pos);
  return data.slotCombat === want.slotCombat
    && data.slotMartial === want.slotMartial
    && data.arenaKey === want.arenaKey
    // Node cap truoc ban nay mang mot dong truong khong ai doc. Ghi lai mot
    // luot cho no gon — khong thi giai cu mang mai hinh dang cu.
    && (data as unknown as Record<string, unknown>).label === undefined;
}

/**
 * Nhung o KHONG con trong thiet dat nua, doc tu ban thiet ke CU.
 *
 * Ha 5 giam dinh xuong 3 ma de nguyen thi ma cua GD4, GD5 van mo duoc mot o
 * cham diem khong con ai nhin — mot cua vao thua nam mo giua giai.
 *
 * Biet ban cu thi biet chinh xac o nao tung ton tai, nen chi ra lenh xoa dung
 * nhung o do. Doan bua ca luoi 2x5 thi phan lon lenh xoa roi vao node khong co
 * that, ma rules chan xoa node khong con `tKey` — loi do khong lam hong gi
 * nhung in day mot mau canh bao ra console.
 */
function staleCodes(prefix: string, before: TournamentCodePlan, after: SharedPosition[], t: TournamentId): string[] {
  const live = new Set(after.map((p) => sharedCodeFor(prefix, p.a, p.r)));
  const out: string[] = [];
  for (const pos of sharedPositions(t, before)) {
    const code = sharedCodeFor(prefix, pos.a, pos.r);
    if (!live.has(code)) out.push(code);
  }
  return out;
}

/**
 * Bao dam moi o cham diem cua giai deu co ma, va KHONG con o thua nao.
 *
 * Goi ca luc tao giai lan ngay sau khi luu thiet dat. So giam dinh la thu chu
 * giai doi duoc bat cu luc nao; bo ma phai chay theo mot cach im lang — khong
 * co ham nay thi bat 5 giam dinh xong, GD4 va GD5 go dung cong thuc van bi bao
 * "khong co ma nay".
 *
 * Ghi mot luot: node 2 so cua giai, cac o phai cap, con tro `tournamentCodePrefix`
 * va cac o phai go — tat ca trong dung MOT lenh `update`. Truoc day day la ba
 * bon vong di-ve noi tiep, va node chi muc bi doc lai bon lan trong cung mot
 * luot cap ma.
 */
export async function syncTournamentCodes(
  t: TournamentId,
  plan: TournamentCodePlan,
  ownerUid: string,
  known?: string
): Promise<EnsureCodesResult> {
  let prefix = known || (await resolvePrefix(t));
  let retries = 0;
  /** Vua tu tay nhan so trong luot nay: khong the co san o nao duoi no */
  let fresh = false;

  if (!prefix) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const candidate = randomPrefix();
      if (!(await isPrefixFree(candidate))) continue;
      prefix = candidate;
      retries = attempt;
      fresh = true;
      break;
    }
    if (!prefix) throw new CodePoolFullError();
  }

  const positions = sharedPositions(t, plan);

  // Doc node 2 so cua giai va cac o hien co TRONG MOT VONG.
  //
  // Chung khong biet gi ve nhau nen khong co ly do xep hang: tao giai o vung
  // xa la ngoi cho vai giay cho mot viec von chi ton mot vong. Loi doc thi de
  // no vang ra — doc hong ma coi nhu "chua co" la ghi de len ma cua giai khac.
  const [holder, pointer, existing] = fresh
    ? [null, null, positions.map(() => null)]
    : await Promise.all([
      get(child(ref(database), `accessCode/${prefix}`)).then((s) => s.val() as AccessCode | null),
      get(child(ref(database), `${PREFIX_PATH}/${t}`)).then((s) => s.val() as string | null),
      Promise.all(positions.map((pos) =>
        get(child(ref(database), `accessCode/${sharedCodeFor(prefix!, pos.a, pos.r)}`))
          .then((s) => s.val() as AccessCode | null)
      )),
    ]);

  // Giai khac dang giu 2 so nay — de nguyen, ghi de la cuop cua ho
  if (holder && holder.tKey !== t) throw new PrefixTakenError(prefix);

  const writes: Record<string, unknown> = {};

  const wantHolder = holderPayload(t, prefix, plan);
  if (!sameHolder(holder, wantHolder)) writes[`accessCode/${prefix}`] = wantHolder;
  if (pointer !== prefix) writes[`${PREFIX_PATH}/${t}`] = prefix;

  let created = 0;
  positions.forEach((pos, i) => {
    if (upToDate(existing[i], pos)) return;
    // Giu nguyen may dang cam o nay: doi 3 lon 5 giam dinh giua giai khong
    // duoc day nguoi dang cham ra khoi ban cua ho
    const keepClaim = existing[i]?.claimedUid;
    const payload = positionPayload(pos);
    if (keepClaim) payload.claimedUid = keepClaim;
    writes[`accessCode/${sharedCodeFor(prefix!, pos.a, pos.r)}`] = payload;
    created++;
  });

  // Chi go duoc khi biet ban thiet ke CU. Khong co node 2 so — so vua nhan,
  // hoac vua thu hoi xong — thi khong co gi de go.
  //
  // Quan trong hon la khong duoc DOAN: mot lenh xoa nham vao node khong co that
  // bi rules tu choi, ma `update` nhieu duong la mot khoi — mot duong hong thi
  // ca khoi truot, va ca luot cap ma roi xuong duong ghi tung o.
  const stale = holder ? staleCodes(prefix, planOf(holder), positions, t) : [];
  for (const code of stale) writes[`accessCode/${code}`] = null;

  // Luu thiet dat ma khong dong den so giam dinh la truong hop THUONG GAP
  // nhat. Khong doi gi thi khong ghi gi — truoc day cho nay van ghi lai dung
  // cai gia tri cu, mot luot ghi Firebase cho moi lan bam luu.
  if (!Object.keys(writes).length) {
    return {
      created: 0, kept: positions.length, removed: 0,
      maxRetries: retries, poolPressure: false, prefix,
    };
  }

  try {
    await update(ref(database), writes);
  } catch {
    // Ghi gop la mot khoi: mot o hong thi ca khoi truot. Quay ve ghi tung o
    // de bo ma van len duoc gan het, con hon la khong len o nao.
    for (const [path, value] of Object.entries(writes)) {
      if (value === null) await remove(ref(database, path)).catch(() => undefined);
      else await set(ref(database, path), value).catch(() => undefined);
    }
  }

  return {
    created,
    kept: positions.length - created,
    removed: stale.length,
    maxRetries: retries,
    poolPressure: retries >= CODE_PRESSURE_WARN,
    prefix,
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
  const current = await resolvePrefix(t);
  if (prefix !== current && !(await isPrefixFree(prefix))) {
    throw new PrefixTakenError(prefix);
  }

  await revokeTournamentCodes(t);
  return syncTournamentCodes(t, plan, ownerUid, prefix);
}

/**
 * Thu hoi TOAN BO ma cua mot giai — goi khi dong giai.
 *
 * Vi ma la kho dung chung co tran, "xong giai la bam Dong giai" khong con la
 * chuyen gon gang ma la **bat buoc**: khong dong thi ma nam giu cho mai.
 *
 * Xoa theo ban thiet ke doc tu chinh node 2 so cua giai, nen khong bo sot o
 * nao va cung khong ra lenh xoa nham o khong co that.
 */
export async function revokeTournamentCodes(t: TournamentId): Promise<number> {
  const prefix = await resolvePrefix(t);
  if (!prefix) {
    // Khong con dau vet nao cua 2 so — van don not cho cu de khong de lai rac
    await remove(ref(database, `tournamentCodeIndex/${t}`)).catch(() => undefined);
    await remove(ref(database, `${PREFIX_PATH}/${t}`)).catch(() => undefined);
    return 0;
  }

  const holder = await get(child(ref(database), `accessCode/${prefix}`))
    .then((s) => s.val() as AccessCode | null)
    .catch(() => null);

  const writes: Record<string, unknown> = {
    // 2 so dau cung chiem mot node trong kho ma — khong tra lai thi giai sau
    // khong bao gio nhan duoc so ay nua
    [`accessCode/${prefix}`]: null,
    [`${PREFIX_PATH}/${t}`]: null,
    [`tournamentCodeIndex/${t}`]: null,
  };
  let n = 1;
  for (const pos of sharedPositions(t, planOf(holder))) {
    writes[`accessCode/${sharedCodeFor(prefix, pos.a, pos.r)}`] = null;
    n++;
  }

  try {
    await update(ref(database), writes);
  } catch {
    for (const path of Object.keys(writes)) {
      await remove(ref(database, path)).catch(() => undefined);
    }
  }
  return n;
}

// ==================== Doc kho ma ====================

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

/** O cham diem cua mot vi tri, dung tu ban thiet ke — chua biet ai dang cam */
function openPositionOf(prefix: string, pos: SharedPosition): OpenPosition {
  return {
    a: pos.a,
    r: pos.r,
    code: sharedCodeFor(prefix, pos.a, pos.r),
    slots: pos.kinds.map((kind) => ({ t: pos.t, kind, a: pos.a, r: pos.r })),
  };
}

/** Bo o cua mot giai, dung thang tu node 2 so cua giai — khong ton vong doc nao */
export function positionsOfHolder(prefix: string, holder: AccessCode): OpenPosition[] {
  return sharedPositions(holder.tKey, planOf(holder)).map((pos) => openPositionOf(prefix, pos));
}

/**
 * Giai co nhung o cham diem nao, va o nao dang co may cam.
 *
 * Bo o thi **tinh ra** tu ba con so nam san tren node 2 so cua giai — truoc
 * day cho nay do cung ca luoi 2x5 = 10 to hop, nen giai mot san ba giam dinh
 * ton 7 vong di-ve chi de nghe tra loi "khong co".
 *
 * Con phai doc that la trang thai "o nay ai dang cam" — thu duy nhat khong
 * tinh ra duoc. Doc mot vong song song cho dung nhung o co that.
 */
export async function positionsForPrefix(prefix: string, holder: AccessCode): Promise<OpenPosition[]> {
  const positions = positionsOfHolder(prefix, holder);
  const claims = await Promise.all(positions.map((p) =>
    getCode(p.code).then((d) => d?.claimedUid).catch(() => undefined)
  ));
  return positions.map((p, i) => (claims[i] ? { ...p, claimedUid: claims[i] } : p));
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
  /** Mon giam dinh vua chon. Ma chi mo duoc mot o thi bo trong. */
  chosen?: CodeSlot
): Promise<AccessCode> {
  const data = await getCode(code);
  if (!data || data.reserved) {
    throw new CodeError('not-found', 'Số không đúng. Kiểm tra lại giúp — số do giám sát đọc cho.');
  }

  // Ma mo duoc 2 o (doi khang / thi quyen). Khong tu chon ho: vao nham mon la
  // ca ban diem do vao lam khac, khong ai nhin ra ngay duoc.
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
    await set(ref(database, `accessCode/${code}/claimedUid`), uid);
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
  await remove(ref(database, `accessCode/${code}/claimedUid`));
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
