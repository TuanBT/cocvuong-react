/**
 * Martial Builder — Sinh danh sách nội dung Thi Quyền
 *
 * Tách nguyên văn từ createTournament.container.tsx (arrangeMartial) để logic
 * gom đội / đánh số lượt thi có thể được test trực tiếp thay vì phải copy.
 *
 * LƯU Ý: hành vi giữ nguyên 100% so với bản trong container.
 *
 * Cấu trúc dữ liệu thật trên Firebase (khác với MartialMatch trong src/types,
 * vốn đã lỗi thời):
 *   martial[i] = { match: { name }, team: [ { no, finalScore, refereeMartial[], fighters[] } ] }
 *   fighters[k] = { fighter: { name, code, country } }
 */

// ==================== Types ====================

export interface MartialFighterEntry {
  fighter: { code: string; name: string; country: string };
}

export interface MartialTeamEntry {
  fighters: MartialFighterEntry[];
  no: number;
  finalScore: number;
  refereeMartial: { score: number }[];
}

export interface MartialContent {
  match: { name: string };
  team: MartialTeamEntry[];
}

export const MARTIAL_ARRANGE_HEADER: string[] = [
  'STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA',
];

/** Bảng điểm giám định mặc định — LUÔN 5 ô, giống hằng số trong app */
export function emptyRefereeMartial(): { score: number }[] {
  return [{ score: 0 }, { score: 0 }, { score: 0 }, { score: 0 }, { score: 0 }];
}

function newTeam(no: number): MartialTeamEntry {
  return { fighters: [], no, finalScore: 0, refereeMartial: emptyRefereeMartial() };
}

function newFighter(row: any[]): MartialFighterEntry {
  // Giữ nguyên thứ tự key như fighterMartialObj gốc trong container
  return {
    fighter: {
      code: String(row[3]).trim(),
      name: String(row[2]).trim(),
      country: String(row[4]).trim(),
    },
  };
}

// ==================== Sắp nội dung ====================

/**
 * Gom danh sách VĐV thô thành các nội dung thi quyền.
 *
 * `martialArrayRaw` là mảng dòng [stt, nội dung, tên, code, quốc gia].
 * Các dòng LIÊN TIẾP có cùng (stt + nội dung) được gom thành MỘT đội đồng diễn;
 * đổi stt là sang lượt thi mới.
 *
 * Nguyên văn arrangeMartial() trong createTournament.container.tsx.
 */
export function buildMartialContents(martialArrayRaw: any[][]): MartialContent[] {
  const martial: MartialContent[] = [];
  const groupedData = new Map<string, any[][]>();
  let matchNo = 0;
  let prevMatch = '';

  martialArrayRaw.forEach((item) => {
    const matchName = String(item[1]).trim();

    if (groupedData.has(matchName)) {
      groupedData.get(matchName)!.push(item);
      if (prevMatch !== item[0] + String(item[1]).trim()) {
        matchNo++;
      }
      const fighter = newFighter(item);
      if (prevMatch !== item[0] + String(item[1]).trim()) {
        const team = newTeam(matchNo);
        team.fighters.push(fighter);
        martial.slice(-1)[0].team.push(team);
      } else {
        martial.slice(-1)[0].team.slice(-1)[0].fighters.push(fighter);
      }
    } else {
      groupedData.set(matchName, [item]);
      const content: MartialContent = { match: { name: matchName }, team: [] };
      martial.push(content);
      content.match.name = matchName;
      matchNo = 1;
      const team = newTeam(matchNo);
      team.fighters.push(newFighter(item));
      martial.slice(-1)[0].team.push(team);
    }
    prevMatch = item[0] + String(item[1]).trim();
  });

  return martial;
}

/** Danh sách nội dung -> các dòng bảng/Excel chuẩn (giống martialStandardArray) */
export function toMartialStandardRows(martialArrayRaw: any[][]): any[][] {
  const rows: any[][] = [];
  const seen = new Set<string>();
  let matchNo = 0;
  let prevMatch = '';

  martialArrayRaw.forEach((item) => {
    const matchName = String(item[1]).trim();
    if (seen.has(matchName)) {
      if (prevMatch !== item[0] + matchName) matchNo++;
    } else {
      seen.add(matchName);
      rows.push([matchName, '', '', '', '']);
      matchNo = 1;
    }
    rows.push([matchNo, matchName, String(item[2]).trim(), String(item[3]).trim(), String(item[4]).trim()]);
    prevMatch = item[0] + matchName;
  });

  return rows;
}
