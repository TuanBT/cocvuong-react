import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/img/logo.png';
import { AppFooter } from '../components/ui';

interface HomeContainerProps {}

type MenuGroupId = 'combat' | 'martial' | 'tool';

interface MenuItem {
  title: string;
  icon: string;
  path: string;
  description: string;
}

interface MenuGroup {
  id: MenuGroupId;
  label: string;
  icon: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'combat',
    label: 'Đối kháng',
    icon: 'fa-solid fa-hand-back-fist',
    items: [
      {
        title: 'Giám sát đối kháng',
        icon: 'fa-solid fa-tv',
        path: 'giam-sat-doi-khang',
        description: 'Màn hình trình chiếu trận đấu',
      },
      {
        title: 'Giám định đối kháng',
        icon: 'fa-solid fa-table-columns',
        path: 'giam-dinh-doi-khang',
        description: 'Bấm điểm cho giám định',
      },
    ],
  },
  {
    id: 'martial',
    label: 'Thi quyền',
    icon: 'fa-solid fa-hand-fist',
    items: [
      {
        title: 'Giám sát thi quyền',
        icon: 'fa-solid fa-desktop',
        path: 'giam-sat-thi-quyen',
        description: 'Màn hình trình chiếu thi quyền',
      },
      {
        title: 'Giám định thi quyền',
        icon: 'fa-solid fa-calculator',
        path: 'giam-dinh-thi-quyen',
        description: 'Nhập điểm cho giám định',
      },
    ],
  },
  {
    id: 'tool',
    label: 'Chuẩn bị & tra cứu',
    icon: 'fa-solid fa-toolbox',
    items: [
      {
        title: 'Tạo giải',
        icon: 'fa-solid fa-file-arrow-up',
        path: 'tao-giai',
        description: 'Nhập danh sách, bốc thăm, xếp trận',
      },
      {
        title: 'Thiết đặt',
        icon: 'fa-solid fa-gear',
        path: 'thiet-dat',
        description: 'Thời gian hiệp, số giám định, mật khẩu',
      },
      {
        title: 'Thông tin đối kháng',
        icon: 'fa-solid fa-sitemap',
        path: 'thong-tin-doi-khang',
        description: 'Danh sách trận và sơ đồ thi đấu',
      },
      {
        title: 'Thông tin thi quyền',
        icon: 'fa-solid fa-table-list',
        path: 'thong-tin-thi-quyen',
        description: 'Điểm từng giám định và xếp hạng',
      },
    ],
  },
];

/**
 * Trang chu - diem vao cho ca 4 nhom nguoi dung (giam sat, giam dinh, ban to
 * chuc, nguoi xem).
 *
 * Menu duoc gom theo nhom thay vi mot luoi 8 o phang: giam dinh mo may len
 * chi can tim dung mot o, gom nhom lam viec do nhanh hon han.
 * Moi o co ghi thiet bi chinh vi cung mot giai chay tren TV, laptop va dien
 * thoai cung luc.
 *
 * Khong dung state cho hieu ung vao trang: dong tac do CSS lo, tranh mot lan
 * ve lai toan trang va tranh viec noi dung vo hinh neu JS cham.
 */
class HomeContainer extends Component<HomeContainerProps> {
  constructor(props: HomeContainerProps) {
    super(props);
    document.title = 'Cóc Vương - Hệ thống chấm điểm Vovinam';
  }

  render() {
    let cardIndex = 0;

    return (
      <div data-accent="brand" className="min-h-screen flex flex-col select-text
        bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <header className="px-4 pt-10 pb-8 text-center animate-fade-in">
          <div className="inline-flex bg-white p-3.5 rounded-card shadow-card mb-5">
            <img src={logo} alt="Cóc Vương" className="h-14 w-auto" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">Cóc Vương</h1>
          <p className="text-slate-500 text-base sm:text-lg m-0">
            Hệ thống chấm điểm Vovinam
          </p>
        </header>

        <main className="flex-1 px-4 pb-12">
          <div className="max-w-6xl mx-auto space-y-8">
            {MENU_GROUPS.map((group) => (
              <section key={group.id} data-accent={group.id}>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide
                  text-slate-500 mb-3">
                  <span className="w-6 h-6 rounded-md bg-accent-600 flex items-center justify-center">
                    <i className={`${group.icon} text-white text-[11px]`} aria-hidden="true" />
                  </span>
                  {group.label}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {group.items.map((item) => {
                    cardIndex += 1;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        style={{ animationDelay: `${cardIndex * 40}ms` }}
                        className="group relative flex flex-col bg-white rounded-card p-5
                          border border-slate-200 shadow-card animate-pop-in
                          hover:border-accent-200 hover:shadow-card-hover
                          hover:-translate-y-0.5 transition-[transform,box-shadow,border-color] duration-200"
                      >
                        <span className="w-12 h-12 rounded-control bg-accent-600 flex items-center
                          justify-center mb-4 shadow-sm">
                          <i className={`${item.icon} text-xl text-white`} aria-hidden="true" />
                        </span>

                        <h3 className="text-slate-800 font-semibold text-base mb-1">{item.title}</h3>
                        <p className="text-slate-500 text-sm m-0 flex-1">{item.description}</p>

                        {/* Mui ten nam trong luong, khong dat absolute: the cao
                            nhat trong hang se day no xuong day thay vi de len chu */}
                        <span className="mt-3 h-4 flex justify-end">
                          <i className="fa-solid fa-arrow-right text-accent-600 opacity-0
                            -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0
                            transition-all duration-200" aria-hidden="true" />
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>

        <AppFooter />
      </div>
    );
  }
}

export default HomeContainer;
