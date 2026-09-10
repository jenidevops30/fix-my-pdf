"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  title: string;
  body: string;
  reloadLabel: string;
}

interface State {
  hasError: boolean;
}

/**
 * Client-side safety net: a render error anywhere in the app shows a friendly
 * recovery card instead of a white screen. No route files needed.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Local development aid only — nothing is reported anywhere.
    console.error("FixMyPDF crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
            <div className="size-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold">{this.props.title}</h1>
            <p className="text-sm text-muted-foreground">{this.props.body}</p>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              <RotateCcw aria-hidden="true" />
              {this.props.reloadLabel}
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
