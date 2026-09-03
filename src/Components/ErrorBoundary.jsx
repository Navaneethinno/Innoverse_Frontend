import { Component } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
class ErrorBoundaryContent extends Component {
  state = { hasError: false, message: "" };
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? "" };
  }
  componentDidCatch(error) {
    console.error("Unhandled UI error", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: "#F4F6FF" }}
        >
          <div
            className="max-w-md w-full rounded-2xl p-6"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid rgba(255,107,107,0.15)",
              boxShadow: "0 4px 24px rgba(255,107,107,0.08)",
            }}
          >
            <div className="flex items-center gap-3 text-red-500 mb-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h1 className="text-sm font-bold">Something went wrong</h1>
            </div>
            {this.state.message && (
              <p className="text-xs text-slate-500 font-mono bg-slate-50 rounded-xl px-3 py-2 mb-4 break-all">
                {this.state.message}
              </p>
            )}
            <button
              onClick={() => this.props.navigate(0)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #2266EE 0%, #26FFFF 100%)" }}
            >
              <RefreshCw size={12} /> Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary(props) {
  const navigate = useNavigate();
  return <ErrorBoundaryContent {...props} navigate={navigate} />;
}
