import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { Dashboard } from './pages/Dashboard'
import { Quests } from './pages/Quests'
import { Journal } from './pages/Journal'
import { Stats } from './pages/Stats'
import { loadSeedData } from './lib/loadSeedData'

function App() {
  useEffect(() => {
    // Load seed data on app initialization
    // In production, this would be replaced with Supabase data fetching
    loadSeedData()
  }, [])

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App
