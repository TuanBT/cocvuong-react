/**
 * Admin Service — bang dieu khien moi giai, go roi phan quyen.
 *
 * **Gioi han noi thang:** khong khoa / khong xoa duoc tai khoan Google — viec
 * do can Admin SDK, ma app khong co server. Day la bang dieu khien giai dau,
 * KHONG phai trang quan tri tai khoan. Dung hua voi ai la no thay duoc Console.
 *
 * Ai la admin: `appAdmin/{uid}: true`, **dat tay trong Firebase Console**.
 * Co y khong lam duong cap quyen admin tu trong app — khong co server thi moi
 * duong cap quyen trong app deu la duong de nguoi khac leo len.
 */
import { ref, get, child, onValue, off } from 'firebase/database';
import { database } from '../firebase';
import { UserProfile, getAllUsers } from './userService';
import { StaffMember } from './staffService';
import { TournamentSummary, demoFirst, listTournaments } from './tournamentService';

export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await get(child(ref(database), `appAdmin/${uid}`));
    return snap.val() === true;
  } catch {
    // Rules tu choi doc = khong phai admin. Khong duoc de vang loi ra UI.
    return false;
  }
}

export function subscribeIsAdmin(uid: string, cb: (v: boolean) => void): () => void {
  const r = ref(database, `appAdmin/${uid}`);
  onValue(r, (snap) => cb(snap.val() === true), () => cb(false));
  return () => off(r);
}

export interface AdminTournamentRow extends TournamentSummary {
  staffCount: number;
  requestCount: number;
  ownerName: string;
}

/** Moi giai, ke ca cua nguoi khac — kem so nhan su va so don dang cho. */
export async function loadAllTournaments(): Promise<AdminTournamentRow[]> {
  const [tournaments, staffRaw, requestRaw, users] = await Promise.all([
    listTournaments(),
    get(child(ref(database), 'tournamentStaff')).then((s) => s.val() || {}),
    get(child(ref(database), 'tournamentRequest')).then((s) => s.val() || {}),
    getAllUsers().catch(() => ({} as Record<string, UserProfile>)),
  ]);

  return tournaments
    .slice()
    .sort(demoFirst)
    .map((t) => ({
      ...t,
      staffCount: Object.keys(staffRaw[t.index] || {}).length,
      requestCount: Object.keys(requestRaw[t.index] || {}).length,
      ownerName: users[t.ownerUid]?.name || t.ownerEmail || '',
    }));
}

export interface AdminUserRow extends UserProfile {
  uid: string;
  /** Cac giai/san nguoi nay dang truc */
  duties: string[];
}

export async function loadAllUsers(): Promise<AdminUserRow[]> {
  const [users, staffRaw, tournaments] = await Promise.all([
    getAllUsers(),
    get(child(ref(database), 'tournamentStaff')).then((s) => s.val() || {}),
    listTournaments(),
  ]);

  const nameOf = new Map(tournaments.map((t) => [t.index, t.name]));

  return Object.keys(users).map((uid) => {
    const duties: string[] = [];
    for (const tKey of Object.keys(staffRaw)) {
      const member: StaffMember | undefined = staffRaw[tKey]?.[uid];
      if (!member) continue;
      const arenas = Object.keys(member.assignments || {}).filter(
        (k) => (member.assignments as any)[k] === true
      );
      duties.push(`${nameOf.get(Number(tKey)) || `Giải ${tKey}`}: ${arenas.join(', ') || '—'}`);
    }
    return { uid, ...users[uid], duties };
  });
}

export async function loadStaffOf(t: number): Promise<StaffMember[]> {
  const snap = await get(child(ref(database), `tournamentStaff/${t}`));
  const raw = snap.val() || {};
  return Object.keys(raw).map((uid) => ({
    uid,
    ...raw[uid],
    assignments: raw[uid]?.assignments || {},
  }));
}
