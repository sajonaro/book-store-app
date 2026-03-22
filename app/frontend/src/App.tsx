import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import CreateBook from './pages/CreateBooks'
import ShowBook from './pages/ShowBook'
import EditBook from './pages/EditBook'
import DeleteBook from './pages/DeleteBook'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SearchPage from './pages/SearchPage'
import StorePage from './pages/StorePage'
import StoreBookDetailPage from './pages/StoreBookDetailPage'
import TenantSettingsPage from './pages/TenantSettingsPage'
import SuperuserDashboard from './pages/SuperuserDashboard'
import ProtectedRoute from './components/ProtectedRoute'

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/login' element={<LoginPage />} />
      <Route path='/register' element={<RegisterPage />} />

      {/* Search page (authenticated) */}
      <Route
        path='/search'
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />

      {/* Public tenant-specific buyer catalog */}
      <Route path='/store/:slug' element={<StorePage />} />
      <Route path='/store/:slug/books/:id' element={<StoreBookDetailPage />} />

      {/* Superuser dashboard */}
      <Route path='/superuser' element={<SuperuserDashboard />} />

      {/* Redirect root to login */}
      <Route path='/' element={<Navigate to='/login' replace />} />

      {/* Authenticated routes (tenant-admin and user) */}
      <Route
        path='/home'
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path='/settings'
        element={
          <ProtectedRoute>
            <TenantSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/books/create'
        element={
          <ProtectedRoute>
            <CreateBook />
          </ProtectedRoute>
        }
      />
      <Route
        path='/books/details/:id'
        element={
          <ProtectedRoute>
            <ShowBook />
          </ProtectedRoute>
        }
      />
      <Route
        path='/books/edit/:id'
        element={
          <ProtectedRoute>
            <EditBook />
          </ProtectedRoute>
        }
      />
      <Route
        path='/books/delete/:id'
        element={
          <ProtectedRoute>
            <DeleteBook />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
