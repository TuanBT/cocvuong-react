/**
 * Phan trang cho cac bang chon — truoc het la bang chon GIAI.
 *
 * Danh sach giai chi dai them chu khong bao gio ngan lai: to chuc vai mua giai
 * la bang chon dai vai chuc dong, trong khi thu can tim gan nhu luon nam o mot
 * dau (giai vua tao, hoac giai dang chay). Cuon het ca danh sach de toi dong
 * cuoi la viec khong ai muon lam lan thu hai.
 *
 * `paginate` KET trang vao khoang hop le thay vi bat noi goi tu lo: danh sach
 * co the ngan di ngay duoi tay — xoa mot giai, go them chu vao o tim — trong
 * khi so trang van nam trong state. Ket o day thi moi cho dung deu duoc bao ve
 * va khong cho nao phai viet rieng mot buoc "reset trang".
 */

export interface Paged<T> {
  /** Muc cua trang hien tai */
  items: T[];
  /** Trang DA ket vao khoang hop le — ve theo cai nay, dung ve theo state tho */
  page: number;
  pageCount: number;
  /** So thu tu muc dau / cuoi cua trang, dem tu 1. Danh sach rong thi ca hai la 0. */
  from: number;
  to: number;
  total: number;
}

export function paginate<T>(all: T[], page: number, size: number): Paged<T> {
  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safe = Math.min(Math.max(Math.floor(page) || 0, 0), pageCount - 1);
  const start = safe * size;
  const items = all.slice(start, start + size);

  return {
    items,
    page: safe,
    pageCount,
    total,
    from: total ? start + 1 : 0,
    to: start + items.length,
  };
}

/**
 * Trang chua muc thu `index` (dem tu 0).
 *
 * Dung khi trang tu chon san mot giai cho nguoi dung — deep link `?giai=N`, giai
 * dang cau hinh do, giai vua tao: chon ma khong nhay trang thi o da tich nam o
 * mot trang khong ai nhin thay.
 *
 * `index` am (khong tim thay) tra ve trang dau.
 */
export function pageOf(index: number, size: number): number {
  return index > 0 ? Math.floor(index / size) : 0;
}
