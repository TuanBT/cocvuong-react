/**
 * Tournament Service — so huu giai, trang thai mo/dong, danh sach theo chu.
 *
 * KHOA GIAI LA CHUOI MO (`push` key), khong phai so thu tu.
 *
 * Truoc day `tournament` la mot MANG DAY DAC khoa 0..N. Cai gia phai tra:
 * xoa mot phan tu o giua la thung mot lo, ma `readTournamentIndex` coi moi lo
 * hong la "chi muc hong" — nen tu do tro di moi lan liet ke giai deu roi ve
 * duong doc ca cay. Vi the chi giai CUOI mang moi xoa han duoc, va soft-delete
 * sinh ra chi de giu mang lien mach. Voi nhieu tai khoan cung dung thi "giai
 * cuoi mang" hau nhu khong bao gio la giai cua minh.
 *
 * RTDB khong co mang that: `tournament/5` va `tournament/-Nx8ab` la cung mot
 * loai node. Nen KHONG PHAI MIGRATE gi ca — giai cu giu nguyen khoa "0".."N",
 * giai moi lay `push` key. Chi bo di cho nao GIA DINH khoa la so lien mach.
 *
 * Doi lai: mat phep kiem "chi muc co lien mach khong" — xem `readTournamentIndex`.
 */
import { ref, get, set, update, remove, child, push, onValue, off } from 'firebase/database';
import { database } from '../firebase';
import { DEFAULT_SETTING } from '../constants/settings';
import { revokeTournamentCodes } from './accessCodeService';
import type { TournamentId } from '../types';

// Dinh nghia nam o `src/types` chu khong o day: `accessCodeService` cung can
// no, ma file nay da import file kia roi — de o day la thanh vong tron.
export type { TournamentId };

export type TournamentStatus = 'draft' | 'open' | 'closed' | 'deleted';

export interface TournamentSummary {
  id: TournamentId;
  name: string;
  /** Rong = giai cu, chua co chu — ai cung ghi duoc (xem rules) */
  ownerUid: string;
  ownerEmail: string;
  status: TournamentStatus;
  /** Ai dang nhap cung giam sat duoc, bo buoc duyet. MAC DINH tat. */
  openAccess: boolean;
  /** Giai thu dung chung — an khoi trang cong khai va bang chon giai that */
  demo: boolean;
  createdAt?: number;
  closedAt?: number;
  /** Ngay giai dien ra, `YYYY-MM-DD`. Vang o giai cu — dung tu bia ra. */
  eventDate?: string;
}

/** Truong thieu phai hieu la giai cu / dang soan, khong phai da mo */
function readStatus(raw: any): TournamentStatus {
  return raw === 'open' || raw === 'closed' || raw === 'deleted' ? raw : 'draft';
}

export function toSummary(id: TournamentId, setting: any): TournamentSummary {
  return {
    id,
    name: setting?.tournamentName || 'Giải chưa đặt tên',
    ownerUid: setting?.ownerUid || '',
    ownerEmail: setting?.ownerEmail || '',
    status: readStatus(setting?.status),
    // `=== true` chu khong phai "khac false": truong khong ton tai la DONG
    openAccess: setting?.openAccess === true,
    demo: setting?.demo === true,
    createdAt: setting?.createdAt,
    closedAt: setting?.closedAt,
    eventDate: typeof setting?.eventDate === 'string' ? setting.eventDate : undefined,
  };
}

/**
 * Thu tu hien danh sach: cu truoc, moi sau — dung nhu thoi con danh so.
 *
 * Giai cu khong co `createdAt` nen deu ve 0; giua chung phai xep theo SO chu
 * khong theo chuoi, khong thi "10" nam ngay sau "1". Giai moi luon co
 * `createdAt` nen luon nam sau, dung thu tu tao.
 */
function idRank(id: TournamentId): number {
  const n = Number(id);
  return Number.isInteger(n) && n >= 0 ? n : Number.MAX_SAFE_INTEGER;
}

export function byCreated(a: TournamentSummary, b: TournamentSummary): number {
  return (a.createdAt || 0) - (b.createdAt || 0)
    || idRank(a.id) - idRank(b.id)
    || a.id.localeCompare(b.id);
}

// ==================== Chi muc giai ====================

/**
 * Ban sao **nhe** cua `setting`, mot dong cho moi giai.
 *
 * Vi sao phai co: `tournament` la mot cay NANG — moi giai keo theo ca lich thi
 * dau, danh sach VDV va tung diem thanh phan. RTDB doc theo duong dan la
 * all-or-nothing: khong co cach nao lay rieng `setting` cua moi con. Muon dung
 * mot danh sach ten giai thi phai tai ca cay vai MB — nhan len so nguoi vao
 * trang thong tin cong khai la thanh mot hoa don bang thong that su.
 *
 * Nguon su that VAN LA `tournament/{t}/setting`. Nhanh nay chi de liet ke, va
 * rules bat moi dong phai khop dung voi `setting` cua chinh giai do — ghi sai
 * la bi tu choi, nen ai dang nhap cung va duoc chi muc thieu.
 */
const INDEX_PATH = 'tournamentIndex';

/** Nhung truong duoc chep sang chi muc — dung ten cua `setting` de doc lai bang `toSummary` */
const INDEX_FIELDS = [
  'tournamentName', 'ownerUid', 'ownerEmail', 'status', 'openAccess', 'demo',
  'createdAt', 'closedAt', 'eventDate',
] as const;

/** Truong vang mat phai VANG HAN chu khong duoc thanh `null` — rules so khop tung o mot */
function indexEntry(setting: any): Record<string, unknown> | null {
  if (!setting) return null;
  const out: Record<string, unknown> = {};
  for (const f of INDEX_FIELDS) {
    if (setting[f] !== undefined && setting[f] !== null) out[f] = setting[f];
  }
  // `set` voi object rong la XOA node — mot giai khong co ten thi tha bo qua,
  // chi muc thieu mot dong thi danh sach tu quay ve duong doc ca cay
  return Object.keys(out).length ? out : null;
}

/** Doc ca cay `tournament` — duong CHAM, chi con dung lam duong lui */
async function readTournamentTree(): Promise<Record<string, any> | null> {
  const snap = await get(child(ref(database), 'tournament'));
  return snap.val();
}

/**
 * Khoa cua moi giai co that trong mot node.
 *
 * `snap.val()` co the tra ve MANG chu khong phai object khi khoa toan la so
 * lien mach — di tich cua thoi `tournament` con la mang. `Object.keys` chay
 * dung tren ca hai, chi con phai loc o rong (mang thua tra `null`).
 */
function idsOf(raw: Record<string, any> | null): TournamentId[] {
  if (!raw) return [];
  return Object.keys(raw).filter((k) => raw[k] != null);
}

function summariesFromTree(raw: Record<string, any> | null): TournamentSummary[] {
  return idsOf(raw)
    .map((id) => toSummary(id, raw![id]?.setting))
    .sort(byCreated);
}

/**
 * Doc chi muc, hoac `null` neu chua co gi de doc.
 *
 * **Khong con phep kiem tinh dung dan nao o day.** Ban cu kiem "chi muc co
 * lien mach 0..K khong" — phep kiem do chi chay duoc khi khoa la so, va chinh
 * no la thu khoa viec xoa giai o giua: mot lo hong hop le (do xoa) khong phan
 * biet duoc voi mot dong bi thieu (do ghi hong).
 *
 * Thay bang mot bat bien o **duong ghi**: moi cho doi `setting` deu goi
 * `syncTournamentIndex`, moi cho xoa deu goi `dropTournamentIndex`. Khi nao
 * nghi chi muc lech thi co `rebuildTournamentIndex()` — nut "Dựng lại chỉ mục"
 * o trang quan tri.
 *
 * Cai mat di la that: mot dong thieu se thieu im lang cho toi luc co nguoi
 * dung lai. Doi lai la xoa duoc bat ky giai nao.
 */
async function readTournamentIndex(): Promise<TournamentSummary[] | null> {
  const snap = await get(child(ref(database), INDEX_PATH));
  const raw = snap.val() as Record<string, any> | null;
  const ids = idsOf(raw);
  if (!ids.length) return null;

  return ids.map((id) => toSummary(id, raw![id])).sort(byCreated);
}

/**
 * Chep ca cay sang chi muc. Nuot loi tung dong — va duoc bao nhieu hay bay nhieu.
 */
async function writeIndexFromTree(raw: Record<string, any> | null): Promise<number> {
  if (!raw) return 0;
  const ids = idsOf(raw);

  const payload: Record<string, unknown> = {};
  for (const id of ids) {
    const entry = indexEntry(raw[id]?.setting);
    if (entry) payload[id] = entry;
  }

  // Xac cua giai da xoa han: de lai thi giai khong con ton tai van nam trong
  // danh sach cong khai mai, va khong co phep kiem nao bat duoc nua
  const stale = await get(child(ref(database), INDEX_PATH));
  const live = new Set(ids);
  for (const key of Object.keys(stale.val() || {})) {
    if (!live.has(key)) payload[key] = null;
  }

  const written = Object.values(payload).filter((v) => v !== null).length;
  try {
    // Mot lan di ve cho ca chi muc thay vi mot lan moi giai
    await update(ref(database, INDEX_PATH), payload);
    return written;
  } catch {
    /* mot dong hong khong duoc phep keo ca chi muc xuong — ghi lai tung dong */
  }

  let n = 0;
  for (const [key, value] of Object.entries(payload)) {
    try {
      if (value === null) {
        await remove(ref(database, `${INDEX_PATH}/${key}`));
      } else {
        await set(ref(database, `${INDEX_PATH}/${key}`), value);
        n++;
      }
    } catch {
      /* dong nay khong ghi duoc thi thoi, chi muc thieu la quay ve duong cham */
    }
  }
  return n;
}

/**
 * Dung lai chi muc tu nguon su that. Tra ve so dong ghi duoc.
 *
 * Day la thu THAY CHO phep kiem lien mach da bo: khi chi muc lech (mot dong
 * ghi hong, hoac giai tao boi ban app cu) thi bam mot cai la khop lai. Doc ca
 * cay `tournament` nen CHAM — chi de sau mot nut o trang quan tri, khong goi
 * trong duong thuong.
 */
export async function rebuildTournamentIndex(): Promise<number> {
  return writeIndexFromTree(await readTournamentTree());
}

/**
 * Cap nhat mot dong chi muc. Goi sau MOI lan doi `setting`.
 *
 * Nuot loi that: chi muc lech chi lam danh sach thieu mot dong, va co nut dung
 * lai. Khong duoc phep vi the ma lam hong thao tac chinh.
 */
export async function syncTournamentIndex(id: TournamentId, known?: any): Promise<void> {
  try {
    // Nguoi goi vua ghi `setting` thi dua thang no vao day — doc lai chinh thu
    // minh vua dat xuong la mot vong di-ve khong doi lay gi.
    const setting = known ?? (await get(child(ref(database), `tournament/${id}/setting`))).val();
    const entry = indexEntry(setting);
    if (entry) await set(ref(database, `${INDEX_PATH}/${id}`), entry);
  } catch {
    /* chi muc lech thi co nut "Dung lai chi muc" o trang quan tri */
  }
}

/** Xoa mot dong chi muc — goi khi xoa han mot giai */
export async function dropTournamentIndex(id: TournamentId): Promise<void> {
  try {
    await remove(ref(database, `${INDEX_PATH}/${id}`));
  } catch {
    /* nhu tren */
  }
}

/**
 * Danh sach giai cho cac trang **da dang nhap**.
 */
export async function listTournaments(): Promise<TournamentSummary[]> {
  return (await listAllTournaments()).filter((t) => !isDeleted(t));
}

/**
 * Nhu tren nhung GIU CA giai da xoa mem — chi trang quan tri dung.
 *
 * Tach ra thanh mot ham rieng chu khong them tham so `includeDeleted`: moi cho
 * goi `listTournaments` deu la cho khong duoc thay giai da xoa, va mot tham so
 * mac dinh `false` la thu de quen bat.
 */
export async function listAllTournaments(): Promise<TournamentSummary[]> {
  const indexed = await readTournamentIndex();
  if (indexed) return indexed;

  // Chi muc TRONG — he thong moi tinh, hoac chua ai dung chi muc bao gio.
  // Nguoi o day deu da dang nhap nen ghi duoc: va luon de lan sau khong phai
  // doc ca cay nua.
  const raw = await readTournamentTree();
  void writeIndexFromTree(raw).catch(() => undefined);
  return summariesFromTree(raw);
}

/**
 * Danh sach giai cho **trang cong khai** — moi nhat truoc, bo ban cham nhanh.
 *
 * Moi tai khoan mot ban cham nhanh, ma ban nao cung mang dung mot cai ten:
 * de vao day thi khan gia thay mot day "CHẤM NHANH" giong het nhau, khong biet
 * bam cai nao. Man cham nhanh von de chieu thang len man hinh, khong di qua
 * trang tra cuu nay.
 *
 * Nguoi xem khong dang nhap nen khong va duoc chi muc; chi muc chua dung thi
 * ho van xem duoc, chi la cham nhu truoc.
 */
export async function listPublicTournaments(): Promise<TournamentSummary[]> {
  const indexed = await readTournamentIndex();
  const list = indexed || summariesFromTree(await readTournamentTree());
  return list
    .filter((t) => !t.demo && !isDeleted(t))
    .sort((a, b) => byCreated(b, a));
}

export async function getTournamentSummary(id: TournamentId): Promise<TournamentSummary | null> {
  const snap = await get(child(ref(database), `tournament/${id}/setting`));
  if (!snap.exists()) return null;
  return toSummary(id, snap.val());
}

export function subscribeTournamentSummary(
  id: TournamentId,
  cb: (t: TournamentSummary | null) => void
): () => void {
  const r = ref(database, `tournament/${id}/setting`);
  onValue(r, (snap) => cb(snap.exists() ? toSummary(id, snap.val()) : null));
  return () => off(r);
}

/**
 * Nghe song danh sach giai do `uid` lam chu.
 *
 * Doc tu chi muc chu khong tu cay that — day la duong chay lien tuc suot phien
 * (chuong bao don o thanh tieu de), khong duoc phep keo vai MB moi lan co ai
 * do doi mot chu trong ten giai.
 *
 * Giai da dong VAN TINH: don ve muon, chu giai mo lai giai roi duyet, la
 * chuyen binh thuong giua dot. Chi giai da xoa mem la bien han.
 *
 * Huy dang ky dung ham `onValue` tra ve chu khong dung `off(ref)`: nhanh
 * `tournamentIndex` co the co nhieu cho cung nghe, ma `off(ref)` go SACH moi
 * tai nghe tren duong dan do.
 */
export function subscribeOwnedTournaments(
  uid: string,
  cb: (list: TournamentSummary[]) => void
): () => void {
  return onValue(
    ref(database, INDEX_PATH),
    (snap) => {
      const raw = snap.val() as Record<string, any> | null;
      cb(
        idsOf(raw)
          .map((id) => toSummary(id, raw![id]))
          .filter((t) => t.ownerUid === uid && !isDeleted(t))
          .sort(byCreated)
      );
    },
    () => cb([])
  );
}

/** Giai toi duoc phep dung: cua chinh minh, hoac giai cu chua co chu. */
export function ownedBy(t: TournamentSummary, uid: string): boolean {
  return t.ownerUid === uid;
}

export function isLegacy(t: TournamentSummary): boolean {
  return !t.ownerUid;
}

/**
 * Giai da xoa mem — bien khoi moi danh sach nhung con nguyen trong DB.
 *
 * Xem `deleteTournament` de biet khi nao dung cai nao.
 */
export function isDeleted(t: TournamentSummary): boolean {
  return t.status === 'deleted';
}

/**
 * Thu tu hien danh sach: ban cham nhanh luon dung dau.
 *
 * No la giai mac dinh — ai chua kip dung giai thi vao thang do — nen phai o
 * cho de thay nhat, chu khong nam cuoi danh sach theo ngay tao.
 */
export function demoFirst(a: TournamentSummary, b: TournamentSummary): number {
  return Number(b.demo) - Number(a.demo);
}

// ==================== Tao giai ====================

/**
 * Them giai moi, dong dau chu so huu.
 *
 * `push` sinh khoa tai CLIENT tu thoi diem + so ngau nhien, nen hai chu giai
 * bam cung luc van ra hai khoa khac nhau. Ban cu doc `length` roi ghi thang,
 * dung do phai co ca mot vong thu 10 lan index ke tiep — vong do bo han.
 *
 * `name` di vao CUNG mot luot ghi voi phan con lai chu khong doi mot lan
 * `renameTournament` sau do: tach lam hai thi giai vua sinh ra mang ten mac
 * dinh "Cóc Vương" trong mot khoanh khac, va neu luot doi ten hong giua chung
 * thi no mang cai ten do vinh vien. Bo trong thi lay ten mac dinh.
 */
export async function addTournament(
  owner: { uid: string; email: string },
  name?: string,
  eventDate?: string
): Promise<TournamentId> {
  const id = push(child(ref(database), 'tournament')).key;
  if (!id) throw new Error('Không tạo được giải mới — thử lại sau ít giây.');

  const base = JSON.parse(JSON.stringify(DEFAULT_SETTING)).setting;
  const setting: Record<string, unknown> = {
    ...base,
    tournamentName: name?.trim() || base.tournamentName,
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    status: 'draft' as TournamentStatus,
    openAccess: false,
    createdAt: Date.now(),
  };
  // Bo trong thi KHONG ghi khoa nay: `undefined` bi Firebase tu choi, con
  // chuoi rong lai la mot "ngay" khong doc duoc, hien ra thanh o trong lo lung.
  if (eventDate) setting.eventDate = eventDate;
  await update(ref(database, `tournament/${id}/setting`), setting);

  // Hai luot NOI TIEP, khong gop duoc: `.validate` cua chi muc so tung o voi
  // `root.child('tournament/$t/setting/...')`, ma `root` la trang thai TRUOC
  // luot ghi — gop chung mot `update` la chi muc bi tu choi vi setting chua co.
  await syncTournamentIndex(id, setting);
  return id;
}

/** Nhan mot giai cu (chua co chu) ve tai khoan minh. */
export async function claimTournament(
  id: TournamentId,
  owner: { uid: string; email: string }
): Promise<void> {
  const current = await get(child(ref(database), `tournament/${id}/setting/ownerUid`));
  if (current.exists() && current.val()) {
    throw new Error('Giải này đã có chủ — không nhận về được.');
  }
  await update(ref(database, `tournament/${id}/setting`), {
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    status: 'open',
  });
  await syncTournamentIndex(id);
}

// ==================== Trang thai ====================

/** Mo giai: tu luc nay moi nhan don xin quyen giam sat. */
export async function openTournament(id: TournamentId): Promise<void> {
  await update(ref(database, `tournament/${id}/setting`), { status: 'open' });
  await syncTournamentIndex(id);
}

/**
 * Dong giai: an khoi bang chon **va thu hoi toan bo ma** cua giai.
 *
 * Thu hoi ma khong phai chuyen don dep — kho ma 2 so dung chung ca he thong
 * co tran, giai khong dong la ma nam giu cho mai.
 */
export async function closeTournament(id: TournamentId): Promise<number> {
  const revoked = await revokeTournamentCodes(id);

  // Don don xin quyen: giai dong roi thi don dang cho khong con nghia gi, ma
  // dau `rejectedAt` con lai se chan nguoi ta nop lai neu sau nay mo lai giai.
  // Danh sach "Dang truc" thi GIU — sau giai con phai tra ai truc san nao khi
  // co khieu nai diem.
  await remove(ref(database, `tournamentRequest/${id}`)).catch(() => undefined);

  await update(ref(database, `tournament/${id}/setting`), {
    status: 'closed',
    closedAt: Date.now(),
  });
  await syncTournamentIndex(id);
  return revoked;
}

/** Mo lai giai da dong. Ma phai cap lai — so cu da tra ve kho. */
export async function reopenTournament(id: TournamentId): Promise<void> {
  await update(ref(database, `tournament/${id}/setting`), {
    status: 'open',
    closedAt: null,
  });
  await syncTournamentIndex(id);
}

export async function setOpenAccess(id: TournamentId, value: boolean): Promise<void> {
  await set(ref(database, `tournament/${id}/setting/openAccess`), value);
  await syncTournamentIndex(id);
}

/** Doi chu giai — cuu khi chu giai nghi, mat tai khoan, hoac tao nham tai khoan. */
export async function transferOwnership(
  id: TournamentId,
  owner: { uid: string; email: string }
): Promise<void> {
  await update(ref(database, `tournament/${id}/setting`), {
    ownerUid: owner.uid,
    ownerEmail: owner.email,
  });
  await syncTournamentIndex(id);
}

// ==================== Xoa giai ====================

/**
 * Xoa MEM: giai bien khoi moi danh sach, du lieu con nguyen trong DB.
 *
 * Truoc day day la duong xoa DUY NHAT cho gan het moi giai, vi xoa han doi hoi
 * giai phai nam cuoi mang. Gio khoa la chuoi mo nen `purgeTournament` chay
 * duoc voi bat ky giai nao; xoa mem tro lai dung vai tro cua no: **cai thung
 * rac** — cat giai di nhung con lay lai duoc bang `restoreTournament`.
 *
 * Thu hoi ma la BAT BUOC chu khong phai don dep: 2 so cua giai lay tu mot kho
 * dung chung ca he thong, giai da xoa ma con giu so thi so do chet luon.
 *
 * Don xin quyen bi xoa han. Danh sach nhan su thi GIU — sau nay co khieu nai
 * diem van phai tra duoc ai truc san nao, va khoi phuc giai la ho vao lai
 * duoc ngay.
 */
export async function deleteTournament(id: TournamentId): Promise<number> {
  const revoked = await revokeTournamentCodes(id).catch(() => 0);
  await remove(ref(database, `tournamentRequest/${id}`)).catch(() => undefined);

  await update(ref(database, `tournament/${id}/setting`), {
    status: 'deleted' as TournamentStatus,
    deletedAt: Date.now(),
  });
  await syncTournamentIndex(id);
  return revoked;
}

/**
 * Khoi phuc giai da xoa mem — ve trang thai DONG chu khong phai dang mo.
 *
 * Ma da bi thu hoi luc xoa nen mo thang la giam dinh go so cu vao chi thay
 * "khong co ma nay". Ve 'closed' thi nguoi khoi phuc buoc phai bam "Mo lai" —
 * duong do da co san buoc cap lai ma.
 */
export async function restoreTournament(id: TournamentId): Promise<void> {
  await update(ref(database, `tournament/${id}/setting`), {
    status: 'closed' as TournamentStatus,
    deletedAt: null,
  });
  await syncTournamentIndex(id);
}

/**
 * Giai nay xoa han duoc khong.
 *
 * Khong con dieu kien "phai la giai cuoi" — khoa la chuoi mo nen xoa o giua
 * khong lam hong gi. Con lai dung hai dieu kien, va ca hai deu la CHINH SACH:
 *
 *   · **Ban cham nhanh khong xoa** — no tu dung lai o lan vao sau, nen mot nut
 *     xoa o day chi la cai bay: bam nham thi mat bo ma dang doc do cho giam
 *     dinh, doi lai khong duoc gi.
 *   · **Phai la giai cua minh**, hoac giai cu chua co chu (rules cung cho ghi
 *     dung hai truong hop nay). Admin thi rules cho tat — cho goi tu quyet
 *     dinh co nới thêm hay khong.
 */
export function canPurge(t: TournamentSummary | null | undefined, uid: string): boolean {
  if (!t || t.demo) return false;
  return ownedBy(t, uid) || isLegacy(t);
}

/**
 * Go nhung ban ghi "dang truc" cua mot giai da bien mat.
 *
 * `presence` khong co `onDisconnect` nao chay khi giai bi xoa duoi chan nguoi
 * ta, nen khong don thi bang "Dang truc" o trang quan tri con hien ten may cua
 * mot giai khong con ton tai. Truoc day hiem khi thay vi xoa han gan nhu khong
 * bao gio chay duoc; mo xoa tu do thi no tich lai.
 *
 * Hai doi ban ghi cung ton tai: ban moi khoa theo `slot` (`{t}:{mon}:gd:{a}:{r}`),
 * ban cu giu `tournament` thanh mot truong rieng.
 */
async function clearTournamentPresence(id: TournamentId): Promise<void> {
  try {
    const snap = await get(child(ref(database), 'presence/giam_dinh'));
    const raw = snap.val() as Record<string, any> | null;
    if (!raw) return;

    await Promise.all(
      Object.keys(raw)
        .filter((key) => {
          const v = raw[key];
          if (typeof v?.slot === 'string' && v.slot.startsWith(`${id}:`)) return true;
          return v?.tournament !== undefined && String(v.tournament) === id;
        })
        .map((key) => remove(ref(database, `presence/giam_dinh/${key}`)).catch(() => undefined))
    );
  } catch {
    /* khong don duoc thi bang "Dang truc" thua vai dong — khong sai diem */
  }
}

/**
 * Xoa HAN mot giai: mat toan bo VDV, lich thi dau va diem so.
 *
 * Chay duoc voi BAT KY giai nao, khong con phu thuoc vi tri. Nguoi goi phai tu
 * kiem `canPurge` truoc — ham nay khong doc lai danh sach de kiem ho, vi cho
 * goi da cam san dong tom tat do trong tay.
 *
 * `codeSession` cua giam dinh dang cam ma thi KHONG don duoc tu day (rules chi
 * cho chinh ho ghi). Khong sao: ma da bi thu hoi ngay dong dau nen moi lenh
 * ghi cua ho bi tu choi, va ho phai go ma moi.
 */
export async function purgeTournament(id: TournamentId): Promise<void> {
  await revokeTournamentCodes(id).catch(() => undefined);
  await remove(ref(database, `tournamentRequest/${id}`)).catch(() => undefined);
  await remove(ref(database, `tournamentStaff/${id}`)).catch(() => undefined);
  await clearTournamentPresence(id);
  await remove(ref(database, `tournament/${id}`));
  await dropTournamentIndex(id);
}

/** Doi ten giai — chi muc phai chay theo, khong thi danh sach cong khai ten cu. */
export async function renameTournament(id: TournamentId, name: string): Promise<void> {
  await set(ref(database, `tournament/${id}/setting/tournamentName`), name);
  await syncTournamentIndex(id);
}
