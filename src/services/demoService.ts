/**
 * Ban cham nhanh — bam mot nut la co cho cham ngay, khong phai sap giai.
 *
 * Ban cham nhanh la mot giai **binh thuong nam ngay trong mang `tournament`**,
 * chi khac o `setting.demo = true`. Khong nhanh rieng, khong refactor duong dan.
 *
 * **Moi tai khoan mot ban rieng, chu la chinh ho.** Truoc day ca he thong dung
 * chung mot ban vo chu; nhu the thi hai nguoi cham cung luc la de diem cua
 * nhau, va nang hon: bo ma giam dinh gan theo giai, dung chung ban tuc la dung
 * chung ma — khong ai phat duoc so rieng cho giam dinh cua minh.
 *
 * Co chu roi thi moi thu chay bang duong cua giai that, khong them mot dong
 * rule nao: chu ghi duoc ca cay giai cua minh, giam dinh ghi diem bang nhanh
 * `codeSession` von khong dinh gi toi quyen so huu.
 *
 * Cai gia: **mot trong 99 dau so** cua kho ma — nhung chi tra khi that su can.
 * Xem `ensureDemoCodesOnDemand`.
 */
import { ref, get, set, update, child, push } from 'firebase/database';
import { database } from '../firebase';
import { DEFAULT_SETTING } from '../constants/settings';
import type { TournamentId } from '../types';
import { ensureTournamentCodes } from './accessCodeService';
import {
  TournamentSummary, listTournaments, reopenTournament, syncTournamentIndex,
} from './tournamentService';

/** Ten luu trong DB — chi de nguoi quan tri phan biet trong danh sach giai. */
export const DEMO_NAME = 'CHẤM NHANH';

/** Ten hien tren man cham diem, dat theo noi dung dang cham. */
export const DEMO_SCREEN_NAME = { combat: 'ĐỐI KHÁNG', martial: 'THI QUYỀN' } as const;

/**
 * Ten giai de hien len man hinh.
 *
 * Man giam sat con dung de trinh chieu cho khan gia, nen dong chu to nhat
 * khong duoc phep noi day la ban chay thu — no phai doc nhu ten noi dung dang
 * cham. DB chi giu duoc mot ten cho ca hai mon, nen moi man tu lay ten theo
 * noi dung cua chinh minh.
 */
export function displayTournamentName(
  setting: { tournamentName?: string; demo?: boolean } | null | undefined,
  kind: keyof typeof DEMO_SCREEN_NAME
): string {
  if (!setting) return '';
  return setting.demo ? DEMO_SCREEN_NAME[kind] : setting.tournamentName || '';
}

function emptyReferee(n: number) {
  return Array.from({ length: n }, () => ({ blueScore: 0, redScore: 0 }));
}

function emptyMartialReferee(n: number) {
  return Array.from({ length: n }, () => ({ score: 0 }));
}

function fighter(name: string, code: string) {
  return {
    result: '',
    name,
    code,
    country: 'VN',
    caution: { remind: 0, warning: 0, medical: 0, fall: 0, bound: 0 },
    legStrike: false,
    score: 0,
  };
}

/**
 * Du lieu ban cham nhanh viet thang o day, KHONG doc file Excel.
 *
 * Dung **mot cap moi san**: san A cham tran 1 / luot 1, san B cham tran 2 /
 * luot 2. Hai san doc lap nhau nhu giai that — khong the dung chung mot tran,
 * vi hai ban cung ghi vao mot cho la de diem cua nhau.
 */
function demoPayload(owner?: DemoOwner) {
  const setting = JSON.parse(JSON.stringify(DEFAULT_SETTING)).setting;
  // Ban cham nhanh khong sua duoc ten tren man hinh, nen khong bia ten nguoi
  // that: goi thang theo mau goc dai — DO va XANH, khong don vi.
  const pair = (no: number) => ({
    match: { no, type: 'Đối kháng', category: '', win: '' },
    fighters: {
      redFighter: fighter('ĐỎ', ''),
      blueFighter: fighter('XANH', ''),
    },
  });
  const turn = (no: number) => ({
    no,
    teamName: '',
    finalScore: 0,
    fighters: [{ fighter: { code: '', name: 'VẬN ĐỘNG VIÊN', country: 'VN' } }],
    refereeMartial: emptyMartialReferee(5),
  });

  return {
    setting: {
      ...setting,
      tournamentName: DEMO_NAME,
      ownerUid: owner?.uid || '',
      ownerEmail: owner?.email || '',
      status: 'open',
      // Ban rieng cua mot nguoi: khong mo tu do, khong ai khac ghi vao duoc
      openAccess: false,
      demo: true,
      createdAt: Date.now(),
    },
    combat: [pair(1), pair(2)],
    combatArena: [
      { combatArenaName: 'Sân A', lastMatch: { no: 1 }, referee: emptyReferee(5) },
      { combatArenaName: 'Sân B', lastMatch: { no: 2 }, referee: emptyReferee(5) },
    ],
    martial: [
      {
        match: { name: 'Thi quyền' },
        team: [turn(1), turn(2)],
      },
    ],
    martialArena: [
      {
        martialArenaName: 'Sân A',
        lastMatchMartial: { matchMartialNo: 1, teamMartialNo: 1 },
      },
      {
        martialArenaName: 'Sân B',
        lastMatchMartial: { matchMartialNo: 1, teamMartialNo: 2 },
      },
    ],
  };
}

/** Nguoi so huu mot ban cham nhanh — dung chinh tai khoan dang dang nhap. */
export interface DemoOwner {
  uid: string;
  email: string;
}

/**
 * Viec vat cua ban cham nhanh: sua ten cu, bu san B, cap bu ma giam dinh.
 *
 * **Khong duoc cho viec nay** — no toan la doc/ghi le, cong lai thanh vai giay
 * tren mang 4G, ma khong viec nao can xong truoc khi man cham diem hien ra.
 * Goi kieu ban-va-quen ngay luc vao ban.
 */
export function topUpDemo(id: TournamentId, currentName?: string): void {
  if (currentName !== undefined && currentName !== DEMO_NAME) {
    void set(ref(database, `tournament/${id}/setting/tournamentName`), DEMO_NAME)
      .then(() => syncTournamentIndex(id))
      .catch(() => undefined);
  }
  void addArenaB(id);
}

/**
 * Ban dung tu truoc chi co San A — de nguyen thi nguoi doi sang San B roi vao
 * mot san trong. Chi ghi nhung nhanh CON THIEU: tran 1, luot 1 va diem dang
 * cham o San A khong duoc dung toi.
 */
async function addArenaB(id: TournamentId): Promise<void> {
  try {
    const snap = await get(child(ref(database), `tournament/${id}/combatArena/1`));
    if (snap.exists()) return;

    const p = demoPayload();
    await update(ref(database, `tournament/${id}`), {
      'combat/1': p.combat[1],
      'combatArena/1': p.combatArena[1],
      'martial/0/team/1': p.martial[0].team[1],
      'martialArena/1': p.martialArena[1],
      'setting/combat/isShowArenaB': true,
      'setting/martial/isShowArenaB': true,
    });
  } catch {
    /* khong bu duoc thi San A van cham binh thuong */
  }
}

/**
 * Tra ve index ban cham nhanh cua tai khoan nay, dung mot cai neu chua co.
 *
 * Duong CHAM: chi di qua day khi tai khoan chua co ban. Da co roi thi bang
 * chon giai da cam san dong tom tat — vao thang bang no, roi `topUpDemo`.
 *
 * Ba nuoc, theo dung thu tu:
 *   1. **Ban cua chinh minh** — co roi thi dung lai, mo lai neu da dong. Dung
 *      lai ban cu la dung lai ca dau so cu, khong an them mot cho trong kho ma.
 *   2. **Ban vo chu con sot lai** tu thoi ca he thong dung chung mot ban —
 *      nhan lam ban cua nguoi vao dau tien, GIU nguyen diem dang cham.
 *   3. Chua co gi thi dung ban moi o cuoi mang.
 */
export async function ensureMyDemoTournament(owner: DemoOwner): Promise<TournamentId> {
  const all = await listTournaments();

  const mine = all.find((t) => t.demo && t.ownerUid === owner.uid);
  if (mine) {
    if (mine.status === 'closed') await reopenTournament(mine.id);
    await addArenaB(mine.id);
    return mine.id;
  }

  const orphan = all.find((t) => t.demo && !t.ownerUid);
  if (orphan) {
    // Chi dat chu, KHONG ghi de tran: rat co the dang co nguoi cham do dang
    // tren chinh ban nay ngay luc doi doi
    await update(ref(database, `tournament/${orphan.id}/setting`), {
      ownerUid: owner.uid,
      ownerEmail: owner.email,
      openAccess: false,
    });
    await syncTournamentIndex(orphan.id);
    await addArenaB(orphan.id);
    return orphan.id;
  }

  const id = push(child(ref(database), 'tournament')).key;
  if (!id) throw new Error('Không mở được bàn chấm nhanh.');

  await set(ref(database, `tournament/${id}`), demoPayload(owner));
  await syncTournamentIndex(id);
  return id;
}

/**
 * Cap ma cho ban cham nhanh — **chi khi that su can den**.
 *
 * Kho ma chi co 99 dau so, va mot dau so chi tra ve kho luc Dong giai. Ban
 * cham nhanh thi khong bao gio dong: no duoc `reopenTournament` moi lan chu no
 * quay lai. Cap ma ngay luc mo ban, nhu ban cu, nghia la **moi tai khoan tung
 * bam "Chấm nhanh" an vinh vien mot trong 99 dau so** — tran that su cua he
 * thong tut xuong thanh so NGUOI DUNG, chu khong phai so giai dang mo.
 *
 * Ma cua ban cham nhanh chi den tay giam dinh qua duy nhat mot duong: giam sat
 * mo bang ma ra doc cho ho. Nen cho cap dung o do. Ai chi mo ban ra cham mot
 * minh — phan lon nguoi bam thu — khong dung den mot dau so nao.
 *
 * Khong phai ban cham nhanh, hoac khong phai chu no, thi khong lam gi: giai
 * that da co ma tu luc tao.
 */
export async function ensureDemoCodesOnDemand(
  t: TournamentSummary | null | undefined,
  uid: string
): Promise<void> {
  if (!t?.demo || t.ownerUid !== uid) return;
  try {
    await ensureTournamentCodes(
      t.id,
      {
        combatReferees: 3,
        martialReferees: 3,
        useArenaB: true,
        tournamentName: 'Chấm nhanh',
      },
      uid
    );
  } catch {
    /* kho ma day thi ban thu van cham duoc, chi la khong co ma giam dinh */
  }
}

/**
 * Cham lai ban cham nhanh — **chi cap dang o san nay**.
 *
 * Hai san la hai ban cham doc lap; xoa het ca cay thi ben kia dang cham dang
 * do se mat diem ma khong hieu vi sao. Moi san co dung mot tran doi khang va
 * mot luot thi quyen nen "cham lai san" = ghi de lai dung hai cho do.
 */
export async function resetDemoTournament(id: TournamentId, arena: number): Promise<void> {
  const p = demoPayload();
  const a = arena === 1 ? 1 : 0;
  await update(ref(database, `tournament/${id}`), {
    [`combat/${a}`]: p.combat[a],
    [`combatArena/${a}`]: p.combatArena[a],
    [`martial/0/team/${a}`]: p.martial[0].team[a],
    [`martialArena/${a}`]: p.martialArena[a],
  });
}
