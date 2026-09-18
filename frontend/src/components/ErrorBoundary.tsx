import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onReset?: () => void
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
    showDetails: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
    }

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error in component tree:', error, errorInfo)
        this.setState({ errorInfo })
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false,
        })
        if (this.props.onReset) {
            this.props.onReset()
        }
    }

    private handleHardReload = () => {
        window.location.reload()
    }

    private handleGoHome = () => {
        window.location.href = '/'
    }

    private toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }))
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            const isDev = import.meta.env.DEV

            return (
                <div className="min-h-[360px] w-full h-full flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-surface/90 backdrop-blur-xl border border-border/80 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
                        {/* Background subtle glow */}
                        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-5 border border-amber-500/20 shadow-inner">
                            <AlertTriangle size={32} />
                        </div>

                        <h2 className="text-xl font-bold text-text mb-2">
                            Ma'lumotlarni yuklashda xatolik yuz berdi
                        </h2>

                        <p className="text-sm text-text-muted mb-6 leading-relaxed">
                            Sahifa komponentida kutilmagan xatolik kuzatildi. Ma'lumotlarni qayta yuklash yoki sahifani yangilash orqali davom etishingiz mumkin.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                                <RotateCcw size={16} />
                                Qayta urinish
                            </button>

                            <button
                                onClick={this.handleHardReload}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-hover hover:bg-white/10 text-text font-medium text-sm border border-border transition-all active:scale-95 cursor-pointer"
                            >
                                Sahifani yangilash
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-hover/50 hover:bg-surface-hover text-text-muted hover:text-text text-sm transition-all cursor-pointer"
                                title="Bosh sahifa"
                            >
                                <Home size={16} />
                                Bosh sahifa
                            </button>
                        </div>

                        {/* Error details (developer friendly) */}
                        {(isDev || this.state.error) && (
                            <div className="mt-4 pt-4 border-t border-border/50 text-left">
                                <button
                                    onClick={this.toggleDetails}
                                    className="flex items-center justify-between w-full text-xs text-text-muted hover:text-text transition-colors py-1 cursor-pointer bg-transparent border-none"
                                >
                                    <span>Texnik tafsilotlar</span>
                                    {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {this.state.showDetails && (
                                    <div className="mt-2 p-3 rounded-xl bg-black/40 border border-border/50 text-[11px] font-mono text-red-400 overflow-x-auto max-h-48 custom-scrollbar">
                                        <div className="font-bold text-red-300 mb-1">
                                            {this.state.error?.name}: {this.state.error?.message}
                                        </div>
                                        {this.state.error?.stack && (
                                            <pre className="whitespace-pre-wrap text-[10px] text-text-muted/80 m-0">
                                                {this.state.error.stack}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
