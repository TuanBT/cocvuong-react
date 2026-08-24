/**
 * Browser Shim — cho phép import code trong src/ (vốn viết cho trình duyệt)
 * chạy được trong Node.
 *
 * PHẢI được import TRƯỚC mọi import từ src/, vì offlineService.ts đụng tới
 * navigator/localStorage/window ngay khi các hàm của nó được gọi.
 */

interface StoreShim {
  [key: string]: string;
}

class LocalStorageShim {
  private store: StoreShim = {};

  get length(): number {
    return Object.keys(this.store).length;
  }
  key(i: number): string | null {
    return Object.keys(this.store)[i] ?? null;
  }
  getItem(k: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null;
  }
  setItem(k: string, v: string): void {
    this.store[k] = String(v);
  }
  removeItem(k: string): void {
    delete this.store[k];
  }
  clear(): void {
    this.store = {};
  }
}

const g = globalThis as any;

if (!g.localStorage) g.localStorage = new LocalStorageShim();
if (!g.navigator) g.navigator = { onLine: true };
else if (g.navigator.onLine === undefined) g.navigator.onLine = true;
if (!g.window) {
  g.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: g.localStorage,
    navigator: g.navigator,
  };
}

/** Giả lập mất mạng — smartSet/smartUpdate sẽ chuyển sang hàng đợi offline */
export function setOnline(online: boolean): void {
  g.navigator.onLine = online;
}

/** Xoá sạch localStorage giả (cache giải đấu + hàng đợi ghi offline) */
export function clearBrowserState(): void {
  g.localStorage.clear();
}

export {};
