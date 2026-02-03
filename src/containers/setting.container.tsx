import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, set, get, update, child, onValue, off, remove, DatabaseReference, Database } from "firebase/database";
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NavLink } from "react-router-dom";

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
      selectedTournament: 0
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

  addTournament = () => {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      if (this.tournamentObj) {
        this.tournamentNoIndex = this.tournamentObj.length;
        this.resetSetting();
        this.main();
      }
    });
  }

  deleteTournament = () => {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      if (this.tournamentObj) {
        this.tournamentNoIndex = this.tournamentObj.length - 1;
        if (this.tournamentObj.length > 1) {
          remove(ref(this.db, 'tournament/' + this.tournamentNoIndex)).then(() => {
            this.tournamentNoIndex--;
            this.main();
            toast.success("Xoá giải đấu thành công!");
          });
        } else {
          toast.error("Không thể xoá giải đấu duy nhất!");
        }
      }
    });
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

  render() {
    const { 
      password, tournamentName, timeRound, timeBreak, timeExtra, timeExtraBreak,
      flexSwitchCountryFlagCombat, showCautionBoxCombat, quantityRefereeCombat, prioritizeUnitNameCombat,
      flexSwitchCountryFlagMartial, quantityRefereeMartial,
      passwordSetting, passwordGiamDinh, passwordGiamSat,
      showPasswordModal, selectedTournament
    } = this.state;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a 
                  href="/" 
                  title="Về Trang chủ" 
                  className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 hover:from-blue-500 hover:to-indigo-600 rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all group"
                >
                  <i className="fa-solid fa-home text-slate-500 group-hover:text-white text-sm"></i>
                </a>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
                  <i className="fa-solid fa-gear text-white text-sm"></i>
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-800">Thiết đặt</h1>
                  {tournamentName && (
                    <p className="text-xs text-blue-600 whitespace-pre-line break-words max-w-[250px] leading-tight">{tournamentName}</p>
                  )}
                </div>
              </div>
              <img src={logo} alt="Logo" className="h-8 opacity-70" />
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Tournament Selection Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-trophy"></i>
                Chọn giải đấu
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                  <label 
                    key={i}
                    onClick={() => this.chooseTournament(i)}
                    className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all
                      ${selectedTournament === i 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                  >
                    <input 
                      type="radio" 
                      name="tournamentRadio" 
                      checked={selectedTournament === i}
                      onChange={() => this.chooseTournament(i)}
                      className="w-4 h-4 text-indigo-500"
                    />
                    <span className="font-medium text-slate-700">{tournament[0]} - {tournament[1]}</span>
                  </label>
                )) : (
                  <p className="text-slate-400 italic col-span-2">Không có giải đấu</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  type="button" 
                  onClick={this.addTournament}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-md"
                >
                  <i className="fas fa-plus"></i>
                  Thêm giải đấu
                </button>
                <button 
                  type="button" 
                  onClick={this.deleteTournament}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md"
                >
                  <i className="fas fa-trash-alt"></i>
                  Xoá giải đấu cuối
                </button>
              </div>
            </div>
          </div>

          {/* Tournament Settings Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-sliders"></i>
                Thiết đặt thông tin giải đấu
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Tournament Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Tên giải đấu</label>
                <textarea 
                  name="tournamentName" 
                  value={tournamentName}
                  onChange={this.handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none text-slate-800 bg-white placeholder:text-slate-400"
                  placeholder="Nhập tên giải đấu... (Enter để xuống dòng)"
                />
              </div>

              {/* Combat Settings */}
              <div className="bg-emerald-50 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-emerald-700 flex items-center gap-2">
                  <i className="fa-solid fa-hand-fist"></i>
                  Thiết đặt đối kháng
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                    <input 
                      type="checkbox"
                      name="flexSwitchCountryFlagCombat"
                      checked={flexSwitchCountryFlagCombat}
                      onChange={this.handleInputChange}
                      className="w-5 h-5 rounded text-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Hiển thị cờ quốc gia</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                    <input 
                      type="checkbox"
                      name="showCautionBoxCombat"
                      checked={showCautionBoxCombat}
                      onChange={this.handleInputChange}
                      className="w-5 h-5 rounded text-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Hiển thị bảng nhắc nhở</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                    <input 
                      type="checkbox"
                      name="quantityRefereeCombat"
                      checked={quantityRefereeCombat}
                      onChange={this.handleInputChange}
                      className="w-5 h-5 rounded text-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Hiển thị 5 giám định</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                    <input 
                      type="checkbox"
                      name="prioritizeUnitNameCombat"
                      checked={prioritizeUnitNameCombat}
                      onChange={this.handleInputChange}
                      className="w-5 h-5 rounded text-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Ưu tiên hiển thị đơn vị</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Thời gian hiệp đấu</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        name="timeRound" 
                        value={timeRound}
                        onChange={this.handleInputChange}
                        className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">giây</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nghỉ giữa hiệp</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        name="timeBreak" 
                        value={timeBreak}
                        onChange={this.handleInputChange}
                        className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">giây</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Thời gian hiệp phụ</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        name="timeExtra" 
                        value={timeExtra}
                        onChange={this.handleInputChange}
                        className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">giây</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nghỉ hiệp phụ</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        name="timeExtraBreak" 
                        value={timeExtraBreak}
                        onChange={this.handleInputChange}
                        className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">giây</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Martial Settings */}
              <div className="bg-amber-50 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-amber-700 flex items-center gap-2">
                  <i className="fa-solid fa-person-running"></i>
                  Thiết đặt thi quyền
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                    <input 
                      type="checkbox"
                      name="flexSwitchCountryFlagMartial"
                      checked={flexSwitchCountryFlagMartial}
                      onChange={this.handleInputChange}
                      className="w-5 h-5 rounded text-amber-500"
                    />
                    <span className="text-sm text-slate-700">Hiển thị cờ quốc gia</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                    <input 
                      type="checkbox"
                      name="quantityRefereeMartial"
                      checked={quantityRefereeMartial}
                      onChange={this.handleInputChange}
                      className="w-5 h-5 rounded text-amber-500"
                    />
                    <span className="text-sm text-slate-700">Hiển thị 5 giám định</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={this.resetTournament}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md"
                >
                  <i className="fa-solid fa-arrows-rotate"></i>
                  Cài lại trận đấu
                </button>
                <button 
                  type="button" 
                  onClick={this.resetSetting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors shadow-md"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  Cài lại thiết đặt
                </button>
                <button 
                  type="button" 
                  onClick={this.updateSetting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-md"
                >
                  <i className="fa-solid fa-floppy-disk"></i>
                  Cập nhập
                </button>
              </div>
            </div>
          </div>

          {/* Password Settings Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-key"></i>
                Thiết đặt mật khẩu
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    <i className="fa-solid fa-gear mr-1 text-slate-400"></i>
                    Mật khẩu Thiết đặt
                  </label>
                  <input 
                    type="number" 
                    name="passwordSetting" 
                    value={passwordSetting}
                    onChange={this.handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all text-center tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    <i className="fa-solid fa-eye mr-1 text-blue-400"></i>
                    Mật khẩu Giám sát
                  </label>
                  <input 
                    type="number" 
                    name="passwordGiamSat" 
                    value={passwordGiamSat}
                    onChange={this.handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    <i className="fa-solid fa-user-check mr-1 text-emerald-400"></i>
                    Mật khẩu Giám định
                  </label>
                  <input 
                    type="number" 
                    name="passwordGiamDinh" 
                    value={passwordGiamDinh}
                    onChange={this.handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-center tracking-widest"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={this.resetPassword}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors shadow-md"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  Cài lại mật khẩu
                </button>
                <button 
                  type="button" 
                  onClick={this.updatePassword}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-md"
                >
                  <i className="fa-solid fa-floppy-disk"></i>
                  Cập nhập mật khẩu
                </button>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <footer className="pt-8 pb-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm border-t border-slate-200 pt-6">
              <NavLink to="/" className="text-slate-500 hover:text-blue-600 transition-colors">
                <i className="fa-solid fa-home mr-1"></i> Home
              </NavLink>
              <NavLink to="giam-sat-doi-khang" className="text-slate-500 hover:text-emerald-600 transition-colors">
                Giám sát đối kháng
              </NavLink>
              <NavLink to="giam-dinh-doi-khang" className="text-slate-500 hover:text-emerald-600 transition-colors">
                Giám định đối kháng
              </NavLink>
              <NavLink to="giam-sat-thi-quyen" className="text-slate-500 hover:text-amber-600 transition-colors">
                Giám sát thi quyền
              </NavLink>
              <NavLink to="giam-dinh-thi-quyen" className="text-slate-500 hover:text-amber-600 transition-colors">
                Giám định thi quyền
              </NavLink>
              <NavLink to="thong-tin-doi-khang" className="text-slate-500 hover:text-blue-600 transition-colors">
                Thông tin đối kháng
              </NavLink>
            </div>
            <p className="text-center text-slate-400 text-sm mt-4">©Tuân 2022</p>
          </footer>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-lock"></i>
                    Vui lòng nhập mật khẩu
                  </h5>
                  <button 
                    onClick={() => this.setState({ showPasswordModal: false })}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 relative">
                    <i className="fa-solid fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                      type="password" 
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••"
                      value={password}
                      readOnly
                    />
                  </div>
                  <button 
                    onClick={() => this.inputPw('-1')}
                    className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {['1','2','3','4','5'].map(num => (
                    <button 
                      key={num}
                      onClick={() => this.inputPw(num)}
                      className="p-4 text-xl font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {['6','7','8','9','0'].map(num => (
                    <button 
                      key={num}
                      onClick={() => this.inputPw(num)}
                      className="p-4 text-xl font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => this.setState({ showPasswordModal: false })}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={this.verifyPassword}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:from-blue-600 hover:to-indigo-700 transition-colors shadow-lg"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    );
  }
}

export default SettingContainer;
