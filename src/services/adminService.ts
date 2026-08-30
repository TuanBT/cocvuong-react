/**
 * Admin Service — bang dieu khien moi giai, moi nguoi, va go roi phan quyen.
 *
 * **Gioi han noi thang:** khong khoa / khong xoa duoc tai khoan Google — viec
 * do can Admin SDK, ma app khong co server. Admin cat duoc quyen TRONG app,
 * khong dong duoc cua Google. Dung hua voi ai la trang nay thay duoc Console.
 *
 * Ai la admin: `appAdmin/{uid}: true`. Hai duong dat gia tri do, khong co
 * duong thu ba:
 *   1. **Dat tay trong Firebase Console** — cho moi admin ve sau.
 *   2. `ensureBootstrapAdmin` — DUNG mot email ghi cung trong code, va rules
 *      moi la noi kiem email do (`auth.token.email`, claim do Firebase ky).
 *
 * Van khong co duong "cap quyen admin cho nguoi khac" tu trong app: khong co
 * server thi moi duong cap quyen trong app deu la duong de nguoi khac leo len.
 *
 * Ngoai hai dieu tren, rules DA cho admin gan het: menh de
 * `root.child('appAdmin/'+auth.uid).val() === true` nam san trong moi rule cua
 * chu giai. Cho nay chi la lop doc/gop du lieu de trang quan tri dung duoc
 * nhung quyen do.
 */
import { ref, get, set, child, onValue, off, remove } from 'firebase/database';
import { database } from '../firebase';
import type { TournamentId } from '../types';
import { BOOTSTRAP_ADMIN_EMAIL } from '../constants/admin';
import { UserProfile, getAllUsers } from './userService';
import {
  AccessRequest, ArenaAssignmentKey, StaffMember, arenaKeyLabel, assignedKeys,
} from './staffService';
import {
  TournamentStatus, TournamentSummary, demoFirst, listAllTournaments,
} from './tournamentService';

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

/**
 * Tu cap quyen admin cho DUNG mot email da ghi cung trong code.
 *
 * **Vi sao phai co ca o day lan trong rules:** rules moi la tang chan that.
 * Trang quan tri doc `tournamentStaff`, `tournamentRequest`, `users` o cap
 * GOC, ma ca ba nhanh do chi mo cho `appAdmin/{uid} === true`. Ghi cung email
 * mot minh trong app thi trang mo ra duoc nhung moi nut deu loi.
 *
 * Nen rules giu su that: no doi `auth.token.email` — claim do Firebase KY,
 * client khong bia duoc — roi cho chinh nguoi do ghi `appAdmin/{uid}` cua
 * minh. Ham nay chi bam nut ho, de khoi mo Console dat tay, va de no tu chay
 * lai tren moi project (dev / prod sinh uid khac nhau cho cung mot email).
 *
 * Rules chi cho ghi gia tri `true`, vao dung o cua chinh minh, boi dung email
 * do — nen ke ca khi ai do goi thang ham nay tu console trinh duyet cung khong
 * leo len duoc.
 *
 * Nuot loi that: khong ghi duoc thi nguoi dung van dung app binh thuong, chi
 * la khong thay trang quan tri.
 */
export async function ensureBootstrapAdmin(user: {
  uid: string;
  email: string;
}): Promise<boolean> {
  if (!user.uid) return false;
  if (user.email.trim().toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL) return false;

  try {
    if (await isAdmin(user.uid)) return true;
    await set(ref(database, `appAdmin/${user.uid}`), true);
    return true;
  } catch {
    // Rules chua duoc deploy la roi vao day. Khong bao ra UI: khong ai sua
    // duoc loi nay tu trong app ca.
    return false;
  }
}

// ==================== Doc gop mot luot ====================

export interface AdminTournamentRow extends TournamentSummary {
  staffCount: number;
  requestCount: number;
  /** Don chua bi tu choi — cai thuc su dang cho chu giai bam */
  pendingCount: number;
  ownerName: string;
}

export interface UserDuty {
  id: TournamentId;
  name: string;
  arenas: ArenaAssignmentKey[];
}

export interface AdminUserRow extends UserProfile {
  uid: string;
  /** Giai nguoi nay lam chu */
  owns: { id: TournamentId; name: string; status: TournamentStatus }[];
  /** Giai nguoi nay dang truc, kem san */
  duties: UserDuty[];
  /** Don dang cho duyet */
  pending: { id: TournamentId; name: string }[];
  /** Chinh nguoi dang mo trang nay. KHONG phai "la admin" — xem `loadAdminOverview`. */
  isViewer: boolean;
}

export interface AdminOverview {
  /** Ke ca giai da xoa mem — trang quan tri la cho duy nhat con thay chung */
  tournaments: AdminTournamentRow[];
  users: AdminUserRow[];
  staffByTournament: Record<TournamentId, StaffMember[]>;
  requestsByTournament: Record<TournamentId, AccessRequest[]>;
}

function readStaffTree(raw: any): Record<TournamentId, StaffMember[]> {
  const out: Record<TournamentId, StaffMember[]> = {};
  for (const t of Object.keys(raw || {})) {
    const byUid = raw[t] || {};
    out[t] = Object.keys(byUid).map((uid) => ({
      uid,
      email: byUid[uid]?.email || '',
      name: byUid[uid]?.name || '',
      photo: byUid[uid]?.photo || '',
      assignments: byUid[uid]?.assignments || {},
      lastArena: byUid[uid]?.lastArena,
      approvedAt: byUid[uid]?.approvedAt,
      approvedBy: byUid[uid]?.approvedBy,
    }));
  }
  return out;
}

function readRequestTree(raw: any): Record<TournamentId, AccessRequest[]> {
  const out: Record<TournamentId, AccessRequest[]> = {};
  for (const t of Object.keys(raw || {})) {
    const byUid = raw[t] || {};
    out[t] = Object.keys(byUid).map((uid) => ({
      uid,
      email: byUid[uid]?.email || '',
      name: byUid[uid]?.name || '',
      photo: byUid[uid]?.photo || '',
      note: byUid[uid]?.note || '',
      want: byUid[uid]?.want || {},
      createdAt: byUid[uid]?.createdAt || 0,
      rejectedAt: byUid[uid]?.rejectedAt,
    }));
  }
  return out;
}

/**
 * Moi thu trang quan tri can, trong DUNG bon luot doc.
 *
 * Ban cu doc `tournamentStaff` ba lan (mot lan cho bang giai, mot lan cho bang
 * nguoi, mot lan moi khi mo mot giai ra). Admin lai la vai duy nhat doc duoc
 * ca ba nhanh goc, nen gop lai o day la re nhat.
 *
 * Khong co cot "ai la admin": rules cua `appAdmin` chi mo `.read` o cap `$uid`
 * cho chinh chu, nen KHONG liet ke nguoc ra duoc danh sach admin — ke ca khi
 * chinh minh la admin. Danh dau duoc moi tai khoan dang mo trang nay
 * (`isViewer`), the thoi. Muon biet ai con la admin thi mo Firebase Console.
 */
export async function loadAdminOverview(viewerUid: string): Promise<AdminOverview> {
  const [tournaments, staffRaw, requestRaw, users] = await Promise.all([
    listAllTournaments(),
    get(child(ref(database), 'tournamentStaff')).then((s) => s.val() || {}).catch(() => ({})),
    get(child(ref(database), 'tournamentRequest')).then((s) => s.val() || {}).catch(() => ({})),
    getAllUsers().catch(() => ({} as Record<string, UserProfile>)),
  ]);

  const staffByTournament = readStaffTree(staffRaw);
  const requestsByTournament = readRequestTree(requestRaw);
  const nameOf = new Map(tournaments.map((t) => [t.id, t.name]));

  const rows: AdminTournamentRow[] = tournaments
    .slice()
    .sort(demoFirst)
    .map((t) => {
      const requests = requestsByTournament[t.id] || [];
      return {
        ...t,
        staffCount: (staffByTournament[t.id] || []).length,
        requestCount: requests.length,
        pendingCount: requests.filter((r) => !r.rejectedAt).length,
        ownerName: users[t.ownerUid]?.name || t.ownerEmail || '',
      };
    });

  const userRows: AdminUserRow[] = Object.keys(users).map((uid) => {
    const duties: UserDuty[] = [];
    for (const [tKey, members] of Object.entries(staffByTournament)) {
      const member = members.find((m) => m.uid === uid);
      if (!member) continue;
      duties.push({
        id: tKey,
        name: nameOf.get(tKey) || 'Giải đã xoá',
        arenas: assignedKeys(member.assignments),
      });
    }

    const pending: { id: TournamentId; name: string }[] = [];
    for (const [tKey, list] of Object.entries(requestsByTournament)) {
      const req = list.find((r) => r.uid === uid && !r.rejectedAt);
      if (req) pending.push({ id: tKey, name: nameOf.get(tKey) || 'Giải đã xoá' });
    }

    return {
      uid,
      ...users[uid],
      owns: tournaments
        .filter((t) => t.ownerUid === uid)
        .map((t) => ({ id: t.id, name: t.name, status: t.status })),
      duties,
      pending,
      isViewer: uid === viewerUid,
    };
  });

  return { tournaments: rows, users: userRows, staffByTournament, requestsByTournament };
}

export async function loadStaffOf(t: TournamentId): Promise<StaffMember[]> {
  const snap = await get(child(ref(database), `tournamentStaff/${t}`));
  const raw = snap.val() || {};
  return Object.keys(raw).map((uid) => ({
    uid,
    ...raw[uid],
    assignments: raw[uid]?.assignments || {},
  }));
}

/**
 * Go mot nguoi khoi MOI giai — dung khi tai khoan bi lo, hoac nguoi do nghi han.
 *
 * Khong dong duoc tai khoan Google cua ho (can Admin SDK), nhung cat het duong
 * ghi diem thi lam duoc ngay o day. Ho van dang nhap duoc, chi la khong con
 * san nao de vao.
 */
export async function revokeEverywhere(uid: string, tournamentIds: TournamentId[]): Promise<number> {
  let n = 0;
  for (const t of tournamentIds) {
    try {
      await remove(ref(database, `tournamentStaff/${t}/${uid}`));
      n++;
    } catch {
      /* mot giai khong go duoc thi khong duoc phep chan nhung giai con lai */
    }
  }
  return n;
}

// ==================== Chan doan ====================

export type AuditLevel = 'error' | 'warn' | 'info';

export interface AuditFinding {
  level: AuditLevel;
  id: TournamentId;
  name: string;
  title: string;
  detail: string;
  /** Viec can lam — hien ngay duoi dong canh bao */
  fix?: string;
}

const META_KEY = 'meta';

/** So ma dang song cua mot giai (bo node `meta`, bo trung) */
async function countCodes(t: TournamentId): Promise<number> {
  try {
    const snap = await get(child(ref(database), `tournamentCodeIndex/${t}`));
    const raw = snap.val() as Record<string, unknown> | null;
    if (!raw) return 0;
    const codes = new Set<string>();
    for (const [key, byReferee] of Object.entries(raw)) {
      if (key === META_KEY) continue;
      for (const code of Object.values((byReferee || {}) as Record<string, string>)) {
        if (code) codes.add(code);
      }
    }
    return codes.size;
  } catch {
    return -1; // doc khong duoc: khong ket luan gi ca, khac han voi "khong co ma"
  }
}

/** Giai da co lich thi dau chua — doc DUNG tran dau tien, khong keo ca cay ve */
async function hasSchedule(t: TournamentId): Promise<boolean> {
  const [combat, martial] = await Promise.all([
    get(child(ref(database), `tournament/${t}/combat/0/match`)).catch(() => null),
    get(child(ref(database), `tournament/${t}/martial/0/match`)).catch(() => null),
  ]);
  return Boolean(combat?.exists() || martial?.exists());
}

/**
 * Ra soat toan he thong, tra ve nhung thu SAI THAT — khong phai bang thong ke.
 *
 * Moi dong deu phai tra loi duoc "neu de nguyen thi giua giai hong cai gi".
 * Cai nao chi la so lieu thi thuoc ve bang giai dau, khong thuoc cho nay.
 *
 * Toa do doc: moi giai them toi da 3 luot (bo ma + 2 tran dau tien). Ham chay
 * khi nguoi ta bam nut, khong chay nen.
 */
export async function auditTournaments(overview: AdminOverview): Promise<AuditFinding[]> {
  const found: AuditFinding[] = [];
  const live = overview.tournaments.filter((t) => !t.demo);

  const probes = await Promise.all(
    live.map(async (t) => ({
      t,
      codes: await countCodes(t.id),
      scheduled: t.status === 'open' ? await hasSchedule(t.id) : true,
    }))
  );

  for (const { t, codes, scheduled } of probes) {
    const at = (level: AuditLevel, title: string, detail: string, fix?: string) =>
      found.push({ level, id: t.id, name: t.name, title, detail, fix });

    const staff = overview.staffByTournament[t.id] || [];
    const requests = overview.requestsByTournament[t.id] || [];

    // --- Giai da xoa mem: chi con mot phep kiem, roi bo qua phan con lai ---
    if (t.status === 'deleted') {
      if (codes > 0) {
        at('error', 'Giải đã xoá nhưng mã vẫn sống',
          `Còn ${codes} mã giám định chưa thu hồi. Người cầm số cũ vẫn ghi điểm vào giải này được.`,
          'Xoá lại giải này một lần nữa để thu hồi mã.');
      }
      continue;
    }

    // --- Duong vao cua giam dinh ---
    if (t.status === 'open' && codes === 0) {
      at('error', 'Giải đang mở nhưng chưa cấp mã giám định',
        'Giám định gõ 2 số của giải vào sẽ báo “không có mã này”.',
        'Mở Thiết đặt của giải → Bảng mã giám định → Cấp mã.');
    }
    if (t.status === 'closed' && codes > 0) {
      at('error', 'Giải đã đóng nhưng mã vẫn sống',
        `Còn ${codes} mã chưa thu hồi — người cầm số cũ vẫn ghi điểm được, và 2 số của giải vẫn bị giữ chỗ.`,
        'Bấm “Mở lại” rồi “Đóng giải” để chạy lại bước thu hồi mã.');
    }

    // --- Ai ghi duoc diem giai nay ---
    if (!t.ownerUid && t.status !== 'draft') {
      at('warn', 'Giải chưa có chủ',
        'Giải cũ chưa gắn chủ: bất kỳ ai đăng nhập cũng ghi điểm vào đây được.',
        'Bấm “Nhận về tài khoản tôi” rồi đổi chủ cho đúng người.');
    }
    if (t.openAccess) {
      at('warn', 'Đang bật “Mở tự do”',
        'Bỏ hẳn bước duyệt: ai đăng nhập cũng vào giám sát và ghi điểm giải này được.',
        'Tắt đi sau khi qua đợt cần gấp.');
    }

    // --- Nhan su ---
    const byArena = new Map<ArenaAssignmentKey, StaffMember[]>();
    for (const m of staff) {
      for (const key of assignedKeys(m.assignments)) {
        byArena.set(key, [...(byArena.get(key) || []), m]);
      }
    }
    for (const [key, people] of byArena) {
      if (people.length > 1) {
        at('warn', `Hai giám sát cùng ${arenaKeyLabel(key)}`,
          `${people.map((p) => p.name).join(', ')} cùng trực một sân — dễ ghi đè điểm của nhau.`,
          'Sửa phân công để mỗi sân một người.');
      }
    }
    const idle = staff.filter((m) => assignedKeys(m.assignments).length === 0);
    if (idle.length) {
      at('warn', 'Giám sát không có sân nào',
        `${idle.map((p) => p.name).join(', ')} đã được duyệt nhưng không được phân sân — vào app sẽ kẹt ở màn xin quyền.`,
        'Phân sân lại, hoặc gỡ hẳn.');
    }

    // --- Don xin quyen ---
    const pending = requests.filter((r) => !r.rejectedAt);
    if (pending.length && t.status === 'open') {
      at('info', `${pending.length} đơn đang chờ duyệt`,
        `${pending.map((r) => r.name).join(', ')} đang chờ. Chủ giải phải đang mở app mới thấy — app không gửi được thông báo đẩy.`,
        'Duyệt hộ ngay tại đây.');
    }
    const rejected = requests.filter((r) => r.rejectedAt);
    if (rejected.length) {
      at('info', `${rejected.length} người bị từ chối, không nộp lại được`,
        `${rejected.map((r) => r.name).join(', ')} còn dấu từ chối nên rules chặn họ nộp đơn lại.`,
        'Bấm “Cho xin lại” nếu là từ chối nhầm.');
    }

    // --- Du lieu giai ---
    if (t.status === 'open' && !scheduled) {
      at('warn', 'Giải đang mở nhưng chưa có lịch thi đấu',
        'Chưa có trận nào ở cả đối kháng lẫn thi quyền — giám sát mở màn ra sẽ trống.',
        'Vào Tạo giải để nhập file VĐV và sinh lịch.');
    }
  }

  const rank: Record<AuditLevel, number> = { error: 0, warn: 1, info: 2 };
  return found.sort((a, b) => rank[a.level] - rank[b.level] || a.name.localeCompare(b.name, 'vi'));
}

// ==================== Ai dang online ====================

export interface RefereePresence {
  key: string;
  /** Chuoi slot `t:kind:gd:a:r` — vang o ban ghi presence kieu cu */
  slot?: string;
  label: string;
  lastSeen?: number;
}

/**
 * Moi may giam dinh dang mo — nhanh `presence` de `.read: true` nen doc duoc
 * ca cay.
 *
 * Hai doi presence cung ton tai: ban moi khoa theo `slot`, ban cu khoa theo
 * `{arena}_{t}_{r}` va khong phan biet duoc mon. Doc ca hai chu khong bo ban
 * cu di — dang giai ma bang nay thieu nguoi thi no phan tac dung.
 */
export function subscribeRefereePresence(cb: (list: RefereePresence[]) => void): () => void {
  const r = ref(database, 'presence/giam_dinh');
  onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const list: RefereePresence[] = [];
      for (const key of Object.keys(raw)) {
        const v = raw[key];
        if (!v?.online) continue;
        list.push({
          key,
          slot: typeof v.slot === 'string' ? v.slot : undefined,
          label: v.label || v.name || key,
          lastSeen: typeof v.lastSeen === 'number' ? v.lastSeen : undefined,
        });
      }
      cb(list.sort((a, b) => a.label.localeCompare(b.label, 'vi')));
    },
    () => cb([])
  );
  return () => off(r);
}
