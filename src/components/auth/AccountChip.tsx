import React, { useState } from 'react';
import { AppUser, signOut } from '../../services/authService';

interface AccountChipProps {
  user: AppUser;
  /** Chu nho duoi ten, vi du "Sân A · Đối kháng" */
  subtitle?: string;
  /** Nen toi (man hinh trinh chieu) hay nen sang (trang co cuon) */
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * Anh + ten tai khoan dang truc, bam vao ra nut Dang xuat.
 *
 * May giam sat thuong la laptop dung chung. Khong hien ten ai dang dang nhap
 * thi nguoi ngoi sau se cham diem bang quyen cua nguoi ngoi truoc — va bang
 * "Dang truc" sau giai se ghi nham nguoi khi co khieu nai diem.
 */
const AccountChip: React.FC<AccountChipProps> = ({
  user,
  subtitle,
  tone = 'light',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const dark = tone === 'dark';

  // Phien an danh (che do dung thu) khong co ten that — dung goi ho la
  // "Nguoi dung" roi de nut Dang xuat cho ho bam vao hu khong
  const guest = user.isAnonymous;
  const displayName = guest ? 'Khách dùng thử' : user.name;
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={user.email}
        className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full transition-colors
          ${dark
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm'}`}
      >
        {user.photo ? (
          <img src={user.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-accent-600 text-white text-xs font-bold
            flex items-center justify-center">{initial}</span>
        )}
        <span className="text-xs font-medium max-w-[9rem] truncate">{displayName}</span>
        <i className="fa-solid fa-chevron-down text-[10px] opacity-60" aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Bam ra ngoai de dong — khong dung onBlur vi nut Dang xuat ben
              trong se mat su kien click truoc khi kip chay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} role="presentation" />

          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-card
            shadow-pop border border-slate-200 overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <p className="m-0 text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              {user.email && <p className="m-0 text-xs text-slate-500 truncate">{user.email}</p>}
              {subtitle && (
                <p className="m-0 mt-1.5 text-xs text-accent-700 font-medium">{subtitle}</p>
              )}
            </div>

            {guest ? (
              <>
                <p className="m-0 px-3 py-2 text-[11px] text-slate-400 leading-snug">
                  Đang xem thử, chưa đăng nhập. Muốn dùng cho giải thật thì đăng nhập bằng Google.
                </p>
                <a
                  href="/login"
                  className="block px-3 py-2.5 text-sm font-medium text-accent-700
                    hover:bg-accent-50 transition-colors border-t border-slate-100"
                >
                  <i className="fa-brands fa-google mr-2" aria-hidden="true" />
                  Đăng nhập bằng Google
                </a>
              </>
            ) : (
              <>
                <p className="m-0 px-3 py-2 text-[11px] text-slate-400 leading-snug">
                  Máy dùng chung? Đăng xuất khi rời bàn để người sau không chấm bằng quyền của bạn.
                </p>
                <button
                  type="button"
                  onClick={() => signOut().then(() => window.location.reload())}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600
                    hover:bg-red-50 transition-colors border-t border-slate-100"
                >
                  <i className="fa-solid fa-right-from-bracket mr-2" aria-hidden="true" />
                  Đăng xuất
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AccountChip;
