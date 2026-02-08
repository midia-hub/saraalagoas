import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/** Se algo der errado no app, mostra o erro em vez de tela preta */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '560px',
          margin: '0 auto',
          fontFamily: 'system-ui, sans-serif',
          color: '#fff',
          background: '#242424',
          minHeight: '100vh',
        }}>
          <h1 style={{ color: '#ffb0b0' }}>Algo deu errado</h1>
          <pre style={{ background: '#1a1a1a', padding: '1rem', overflow: 'auto' }}>
            {this.state.error.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
