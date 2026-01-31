import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/img/logo.png';

interface HomeContainerProps {}

interface HomeContainerState {
  isLoaded: boolean;
}

interface MenuItem {
  title: string;
  icon: string;
  path: string;
  color: 'combat' | 'martial' | 'tool';
  description: string;
}

class HomeContainer extends Component<HomeContainerProps, HomeContainerState> {
  menuItems: MenuItem[] = [
    { title: 'GIÁM SÁT ĐỐI KHÁNG', icon: 'fa-solid fa-tv', path: 'giam-sat-doi-khang', color: 'combat', description: 'Màn hình hiển thị trận đấu' },
    { title: 'GIÁM ĐỊNH ĐỐI KHÁNG', icon: 'fa-solid fa-table-columns', path: 'giam-dinh-doi-khang', color: 'combat', description: 'Chấm điểm cho giám định' },
    { title: 'GIÁM SÁT THI QUYỀN', icon: 'fas fa-desktop', path: 'giam-sat-thi-quyen', color: 'martial', description: 'Màn hình hiển thị thi quyền' },
    { title: 'GIÁM ĐỊNH THI QUYỀN', icon: 'fa-solid fa-calculator', path: 'giam-dinh-thi-quyen', color: 'martial', description: 'Chấm điểm cho giám định' },
    { title: 'THIẾT ĐẶT', icon: 'fa-solid fa-gear', path: 'thiet-dat', color: 'tool', description: 'Cài đặt hệ thống' },
    { title: 'TẠO GIẢI', icon: 'fas fa-file-upload', path: 'tao-giai', color: 'tool', description: 'Tạo giải đấu mới' },
    { title: 'THÔNG TIN ĐỐI KHÁNG', icon: 'fas fa-sitemap', path: 'thong-tin-doi-khang', color: 'tool', description: 'Xem thông tin trận đấu' },
    { title: 'THÔNG TIN THI QUYỀN', icon: 'fas fa-table', path: 'thong-tin-thi-quyen', color: 'tool', description: 'Xem thông tin thi quyền' },
  ];

  constructor(props: HomeContainerProps) {
    super(props);
    document.title = 'Cóc Vương - Hệ thống chấm điểm Vovinam';
    this.state = {
      isLoaded: false
    };
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({ isLoaded: true });
    }, 100);
  }

  getColorClasses(color: 'combat' | 'martial' | 'tool'): { bg: string; text: string; border: string; shadow: string; lightBg: string } {
    switch (color) {
      case 'combat':
        return { 
          bg: 'bg-gradient-to-br from-emerald-500 to-green-600', 
          text: 'text-emerald-600',
          border: 'border-emerald-200 hover:border-emerald-400',
          shadow: 'hover:shadow-emerald-200/50',
          lightBg: 'bg-emerald-50'
        };
      case 'martial':
        return { 
          bg: 'bg-gradient-to-br from-amber-500 to-orange-500', 
          text: 'text-amber-600',
          border: 'border-amber-200 hover:border-amber-400',
          shadow: 'hover:shadow-amber-200/50',
          lightBg: 'bg-amber-50'
        };
      case 'tool':
        return { 
          bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', 
          text: 'text-blue-600',
          border: 'border-blue-200 hover:border-blue-400',
          shadow: 'hover:shadow-blue-200/50',
          lightBg: 'bg-blue-50'
        };
    }
  }

  render() {
    const { isLoaded } = this.state;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        {/* Decorative background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute top-1/3 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-60"></div>
        </div>

        {/* Header */}
        <header className={`relative z-10 py-10 px-4 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
          <div className="max-w-6xl mx-auto text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center mb-6">
              <div className="bg-white p-4 rounded-2xl shadow-lg shadow-gray-200/50">
                <img 
                  src={logo} 
                  alt="Cóc Vương Logo" 
                  className="h-14 w-auto"
                />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Cóc Vương
            </h1>
            <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto mb-6">
              Hệ thống chấm điểm Vovinam chuyên nghiệp
            </p>
            
            {/* Category badges */}
            <div className="flex justify-center gap-3 flex-wrap">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 shadow-sm">
                <i className="fa-solid fa-fist-raised mr-2"></i>
                Đối Kháng
              </span>
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-amber-100 text-amber-700 shadow-sm">
                <i className="fa-solid fa-hand-fist mr-2"></i>
                Thi Quyền
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 px-4 pb-16">
          <div className="max-w-6xl mx-auto">
            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
              {this.menuItems.map((item, index) => {
                const colors = this.getColorClasses(item.color);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`group relative bg-white rounded-2xl border-2 ${colors.border} 
                      transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 
                      hover:shadow-xl ${colors.shadow}
                      ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                    style={{ transitionDelay: `${index * 75}ms` }}
                  >
                    {/* Card content */}
                    <div className="p-6">
                      {/* Icon container */}
                      <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center mb-4 
                        transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 
                        shadow-lg`}>
                        <i className={`${item.icon} text-2xl text-white`}></i>
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-gray-800 font-semibold text-sm md:text-base mb-2">
                        {item.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-gray-500 text-xs md:text-sm">
                        {item.description}
                      </p>
                      
                      {/* Arrow indicator */}
                      <div className={`absolute bottom-4 right-4 w-8 h-8 rounded-full ${colors.lightBg} flex items-center justify-center
                        transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300`}>
                        <i className={`fa-solid fa-arrow-right ${colors.text} text-sm`}></i>
                      </div>
                    </div>
                    
                    {/* Bottom accent line */}
                    <div className={`absolute bottom-0 left-0 h-1 ${colors.bg} rounded-b-2xl w-0 group-hover:w-full transition-all duration-500`}></div>
                  </NavLink>
                );
              })}
            </div>

            {/* Stats Section */}
            <div className={`mt-12 bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 border border-gray-100 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '600ms' }}>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="space-y-1">
                  <div className="text-3xl md:text-4xl font-bold text-emerald-500">2</div>
                  <div className="text-gray-500 text-sm md:text-base">Đối Kháng</div>
                </div>
                <div className="space-y-1 border-x border-gray-100">
                  <div className="text-3xl md:text-4xl font-bold text-amber-500">2</div>
                  <div className="text-gray-500 text-sm md:text-base">Thi Quyền</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl md:text-4xl font-bold text-blue-500">4</div>
                  <div className="text-gray-500 text-sm md:text-base">Công cụ</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className={`relative z-10 py-8 px-4 bg-white border-t border-gray-100 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '700ms' }}>
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-gray-400 text-sm">
              © 2022 Cóc Vương - Bùi Tiến Tuân
            </p>
          </div>
        </footer>
      </div>
    );
  }
}

export default HomeContainer;
