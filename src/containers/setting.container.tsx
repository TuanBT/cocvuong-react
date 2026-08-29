import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, update, off, DatabaseReference, Database } from "firebase/database";
import { toast } from 'react-toastify';
import { NavLink } from "react-router-dom";

import {
  PageShell, PageHeader, SectionCard, Button, Toggle, NumberField,
  ConfirmModal, Toast, AppFooter,
} from '../components/ui';
import { AccountChip } from '../components/auth';
import CodeBoard from '../components/tournament/CodeBoard';
import StaffApprovalPanel from '../components/tournament/StaffApprovalPanel';

import { DEFAULT_SETTING } from '../constants/settings';
import { AppUser } from '../services/authService';
import {
  TournamentSummary, closeTournament, isLegacy, listTournaments,
  openTournament, reopenTournament, setOpenAccess, claimTournament,
} from '../services/tournamentService';
import { ensureTournamentCodes } from '../services/accessCodeService';

interface SettingContainerProps {
  user: AppUser;
}

interface SettingContainerState {
  tournaments: TournamentSummary[];
  selected: TournamentSummary | null;
  loading: boolean;
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
  /** Hop thoai xac nhan cho cac hanh dong khong hoan tac duoc */
  confirm: { title: string; message: string; label?: string; action: () => void } | null;
  regenerating: boolean;
}

/**
 * Trang thiet dat — nay la ban dieu khien cua **chu giai**.
 *
 * Ba thay doi lon so voi ban cu:
 *  - Bo han modal mat khau. Mat khau chung nam cong khai o `commonSetting` nen
 *    ai mo DevTools cung lay duoc; dang nhap Google roi thi giu no lai chi de
 *    trang tri.
 *  - Chi thay **giai cua minh** (+ giai cu chua co chu, co nut nhan ve).
 *  - O "Mat khau" cu doi thanh **"Bang ma giam dinh"** — dung cho nguoi dung
 *    dang quen bam vao, khong phai hoc lai duong di moi.
 */
class SettingContainer extends Component<SettingContainerProps, SettingContainerState> {
  firebaseListeners: DatabaseReference[] = [];
  db: Database;
  settingObj: any = null;
  settingConst: any;

  constructor(props: SettingContainerProps) {
    super(props);
    document.title = 'Thiết Đặt';

    this.state = {
      tournaments: [],
      selected: null,
      loading: true,
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
      confirm: null,
      regenerating: false,
    };

    this.db = database;
    this.settingConst = JSON.parse(JSON.stringify(DEFAULT_SETTING));
  }

  componentDidMount() {
    void this.loadTournaments();
  }

  componentWillUnmount() {
    this.firebaseListeners.forEach((listenerRef) => off(listenerRef));
    this.firebaseListeners = [];
  }

  get index(): number {
    return this.state.selected?.index ?? 0;
  }

  /**
   * Chi hien giai cua minh va giai cu chua co chu.
   *
   * Giai da dong van hien o day (chu giai con phai tra cuu, mo lai) — chi bang
   * chon cua giam sat / giam dinh moi an giai da dong.
   */
  async loadTournaments() {
    const { user } = this.props;
    this.setState({ loading: true });
    try {
      const all = await listTournaments();
      const mine = all.filter((t) => t.ownerUid === user.uid || isLegacy(t));
      this.setState({ tournaments: mine, loading: false });
      if (mine.length) this.selectTournament(mine[0]);
    } catch {
      this.setState({ loading: false });
      toast.error('Không đọc được danh sách giải.');
    }
  }

  selectTournament = (t: TournamentSummary) => {
    this.setState({ selected: t });
    this.loadSetting(t.index);
  };

  loadSetting(index: number) {
    get(ref(this.db, 'tournament/' + index + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      if (!this.settingObj) return;
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
        quantityRefereeMartial: this.settingObj.martial.isShowFiveReferee,
      });
    });
  }

  /** Doc lai dong tom tat sau khi doi trang thai / cong tac */
  async refreshSummary() {
    const all = await listTournaments();
    const mine = all.filter((t) => t.ownerUid === this.props.user.uid || isLegacy(t));
    const fresh = mine.find((t) => t.index === this.index) || null;
    this.setState({ tournaments: mine, selected: fresh });
  }

  // ==================== Trang thai giai ====================

  handleOpen = async () => {
    try {
      await openTournament(this.index);
      await this.refreshSummary();
      toast.success('Đã mở giải — từ giờ giải nhận được đơn xin quyền giám sát.');
    } catch {
      toast.error('Không mở được giải này.');
    }
  };

  confirmClose = () => this.askConfirm(
    'Đóng giải',
    'Giải sẽ biến mất khỏi bảng chọn của giám sát và giám định, và TOÀN BỘ mã giám định của giải bị thu hồi ngay lập tức. Thông tin giải vẫn tra cứu được ở trang công khai.',
    this.handleClose,
    'Đóng giải'
  );

  handleClose = async () => {
    try {
      const revoked = await closeTournament(this.index);
      await this.refreshSummary();
      toast.success(`Đã đóng giải và thu hồi ${revoked} mã giám định.`);
    } catch {
      toast.error('Không đóng được giải này.');
    }
  };

  handleReopen = async () => {
    try {
      await reopenTournament(this.index);
      await this.refreshSummary();
      toast.info('Đã mở lại giải. Mã giám định phải cấp lại — bấm “Cấp lại toàn bộ mã”.');
    } catch {
      toast.error('Không mở lại được giải này.');
    }
  };

  handleClaim = async () => {
    const { user } = this.props;
    try {
      await claimTournament(this.index, user);
      await this.refreshSummary();
      toast.success('Giải này giờ thuộc tài khoản của bạn.');
    } catch (err: any) {
      toast.error(err?.message || 'Không nhận được giải này.');
    }
  };

  /**
   * Cong tac "Mo tu do". Mac dinh TAT cho moi giai — muon giam sat thi phai
   * xin duyet, khong co ngoai le mac dinh. Bat len la bo han buoc duyet nen
   * phai hoi lai mot lan.
   */
  handleToggleOpenAccess = () => {
    const { selected } = this.state;
    if (!selected) return;

    if (selected.openAccess) {
      void setOpenAccess(this.index, false).then(() => {
        this.refreshSummary();
        toast.success('Đã tắt — giám sát phải xin duyệt như bình thường.');
      });
      return;
    }

    this.askConfirm(
      'Bật “Mở tự do”?',
      'BẤT KỲ AI đăng nhập Google cũng chấm điểm được trên giải này, không cần bạn duyệt. Chỉ bật cho giải nội bộ hoặc buổi tập huấn.',
      async () => {
        await setOpenAccess(this.index, true);
        await this.refreshSummary();
        toast.warn('Giải đang MỞ TỰ DO — nhớ tắt lại sau buổi tập.');
      },
      'Tôi hiểu, vẫn bật'
    );
  };

  // ==================== Ma giam dinh ====================

  handleRegenerateAll = async () => {
    const { selected } = this.state;
    const { user } = this.props;
    if (!selected) return;

    this.setState({ regenerating: true });
    try {
      const result = await ensureTournamentCodes(
        selected.index,
        {
          combatReferees: this.state.quantityRefereeCombat ? 5 : 3,
          martialReferees: this.state.quantityRefereeMartial ? 5 : 3,
          useArenaB: this.settingObj?.combat?.isShowArenaB !== false,
          tournamentName: selected.name,
        },
        user.uid
      );

      if (result.created === 0) {
        toast.info('Mọi ô chấm điểm đều đã có mã.');
      } else {
        toast.success(`Đã cấp thêm ${result.created} mã.`);
      }

      // Khong doc nguoc duoc kho ma nen khong dem truc tiep duoc do day —
      // so lan phai random lai la thuoc do gian tiep duy nhat co
      if (result.poolPressure) {
        toast.warn('Kho mã sắp hết — kiểm tra xem còn giải cũ chưa đóng không.', { autoClose: 8000 });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không cấp được mã.');
    } finally {
      this.setState({ regenerating: false });
    }
  };

  // ==================== Thiet dat ====================

  resetTournament = () => {
    get(ref(this.db, 'tournament/' + this.index + '/')).then((snapshot) => {
      const tournamentData = snapshot.val();
      if (!tournamentData) return;

      for (let i = 0; i < tournamentData.combat.length; i++) {
        const red = tournamentData.combat[i].fighters.redFighter;
        const blue = tournamentData.combat[i].fighters.blueFighter;
        for (const f of [red, blue]) {
          f.caution.bound = 0;
          f.caution.fall = 0;
          f.caution.medical = 0;
          f.caution.remind = 0;
          f.caution.warning = 0;
          f.result = "";
          f.score = 0;
        }
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

      update(ref(this.db, 'tournament/' + this.index + '/'), tournamentData).then(() => {
        toast.success("Cài đặt trận đấu thành công!");
      });
    });
  }

  resetSetting = () => {
    const fresh = JSON.parse(JSON.stringify(this.settingConst)).setting;
    update(ref(this.db, 'tournament/' + this.index + '/setting'), fresh).then(() => {
      this.loadSetting(this.index);
      toast.success("Cài lại thiết đặt thành công!");
    });
  }

  updateSetting = () => {
    const { timeRound, timeBreak, timeExtra, timeExtraBreak, tournamentName,
            flexSwitchCountryFlagCombat, showCautionBoxCombat, quantityRefereeCombat, prioritizeUnitNameCombat,
            flexSwitchCountryFlagMartial, quantityRefereeMartial } = this.state;

    const payload = {
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
    update(ref(this.db, 'tournament/' + this.index + '/setting'), payload).then(() => {
      void this.refreshSummary();
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
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

  askConfirm = (title: string, message: string, action: () => void, label?: string) => {
    this.setState({ confirm: { title, message, action, label } });
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

  copyUid = async () => {
    try {
      await navigator.clipboard.writeText(this.props.user.uid);
      toast.success('Đã chép mã tài khoản.');
    } catch {
      toast.info(this.props.user.uid);
    }
  };

  renderStatusBar() {
    const { selected } = this.state;
    if (!selected) return null;

    const legacy = isLegacy(selected);
    const badge = {
      draft: { text: 'Chưa mở', className: 'bg-slate-100 text-slate-600 border-slate-200' },
      open: { text: 'Đang mở', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      closed: { text: 'Đã đóng', className: 'bg-red-50 text-red-700 border-red-200' },
    }[selected.status];

    return (
      <div className="flex flex-wrap items-center gap-2.5 pt-4 mt-4 border-t border-slate-100">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.className}`}>
          {badge.text}
        </span>

        {legacy && (
          <>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border
              bg-amber-50 text-amber-700 border-amber-200">Giải cũ — chưa có chủ</span>
            <Button size="sm" variant="primary" icon="fa-solid fa-hand-holding-heart"
              onClick={this.handleClaim}>
              Nhận giải này về tài khoản tôi
            </Button>
          </>
        )}

        {!legacy && selected.status !== 'open' && (
          <Button size="sm" variant="success" icon="fa-solid fa-door-open"
            onClick={selected.status === 'closed' ? this.handleReopen : this.handleOpen}>
            {selected.status === 'closed' ? 'Mở lại giải' : 'Mở giải'}
          </Button>
        )}

        {!legacy && selected.status === 'open' && (
          <Button size="sm" variant="danger" icon="fa-solid fa-flag-checkered"
            onClick={this.confirmClose}>
            Đóng giải
          </Button>
        )}

        {selected.openAccess && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border
            bg-red-50 text-red-700 border-red-200">
            <i className="fa-solid fa-lock-open mr-1" aria-hidden="true" />
            ĐANG MỞ TỰ DO
          </span>
        )}
      </div>
    );
  }

  render() {
    const {
      tournaments, selected, loading, tournamentName,
      timeRound, timeBreak, timeExtra, timeExtraBreak,
      flexSwitchCountryFlagCombat, showCautionBoxCombat, quantityRefereeCombat, prioritizeUnitNameCombat,
      flexSwitchCountryFlagMartial, quantityRefereeMartial,
      confirm, regenerating,
    } = this.state;
    const { user } = this.props;

    return (
      <PageShell accent="tool">
        <PageHeader title="Thiết đặt" icon="fa-solid fa-gear" badge={tournamentName}>
          <div className="flex justify-end">
            <AccountChip user={user} />
          </div>
        </PageHeader>

        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
          <SectionCard title="Giải đang cấu hình" icon="fa-solid fa-trophy">
            {loading ? (
              <p className="text-slate-400 italic m-0">Đang đọc danh sách giải…</p>
            ) : tournaments.length === 0 ? (
              <p className="text-slate-500 m-0">
                Bạn chưa tạo giải nào. Sang trang{' '}
                <NavLink to="/tao-giai" className="text-accent-700 font-medium underline">Tạo giải</NavLink>{' '}
                để bắt đầu.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {tournaments.map((t) => (
                  <label
                    key={t.index}
                    className={`flex items-center gap-3 p-3.5 border-2 rounded-control cursor-pointer transition-colors
                      ${selected?.index === t.index
                        ? 'border-accent-500 bg-accent-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <input
                      type="radio"
                      name="tournamentRadio"
                      checked={selected?.index === t.index}
                      onChange={() => this.selectTournament(t)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-700 whitespace-pre-line">{t.name}</span>
                      {t.status === 'closed' && (
                        <span className="block text-xs text-red-600 mt-0.5">đã đóng</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {this.renderStatusBar()}

            <p className="text-xs text-slate-500 m-0 mt-4 bg-slate-50 border border-slate-200
              rounded-control px-3 py-2.5">
              <i className="fa-solid fa-circle-info mr-1.5 text-slate-400" aria-hidden="true" />
              Chỉ hiện giải của bạn. Thêm giải mới hoặc nhập danh sách vận động viên ở trang{' '}
              <NavLink to="/tao-giai" className="text-accent-700 font-medium underline">Tạo giải</NavLink>.
            </p>
          </SectionCard>

          {selected && (
            <SectionCard title="Bảng mã giám định" icon="fa-solid fa-key" tone="neutral">
              <p className="text-sm text-slate-500 mt-0 mb-4">
                Mỗi mã vào thẳng đúng một ô chấm điểm — giám định không phải chọn giải, chọn sân,
                chọn vị trí nữa. Đọc số cho họ gõ vào máy, hoặc in ra dán ở bàn.
              </p>

              <CodeBoard
                tournamentIndex={selected.index}
                tournamentName={selected.name}
                canManage
                ownerUid={user.uid}
              />

              <div className="pt-4 mt-4 border-t border-slate-100">
                <Button variant="secondary" icon="fa-solid fa-wand-magic-sparkles"
                  disabled={regenerating} onClick={this.handleRegenerateAll}>
                  {regenerating ? 'Đang cấp mã…' : 'Cấp mã cho ô còn thiếu'}
                </Button>
                <p className="text-xs text-slate-400 m-0 mt-2">
                  Mã được sinh sẵn lúc tạo giải. Nút này chỉ cần dùng cho giải cũ, hoặc sau khi
                  đổi số giám định / bật thêm Sân B.
                </p>
              </div>
            </SectionCard>
          )}

          {selected && !isLegacy(selected) && (
            <SectionCard title="Giám sát của giải" icon="fa-solid fa-user-shield">
              <StaffApprovalPanel
                tournamentIndex={selected.index}
                ownerUid={user.uid}
                tournamentStatus={selected.status}
              />

              <div className="pt-5 mt-5 border-t border-slate-100">
                <Toggle
                  name="openAccess"
                  checked={selected.openAccess}
                  onChange={this.handleToggleOpenAccess}
                  label="Mở tự do — bỏ hẳn bước duyệt"
                  hint="Chỉ dùng cho giải nội bộ hoặc buổi tập huấn"
                />
                {selected.openAccess && (
                  <p className="m-0 mt-2 text-xs text-red-700 bg-red-50 border border-red-200
                    rounded-control px-3 py-2.5">
                    <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
                    Ai đăng nhập cũng chấm điểm được trên giải này. Nhớ tắt lại khi xong.
                  </p>
                )}
              </div>
            </SectionCard>
          )}

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

          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm pt-2">
            {[
              { to: '/', label: 'Trang chủ' },
              { to: '/giam-sat-doi-khang', label: 'Giám sát đối kháng' },
              { to: '/giam-sat-thi-quyen', label: 'Giám sát thi quyền' },
              { to: '/vao', label: 'Vào bằng mã (giám định)' },
              { to: '/tao-giai', label: 'Tạo giải' },
            ].map((link) => (
              <NavLink key={link.to} to={link.to}
                className="text-slate-500 hover:text-accent-700 transition-colors">
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Ma tai khoan de o day de lan sau cap quyen admin cho nguoi khac
              khoi phai mo Firebase Console di mo tung dong */}
          <p className="text-center text-[11px] text-slate-400 m-0 pt-2">
            Mã tài khoản của bạn:{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">{user.uid}</code>{' '}
            <button type="button" onClick={this.copyUid}
              className="text-accent-600 hover:underline">chép</button>
          </p>
        </main>

        <AppFooter />

        <ConfirmModal
          isOpen={confirm !== null}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          confirmLabel={confirm?.label}
          onConfirm={this.runConfirm}
          onCancel={this.closeConfirm}
        />

        <Toast />
      </PageShell>
    );
  }
}

export default SettingContainer;
