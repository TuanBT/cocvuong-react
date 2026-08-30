import React, { useMemo, useState } from 'react';

export interface PickableUser {
  uid: string;
  name: string;
  email: string;
  photo?: string;
}

interface UserPickerProps {
  users: PickableUser[];
  /** Nguoi da co mat roi — van hien nhung mo di va khong bam duoc */
  excludeUids?: string[];
  onPick: (user: PickableUser) => void;
  /** uid dang duoc chon — de tick lai cho nguoi dung thay minh vua bam gi */
  selectedUid?: string;
  placeholder?: string;
  /** So dong hien khi chua go gi. Go tim thi bo gioi han. */
  limit?: number;
}

/**
 * Bang chon nguoi co o tim kiem.
 *
 * Tim theo ca **uid** chu khong chi ten/email: khi phai go roi mot ca kho, thu
 * duy nhat trong tay thuong la uid nguoi ta doc qua dien thoai — do cung la
 * thu duy nhat khong the trung nhau giua hai tai khoan cung ten.
 */
const UserPicker: React.FC<UserPickerProps> = ({
  users,
  excludeUids = [],
  onPick,
  selectedUid,
  placeholder = 'Tìm theo tên, email hoặc mã tài khoản…',
  limit = 6,
}) => {
  const [q, setQ] = useState('');

  const excluded = useMemo(() => new Set(excludeUids), [excludeUids]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sorted = users
      .slice()
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, 'vi'));
    if (!needle) return sorted.slice(0, limit);
    return sorted.filter(
      (u) =>
        u.name?.toLowerCase().includes(needle) ||
        u.email?.toLowerCase().includes(needle) ||
        u.uid.toLowerCase().includes(needle)
    );
  }, [users, q, limit]);

  const hidden = !q.trim() && users.length > matches.length ? users.length - matches.length : 0;

  return (
    <div>
      <div className="relative mb-2">
        <i
          className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
            text-slate-300 text-xs"
          aria-hidden="true"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-control
            focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
        />
      </div>

      {matches.length === 0 ? (
        <p className="m-0 text-xs text-slate-400 italic py-2">
          Không có ai khớp. Người đó phải đăng nhập vào app ít nhất một lần thì mới có trong danh sách.
        </p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {matches.map((u) => {
            const off = excluded.has(u.uid);
            const on = selectedUid === u.uid;
            return (
              <button
                key={u.uid}
                type="button"
                disabled={off}
                onClick={() => onPick(u)}
                className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-control
                  border transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                  ${on
                    ? 'border-accent-500 bg-accent-50'
                    : 'border-slate-200 bg-white hover:border-accent-400 hover:bg-accent-50/40'}`}
              >
                {u.photo ? (
                  <img src={u.photo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center
                    text-slate-500 text-xs font-bold flex-shrink-0">
                    {(u.name || u.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-800 truncate">{u.name || '(chưa có tên)'}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{u.email}</span>
                </span>
                {off && <span className="text-[10px] text-slate-400 flex-shrink-0">đã có</span>}
                {on && <i className="fa-solid fa-check text-accent-600 flex-shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {hidden > 0 && (
        <p className="m-0 mt-1.5 text-[11px] text-slate-400">
          Còn {hidden} người nữa — gõ để tìm.
        </p>
      )}
    </div>
  );
};

export default UserPicker;
