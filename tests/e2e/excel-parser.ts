/**
 * Excel Parser — Port logic sinh bracket từ app thật
 * 
 * Đọc file Excel data_doikhang_tho.xlsx → parse → sinh lịch thi đấu
 * Logic copy trung thực từ createTournament.container.tsx
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// ==================== Types ====================

export interface MatchFighter {
  name: string;
  code: string;
  country: string;
  result: string;
}

export interface MatchSchema {
  match: number;
  weight: string;
  type: string;
  redFighter: MatchFighter;
  blueFighter: MatchFighter;
}

export interface CategoryInfo {
  name: string;
  fighterCount: number;
  fighters: any[][];
}

// ==================== Schema Fighters ====================
// Copy nguyên 22 schema từ createTournament.container.tsx

const SCHEMA_FIGHTERS: string[] = [];
SCHEMA_FIGHTERS.push('[]');//0
SCHEMA_FIGHTERS.push('[]');//1
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Chung Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}}]'); //2
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Chung Kết","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}}]');//3
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Bán Kết","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}}]');//4
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}}]'); //5
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":4,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}}]');//6
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":5,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":6,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}}]');//7
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":6,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":7,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}}]');//8
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-2","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":7,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":8,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}}]');//9
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":8,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":9,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}}]');//10
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":10,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}}]');//11
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":11,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}}]');//12
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":11,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":12,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}}]');//13

// ==================== Excel Reader ====================

/**
 * Đọc file Excel và trả về mảng raw data
 */
export function parseExcelFile(filePath: string): any[][] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  
  const workbook = XLSX.readFile(absolutePath);
  const worksheet = workbook.Sheets['data'];
  if (!worksheet) {
    throw new Error(`Sheet "data" not found. Available: ${workbook.SheetNames.join(', ')}`);
  }
  
  const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  // Parse rows (skip header row 0)
  const rawData: any[][] = [];
  for (let i = 1; i < excelData.length; i++) {
    const values = excelData[i];
    if (values && values.length !== 0) {
      rawData.push([
        values[0] !== undefined ? values[0] : '',
        values[1] !== undefined ? String(values[1]).trim() : '',
        values[2] !== undefined ? String(values[2]).trim() : '',
        values[3] !== undefined ? String(values[3]).trim() : '',
        values[4] !== undefined ? String(values[4]).trim() : '',
      ]);
    }
  }
  
  return rawData;
}

/**
 * Lấy thông tin các hạng cân từ raw data
 */
export function getCategories(rawData: any[][]): CategoryInfo[] {
  const grouped = new Map<string, any[][]>();
  
  for (const row of rawData) {
    const weight = String(row[1]).trim();
    if (!grouped.has(weight)) {
      grouped.set(weight, []);
    }
    grouped.get(weight)!.push(row);
  }
  
  const categories: CategoryInfo[] = [];
  for (const [name, fighters] of grouped.entries()) {
    categories.push({ name, fighterCount: fighters.length, fighters });
  }
  
  // Sort: nhiều VĐV nhất trước
  categories.sort((a, b) => b.fighterCount - a.fighterCount);
  
  return categories;
}

/**
 * Lấy subset categories theo tên
 */
export function getCategoriesByName(rawData: any[][], names: string[]): CategoryInfo[] {
  const all = getCategories(rawData);
  return all.filter(c => names.includes(c.name));
}

// ==================== Bracket Generation ====================

/**
 * Sinh lịch thi đấu cho 1 nhóm VĐV — port từ getschedule()
 */
function getSchedule(fighters: any[][]): MatchSchema[] {
  const count = fighters.length;
  if (count < 2 || count >= SCHEMA_FIGHTERS.length) {
    throw new Error(`Unsupported fighter count: ${count} (must be 2-${SCHEMA_FIGHTERS.length - 1})`);
  }
  
  const schemaFighter = JSON.parse(SCHEMA_FIGHTERS[count]) as MatchSchema[];
  const matchs: MatchSchema[] = [];
  
  for (let i = 0; i < schemaFighter.length; i++) {
    const match = schemaFighter[i];
    
    if (!isNaN(parseFloat(String(match.weight)))) {
      match.weight = fighters[Number(match.weight) - 1][1];
    }
    
    if (!isNaN(parseFloat(String(match.redFighter.name)))) {
      const index = Number(match.redFighter.name);
      match.redFighter.name = fighters[index - 1][2];
      match.redFighter.code = fighters[index - 1][3];
      match.redFighter.country = fighters[index - 1][4];
    }
    if (!isNaN(parseFloat(String(match.blueFighter.name)))) {
      const index = Number(match.blueFighter.name);
      match.blueFighter.name = fighters[index - 1][2];
      match.blueFighter.code = fighters[index - 1][3];
      match.blueFighter.country = fighters[index - 1][4];
    }
    matchs.push(match);
  }
  
  return matchs;
}

/**
 * Đánh lại số trận — port từ changeMatchNumber()
 */
function changeMatchNumber(groupMatch: MatchSchema[], newMatchNumber: number): MatchSchema[] {
  const variance = newMatchNumber - groupMatch[0].match;
  groupMatch.forEach(match => {
    match.match += variance;
    if (String(match.redFighter.name).includes('W.')) {
      const number = parseFloat(String(match.redFighter.name).split('.')[1]);
      match.redFighter.name = 'W.' + (number + variance);
      match.redFighter.result = 'W.' + (number + variance);
    }
    if (String(match.blueFighter.name).includes('W.')) {
      const number = parseFloat(String(match.blueFighter.name).split('.')[1]);
      match.blueFighter.name = 'W.' + (number + variance);
      match.blueFighter.result = 'W.' + (number + variance);
    }
  });
  return groupMatch;
}

/**
 * Sinh toàn bộ lịch thi đấu từ raw data — port từ arrangeCombat()
 * 
 * @param rawData Mảng raw từ parseExcelFile
 * @param categoryFilter Chỉ sinh bracket cho các hạng cân này (null = tất cả)
 */
export function arrangeCombat(rawData: any[][], categoryFilter?: string[]): MatchSchema[] {
  // Group theo hạng cân
  const weightCount: { [key: string]: number } = {};
  rawData.forEach((fighter) => {
    const weight = fighter[1];
    weightCount[weight] = (weightCount[weight] || 0) + 1;
  });

  // Sort: nhiều VĐV trước, rồi alpha
  const sorted = [...rawData].sort((a, b) => {
    const weightA = a[1];
    const weightB = b[1];
    const countA = weightCount[weightA];
    const countB = weightCount[weightB];

    if (countB !== countA) return countB - countA;
    if (weightA !== weightB) {
      if (weightA.includes('>') && !weightB.includes('>')) return 1;
      if (!weightA.includes('>') && weightB.includes('>')) return -1;
      return weightA.localeCompare(weightB);
    }
    return rawData.indexOf(a) - rawData.indexOf(b);
  });

  // Group
  const groupedData = new Map<string, any[][]>();
  sorted.forEach(item => {
    const weight = String(item[1]).trim();
    if (groupedData.has(weight)) {
      groupedData.get(weight)!.push(item);
    } else {
      groupedData.set(weight, [item]);
    }
  });

  // Generate matches
  let allMatches: MatchSchema[] = [];
  let matchCount = 1;
  
  for (const [key, value] of groupedData.entries()) {
    if (categoryFilter && !categoryFilter.includes(key)) continue;
    
    const groupMatch = getSchedule(value);
    changeMatchNumber(groupMatch, matchCount);
    
    groupMatch.forEach(match => {
      allMatches.push(match);
    });
    matchCount += groupMatch.length;
  }

  // Sort by type order
  const typeOrder: { [key: string]: number } = {
    'Vòng loại-1': 0, 'Vòng loại-2': 1, 'Vòng loại-3': 2,
    'Bán Kết': 3, 'Chung Kết': 4
  };
  allMatches.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));

  // Re-number with W.x → W..y → W.y transform
  for (let i = 0; i < allMatches.length; i++) {
    const oldMatchNo = allMatches[i].match;
    const newMatchNo = i + 1;
    if (allMatches[i].match !== newMatchNo) {
      allMatches[i].match = newMatchNo;
      for (let j = 0; j < allMatches.length; j++) {
        if (allMatches[j].redFighter.name === 'W.' + oldMatchNo) {
          allMatches[j].redFighter.name = 'W..' + newMatchNo;
          allMatches[j].redFighter.result = 'W..' + newMatchNo;
        }
        if (allMatches[j].blueFighter.name === 'W.' + oldMatchNo) {
          allMatches[j].blueFighter.name = 'W..' + newMatchNo;
          allMatches[j].blueFighter.result = 'W..' + newMatchNo;
        }
      }
    }
  }
  
  // Replace W.. back to W.
  for (let i = 0; i < allMatches.length; i++) {
    allMatches[i].redFighter.name = allMatches[i].redFighter.name.replace(/W\.\.(\d+)/g, 'W.$1');
    allMatches[i].blueFighter.name = allMatches[i].blueFighter.name.replace(/W\.\.(\d+)/g, 'W.$1');
    allMatches[i].redFighter.result = allMatches[i].redFighter.result.replace(/W\.\.(\d+)/g, 'W.$1');
    allMatches[i].blueFighter.result = allMatches[i].blueFighter.result.replace(/W\.\.(\d+)/g, 'W.$1');
  }

  return allMatches;
}

/**
 * Convert MatchSchema thành CombatMatch format để ghi lên Firebase
 */
export function toCombatMatches(matches: MatchSchema[]): any[] {
  return matches.map(m => ({
    match: {
      no: m.match,
      category: m.weight,
      type: String(m.type).split('-')[0],
      win: '',
    },
    fighters: {
      redFighter: {
        name: m.redFighter.name,
        code: m.redFighter.code,
        country: m.redFighter.country,
        result: m.redFighter.result,
        score: 0,
        legStrike: false,
        caution: { remind: 0, warning: 0, medical: 0, fall: 0, bound: 0 },
      },
      blueFighter: {
        name: m.blueFighter.name,
        code: m.blueFighter.code,
        country: m.blueFighter.country,
        result: m.blueFighter.result,
        score: 0,
        legStrike: false,
        caution: { remind: 0, warning: 0, medical: 0, fall: 0, bound: 0 },
      },
    },
  }));
}
