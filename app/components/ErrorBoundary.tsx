"use client";

import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen flex items-center justify-center bg-cream">
          <div className="text-center p-8 max-w-md">
            <div className="text-5xl mb-4">🌸</div>
            <h2 className="text-xl font-bold text-forest mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4 font-mono bg-sage/50 p-3 rounded text-left whitespace-pre-wrap">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 bg-fern text-white rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
