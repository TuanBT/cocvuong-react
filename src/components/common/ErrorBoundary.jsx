import React, { Component } from 'react';

/**
 * ErrorBoundary Component
 * Bắt và xử lý các lỗi JavaScript trong component tree
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (có thể tích hợp với error tracking service như Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="error-boundary-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '500px',
            padding: '40px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ 
              fontSize: '64px', 
              color: '#e74c3c',
              marginBottom: '20px'
            }}></i>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>
              Oops! Có lỗi xảy ra
            </h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Đã có lỗi không mong muốn xảy ra. Vui lòng tải lại trang.
            </p>
            
            <button 
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              <i className="fa-solid fa-rotate-right"></i> Tải lại trang
            </button>
            
            <a 
              href="#/"
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#95a5a6',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              <i className="fa-solid fa-house"></i> Về trang chủ
            </a>

            {/* Debug info - chỉ hiển thị trong development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ 
                marginTop: '20px', 
                textAlign: 'left',
                padding: '10px',
                backgroundColor: '#f1f1f1',
                borderRadius: '4px'
              }}>
                <summary style={{ cursor: 'pointer', color: '#e74c3c' }}>
                  Chi tiết lỗi (Development Only)
                </summary>
                <pre style={{ 
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
