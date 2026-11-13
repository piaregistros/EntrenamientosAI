import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '../lib/lazyWithRetry';

type Props = {
  children: ReactNode;
  label?: string;
  onReset?: () => void;
};

type State = { error: Error | null };

export default class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
    }
  }

  private reload = () => {
    window.location.reload();
  };

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = isChunkLoadError(this.state.error);
    const title = chunk
      ? 'No se pudo cargar esta pantalla'
      : 'Ha ocurrido un error en esta pantalla';
    const detail = chunk
      ? 'Suele pasar después de una actualización: la app intentó abrir un archivo que ya no está. Recarga para coger la versión nueva.'
      : (this.state.error.message || 'Error inesperado.');
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
        <div className="max-w-sm w-full space-y-4 text-center">
          <h2 className="text-lg font-black text-white">{title}</h2>
          {this.props.label && (
            <p className="text-[11px] uppercase tracking-widest text-neutral-500">{this.props.label}</p>
          )}
          <p className="text-sm text-neutral-400">{detail}</p>
          <button
            type="button"
            onClick={this.reload}
            className="w-full bg-lime-400 text-neutral-950 font-extrabold rounded-xl py-3"
          >
            Recargar la app
          </button>
          {this.props.onReset && (
            <button
              type="button"
              onClick={this.reset}
              className="w-full border border-neutral-700 text-neutral-200 font-bold rounded-xl py-3"
            >
              Volver
            </button>
          )}
        </div>
      </div>
    );
  }
}
