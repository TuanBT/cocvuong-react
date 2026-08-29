import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/img/logo.png';

interface PageHeaderProps {
  title: string;
  /** Class Font Awesome cho o icon canh tieu de */
  icon: string;
  /** Ten giai dau, hien ben phai; xuong dong theo ky tu \n */
  badge?: string;
  /**
   * Goc phai cua CHINH dong tieu de — cho anh tai khoan.
   *
   * Co cho rieng thay vi de nguoi goi nhet vao `children`: nhet vao `children`
   * la de ra han mot hang moi chi de khoe ai dang dang nhap, tren mot thanh
   * sticky von phai gon.
   */
  action?: React.ReactNode;
  /** Noi dung phu chen vao hang duoi (bo loc, nut...) */
  children?: React.ReactNode;
}

/**
 * Thanh tieu de dung chung cho cac trang co cuon.
 * Truoc day 4 trang chep lai cung mot khoi markup, moi trang lech mau mot kieu.
 *
 * Bo cuc: 3 cot tren man hinh rong, xep chong tren dien thoai doc.
 * Khong dung `absolute left-1/2` nhu ban cu vi ten giai dai se de len tieu de.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, icon, badge, action, children }) => (
  <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          title="Về trang chủ"
          className="flex items-center p-2 bg-white border border-slate-200 rounded-control
            shadow-sm hover:border-slate-300 hover:shadow transition-all flex-shrink-0"
        >
          <img src={logo} alt="Cóc Vương" className="h-7 w-auto" />
        </Link>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-9 h-9 bg-accent-600 rounded-control flex items-center justify-center
            shadow-sm flex-shrink-0">
            <i className={`${icon} text-white text-sm`} aria-hidden="true" />
          </span>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 m-0 truncate">{title}</h1>
        </div>

        {badge && (
          <div className="hidden md:block bg-accent-50 border border-accent-200 rounded-control
            px-3 py-1.5 max-w-[280px] flex-shrink-0">
            <p className="text-xs text-accent-700 font-medium whitespace-pre-line line-clamp-2 m-0"
              title={badge}>
              {badge}
            </p>
          </div>
        )}

        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {/* Tren dien thoai ten giai xuong hang rieng thay vi bi cat mat */}
      {badge && (
        <p className="md:hidden mt-2 mb-0 text-xs text-accent-700 font-medium whitespace-pre-line
          bg-accent-50 border border-accent-200 rounded-control px-3 py-1.5">
          {badge}
        </p>
      )}

    </div>

    {/* Bo loc nam trong cung khoi sticky voi tieu de: cuon xuong sau danh sach
        dai van doi duoc giai / hang can ma khong phai cuon nguoc len */}
    {children && (
      <div className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 space-y-2">{children}</div>
      </div>
    )}
  </header>
);

export default React.memo(PageHeader);
