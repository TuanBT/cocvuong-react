import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/img/logo.png';
import HeaderAccount from './HeaderAccount';
import { AppUser } from '../../services/authService';

interface AppTopBarProps {
  /** Rong = chua dang nhap; luc do hien loi moi dang nhap thay cho anh tai khoan */
  user: AppUser | null;
  /** Chu nho duoi ten trong menu tai khoan, vi du "Sân A · Đối kháng" */
  subtitle?: string;
  /** Muc phu chen giua logo va goc phai */
  children?: React.ReactNode;
  /**
   * Tat logo khi trang o duoi da co mot cai to hon (trang chu).
   *
   * Hai logo chong nhau tren mot man hinh khong lam ai nho ten app hon, chi
   * lam thanh tren cung trong nhu mot manh vun cua khoi ben duoi.
   */
  showLogo?: boolean;
  className?: string;
}

/**
 * Thanh tren cung cho cac trang KHONG dung `PageHeader`.
 *
 * `PageHeader` bat buoc phai co tieu de va o icon — dung cho cac trang cong
 * cu. Nhung trang chu va may man cong (xin quyen, cho duyet) thi khong co
 * "tieu de trang" nao ca: chung tu gioi thieu bang khoi noi dung o giua. Truoc
 * day vi vay ma chung khong co thanh tren cung nao — va do la cho duy nhat
 * chuong bao don khong bam vao dau duoc, dung luc chu giai hay ngoi o trang
 * chu nhat.
 *
 * Nen thanh nay chi giu dung ba thu: **logo ve trang chu · chuong · tai
 * khoan**. Khong tieu de, khong menu — de trang o duoi van la thu nguoi ta
 * nhin thay truoc.
 */
const AppTopBar: React.FC<AppTopBarProps> = ({
  user, subtitle, children, showLogo = true, className = '',
}) => (
  <header
    className={`bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30
      flex-shrink-0 ${className}`}
  >
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-3">
      {showLogo && (
        <Link
          to="/"
          title="Về trang chủ"
          className="flex items-center p-2 bg-white border border-slate-200 rounded-control
            shadow-sm hover:border-slate-300 hover:shadow transition-all flex-shrink-0"
        >
          <img src={logo} alt="Cóc Vương" className="h-7 w-auto" />
        </Link>
      )}

      <div className="min-w-0 flex-1">{children}</div>

      {user ? (
        <div className="flex-shrink-0">
          <HeaderAccount user={user} subtitle={subtitle} />
        </div>
      ) : (
        <Link
          to="/login"
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-control text-sm
            font-medium text-slate-700 bg-white border border-slate-200 shadow-sm
            hover:border-slate-400 transition-colors no-underline"
        >
          <i className="fa-brands fa-google text-accent-600" aria-hidden="true" />
          <span className="hidden sm:inline">Đăng nhập</span>
        </Link>
      )}
    </div>
  </header>
);

export default AppTopBar;
