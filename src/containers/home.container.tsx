import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/img/logo.png';
import { AppFooter, AppTopBar, Toast } from '../components/ui';
import { AppUser, onAuthChanged } from '../services/authService';
import { subscribeIsAdmin } from '../services/adminService';

interface HomeContainerProps {
  history?: { push: (path: string) => void };
}

interface HomeContainerState {
  user: AppUser | null;
  /** Cua vao trang quan tri chi hien cho admin — nguoi khac bam vao cung bi chan */
  isAdmin: boolean;
}

interface MenuItem {
  title: string;
  icon: string;
  path: string;
  description: string;
}

interface MenuGroup {
  id: 'combat' | 'martial' | 'tool';
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
        title: 'Thông tin đối kháng',
        icon: 'fa-solid fa-sitemap',
        path: 'thong-tin-doi-khang',
        description: 'Danh sách trận và sơ đồ thi đấu',
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
        title: 'Thông tin thi quyền',
        icon: 'fa-solid fa-table-list',
        path: 'thong-tin-thi-quyen',
        description: 'Điểm từng giám định và xếp hạng',
      },
    ],
  },
  {
    id: 'tool',
    label: 'Ban tổ chức',
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
        description: 'Bảng mã giám định, duyệt giám sát, mở/đóng giải',
      },
    ],
  },
];

/**
 * Trang chu — diem vao cho ca 4 nhom nguoi dung.
 *
 * Bo cuc dat theo **so nguoi**, khong theo so muc menu: giam dinh dong nhat
 * nen o "Vao bang ma" chiem han mot khoi rieng o tren cung, khong lan trong
 * luoi 8 o nhu truoc. Cac o con lai gom theo nhom viec.
 */
class HomeContainer extends Component<HomeContainerProps, HomeContainerState> {
  unsubscribe: (() => void) | null = null;
  unsubAdmin: (() => void) | null = null;
  state: HomeContainerState = { user: null, isAdmin: false };

  constructor(props: HomeContainerProps) {
    super(props);
    document.title = 'Cóc Vương - Hệ thống chấm điểm Vovinam';
  }

  componentDidMount() {
    this.unsubscribe = onAuthChanged((user) => {
      const real = user && !user.isAnonymous ? user : null;
      this.setState({ user: real });

      this.unsubAdmin?.();
      this.unsubAdmin = null;
      if (!real) {
        this.setState({ isAdmin: false });
        return;
      }
      // Nghe thay vi doc mot lan: cap quyen admin trong Console phai an ngay
      // o tab dang mo, khong bat nguoi ta tai lai trang moi thay cua vao
      this.unsubAdmin = subscribeIsAdmin(real.uid, (v) => this.setState({ isAdmin: v }));
    });
  }

  componentWillUnmount() {
    this.unsubscribe?.();
    this.unsubAdmin?.();
  }

  go(path: string) {
    if (this.props.history) this.props.history.push(path);
    else window.location.href = path;
  }

  render() {
    const { user, isAdmin } = this.state;
    let cardIndex = 0;

    return (
      <div data-accent="brand" className="min-h-screen flex flex-col select-text
        bg-gradient-to-b from-slate-50 via-white to-slate-100">
        {/* Chuong bao don xin quyen phai bam duoc o day: chu giai giua giai
            ngoi o trang chu nhieu hon o trang Thiet dat. Bo logo — ngay duoi
            da co mot cai to gap doi. */}
        <AppTopBar user={user} showLogo={false} />

        <div className="px-4 pt-10 pb-8 text-center animate-fade-in">
          <div className="inline-flex bg-white p-3.5 rounded-card shadow-card mb-5">
            <img src={logo} alt="Cóc Vương" className="h-14 w-auto" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">Cóc Vương</h1>
          <p className="text-slate-500 text-base sm:text-lg m-0">
            Hệ thống chấm điểm Vovinam
          </p>
        </div>

        <main className="flex-1 px-4 pb-12">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Giam dinh la nhom dong nguoi nhat va it thao tac nhat — cho
                ho mot o rieng that to thay vi nam lan trong luoi menu */}
            <section>
              <NavLink
                to="/gd"
                className="group flex items-center gap-4 sm:gap-5 bg-accent-600 text-white
                  rounded-card p-5 sm:p-6 shadow-card hover:shadow-card-hover
                  hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200"
              >
                <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-control bg-white/15 flex
                  items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-keyboard text-2xl sm:text-3xl" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg sm:text-xl font-bold">Tôi là giám định — vào bằng số của giải</span>
                  <span className="block text-sm text-white/80 mt-0.5">
                    Gõ 2 số giám sát đọc cho, rồi chọn sân và số của bạn. Không cần tài khoản.
                  </span>
                </span>
                <i className="fa-solid fa-arrow-right text-xl opacity-70
                  group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </NavLink>
            </section>

            {MENU_GROUPS.map((group) => (
              <section key={group.id} data-accent={group.id}>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide
                  text-slate-500 mb-3">
                  <span className="w-6 h-6 rounded-md bg-accent-600 flex items-center justify-center">
                    <i className={`${group.icon} text-white text-[11px]`} aria-hidden="true" />
                  </span>
                  {group.label}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

            {/* Ai dang dang nhap va nut Dang xuat da nam o thanh tren cung —
                duoi day chi con cua vao trang quan tri, von khong co cho nao
                khac de bay ra. */}
            {isAdmin && (
              <section className="text-center text-sm">
                <NavLink to="/quan-tri" className="text-accent-700 font-medium hover:underline">
                  <i className="fa-solid fa-shield-halved mr-1" aria-hidden="true" />
                  Quản trị
                </NavLink>
              </section>
            )}
          </div>
        </main>

        <AppFooter />
        <Toast />
      </div>
    );
  }
}

export default HomeContainer;
