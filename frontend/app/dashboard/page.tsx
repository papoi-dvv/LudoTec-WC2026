import MatchAnalysisCard from './MatchAnalysisCard'
import RoomsPanel from './RoomsPanel'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 rounded-lg border border-emerald-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">LudoTec WC 2026</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-950">Centro de predicciones</h1>
            <p className="mt-2 text-sm text-zinc-600">Gestiona tus salas, consulta el ranking y prepara tus picks con apoyo de IA.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-emerald-50 px-4 py-3">
              <div className="text-lg font-semibold text-emerald-900">5</div>
              <div className="text-xs text-emerald-700">Exacto</div>
            </div>
            <div className="rounded-md bg-zinc-100 px-4 py-3">
              <div className="text-lg font-semibold text-zinc-950">3</div>
              <div className="text-xs text-zinc-600">Ganador</div>
            </div>
            <div className="rounded-md bg-amber-50 px-4 py-3">
              <div className="text-lg font-semibold text-amber-900">+2</div>
              <div className="text-xs text-amber-700">Racha</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <MatchAnalysisCard />
          <RoomsPanel />
        </div>
      </div>
    </div>
  )
}
