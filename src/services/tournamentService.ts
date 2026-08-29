/**
 * Tournament Service — so huu giai, trang thai mo/dong, danh sach theo chu.
 *
 * `tournament` GIU NGUYEN dang mang theo index. Dong giai o cap `setting.status`
 * chu khong xoa phan tu, nen index khong bao gio xe dich — tranh nguyen mot dot
 * refactor cham vao ca 8 container va toan bo bo e2e.
 *
 * Danh sach giai KHONG doc tu `tournament` nua — xem phan "Chi muc giai".
 */
import { ref, get, set, update, remove, child, onValue, off } from 'firebase/database';
import { database } from '../firebase';
import { DEFAULT_SETTING } from '../constants/settings';
import { revokeTournamentCodes } from './accessCodeService';

export type TournamentStatus = 'draft' | 'open' | 'closed';

export interface TournamentSummary {
  index: number;
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
}

/** Truong thieu phai hieu la giai cu / dang soan, khong phai da mo */
function readStatus(raw: any): TournamentStatus {
  return raw === 'open' || raw === 'closed' ? raw : 'draft';
}

export function toSummary(index: number, setting: any): TournamentSummary {
  return {
    index,
    name: setting?.tournamentName || `Giải ${index + 1}`,
    ownerUid: setting?.ownerUid || '',
    ownerEmail: setting?.ownerEmail || '',
    status: readStatus(setting?.status),
    // `=== true` chu khong phai "khac false": truong khong ton tai la DONG
    openAccess: setting?.openAccess === true,
    demo: setting?.demo === true,
    createdAt: setting?.createdAt,
    closedAt: setting?.closedAt,
  };
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
  'createdAt', 'closedAt',
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

function summariesFromTree(raw: Record<string, any> | null): TournamentSummary[] {
  if (!raw) return [];
  return Object.keys(raw)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
    .map((i) => toSummary(i, raw[i]?.setting));
}

/**
 * Doc chi muc, hoac `null` neu no khong dang tin.
 *
 * "Dang tin" doi hoi ba dieu — thieu mot la ca danh sach sai chu khong phai
 * chi sai mot dong, nen tha quay ve doc ca cay:
 *   1. khong lo hong: `tournament` la mang lien tuc nen chi muc cung phai 0..K
 *   2. giai cuoi cung con that (khong phai xac cua mot giai da xoa)
 *   3. khong con giai nao nam sau K — tuc chi muc da bat kip giai moi nhat
 * Hai phep kiem cuoi doc `setting` cua dung hai giai, moi cai vai tram byte.
 */
async function readTournamentIndex(): Promise<TournamentSummary[] | null> {
  const snap = await get(child(ref(database), INDEX_PATH));
  const raw = snap.val() as Record<string, any> | null;
  if (!raw) return null;

  const list = Object.keys(raw)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
    .map((i) => toSummary(i, raw[i]));

  if (!list.length || list.some((t, i) => t.index !== i)) return null;

  const [last, next] = await Promise.all([
    get(child(ref(database), `tournament/${list.length - 1}/setting`)),
    get(child(ref(database), `tournament/${list.length}/setting`)),
  ]);
  if (!last.exists() || next.exists()) return null;

  return list;
}

/**
 * Chep ca cay sang chi muc. Nuot loi tung dong — va duoc bao nhieu hay bay nhieu.
 */
async function writeIndexFromTree(raw: Record<string, any> | null): Promise<number> {
  if (!raw) return 0;
  const keys = Object.keys(raw).map(Number).filter((n) => !Number.isNaN(n));

  const payload: Record<string, unknown> = {};
  for (const i of keys) {
    const entry = indexEntry(raw[i]?.setting);
    if (entry) payload[String(i)] = entry;
  }

  // Xac cua giai da xoa: de lai thi chi muc van "lien tuc" nen khong phep kiem
  // nao bat duoc, va giai da xoa cu nam trong danh sach cong khai mai
  const stale = await get(child(ref(database), INDEX_PATH));
  for (const key of Object.keys(stale.val() || {})) {
    if (!keys.includes(Number(key))) payload[key] = null;
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
 * Cap nhat mot dong chi muc. Goi sau MOI lan doi `setting`.
 *
 * Nuot loi that: chi muc lech chi lam danh sach quay ve duong doc ca cay —
 * cham, khong sai. Khong duoc phep vi the ma lam hong thao tac chinh.
 */
export async function syncTournamentIndex(index: number): Promise<void> {
  try {
    const snap = await get(child(ref(database), `tournament/${index}/setting`));
    const entry = indexEntry(snap.val());
    if (entry) await set(ref(database, `${INDEX_PATH}/${index}`), entry);
  } catch {
    /* chi muc lech thi danh sach tu quay ve duong cham */
  }
}

/** Xoa mot dong chi muc — goi khi xoa han mot giai */
export async function dropTournamentIndex(index: number): Promise<void> {
  try {
    await remove(ref(database, `${INDEX_PATH}/${index}`));
  } catch {
    /* nhu tren */
  }
}

/**
 * Danh sach giai cho cac trang **da dang nhap**.
 *
 * Chi muc hong thi vua doc ca cay vua va lai luon: nguoi o day deu da dang
 * nhap nen ghi duoc, va lan sau nguoi ngoai vao trang cong khai khong phai
 * doc ca cay nua. Khong co buoc "chay migration" nao ca.
 */
export async function listTournaments(): Promise<TournamentSummary[]> {
  const indexed = await readTournamentIndex();
  if (indexed) return indexed;

  const raw = await readTournamentTree();
  void writeIndexFromTree(raw).catch(() => undefined);
  return summariesFromTree(raw);
}

/**
 * Danh sach giai cho **trang cong khai** — moi nhat truoc, bo giai thu.
 *
 * Nguoi xem khong dang nhap nen khong va duoc chi muc; chi muc chua dung thi
 * ho van xem duoc, chi la cham nhu truoc.
 */
export async function listPublicTournaments(): Promise<TournamentSummary[]> {
  const indexed = await readTournamentIndex();
  const list = indexed || summariesFromTree(await readTournamentTree());
  return list
    .filter((t) => !t.demo)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || b.index - a.index);
}

export async function getTournamentSummary(index: number): Promise<TournamentSummary | null> {
  const snap = await get(child(ref(database), `tournament/${index}/setting`));
  if (!snap.exists()) return null;
  return toSummary(index, snap.val());
}

export function subscribeTournamentSummary(
  index: number,
  cb: (t: TournamentSummary | null) => void
): () => void {
  const r = ref(database, `tournament/${index}/setting`);
  onValue(r, (snap) => cb(snap.exists() ? toSummary(index, snap.val()) : null));
  return () => off(r);
}

/** Giai toi duoc phep dung: cua chinh minh, hoac giai cu chua co chu. */
export function ownedBy(t: TournamentSummary, uid: string): boolean {
  return t.ownerUid === uid;
}

export function isLegacy(t: TournamentSummary): boolean {
  return !t.ownerUid;
}

/** Giai hien trong bang chon: bo giai da dong va giai thu. */
export function isSelectable(t: TournamentSummary): boolean {
  return t.status !== 'closed' && !t.demo;
}

// ==================== Tao giai ====================

const MAX_INDEX_ATTEMPTS = 10;

/**
 * Them giai moi vao cuoi mang, dong dau chu so huu.
 *
 * Ban cu doc `length` roi ghi thang: hai chu giai bam cung luc thi ra cung
 * mot index, nguoi sau de len nguoi truoc. Voi rules moi nguoi sau bi TU CHOI
 * — an toan hon nhung dung im. Nen o day thu index ke tiep cho toi khi lot.
 */
export async function addTournament(owner: { uid: string; email: string }): Promise<number> {
  const snap = await get(child(ref(database), 'tournament'));
  const raw = snap.val();
  const keys = raw
    ? Object.keys(raw).map(Number).filter((n) => !Number.isNaN(n))
    : [];
  let index = keys.length ? Math.max(...keys) + 1 : 0;

  const base = JSON.parse(JSON.stringify(DEFAULT_SETTING)).setting;

  for (let attempt = 0; attempt < MAX_INDEX_ATTEMPTS; attempt++) {
    const occupied = await get(child(ref(database), `tournament/${index}`));
    if (occupied.exists()) {
      index++;
      continue;
    }

    const setting = {
      ...base,
      ownerUid: owner.uid,
      ownerEmail: owner.email,
      status: 'draft' as TournamentStatus,
      openAccess: false,
      createdAt: Date.now(),
    };

    try {
      await update(ref(database, `tournament/${index}/setting`), setting);
    } catch {
      index++;
      continue;
    }

    // Nguoi khac co the vua ghi de dung luc do — doc lai de chac la cua minh
    const check = await get(child(ref(database), `tournament/${index}/setting/ownerUid`));
    if (check.val() === owner.uid) {
      await syncTournamentIndex(index);
      return index;
    }
    index++;
  }

  throw new Error('Không tạo được giải mới — thử lại sau ít giây.');
}

/** Nhan mot giai cu (chua co chu) ve tai khoan minh. */
export async function claimTournament(
  index: number,
  owner: { uid: string; email: string }
): Promise<void> {
  const current = await get(child(ref(database), `tournament/${index}/setting/ownerUid`));
  if (current.exists() && current.val()) {
    throw new Error('Giải này đã có chủ — không nhận về được.');
  }
  await update(ref(database, `tournament/${index}/setting`), {
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    status: 'open',
  });
  await syncTournamentIndex(index);
}

// ==================== Trang thai ====================

/** Mo giai: tu luc nay moi nhan don xin quyen giam sat. */
export async function openTournament(index: number): Promise<void> {
  await update(ref(database, `tournament/${index}/setting`), { status: 'open' });
  await syncTournamentIndex(index);
}

/**
 * Dong giai: an khoi bang chon **va thu hoi toan bo ma** cua giai.
 *
 * Thu hoi ma khong phai chuyen don dep — kho ma 2 so dung chung ca he thong
 * co tran, giai khong dong la ma nam giu cho mai.
 */
export async function closeTournament(index: number): Promise<number> {
  const revoked = await revokeTournamentCodes(index);

  // Don don xin quyen: giai dong roi thi don dang cho khong con nghia gi, ma
  // dau `rejectedAt` con lai se chan nguoi ta nop lai neu sau nay mo lai giai.
  // Danh sach "Dang truc" thi GIU — sau giai con phai tra ai truc san nao khi
  // co khieu nai diem.
  await remove(ref(database, `tournamentRequest/${index}`)).catch(() => undefined);

  await update(ref(database, `tournament/${index}/setting`), {
    status: 'closed',
    closedAt: Date.now(),
  });
  await syncTournamentIndex(index);
  return revoked;
}

/** Mo lai giai da dong. Ma phai cap lai — so cu da tra ve kho. */
export async function reopenTournament(index: number): Promise<void> {
  await update(ref(database, `tournament/${index}/setting`), {
    status: 'open',
    closedAt: null,
  });
  await syncTournamentIndex(index);
}

export async function setOpenAccess(index: number, value: boolean): Promise<void> {
  await set(ref(database, `tournament/${index}/setting/openAccess`), value);
  await syncTournamentIndex(index);
}

/** Doi chu giai — cuu khi chu giai nghi, mat tai khoan, hoac tao nham tai khoan. */
export async function transferOwnership(
  index: number,
  owner: { uid: string; email: string }
): Promise<void> {
  await update(ref(database, `tournament/${index}/setting`), {
    ownerUid: owner.uid,
    ownerEmail: owner.email,
  });
  await syncTournamentIndex(index);
}
