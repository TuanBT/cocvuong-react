/**
 * Demo Service — giai thu de bam mot nut la dung duoc ngay.
 *
 * Giai thu la mot giai **binh thuong nam ngay trong mang `tournament`**, chi
 * khac o `setting.demo = true`. Khong nhanh rieng, khong refactor duong dan.
 *
 * Ba diem lam no chay duoc ma khong phai them mot dong rule nao:
 *   1. **Khong dat `ownerUid`** -> roi dung vao nhanh "giai cu van mo" da co
 *      san trong rules -> ai vao cung ghi duoc.
 *   2. **Chi co dung mot cai, ton tai vinh vien** -> khong sinh rac trong mang
 *      index, khong bao gio phai xoa phan tu giua mang.
 *   3. Ai lo xoa thi lan sau bam la no tu moc lai.
 *
 * Hai nguoi thu cung luc se de diem cua nhau — chap nhan, vi da co nut Cham lai.
 */
import { ref, get, set, update, child } from 'firebase/database';
import { database } from '../firebase';
import { DEFAULT_SETTING } from '../constants/settings';
import { ensureTournamentCodes } from './accessCodeService';
import { listTournaments, syncTournamentIndex } from './tournamentService';

export const DEMO_NAME = 'CHẤM NHANH\n(chưa có giải chính thức)';

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
 * Du lieu giai thu viet thang o day, KHONG doc file Excel.
 *
 * Dung 1 tran doi khang + 1 luot thi quyen: du de xem het luong ma nguoi thu
 * khong lac, va khong phai nuoi them mot duong nhap lieu nua.
 */
function demoPayload() {
  const setting = JSON.parse(JSON.stringify(DEFAULT_SETTING)).setting;
  return {
    setting: {
      ...setting,
      tournamentName: DEMO_NAME,
      // Co y KHONG co ownerUid — de roi vao nhanh "giai cu van mo" cua rules
      status: 'open',
      openAccess: true,
      demo: true,
      createdAt: Date.now(),
      combat: { ...setting.combat, isShowArenaB: false },
      martial: { ...setting.martial, isShowArenaB: false },
    },
    combat: [
      {
        match: { no: 1, type: 'Chấm nhanh', category: 'Hạng 60kg Nam', win: '' },
        fighters: {
          redFighter: fighter('Nguyễn Văn A', 'A01'),
          blueFighter: fighter('Trần Văn B', 'B01'),
        },
      },
    ],
    combatArena: [
      { combatArenaName: 'Sân A', lastMatch: { no: 1 }, referee: emptyReferee(5) },
    ],
    martial: [
      {
        match: { name: 'Long hổ quyền' },
        team: [
          {
            no: 1,
            teamName: 'Đội 1',
            finalScore: 0,
            fighters: [{ fighter: { code: 'TQ01', name: 'Lê Thị C', country: 'VN' } }],
            refereeMartial: emptyMartialReferee(5),
          },
        ],
      },
    ],
    martialArena: [
      {
        martialArenaName: 'Sân A',
        lastMatchMartial: { matchMartialNo: 1, teamMartialNo: 1 },
      },
    ],
  };
}

/**
 * Tim giai thu dang co. Tra ve index, hoac null neu chua co.
 *
 * Di qua chi muc chu khong doc ca cay: nut "Cham nhanh" bam vao la vao day,
 * khong dang de tai vai MB chi de biet ban thu nam o o so may.
 */
export async function findDemoTournament(): Promise<number | null> {
  const all = await listTournaments();
  return all.find((t) => t.demo)?.index ?? null;
}

/**
 * Tra ve index giai thu, dung mot cai o cuoi mang neu chua co.
 * Sinh san ma giam dinh de bang ma hien ngay tren man hinh nguoi thu.
 */
export async function ensureDemoTournament(): Promise<number> {
  const existing = await findDemoTournament();
  if (existing !== null) {
    await ensureDemoCodes(existing);
    return existing;
  }

  const snap = await get(child(ref(database), 'tournament'));
  const raw = snap.val();
  const keys = raw ? Object.keys(raw).map(Number).filter((n) => !Number.isNaN(n)) : [];
  const index = keys.length ? Math.max(...keys) + 1 : 0;

  await set(ref(database, `tournament/${index}`), demoPayload());
  await syncTournamentIndex(index);
  await ensureDemoCodes(index);
  return index;
}

/** Ban cham nhanh: 1 san x 2 mon x 3 giam dinh. Tinh vao tran kho ma. */
async function ensureDemoCodes(index: number): Promise<void> {
  try {
    await ensureTournamentCodes(
      index,
      {
        combatReferees: 3,
        martialReferees: 3,
        useArenaB: false,
        tournamentName: 'Chấm nhanh',
      },
      ''
    );
  } catch {
    /* kho ma day thi giai thu van xem duoc, chi la khong co ma giam dinh */
  }
}

/**
 * Cham lai giai thu.
 *
 * Giai thu co dung 1 tran nen "cham lai giai" = "cham lai tran" — khong phai
 * viet logic reset moi, chi ghi de lai phan diem cua chinh payload mau.
 */
export async function resetDemoTournament(index: number): Promise<void> {
  const p = demoPayload();
  await update(ref(database, `tournament/${index}`), {
    combat: p.combat,
    combatArena: p.combatArena,
    martial: p.martial,
    martialArena: p.martialArena,
  });
}
