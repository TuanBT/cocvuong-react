import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * Bắt và xử lý các lỗi JavaScript trong component tree
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = (): void => {
    window.location.reload();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback UI with Tailwind classes
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-gray-100">
          <div className="text-center max-w-md p-10 bg-white rounded-lg shadow-md">
            <i className="fa-solid fa-triangle-exclamation text-6xl text-coc-red mb-5 block"></i>
            <h2 className="text-gray-800 mb-2 text-xl font-semibold">
              Oops! Có lỗi xảy ra
            </h2>
            <p className="text-gray-600 mb-5">
              Đã có lỗi không mong muốn xảy ra. Vui lòng tải lại trang.
            </p>
            
            <button 
              onClick={this.handleReload}
              className="px-6 py-3 text-base bg-blue-500 text-white border-none rounded cursor-pointer mr-2 hover:bg-blue-600 transition-colors"
            >
              <i className="fa-solid fa-rotate-right"></i> Tải lại trang
            </button>
            
            <a 
              href="#/"
              className="inline-block px-6 py-3 text-base bg-gray-400 text-white border-none rounded cursor-pointer no-underline hover:bg-gray-500 transition-colors"
            >
              <i className="fa-solid fa-house"></i> Về trang chủ
            </a>

            {/* Debug info - chỉ hiển thị trong development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-5 text-left p-2 bg-gray-100 rounded">
                <summary className="cursor-pointer text-coc-red">
                  Chi tiết lỗi (Development Only)
                </summary>
                <pre className="mt-2 p-2 bg-white rounded overflow-auto text-xs">
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
