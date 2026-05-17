import React from 'react';
import { clearAuthSession } from '../utils/storage';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info);
  }

  handleResetSession = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-red-500">
            Application error
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Khong the hien thi man hinh nay
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Ung dung vua gap loi runtime thay vi loi API thong thuong. Thu tai
            lai trang; neu van loi, xoa phien dang nhap va dang nhap lai.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-red-100">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            >
              Tai lai
            </button>
            <button
              type="button"
              onClick={this.handleResetSession}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
            >
              Dang nhap lai
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
