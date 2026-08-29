/**
 * Tournament Service — so huu giai, trang thai mo/dong, danh sach theo chu.
 *
 * `tournament` GIU NGUYEN dang mang theo index. Dong giai o cap `setting.status`
 * chu khong xoa phan tu, nen index khong bao gio xe dich — tranh nguyen mot dot
 * refactor cham vao ca 8 container va toan bo bo e2e.
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

/** Doc mot lan toan bo danh sach giai (chi phan `setting`). */
export async function listTournaments(): Promise<TournamentSummary[]> {
  const snap = await get(child(ref(database), 'tournament'));
  const raw = snap.val();
  if (!raw) return [];

  const keys = Object.keys(raw)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  return keys.map((i) => toSummary(i, raw[i]?.setting));
}

export function subscribeTournaments(cb: (list: TournamentSummary[]) => void): () => void {
  const r = ref(database, 'tournament');
  onValue(r, (snap) => {
    const raw = snap.val();
    if (!raw) return cb([]);
    const keys = Object.keys(raw)
      .map(Number)
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    cb(keys.map((i) => toSummary(i, raw[i]?.setting)));
  });
  return () => off(r);
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
    if (check.val() === owner.uid) return index;
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
}

// ==================== Trang thai ====================

/** Mo giai: tu luc nay moi nhan don xin quyen giam sat. */
export async function openTournament(index: number): Promise<void> {
  await update(ref(database, `tournament/${index}/setting`), { status: 'open' });
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
  return revoked;
}

/** Mo lai giai da dong. Ma phai cap lai — so cu da tra ve kho. */
export async function reopenTournament(index: number): Promise<void> {
  await update(ref(database, `tournament/${index}/setting`), {
    status: 'open',
    closedAt: null,
  });
}

export async function setOpenAccess(index: number, value: boolean): Promise<void> {
  await set(ref(database, `tournament/${index}/setting/openAccess`), value);
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
}
