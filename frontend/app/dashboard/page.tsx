import MatchAnalysisCard from './MatchAnalysisCard'
import RoomsPanel from './RoomsPanel'
import DashboardNav from './DashboardNav'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      <DashboardNav />

      <div id="inicio" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <RoomsPanel />
          <MatchAnalysisCard />
        </div>
      </div>
    </div>
  )
}
