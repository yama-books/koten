import { Component } from 'preact';
import type { ComponentChildren } from 'preact';
import { ErrorScreen } from './screens/ErrorScreen.tsx';

export class ErrorBoundary extends Component<{ children: ComponentChildren }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children;
  }
}
