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
import type { TournamentId } from '../types';
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
  /** Moc thoi gian nop don (`Date.now()`) — de xep don moi len truoc */
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
  t: TournamentId,
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

export async function withdrawRequest(t: TournamentId, uid: string): Promise<void> {
  await remove(ref(database, `tournamentRequest/${t}/${uid}`));
}

/** Chu giai: don dang cho. Realtime — cham do tren chuong o thanh tieu de doc tu day. */
export function subscribeRequests(
  t: TournamentId,
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
  t: TournamentId,
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
  t: TournamentId,
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
export async function rejectRequest(t: TournamentId, uid: string): Promise<void> {
  await update(ref(database, `tournamentRequest/${t}/${uid}`), { rejectedAt: Date.now() });
}

/** Chu giai lo tu choi nham — xoa dau la nguoi kia nop lai duoc. */
export async function undoReject(t: TournamentId, uid: string): Promise<void> {
  await remove(ref(database, `tournamentRequest/${t}/${uid}/rejectedAt`));
}

export async function revokeStaff(t: TournamentId, uid: string): Promise<void> {
  await remove(ref(database, `tournamentStaff/${t}/${uid}`));
}

/** Thu hep phan cong giua giai, khong phai thu hoi roi duyet lai tu dau. */
export async function updateAssignments(
  t: TournamentId,
  uid: string,
  assignments: Assignments
): Promise<void> {
  await set(ref(database, `tournamentStaff/${t}/${uid}/assignments`), assignments);
}

/**
 * Chi dinh THANG mot nguoi vao truc san, khong qua buoc nop don.
 *
 * Duong nay danh cho chu giai / admin dang dung ngay tai san: nguoi kia chua
 * kip mo app de nop don ma tran thi sap bat dau. Ghi vao dung cai node ma
 * `approveRequest` ghi, nen may cua ho tu vao thang, khong phai tai lai trang.
 *
 * Don cu (ke ca don da bi tu choi) bi don luon: de lai thi bang duyet hien mot
 * nguoi o ca hai muc, va dau `rejectedAt` con lai se chan ho nop lai sau nay.
 */
export async function grantStaff(
  t: TournamentId,
  person: { uid: string; email: string; name: string; photo?: string },
  assignments: Assignments,
  approvedBy: string
): Promise<void> {
  await set(ref(database, `tournamentStaff/${t}/${person.uid}`), {
    email: person.email,
    name: person.name,
    photo: person.photo || '',
    assignments,
    approvedAt: Date.now(),
    approvedBy,
  });
  await remove(ref(database, `tournamentRequest/${t}/${person.uid}`)).catch(() => undefined);
}

/**
 * Thay nguoi trong san: nguoi moi nhan DUNG nhung san nguoi cu dang giu.
 *
 * Cap quyen cho nguoi moi TRUOC roi moi go nguoi cu. Lam nguoc lai thi giua
 * hai lenh co mot khoang khong ai giu san — dung luc do giam sat bam la ghi
 * hong. Trung nhau vai giay thi khong sao: hai nguoi cung san chi la canh bao
 * quen thuoc cua app.
 *
 * San cua nguoi moi (neu ho da truc san khac roi) duoc GIU LAI chu khong bi
 * de len: goi ham nay la de them viec cho ho, khong phai de chuyen viec.
 */
export async function replaceStaff(
  t: TournamentId,
  outgoing: StaffMember,
  incoming: { uid: string; email: string; name: string; photo?: string },
  approvedBy: string
): Promise<Assignments> {
  if (incoming.uid === outgoing.uid) return outgoing.assignments || {};

  const existing = await getStaff(t, incoming.uid).catch(() => null);
  const merged: Assignments = { ...(existing?.assignments || {}) };
  for (const key of assignedKeys(outgoing.assignments)) merged[key] = true;

  await grantStaff(t, incoming, merged, approvedBy);
  await revokeStaff(t, outgoing.uid);
  return merged;
}

export function subscribeStaff(
  t: TournamentId,
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

export async function getStaff(t: TournamentId, uid: string): Promise<StaffMember | null> {
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
  t: TournamentId,
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

/**
 * Trang thai quyen cua CHINH minh tren mot giai.
 *
 * `granted` mang theo ca `staff` de nguoi goi khoi phai doc lai phan cong.
 */
export type AccessState =
  | { kind: 'none' }                       // chua nop don, hoac vua bi thu hoi
  | { kind: 'pending' }                    // don dang cho chu giai duyet
  | { kind: 'rejected' }
  | { kind: 'granted'; staff: StaffMember };

/**
 * Gop hai nhanh `tournamentStaff` + `tournamentRequest` thanh MOT dong trang thai.
 *
 * **Vi sao phai gop chu khong nghe rieng hai cai.** `approveRequest` ghi nhan
 * su TRUOC roi moi xoa don, nen may nguoi xin quyen nhan hai su kien roi rac
 * theo dung thu tu do: "da co quyen", roi vai tram mili-giay sau la "don da
 * bien mat". Hai tai nghe rieng thi su kien thu hai de len cai truoc — chu
 * giai bam Dong y roi ma man hinh nguoi kia tut nguoc ve "Xin quyen giam sat",
 * ho bam xin lai, va chu giai thay don ve them mot lan nua. Vong lap nay tung
 * xay ra that giua giai.
 *
 * Quy tac gop chi co mot dong: **co nhan su thi thang** — don khong con noi gi
 * duoc nua. Va khong doan bua khi chua du tin: chua biet nhanh nhan su thi im,
 * de man hinh dung yen thay vi loe mot cai man sai.
 */
export function subscribeAccessState(
  t: TournamentId,
  uid: string,
  cb: (state: AccessState) => void
): () => void {
  let staff: StaffMember | null = null;
  let staffKnown = false;
  let req: AccessRequest | null = null;
  let reqKnown = false;

  const emit = () => {
    if (!staffKnown) return;
    if (staff) {
      cb({ kind: 'granted', staff });
      return;
    }
    if (!reqKnown) return;
    if (!req) cb({ kind: 'none' });
    else if (req.rejectedAt) cb({ kind: 'rejected' });
    else cb({ kind: 'pending' });
  };

  const offStaff = subscribeMyAccess(t, uid, (s) => {
    staff = s;
    staffKnown = true;
    emit();
  });
  const offReq = subscribeMyRequest(t, uid, (r) => {
    req = r;
    reqKnown = true;
    emit();
  });

  return () => {
    offStaff();
    offReq();
  };
}

/** Ghi san vao lan gan nhat -> lan sau vao thang, doi may van dung. */
export async function setLastArena(
  t: TournamentId,
  uid: string,
  key: ArenaAssignmentKey
): Promise<void> {
  await set(ref(database, `tournamentStaff/${t}/${uid}/lastArena`), key);
}
