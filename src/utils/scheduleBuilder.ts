/**
 * Schedule Builder — Sinh lịch thi đấu Đối Kháng
 *
 * Tách nguyên văn từ createTournament.container.tsx (initSchemaFighters /
 * getschedule / changeMatchNumber / arrangeCombat) để logic sắp lịch có thể
 * được test trực tiếp thay vì phải copy sang test.
 *
 * LƯU Ý: hành vi giữ nguyên 100% so với bản trong container. Mọi thay đổi ở
 * đây sẽ đổi cách giải đấu được sắp lịch.
 */

// ==================== Types ====================

export interface MatchFighter {
  name: string | number;
  code: string;
  country: string;
  result: string;
}

export interface MatchSchema {
  match: number;
  weight: string | number;
  type: string;
  redFighter: MatchFighter;
  blueFighter: MatchFighter;
}

/** Thứ tự ưu tiên khi sắp xếp các trận theo loại trận */
export const TYPE_ORDER: { [key: string]: number } = {
  'Vòng loại-1': 0,
  'Vòng loại-2': 1,
  'Vòng loại-3': 2,
  'Bán Kết': 3,
  'Chung Kết': 4,
};

export const COMBAT_ARRANGE_HEADER: string[] = [
  "TRẬN", "HẠNG CÂN", "LOẠI TRẬN",
  "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ",
  "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH",
];

// ==================== Schema nhánh đấu ====================
// Index = số vận động viên trong hạng cân (0..22)

export const SCHEMA_FIGHTERS: string[] = [];
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
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-1","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":11,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":12,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":13,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}}]');//14
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-1","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-1","redFighter":{"name":14,"code":"","country":"","result":""},"blueFighter":{"name":15,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":12,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":13,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}},{"match":14,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.12","code":"","country":"","result":"W.12"},"blueFighter":{"name":"W.13","code":"","country":"","result":"W.13"}}]');//15
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-1","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-1","redFighter":{"name":13,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-1","redFighter":{"name":15,"code":"","country":"","result":""},"blueFighter":{"name":16,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":12,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":13,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":14,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}},{"match":15,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":"W.14","code":"","country":"","result":"W.14"}}]');//16
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-2","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":14,"code":"","country":"","result":""},"blueFighter":{"name":15,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":16,"code":"","country":"","result":""},"blueFighter":{"name":17,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":11,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":12,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":13,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":14,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}},{"match":15,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.12","code":"","country":"","result":"W.12"},"blueFighter":{"name":"W.13","code":"","country":"","result":"W.13"}},{"match":16,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.14","code":"","country":"","result":"W.14"},"blueFighter":{"name":"W.15","code":"","country":"","result":"W.15"}}]');//17
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-3","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":13,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":15,"code":"","country":"","result":""},"blueFighter":{"name":16,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":17,"code":"","country":"","result":""},"blueFighter":{"name":18,"code":"","country":"","result":""}},{"match":11,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":12,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":13,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":14,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":15,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}},{"match":16,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":"W.14","code":"","country":"","result":"W.14"}},{"match":17,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.15","code":"","country":"","result":"W.15"},"blueFighter":{"name":"W.16","code":"","country":"","result":"W.16"}}]');//18
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":16,"code":"","country":"","result":""},"blueFighter":{"name":17,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":15,"code":"","country":"","result":""},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":18,"code":"","country":"","result":""},"blueFighter":{"name":19,"code":"","country":"","result":""}},{"match":12,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":13,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":14,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":15,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}},{"match":16,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.12","code":"","country":"","result":"W.12"},"blueFighter":{"name":"W.13","code":"","country":"","result":"W.13"}},{"match":17,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.14","code":"","country":"","result":"W.14"},"blueFighter":{"name":"W.15","code":"","country":"","result":"W.15"}},{"match":18,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.16","code":"","country":"","result":"W.16"},"blueFighter":{"name":"W.17","code":"","country":"","result":"W.17"}}]');//19
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":13,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":17,"code":"","country":"","result":""},"blueFighter":{"name":18,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":15,"code":"","country":"","result":""}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":16,"code":"","country":"","result":""},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":12,"weight":1,"type":"Vòng loại-2","redFighter":{"name":19,"code":"","country":"","result":""},"blueFighter":{"name":20,"code":"","country":"","result":""}},{"match":13,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":14,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":15,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":16,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}},{"match":17,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":"W.14","code":"","country":"","result":"W.14"}},{"match":18,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":"","result":"W.15"},"blueFighter":{"name":"W.16","code":"","country":"","result":"W.16"}},{"match":19,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.17","code":"","country":"","result":"W.17"},"blueFighter":{"name":"W.18","code":"","country":"","result":"W.18"}}]');//20
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":14,"code":"","country":"","result":""},"blueFighter":{"name":15,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":19,"code":"","country":"","result":""},"blueFighter":{"name":20,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":16,"code":"","country":"","result":""}},{"match":12,"weight":1,"type":"Vòng loại-2","redFighter":{"name":17,"code":"","country":"","result":""},"blueFighter":{"name":18,"code":"","country":"","result":""}},{"match":13,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":21,"code":"","country":"","result":""}},{"match":14,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":15,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":16,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}},{"match":17,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.12","code":"","country":"","result":"W.12"},"blueFighter":{"name":"W.13","code":"","country":"","result":"W.13"}},{"match":18,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":"","result":"W.15"},"blueFighter":{"name":"W.16","code":"","country":"","result":"W.16"}},{"match":19,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.16","code":"","country":"","result":"W.16"},"blueFighter":{"name":"W.17","code":"","country":"","result":"W.17"}},{"match":20,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.18","code":"","country":"","result":"W.18"},"blueFighter":{"name":"W.19","code":"","country":"","result":"W.19"}}]');//21
SCHEMA_FIGHTERS.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":13,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":15,"code":"","country":"","result":""},"blueFighter":{"name":16,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-1","redFighter":{"name":20,"code":"","country":"","result":""},"blueFighter":{"name":21,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":12,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":17,"code":"","country":"","result":""}},{"match":13,"weight":1,"type":"Vòng loại-2","redFighter":{"name":18,"code":"","country":"","result":""},"blueFighter":{"name":19,"code":"","country":"","result":""}},{"match":14,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":22,"code":"","country":"","result":""}},{"match":15,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":16,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":17,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}},{"match":18,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":"W.14","code":"","country":"","result":"W.14"}},{"match":19,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":"","result":"W.15"},"blueFighter":{"name":"W.16","code":"","country":"","result":"W.16"}},{"match":20,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.17","code":"","country":"","result":"W.17"},"blueFighter":{"name":"W.18","code":"","country":"","result":"W.18"}},{"match":21,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.19","code":"","country":"","result":"W.19"},"blueFighter":{"name":"W.20","code":"","country":"","result":"W.20"}}]');//22

// ==================== Sinh lịch cho 1 hạng cân ====================

/**
 * Sinh lịch thi đấu cho 1 nhóm VĐV cùng hạng cân.
 * `fighters` là mảng dòng thô: [stt, hạng cân, tên, code, quốc gia]
 *
 * Nguyên văn getschedule() trong createTournament.container.tsx
 */
export function getSchedule(fighters: any[][]): MatchSchema[] {
  const schemaFighter = JSON.parse(SCHEMA_FIGHTERS[fighters.length]) as MatchSchema[];
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
 * Dịch số trận của cả nhóm sang mốc mới, đồng thời dịch các tham chiếu W.x
 *
 * Phải dịch CẢ `name` LẪN `result`:
 *   - `name`   là thứ hiển thị trên màn hình
 *   - `result` là thứ replaceFighter() dò theo để điền VĐV thắng vào trận sau
 *
 * Bản cũ chỉ dịch `name`. Vòng đánh số lại ở buildMatchesFromGroups() chỉ vá
 * được những ô có trận nguồn ĐỔI SỐ, nên ô nào trận nguồn giữ nguyên số sẽ kẹt
 * `result` ở giá trị thô của schema — trỏ sang hạng cân khác. Hậu quả: VĐV
 * thắng bị điền vào chung kết của hạng cân khác, còn chung kết đúng thì không
 * bao giờ nhận được VĐV và giải không chạy hết được.
 * (Giải thật trên DB dev dính đúng lỗi này ở trận 71 — Chung Kết 73kg nam mang
 * result "W.7"/"W.8" trỏ sang 68kg nam.)
 */
export function changeMatchNumber(groupMatch: MatchSchema[], newMatchNumber: number): MatchSchema[] {
  const variance = newMatchNumber - groupMatch[0].match;

  const shift = (value: string): string => {
    const number = parseFloat(String(value).split('.')[1]);
    return 'W.' + (number + variance);
  };

  groupMatch.forEach(match => {
    match.match += variance;
    for (const side of ['redFighter', 'blueFighter'] as const) {
      const fighter = match[side];
      if (String(fighter.name).includes('W.')) {
        fighter.name = shift(String(fighter.name));
      }
      if (String(fighter.result).includes('W.')) {
        fighter.result = shift(String(fighter.result));
      }
    }
  });

  return groupMatch;
}

// ==================== Sắp lịch toàn giải ====================

/**
 * Sắp xếp danh sách VĐV thô: hạng cân đông VĐV nhất lên trước.
 * CẢNH BÁO: sort tại chỗ (mutate) — giống hệt bản trong container.
 */
export function sortFightersByCategory(combatArrayRaw: any[][]): any[][] {
  const weightCount: { [key: string]: number } = {};
  combatArrayRaw.forEach((fighter) => {
    const weight = fighter[1];
    weightCount[weight] = (weightCount[weight] || 0) + 1;
  });

  combatArrayRaw.sort((a, b) => {
    const weightA = a[1];
    const weightB = b[1];
    const countA = weightCount[weightA];
    const countB = weightCount[weightB];

    if (countB !== countA) {
      return countB - countA;
    }

    if (weightA !== weightB) {
      if (weightA.includes('>') && !weightB.includes('>')) {
        return 1;
      } else if (!weightA.includes('>') && weightB.includes('>')) {
        return -1;
      }
      return weightA.localeCompare(weightB);
    }

    return combatArrayRaw.indexOf(a) - combatArrayRaw.indexOf(b);
  });

  return combatArrayRaw;
}

/** Gom VĐV theo hạng cân, giữ nguyên thứ tự đã sắp */
export function groupFightersByCategory(combatArrayRaw: any[][]): Map<string, any[][]> {
  const groupedData = new Map<string, any[][]>();
  combatArrayRaw.forEach(item => {
    const weight = String(item[1]).trim();
    if (groupedData.has(weight)) {
      groupedData.get(weight)!.push(item);
    } else {
      groupedData.set(weight, [item]);
    }
  });
  return groupedData;
}

/**
 * Từ các nhóm hạng cân -> danh sách trận đã đánh số liên tục toàn giải,
 * sắp theo loại trận (Vòng loại -> Bán Kết -> Chung Kết) và vá lại các
 * tham chiếu W.x cho khớp số trận mới.
 */
export function buildMatchesFromGroups(groupedData: Map<string, any[][]>): MatchSchema[] {
  const matchs: MatchSchema[] = [];
  let matchCount = 1;
  for (const value of groupedData.values()) {
    const groupMatch = getSchedule(value);
    changeMatchNumber(groupMatch, matchCount);

    groupMatch.forEach(match => {
      matchs.push(match);
    });
    matchCount += groupMatch.length;
  }

  matchs.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);

  // Đánh lại số trận theo thứ tự mới; dùng "W..x" làm mốc tạm để tránh
  // vá chồng lên tham chiếu vừa vá.
  for (let i = 0; i < matchs.length; i++) {
    const oldMatchNo = matchs[i].match;
    const newMatchNo = i + 1;
    if (matchs[i].match !== newMatchNo) {
      matchs[i].match = newMatchNo;
      for (let j = 0; j < matchs.length; j++) {
        if (matchs[j].redFighter.name === "W." + oldMatchNo) {
          matchs[j].redFighter.name = "W.." + newMatchNo;
          matchs[j].redFighter.result = "W.." + newMatchNo;
        }
        if (matchs[j].blueFighter.name === "W." + oldMatchNo) {
          matchs[j].blueFighter.name = "W.." + newMatchNo;
          matchs[j].blueFighter.result = "W.." + newMatchNo;
        }
      }
    }
  }
  for (let i = 0; i < matchs.length; i++) {
    matchs[i].redFighter.name = String(matchs[i].redFighter.name).replace(/W\.\.(\d+)/g, "W.$1");
    matchs[i].blueFighter.name = String(matchs[i].blueFighter.name).replace(/W\.\.(\d+)/g, "W.$1");
    matchs[i].redFighter.result = String(matchs[i].redFighter.result).replace(/W\.\.(\d+)/g, "W.$1");
    matchs[i].blueFighter.result = String(matchs[i].blueFighter.result).replace(/W\.\.(\d+)/g, "W.$1");
  }

  return matchs;
}

/**
 * Sắp lịch toàn giải từ danh sách VĐV thô.
 *
 * @param combatArrayRaw mảng dòng [stt, hạng cân, tên, code, quốc gia].
 *   CẢNH BÁO: bị sort tại chỗ, giống hệt hành vi cũ trong container.
 * @param onGroups hook chạy sau khi gom nhóm, trước khi sinh trận —
 *   dùng cho bước áp hạt giống của wizard.
 */
export function buildCombatSchedule(
  combatArrayRaw: any[][],
  onGroups?: (groupedData: Map<string, any[][]>) => void
): MatchSchema[] {
  sortFightersByCategory(combatArrayRaw);
  const groupedData = groupFightersByCategory(combatArrayRaw);
  if (onGroups) onGroups(groupedData);
  return buildMatchesFromGroups(groupedData);
}

// ==================== Xuất kết quả ====================

/** Danh sách trận -> các dòng bảng/Excel (khớp COMBAT_ARRANGE_HEADER) */
export function toStandardRows(matchs: MatchSchema[]): any[][] {
  return matchs.map(value => [
    value.match,
    value.weight,
    String(value.type).split('-')[0],
    value.redFighter.name, value.redFighter.code, value.redFighter.country,
    value.blueFighter.name, value.blueFighter.code, value.blueFighter.country,
  ]);
}

/**
 * Danh sách trận -> mảng object trận đấu để ghi lên Firebase.
 * `matchObjTemplate` là DEFAULT_MATCH_OBJ (truyền vào để module này không
 * phụ thuộc ngược lại constants).
 */
export function toCombatMatches<T extends { match: any; fighters: any }>(
  matchs: MatchSchema[],
  matchObjTemplate: T
): T[] {
  return matchs.map(value => {
    const matchObjTemp = JSON.parse(JSON.stringify(matchObjTemplate)) as T;
    matchObjTemp.match.no = value.match;
    matchObjTemp.match.category = String(value.weight);
    matchObjTemp.match.type = String(value.type).split('-')[0];
    matchObjTemp.fighters.redFighter.name = value.redFighter.name;
    matchObjTemp.fighters.redFighter.code = value.redFighter.code;
    matchObjTemp.fighters.redFighter.country = value.redFighter.country;
    matchObjTemp.fighters.redFighter.result = value.redFighter.result;
    matchObjTemp.fighters.blueFighter.name = value.blueFighter.name;
    matchObjTemp.fighters.blueFighter.code = value.blueFighter.code;
    matchObjTemp.fighters.blueFighter.country = value.blueFighter.country;
    matchObjTemp.fighters.blueFighter.result = value.blueFighter.result;
    return matchObjTemp;
  });
}
