import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, set, get, update, child, onValue, off, DatabaseReference, Database } from "firebase/database";
import { toast } from 'react-toastify';
import { NavLink } from "react-router-dom";

import {
  PageShell, PageHeader, SectionCard, Button, Toggle, NumberField,
  PasswordModal, ConfirmModal, Toast, AppFooter,
} from '../components/ui';

// Import constants
import { DEFAULT_SETTING, DEFAULT_COMMON_SETTING } from '../constants/settings';

interface Tournament {
  setting: {
    tournamentName: string;
    combat: {
      timeRound: number;
      timeBreak: number;
      timeExtra: number;
      timeExtraBreak: number;
      isShowCountryFlag: boolean;
      isShowCautionBox: boolean;
      isShowFiveReferee: boolean;
    };
    martial: {
      isShowCountryFlag: boolean;
      isShowFiveReferee: boolean;
    };
  };
  combat: any[];
  combatArena: any[];
  martial: any[];
  martialArena: any[];
}

interface SettingContainerProps {}

interface SettingContainerState {
  data: [number, string][];
  password: string;
  tournamentName: string;
  timeRound: number;
  timeBreak: number;
  timeExtra: number;
  timeExtraBreak: number;
  flexSwitchCountryFlagCombat: boolean;
  showCautionBoxCombat: boolean;
  quantityRefereeCombat: boolean;
  prioritizeUnitNameCombat: boolean;
  flexSwitchCountryFlagMartial: boolean;
  quantityRefereeMartial: boolean;
  passwordSetting: string;
  passwordGiamDinh: string;
  passwordGiamSat: string;
  showPasswordModal: boolean;
  selectedTournament: number;
  /** Hop thoai xac nhan cho cac hanh dong khong hoan tac duoc */
  confirm: { title: string; message: string; action: () => void } | null;
}

class SettingContainer extends Component<SettingContainerProps, SettingContainerState> {
  // Firebase listener references for cleanup
  firebaseListeners: DatabaseReference[] = [];
  db: Database;
  settingObj: any = null;
  tournamentObj: Tournament[] | null = null;
  commonSettingObj: any = null;
  tournamentNoIndex: number = 0;
  tournaments: [number, string][] = [];
  settingConst: any;
  commonSettingConst: any;

  constructor(props: SettingContainerProps) {
    super(props);
    document.title = 'Thiết Đặt';
    
    this.state = {
      data: [],
      password: '',
      tournamentName: '',
      timeRound: 120,
      timeBreak: 60,
      timeExtra: 60,
      timeExtraBreak: 30,
      flexSwitchCountryFlagCombat: false,
      showCautionBoxCombat: false,
      quantityRefereeCombat: false,
      prioritizeUnitNameCombat: false,
      flexSwitchCountryFlagMartial: false,
      quantityRefereeMartial: false,
      passwordSetting: '',
      passwordGiamDinh: '',
      passwordGiamSat: '',
      showPasswordModal: true,
      selectedTournament: 0,
      confirm: null
    };

    this.db = database;

    // Use constants instead of hardcoded values
    this.settingConst = JSON.parse(JSON.stringify(DEFAULT_SETTING));
    this.commonSettingConst = JSON.parse(JSON.stringify(DEFAULT_COMMON_SETTING));
  }

  componentDidMount() {
    // Check for cached password
    this.checkCachedPassword();
  }

  checkCachedPassword = () => {
    const cachedValid = localStorage.getItem('setting_password_valid');
    const cachedTime = localStorage.getItem('setting_password_timestamp');
    
    if (cachedValid === 'true' && cachedTime) {
      const timestamp = parseInt(cachedTime, 10);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (now - timestamp < sixHours) {
        // Password still valid, skip modal
        this.setState({ showPasswordModal: false });
        this.main();
        return;
      }
    }
  }

  cachePassword = () => {
    localStorage.setItem('setting_password_valid', 'true');
    localStorage.setItem('setting_password_timestamp', Date.now().toString());
  }

  componentWillUnmount() {
    // Cleanup Firebase listeners
    this.firebaseListeners.forEach(listenerRef => {
      off(listenerRef);
    });
    this.firebaseListeners = [];
  }

  verifyPassword = () => {
    const { password } = this.state;

    if (password != null && password !== "") {
      const passwordRef = ref(this.db, 'commonSetting/passwordSetting');
      onValue(passwordRef, (snapshot) => {
        if (password === String(snapshot.val())) {
          this.cachePassword();
          this.setState({ showPasswordModal: false });
          this.main();
        } else {
          toast.error("Sai mật khẩu!");
          window.location.reload();
        }
      }, { onlyOnce: true });
    } else {
      toast.error("Sai mật khẩu!");
    }
  }

  main() {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      this.tournaments = [];

      if (this.tournamentObj) {
        for (let i = 0; i < this.tournamentObj.length; i++) {
          this.tournaments.push([i, this.tournamentObj[i].setting.tournamentName]);
        }
      }
      this.setState({ data: this.tournaments });
    });

    get(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      if (this.settingObj) {
        this.setState({
          timeRound: this.settingObj.combat.timeRound,
          timeBreak: this.settingObj.combat.timeBreak,
          timeExtra: this.settingObj.combat.timeExtra,
          timeExtraBreak: this.settingObj.combat.timeExtraBreak,
          tournamentName: this.settingObj.tournamentName,
          flexSwitchCountryFlagCombat: this.settingObj.combat.isShowCountryFlag,
          showCautionBoxCombat: this.settingObj.combat.isShowCautionBox,
          quantityRefereeCombat: this.settingObj.combat.isShowFiveReferee,
          prioritizeUnitNameCombat: this.settingObj.combat.isPrioritizeUnitName || false,
          flexSwitchCountryFlagMartial: this.settingObj.martial.isShowCountryFlag,
          quantityRefereeMartial: this.settingObj.martial.isShowFiveReferee
        });
      }
    });

    get(ref(this.db, 'commonSetting')).then((snapshot) => {
      const commonSetting = snapshot.val();
      if (commonSetting) {
        this.setState({
          passwordSetting: String(commonSetting.passwordSetting),
          passwordGiamDinh: String(commonSetting.passwordGiamDinh),
          passwordGiamSat: String(commonSetting.passwordGiamSat)
        });
      }
    });
  }

  resetTournament = () => {
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/')).then((snapshot) => {
      const tournamentData = snapshot.val();
      
      if (tournamentData) {
        for (let i = 0; i < tournamentData.combat.length; i++) {
          tournamentData.combat[i].fighters.redFighter.caution.bound = 0;
          tournamentData.combat[i].fighters.redFighter.caution.fall = 0;
          tournamentData.combat[i].fighters.redFighter.caution.medical = 0;
          tournamentData.combat[i].fighters.redFighter.caution.remind = 0;
          tournamentData.combat[i].fighters.redFighter.caution.warning = 0;
          tournamentData.combat[i].fighters.redFighter.result = "";
          tournamentData.combat[i].fighters.redFighter.score = 0;

          tournamentData.combat[i].fighters.blueFighter.caution.bound = 0;
          tournamentData.combat[i].fighters.blueFighter.caution.fall = 0;
          tournamentData.combat[i].fighters.blueFighter.caution.medical = 0;
          tournamentData.combat[i].fighters.blueFighter.caution.remind = 0;
          tournamentData.combat[i].fighters.blueFighter.caution.warning = 0;
          tournamentData.combat[i].fighters.blueFighter.result = "";
          tournamentData.combat[i].fighters.blueFighter.score = 0;

          tournamentData.combat[i].match.win = "";
        }
        
        for (let i = 0; i < tournamentData.combatArena.length; i++) {
          tournamentData.combatArena[i].lastMatch.no = 1;
          for (let j = 0; j < tournamentData.combatArena[i].referee.length; j++) {
            tournamentData.combatArena[i].referee[j].redScore = 0;
            tournamentData.combatArena[i].referee[j].blueScore = 0;
          }
        }
        
        for (let i = 0; i < tournamentData.martial.length; i++) {
          for (let j = 0; j < tournamentData.martial[i].team.length; j++) {
            tournamentData.martial[i].team[j].finalScore = 0;
            for (let k = 0; k < tournamentData.martial[i].team[j].refereeMartial.length; k++) {
              tournamentData.martial[i].team[j].refereeMartial[k].score = 0;
            }
          }
        }
        
        for (let i = 0; i < tournamentData.martialArena.length; i++) {
          tournamentData.martialArena[i].lastMatchMartial.matchMartialNo = 1;
          tournamentData.martialArena[i].lastMatchMartial.teamMartialNo = 1;
        }
        
        update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), tournamentData).then(() => {
          toast.success("Cài đặt trận đấu thành công!");
        });
      }
    });
  }

  resetSetting = () => {
    this.settingObj = JSON.parse(JSON.stringify(this.settingConst));

    update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/setting'), this.settingObj.setting).then(() => {
      get(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
        this.settingObj = snapshot.val();
        if (this.settingObj) {
          this.setState({
            timeRound: this.settingObj.combat.timeRound,
            timeBreak: this.settingObj.combat.timeBreak,
            timeExtra: this.settingObj.combat.timeExtra,
            timeExtraBreak: this.settingObj.combat.timeExtraBreak,
            flexSwitchCountryFlagCombat: this.settingObj.combat.isShowCountryFlag,
            showCautionBoxCombat: this.settingObj.combat.isShowCautionBox,
            quantityRefereeCombat: this.settingObj.combat.isShowFiveReferee,
            prioritizeUnitNameCombat: this.settingObj.combat.isPrioritizeUnitName || false,
            flexSwitchCountryFlagMartial: this.settingObj.martial.isShowCountryFlag,
            quantityRefereeMartial: this.settingObj.martial.isShowFiveReferee
          });
        }
      });

      toast.success("Cài lại thiết đặt thành công!");
    });
  }

  resetPassword = () => {
    this.commonSettingObj = JSON.parse(JSON.stringify(this.commonSettingConst));
    update(ref(this.db, 'commonSetting'), this.commonSettingObj).then(() => {
      get(ref(this.db, 'commonSetting')).then((snapshot) => {
        this.commonSettingObj = snapshot.val();
        if (this.commonSettingObj) {
          this.setState({
            passwordSetting: String(this.commonSettingObj.passwordSetting),
            passwordGiamDinh: String(this.commonSettingObj.passwordGiamDinh),
            passwordGiamSat: String(this.commonSettingObj.passwordGiamSat)
          });
        }
      });

      toast.success("Cài lại thiết đặt mật khẩu thành công!");
    });
  }

  updateSetting = () => {
    const { timeRound, timeBreak, timeExtra, timeExtraBreak, tournamentName, 
            flexSwitchCountryFlagCombat, showCautionBoxCombat, quantityRefereeCombat, prioritizeUnitNameCombat,
            flexSwitchCountryFlagMartial, quantityRefereeMartial } = this.state;
    
    this.settingObj = {
      "combat/timeRound": timeRound,
      "combat/timeBreak": timeBreak,
      "combat/timeExtra": timeExtra,
      "combat/timeExtraBreak": timeExtraBreak,
      "tournamentName": tournamentName,
      "combat/isShowCountryFlag": flexSwitchCountryFlagCombat,
      "combat/isShowCautionBox": showCautionBoxCombat,
      "combat/isShowFiveReferee": quantityRefereeCombat,
      "combat/isPrioritizeUnitName": prioritizeUnitNameCombat,
      "martial/isShowCountryFlag": flexSwitchCountryFlagMartial,
      "martial/isShowFiveReferee": quantityRefereeMartial,
    };
    update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/setting'), this.settingObj).then(() => {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
  }

  updatePassword = () => {
    const { passwordSetting, passwordGiamDinh, passwordGiamSat } = this.state;
    
    this.commonSettingObj = {
      "passwordSetting": parseInt(passwordSetting),
      "passwordGiamDinh": parseInt(passwordGiamDinh),
      "passwordGiamSat": parseInt(passwordGiamSat),
    };
    update(ref(this.db, 'commonSetting'), this.commonSettingObj).then(() => {
      toast.success("Cập nhập thông tin mật khẩu thành công!");
    });
  }

  chooseTournament = (tournamentNoIndex: number) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.setState({ selectedTournament: tournamentNoIndex });
    this.main();
  }

  inputPw = (value: string) => {
    if (value === "-1") {
      this.setState({ password: '' });
    } else {
      this.setState(prevState => ({ 
        password: prevState.password + value 
      }));
    }
  }

  handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    if (type === 'checkbox') {
      this.setState({ [name]: target.checked } as any);
    } else if (type === 'number') {
      this.setState({ [name]: parseInt(value) || 0 } as any);
    } else {
      this.setState({ [name]: value } as any);
    }
  }

  askConfirm = (title: string, message: string, action: () => void) => {
    this.setState({ confirm: { title, message, action } });
  }

  closeConfirm = () => this.setState({ confirm: null });

  runConfirm = () => {
    const { confirm } = this.state;
    this.setState({ confirm: null }, () => confirm?.action());
  }

  confirmResetTournament = () => this.askConfirm(
    'Cài lại trận đấu',
    'Toàn bộ điểm số và diễn biến của giải đang chọn sẽ bị xoá về mặc định. Không thể hoàn tác.',
    this.resetTournament
  );

  confirmResetSetting = () => this.askConfirm(
    'Cài lại thiết đặt',
    'Thời gian hiệp, số giám định và các tuỳ chọn hiển thị sẽ trở về mặc định.',
    this.resetSetting
  );

  confirmResetPassword = () => this.askConfirm(
    'Cài lại mật khẩu',
    'Cả ba mật khẩu sẽ trở về giá trị mặc định.',
    this.resetPassword
  );

  hidePasswordModal = () => this.setState({ showPasswordModal: false });

  render() {
    const {
      password, tournamentName, timeRound, timeBreak, timeExtra, timeExtraBreak,
      flexSwitchCountryFlagCombat, showCautionBoxCombat, quantityRefereeCombat, prioritizeUnitNameCombat,
      flexSwitchCountryFlagMartial, quantityRefereeMartial,
      passwordSetting, passwordGiamDinh, passwordGiamSat,
      showPasswordModal, selectedTournament, confirm
    } = this.state;

    return (
      <PageShell accent="tool">
        <PageHeader title="Thiết đặt" icon="fa-solid fa-gear" badge={tournamentName} />

        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
          <SectionCard title="Giải đang cấu hình" icon="fa-solid fa-trophy">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-5">
              {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                <label
                  key={tournament[0]}
                  className={`flex items-center gap-3 p-3.5 border-2 rounded-control cursor-pointer transition-colors
                    ${selectedTournament === i
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <input
                    type="radio"
                    name="tournamentRadio"
                    checked={selectedTournament === i}
                    onChange={() => this.chooseTournament(i)}
                    className="w-4 h-4 flex-shrink-0"
                  />
                  <span className="font-medium text-slate-700 whitespace-pre-line min-w-0">
                    {tournament[1]}
                  </span>
                </label>
              )) : (
                <p className="text-slate-400 italic col-span-2 m-0">Không có giải đấu</p>
              )}
            </div>

            {/* Them / xoa giai da chuyen sang trang Tao giai: trang nay chi
                cau hinh giai da co, khong tao hay xoa giai */}
            <p className="text-xs text-slate-500 m-0 bg-slate-50 border border-slate-200
              rounded-control px-3 py-2.5">
              <i className="fa-solid fa-circle-info mr-1.5 text-slate-400" aria-hidden="true" />
              Thiết đặt bên dưới áp dụng cho giải đang chọn. Thêm giải mới, xoá giải hoặc nhập
              danh sách vận động viên ở trang{' '}
              <NavLink to="/tao-giai" className="text-accent-700 font-medium underline">
                Tạo giải
              </NavLink>.
            </p>
          </SectionCard>

          <SectionCard title="Thông tin giải đấu" icon="fa-solid fa-sliders">
            <div className="space-y-6">
              <div>
                <label htmlFor="field-tournamentName" className="block text-sm font-semibold text-slate-600 mb-2">
                  Tên giải đấu
                </label>
                <textarea
                  id="field-tournamentName"
                  name="tournamentName"
                  value={tournamentName}
                  onChange={this.handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-200 rounded-control resize-none
                    text-slate-800 bg-white placeholder:text-slate-400
                    focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                  placeholder="Nhập tên giải đấu... (Enter để xuống dòng)"
                />
                <p className="text-xs text-slate-400 mt-1.5 mb-0">
                  Tên này hiển thị trên màn hình trình chiếu, xuống dòng để tránh chữ quá nhỏ.
                </p>
              </div>

              <fieldset className="border border-emerald-200 bg-emerald-50/50 rounded-card p-4 sm:p-5 m-0">
                <legend className="px-2 font-bold text-emerald-700 flex items-center gap-2 text-sm">
                  <i className="fa-solid fa-hand-back-fist" aria-hidden="true" />
                  Đối kháng
                </legend>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <Toggle name="flexSwitchCountryFlagCombat" checked={flexSwitchCountryFlagCombat}
                    onChange={this.handleInputChange} label="Hiển thị cờ quốc gia" />
                  <Toggle name="showCautionBoxCombat" checked={showCautionBoxCombat}
                    onChange={this.handleInputChange} label="Hiển thị bảng nhắc nhở" />
                  <Toggle name="quantityRefereeCombat" checked={quantityRefereeCombat}
                    onChange={this.handleInputChange} label="Dùng 5 giám định"
                    hint="Tắt để dùng 3 giám định" />
                  <Toggle name="prioritizeUnitNameCombat" checked={prioritizeUnitNameCombat}
                    onChange={this.handleInputChange} label="Ưu tiên hiển thị đơn vị"
                    hint="Tên đơn vị to hơn tên vận động viên" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <NumberField name="timeRound" label="Thời gian hiệp" value={timeRound}
                    onChange={this.handleInputChange} unit="giây" />
                  <NumberField name="timeBreak" label="Nghỉ giữa hiệp" value={timeBreak}
                    onChange={this.handleInputChange} unit="giây" />
                  <NumberField name="timeExtra" label="Thời gian hiệp phụ" value={timeExtra}
                    onChange={this.handleInputChange} unit="giây" />
                  <NumberField name="timeExtraBreak" label="Nghỉ hiệp phụ" value={timeExtraBreak}
                    onChange={this.handleInputChange} unit="giây" />
                </div>
              </fieldset>

              <fieldset className="border border-amber-200 bg-amber-50/50 rounded-card p-4 sm:p-5 m-0">
                <legend className="px-2 font-bold text-amber-700 flex items-center gap-2 text-sm">
                  <i className="fa-solid fa-hand-fist" aria-hidden="true" />
                  Thi quyền
                </legend>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <Toggle name="flexSwitchCountryFlagMartial" checked={flexSwitchCountryFlagMartial}
                    onChange={this.handleInputChange} label="Hiển thị cờ quốc gia" />
                  <Toggle name="quantityRefereeMartial" checked={quantityRefereeMartial}
                    onChange={this.handleInputChange} label="Dùng 5 giám định"
                    hint="Bỏ điểm cao nhất và thấp nhất" />
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-100">
                <Button variant="primary" icon="fa-solid fa-floppy-disk" onClick={this.updateSetting}>
                  Lưu thiết đặt
                </Button>
                <Button variant="secondary" icon="fa-solid fa-rotate-left" onClick={this.confirmResetSetting}>
                  Cài lại thiết đặt
                </Button>
                <Button variant="danger" icon="fa-solid fa-arrows-rotate" onClick={this.confirmResetTournament}>
                  Cài lại trận đấu
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Mật khẩu" icon="fa-solid fa-key" tone="neutral">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="field-passwordSetting" className="block text-sm font-semibold text-slate-600 mb-2">
                  <i className="fa-solid fa-gear mr-1.5 text-slate-400" aria-hidden="true" />
                  Thiết đặt
                </label>
                <input id="field-passwordSetting" type="number" inputMode="numeric" name="passwordSetting"
                  value={passwordSetting} onChange={this.handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-control text-center
                    tracking-[0.3em] tabular-nums text-slate-800
                    focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow" />
              </div>
              <div>
                <label htmlFor="field-passwordGiamSat" className="block text-sm font-semibold text-slate-600 mb-2">
                  <i className="fa-solid fa-tv mr-1.5 text-slate-400" aria-hidden="true" />
                  Giám sát
                </label>
                <input id="field-passwordGiamSat" type="number" inputMode="numeric" name="passwordGiamSat"
                  value={passwordGiamSat} onChange={this.handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-control text-center
                    tracking-[0.3em] tabular-nums text-slate-800
                    focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow" />
              </div>
              <div>
                <label htmlFor="field-passwordGiamDinh" className="block text-sm font-semibold text-slate-600 mb-2">
                  <i className="fa-solid fa-user-check mr-1.5 text-slate-400" aria-hidden="true" />
                  Giám định
                </label>
                <input id="field-passwordGiamDinh" type="number" inputMode="numeric" name="passwordGiamDinh"
                  value={passwordGiamDinh} onChange={this.handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-control text-center
                    tracking-[0.3em] tabular-nums text-slate-800
                    focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-5 mt-5 border-t border-slate-100">
              <Button variant="primary" icon="fa-solid fa-floppy-disk" onClick={this.updatePassword}>
                Lưu mật khẩu
              </Button>
              <Button variant="secondary" icon="fa-solid fa-rotate-left" onClick={this.confirmResetPassword}>
                Cài lại mật khẩu
              </Button>
            </div>
          </SectionCard>

          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm pt-2">
            {[
              { to: '/', label: 'Trang chủ' },
              { to: '/giam-sat-doi-khang', label: 'Giám sát đối kháng' },
              { to: '/giam-dinh-doi-khang', label: 'Giám định đối kháng' },
              { to: '/giam-sat-thi-quyen', label: 'Giám sát thi quyền' },
              { to: '/giam-dinh-thi-quyen', label: 'Giám định thi quyền' },
              { to: '/tao-giai', label: 'Tạo giải' },
            ].map((link) => (
              <NavLink key={link.to} to={link.to}
                className="text-slate-500 hover:text-accent-700 transition-colors">
                {link.label}
              </NavLink>
            ))}
          </nav>
        </main>

        <AppFooter />

        <PasswordModal
          isOpen={showPasswordModal}
          value={password}
          onInput={this.inputPw}
          onSubmit={this.verifyPassword}
          onClose={this.hidePasswordModal}
        />

        <ConfirmModal
          isOpen={confirm !== null}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          onConfirm={this.runConfirm}
          onCancel={this.closeConfirm}
        />

        <Toast />
      </PageShell>
    );
  }
}

export default SettingContainer;
