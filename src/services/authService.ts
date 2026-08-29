/**
 * Auth Service
 *
 * Hai duong vao, co tinh khac nhau:
 *
 * - **Google** cho chu giai va giam sat. Co man hinh dang nhap that, co nut
 *   dang xuat, co ten va anh hien tren man hinh.
 * - **An danh** cho giam dinh. Hoan toan NGAM: khong mot chu "dang nhap" nao
 *   xuat hien tren duong di cua giam dinh. Van phai co vi security rules can
 *   `auth.uid` de troi mot ma vao dung mot thiet bi.
 *
 * `signInWithPopup` chu khong phai `signInWithRedirect`: Safari tren iPhone
 * chan storage ben thu ba, ma authDomain (`*.firebaseapp.com`) khac domain
 * app (`cocvuong.com`) - redirect se quay ve tay khong.
 */
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../firebase';
import { saveUserProfile } from './userService';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  photo: string;
  isAnonymous: boolean;
}

export function toAppUser(u: User | null): AppUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email || '',
    name: u.displayName || u.email || 'Nguoi dung',
    photo: u.photoURL || '',
    isAnonymous: u.isAnonymous,
  };
}

export function getCurrentUser(): AppUser | null {
  return toAppUser(auth.currentUser);
}

/** Lang nghe thay doi tai khoan. Tra ve ham huy dang ky. */
export function onAuthChanged(cb: (user: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => cb(toAppUser(u)));
}

/**
 * Doi Firebase khoi phuc phien tu localStorage roi moi tra loi.
 *
 * Bat buoc phai cho: `auth.currentUser` ngay sau khi tai trang luon la null
 * du nguoi dung dang co phien. Ky an danh moi ngay luc do se sinh uid moi va
 * ma giam dinh dang claim se bi khoa nham.
 */
export function waitForAuthReady(): Promise<AppUser | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(toAppUser(u));
    });
  });
}

/** Doi tieng Viet cho cac loi hay gap cua popup Google. */
export function describeAuthError(err: any): string {
  const code = String(err?.code || '');
  if (code.includes('popup-blocked')) {
    return 'Trinh duyet da chan cua so dang nhap. Cho phep pop-up cho trang nay roi thu lai.';
  }
  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
    return 'Ban da dong cua so dang nhap.';
  }
  if (code.includes('network-request-failed')) {
    return 'Mat ket noi mang. Kiem tra lai duong truyen roi thu lai.';
  }
  if (code.includes('unauthorized-domain')) {
    return 'Ten mien nay chua duoc cho phep dang nhap. Bao ban to chuc them vao Authorized domains.';
  }
  if (code.includes('operation-not-allowed')) {
    return 'Cach dang nhap nay chua duoc bat trong Firebase Console.';
  }
  return err?.message || 'Dang nhap khong thanh cong. Thu lai giup.';
}

/**
 * Dang nhap Google. Ghi luon ho so vao `users/{uid}` de trang quan tri tra
 * duoc uid -> nguoi that; loi ghi ho so khong duoc lam hong lan dang nhap.
 */
export async function signInWithGoogle(): Promise<AppUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const cred = await signInWithPopup(auth, provider);
  const user = toAppUser(cred.user)!;

  try {
    await saveUserProfile(user);
  } catch {
    /* ho so chi phuc vu trang quan tri - khong chan dang nhap */
  }

  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Bao dam co mot `auth.uid` de ghi duoc, khong hoi gi nguoi dung.
 *
 * Da dang nhap Google roi thi giu nguyen tai khoan do — chu giai tu vao cham
 * o may giam dinh van phai la chinh ho, khong bi ha xuong an danh.
 */
export async function ensureAnonymous(): Promise<AppUser> {
  const existing = await waitForAuthReady();
  if (existing) return existing;

  const cred = await signInAnonymously(auth);
  return toAppUser(cred.user)!;
}

/** Dang co tai khoan Google that (khong phai phien an danh) hay khong. */
export function isSignedInWithGoogle(): boolean {
  const u = auth.currentUser;
  return !!u && !u.isAnonymous;
}
