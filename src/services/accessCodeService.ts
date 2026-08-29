/**
 * Access Code Service — ma vao cho giam dinh.
 *
 * Y tuong: mot ma la mot **o cham diem da duoc troi san**. Go ma xong la vao
 * thang dung giai / dung san / dung vi tri, bo hoan toan ba vong chon
 * giai -> san -> vi tri von la cho de sai nhat.
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

/**
 * Do dai ma — **mot hang so duy nhat cua ca he thong**.
 *
 * Rules khong quan tam do dai ma, nen doi 2 -> 3 chi sua dung dong nay,
 * KHONG phai deploy lai rules. Ma cu van chay tiep cho toi luc dong giai.
 *
 * Tran: 2 so = 99 ma dung chung cho MOI giai (kho phang, khong tach theo giai
 * — tach thi giam dinh lai phai chon giai truoc khi go, dung cai buoc muon bo).
 * Mot giai 2 san x 2 mon tieu ~12-24 ma => khoang 4 giai mo cung luc.
 */
export const CODE_LENGTH = 2;

/** Bo cuoc sau ngan nay lan random trung ma da co */
export const MAX_CODE_ATTEMPTS = 50;

/** Qua ngan nay lan random lai la kho ma sap day — canh bao nguoi dung */
export const CODE_PRESSURE_WARN = 5;

const SESSION_CACHE_KEY = 'cocvuong_code_session';

export type ArenaKind = 'combat' | 'martial';

export interface CodeSlot {
  /** Index giai trong mang `tournament` */
  t: number;
  kind: ArenaKind;
  /** 0 = San A, 1 = San B */
  a: number;
  /** Vi tri giam dinh, **0-based** — dung index that trong DB, khong phai so hien thi */
  r: number;
}

export interface AccessCode {
  slot: string;
  t: number;
  kind: ArenaKind;
  a: number;
  r: number;
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
  if (kind !== 'combat' && kind !== 'martial') return null;
  const nums = [Number(t), Number(a), Number(r)];
  if (nums.some((n) => Number.isNaN(n))) return null;
  return { t: nums[0], kind, a: nums[1], r: nums[2] };
}

/** "Thi quyền · Sân B · GĐ2" — dong chu giam dinh doc de xac nhan truoc khi vao */
export function slotLabel(s: CodeSlot): string {
  return `${kindName(s.kind)} · ${arenaName(s.a)} · GĐ${s.r + 1}`;
}

/** Tach chu so de doc to cho nhau nghe: "30" -> "3 0" */
export function spacedCode(code: string): string {
  return code.split('').join(' ');
}

// ==================== Sinh ma ====================

/** Ma toan so 0 bi bo: nhin nhu "chua nhap gi" nen de gay hoang mang */
function randomCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += String(Math.floor(Math.random() * 10));
  }
  return /^0+$/.test(out) ? randomCode() : out;
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

export interface CreatedCode {
  code: string;
  /** So lan phai random lai. Cao la kho ma sap day. */
  retries: number;
}

/**
 * Cap mot ma moi cho mot o cham diem.
 *
 * Khong doc nguoc duoc ca kho (`accessCode` de `.read: false`) nen khong dem
 * truc tiep duoc do day — thay vao do dem so lan random trung, goi ve cho
 * nguoi goi de canh bao.
 */
export async function createCode(
  slot: CodeSlot,
  ownerUid: string,
  label: string
): Promise<CreatedCode> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = randomCode();
    const existing = await get(child(ref(database), `accessCode/${code}`));
    if (existing.exists()) continue;

    const payload: AccessCode = {
      slot: slotString(slot),
      t: slot.t,
      kind: slot.kind,
      a: slot.a,
      r: slot.r,
      tKey: String(slot.t),
      arenaKey: arenaKey(slot.kind, slot.a),
      label,
      ownerUid,
    };
    await set(ref(database, `accessCode/${code}`), payload);
    await set(
      ref(database, `tournamentCodeIndex/${slot.t}/${arenaKey(slot.kind, slot.a)}/${slot.r}`),
      code
    );
    return { code, retries: attempt };
  }
  throw new CodePoolFullError();
}

/** Xoa han mot ma (va dong chi muc tro toi no) */
export async function deleteCode(code: string, slot: CodeSlot): Promise<void> {
  await remove(ref(database, `accessCode/${code}`));
  await remove(
    ref(database, `tournamentCodeIndex/${slot.t}/${arenaKey(slot.kind, slot.a)}/${slot.r}`)
  );
}

/** Cap so moi cho dung o do. Buoc doc lai so cho giam dinh giua giai — de phu. */
export async function regenerateCode(
  slot: CodeSlot,
  ownerUid: string,
  label: string
): Promise<CreatedCode> {
  const old = await getCodeForSlot(slot);
  if (old) await remove(ref(database, `accessCode/${old}`));
  return createCode(slot, ownerUid, label);
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

export function slotsForTournament(t: number, plan: TournamentCodePlan): CodeSlot[] {
  const arenas = plan.useArenaB ? [0, 1] : [0];
  const out: CodeSlot[] = [];
  for (const a of arenas) {
    for (let r = 0; r < plan.combatReferees; r++) out.push({ t, kind: 'combat', a, r });
    for (let r = 0; r < plan.martialReferees; r++) out.push({ t, kind: 'martial', a, r });
  }
  return out;
}

export interface EnsureCodesResult {
  created: number;
  kept: number;
  maxRetries: number;
  /** True khi kho ma sap het — hien canh bao cho nguoi dung */
  poolPressure: boolean;
}

/**
 * Bao dam moi o cham diem cua giai deu co ma.
 *
 * Goi ngay LUC TAO GIAI, khong bat bam them mot buoc: mo Thiet dat ra la da
 * co ma san de doc cho giam dinh.
 */
export async function ensureTournamentCodes(
  t: number,
  plan: TournamentCodePlan,
  ownerUid: string
): Promise<EnsureCodesResult> {
  const slots = slotsForTournament(t, plan);
  let created = 0;
  let kept = 0;
  let maxRetries = 0;

  for (const slot of slots) {
    const existing = await getCodeForSlot(slot);
    if (existing) {
      const snap = await get(child(ref(database), `accessCode/${existing}/slot`));
      if (snap.val() === slotString(slot)) {
        kept++;
        continue;
      }
    }
    const res = await createCode(slot, ownerUid, `${plan.tournamentName} · ${slotLabel(slot)}`);
    created++;
    maxRetries = Math.max(maxRetries, res.retries);
  }

  return { created, kept, maxRetries, poolPressure: maxRetries >= CODE_PRESSURE_WARN };
}

/**
 * Thu hoi TOAN BO ma cua mot giai — goi khi dong giai.
 *
 * Vi ma la kho dung chung co tran, "xong giai la bam Dong giai" khong con la
 * chuyen gon gang ma la **bat buoc**: khong dong thi ma nam giu cho mai.
 */
export async function revokeTournamentCodes(t: number): Promise<number> {
  const snap = await get(child(ref(database), `tournamentCodeIndex/${t}`));
  const index = snap.val() as Record<string, Record<string, string>> | null;
  if (!index) return 0;

  let n = 0;
  for (const byArena of Object.values(index)) {
    for (const code of Object.values(byArena || {})) {
      if (!code) continue;
      await remove(ref(database, `accessCode/${code}`));
      n++;
    }
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
  t: number,
  cb: (index: CodeIndex) => void,
  onError?: (err: Error) => void
): () => void {
  const r = ref(database, `tournamentCodeIndex/${t}`);
  onValue(r, (snap) => cb(snap.val() || {}), (err) => onError?.(err));
  return () => off(r);
}

/** Giam sat: chi doc duoc dung san minh duoc phan cong */
export function subscribeArenaCodeIndex(
  t: number,
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
export async function claimCode(code: string, uid: string): Promise<AccessCode> {
  const data = await getCode(code);
  if (!data) {
    throw new CodeError('not-found', 'Mã không đúng. Kiểm tra lại giúp — mã do giám sát đọc cho.');
  }
  if (data.claimedUid && data.claimedUid !== uid) {
    throw new CodeError(
      'taken',
      'Mã này đã có người dùng. Nhờ giám sát bấm "Mở khoá" rồi gõ lại đúng mã cũ.'
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

  await set(ref(database, `codeSession/${uid}`), { code, slot: data.slot });
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
