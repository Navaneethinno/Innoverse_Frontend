import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled UI error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
          <div className="max-w-md w-full rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertCircle className="h-5 w-5" />
              <h1 className="text-base font-semibold">Something went wrong</h1>
            </div>
            <p className="text-sm text-slate-600">
              The interface hit an unexpected error. Please refresh the page and try again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
