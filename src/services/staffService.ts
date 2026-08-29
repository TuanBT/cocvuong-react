/**
 * Staff Service — xin quyen giam sat, duyet, phan cong san, thu hoi.
 *
 * Vi sao nam NGOAI `tournament/`: trang thong tin cong khai can
 * `tournament/.read: true`, ma rules RTDB cascade — cha da `true` thi con
 * KHONG tat lai duoc. Danh sach nhan su chua ten va email that nen bat buoc
 * phai o nhanh rieng.
 */
import { ref, get, set, update, remove, child, onValue, off } from 'firebase/database';
import { database } from '../firebase';
import { ArenaKind, arenaKey, arenaName, kindName } from './accessCodeService';

/** Bon san co the phan cong: doi khang A/B, thi quyen A/B */
export const ARENA_KEYS = ['combat0', 'combat1', 'martial0', 'martial1'] as const;
export type ArenaAssignmentKey = typeof ARENA_KEYS[number];

export type Assignments = Partial<Record<ArenaAssignmentKey, boolean>>;

export interface StaffMember {
  uid: string;
  email: string;
  name: string;
  photo: string;
  assignments: Assignments;
  /** San vao lan gan nhat — de lan sau vao thang, nho theo TAI KHOAN */
  lastArena?: ArenaAssignmentKey;
  approvedAt?: number;
  approvedBy?: string;
}

export interface AccessRequest {
  uid: string;
  email: string;
  name: string;
  photo: string;
  note?: string;
  want: Assignments;
  createdAt: number;
  rejectedAt?: number;
}

/** Tick san TAT CA — chu giai bo tick de thu hep, khong muon nghi thi bam Dong y la xong */
export function allArenas(): Assignments {
  return { combat0: true, combat1: true, martial0: true, martial1: true };
}

export function parseArenaKey(key: string): { kind: ArenaKind; a: number } | null {
  const m = /^(combat|martial)([01])$/.exec(key);
  if (!m) return null;
  return { kind: m[1] as ArenaKind, a: Number(m[2]) };
}

export function arenaKeyLabel(key: string): string {
  const parsed = parseArenaKey(key);
  if (!parsed) return key;
  return `${kindName(parsed.kind)} · ${arenaName(parsed.a)}`;
}

export function assignedKeys(a: Assignments | undefined): ArenaAssignmentKey[] {
  if (!a) return [];
  return ARENA_KEYS.filter((k) => a[k] === true);
}

export function hasAssignment(a: Assignments | undefined, kind: ArenaKind, arena: number): boolean {
  return a?.[arenaKey(kind, arena) as ArenaAssignmentKey] === true;
}

// ==================== Don xin quyen ====================

/**
 * Nop don. Key la uid nen toi da MOT don / nguoi / giai — nguoi la khong spam
 * duoc. Bi tu choi roi thi rules chan nop lai (con `rejectedAt`).
 */
export async function requestAccess(
  t: number,
  user: { uid: string; email: string; name: string; photo: string },
  want: Assignments = allArenas(),
  note = ''
): Promise<void> {
  await set(ref(database, `tournamentRequest/${t}/${user.uid}`), {
    email: user.email,
    name: user.name,
    photo: user.photo,
    note,
    want,
    createdAt: Date.now(),
  });
}

export async function withdrawRequest(t: number, uid: string): Promise<void> {
  await remove(ref(database, `tournamentRequest/${t}/${uid}`));
}

/** Chu giai: don dang cho. Realtime — cham do + tieng chuong dua vao day. */
export function subscribeRequests(
  t: number,
  cb: (list: AccessRequest[]) => void,
  onError?: (err: Error) => void
): () => void {
  const r = ref(database, `tournamentRequest/${t}`);
  onValue(r, (snap) => {
    const raw = snap.val() || {};
    cb(
      Object.keys(raw).map((uid) => ({
        uid,
        email: raw[uid]?.email || '',
        name: raw[uid]?.name || '',
        photo: raw[uid]?.photo || '',
        note: raw[uid]?.note || '',
        want: raw[uid]?.want || {},
        createdAt: raw[uid]?.createdAt || 0,
        rejectedAt: raw[uid]?.rejectedAt,
      }))
    );
  }, (err) => {
    // Khong phai chu giai thi rules tu choi doc — bao ra ngoai chu dung de
    // Firebase in loi do ra console roi bang duyet don dung im
    cb([]);
    onError?.(err);
  });
  return () => off(r);
}

/** Chinh nguoi nop theo doi don cua minh — duyet cai la vao thang, khong phai tai trang. */
export function subscribeMyRequest(
  t: number,
  uid: string,
  cb: (req: AccessRequest | null) => void
): () => void {
  const r = ref(database, `tournamentRequest/${t}/${uid}`);
  onValue(
    r,
    (snap) => {
      const v = snap.val();
      cb(v ? { uid, ...v } : null);
    },
    () => cb(null)
  );
  return () => off(r);
}

// ==================== Duyet / thu hoi ====================

export async function approveRequest(
  t: number,
  req: AccessRequest,
  assignments: Assignments,
  approvedBy: string
): Promise<void> {
  await set(ref(database, `tournamentStaff/${t}/${req.uid}`), {
    email: req.email,
    name: req.name,
    photo: req.photo,
    assignments,
    approvedAt: Date.now(),
    approvedBy,
  });
  await remove(ref(database, `tournamentRequest/${t}/${req.uid}`));
}

/** Tu choi: giu lai don co dau `rejectedAt` de rules chan nop lai. */
export async function rejectRequest(t: number, uid: string): Promise<void> {
  await update(ref(database, `tournamentRequest/${t}/${uid}`), { rejectedAt: Date.now() });
}

/** Chu giai lo tu choi nham — xoa dau la nguoi kia nop lai duoc. */
export async function undoReject(t: number, uid: string): Promise<void> {
  await remove(ref(database, `tournamentRequest/${t}/${uid}/rejectedAt`));
}

export async function revokeStaff(t: number, uid: string): Promise<void> {
  await remove(ref(database, `tournamentStaff/${t}/${uid}`));
}

/** Thu hep phan cong giua giai, khong phai thu hoi roi duyet lai tu dau. */
export async function updateAssignments(
  t: number,
  uid: string,
  assignments: Assignments
): Promise<void> {
  await set(ref(database, `tournamentStaff/${t}/${uid}/assignments`), assignments);
}

export function subscribeStaff(
  t: number,
  cb: (list: StaffMember[]) => void,
  onError?: (err: Error) => void
): () => void {
  const r = ref(database, `tournamentStaff/${t}`);
  onValue(r, (snap) => {
    const raw = snap.val() || {};
    cb(
      Object.keys(raw).map((uid) => ({
        uid,
        email: raw[uid]?.email || '',
        name: raw[uid]?.name || '',
        photo: raw[uid]?.photo || '',
        assignments: raw[uid]?.assignments || {},
        lastArena: raw[uid]?.lastArena,
        approvedAt: raw[uid]?.approvedAt,
        approvedBy: raw[uid]?.approvedBy,
      }))
    );
  }, (err) => {
    cb([]);
    onError?.(err);
  });
  return () => off(r);
}

export async function getStaff(t: number, uid: string): Promise<StaffMember | null> {
  const snap = await get(child(ref(database), `tournamentStaff/${t}/${uid}`));
  const v = snap.val();
  return v ? { uid, ...v, assignments: v.assignments || {} } : null;
}

/**
 * Theo doi CHINH phan cong cua minh.
 *
 * Bat buoc: bi thu hoi giua giai ma khong biet thi giam sat cu bam vao hu
 * khong roi loi am tham. Mat nhanh nay la phai hien man "Quyen da bi thu hoi".
 */
export function subscribeMyAccess(
  t: number,
  uid: string,
  cb: (staff: StaffMember | null) => void
): () => void {
  const r = ref(database, `tournamentStaff/${t}/${uid}`);
  onValue(
    r,
    (snap) => {
      const v = snap.val();
      cb(v ? { uid, ...v, assignments: v.assignments || {} } : null);
    },
    () => cb(null)
  );
  return () => off(r);
}

/** Ghi san vao lan gan nhat -> lan sau vao thang, doi may van dung. */
export async function setLastArena(
  t: number,
  uid: string,
  key: ArenaAssignmentKey
): Promise<void> {
  await set(ref(database, `tournamentStaff/${t}/${uid}/lastArena`), key);
}
