import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-black flex flex-col items-center justify-center text-center p-8">
          <AlertTriangle className="text-lcars-red mb-6" size={64} />
          <div className="text-lcars-red font-lcars text-3xl tracking-[0.3em] mb-4">
            SYSTEMFEHLER
          </div>
          <p className="text-lcars-gray font-lcars text-sm tracking-wider mb-8 max-w-md">
            Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-lcars-orange text-black rounded-full px-8 py-3 font-lcars tracking-wider hover:bg-lcars-blue transition-all"
          >
            SEITE NEU LADEN
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
