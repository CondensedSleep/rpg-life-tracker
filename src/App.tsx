import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { Dashboard } from './pages/Dashboard'
import { Quests } from './pages/Quests'
import { Journal } from './pages/Journal'
import { Stats } from './pages/Stats'
import { Auth } from './pages/Auth'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/quests" element={<Quests />} />
                    <Route path="/journal" element={<Journal />} />
                    <Route path="/stats" element={<Stats />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
