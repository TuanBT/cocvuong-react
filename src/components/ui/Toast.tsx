import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ToastProps {
  /** Trang cham diem dat o giua tren de khong che noi dung hai ben */
  position?: 'top-center' | 'top-right';
  autoClose?: number;
}

/**
 * Cau hinh thong bao dung chung. Truoc day moi trang mot kieu:
 * cho hien 800ms, cho 5s, cho co thanh tien trinh, cho khong.
 */
const Toast: React.FC<ToastProps> = ({ position = 'top-center', autoClose = 2200 }) => (
  <ToastContainer
    position={position}
    autoClose={autoClose}
    hideProgressBar
    newestOnTop
    closeOnClick
    pauseOnFocusLoss={false}
    draggable={false}
    theme="colored"
  />
);

export default Toast;
