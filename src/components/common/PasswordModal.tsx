import React, { useState } from 'react';
import NumpadInput from './NumpadInput';

interface PasswordModalProps {
  isVisible: boolean;
  onVerify: (password: string) => void;
  onCancel?: () => void;
  title?: string;
}

/**
 * PasswordModal Component
 * Modal nhập mật khẩu dùng chung cho các trang
 */
const PasswordModal: React.FC<PasswordModalProps> = ({ 
  isVisible, 
  onVerify, 
  onCancel,
  title = "Vui lòng nhập mật khẩu"
}) => {
  const [password, setPassword] = useState<string>('');

  const handleNumberClick = (num: string): void => {
    setPassword(prev => prev + num);
  };

  const handleClear = (): void => {
    setPassword('');
  };

  const handleVerify = (): void => {
    onVerify(password);
    setPassword('');
  };

  const handleCancel = (): void => {
    setPassword('');
    if (onCancel) onCancel();
  };

  if (!isVisible) return null;

  return (
    <div className="modal display-block" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa-solid fa-lock"></i> {title}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={handleCancel}
            ></button>
          </div>
          <div className="modal-body">
            <div className="input-group mb-3">
              <span className="input-group-text">
                <i className="fa fa-key" aria-hidden="true"></i>
              </span>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Mật khẩu"
                value={password}
                disabled 
              />
              <button 
                type="button" 
                className="btn btn-outline-danger btn-lg" 
                onClick={handleClear}
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
            <NumpadInput 
              onNumberClick={handleNumberClick}
              onClear={handleClear}
            />
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-primary ok-button" 
              onClick={handleVerify}
            >
              OK
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;
