import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import CreateBook from './pages/CreateBooks'
import ShowBook from './pages/ShowBook'
import EditBook from './pages/EditBook'
import DeleteBook from './pages/DeleteBook'
import LoginPage from './pages/LoginPage'
import SearchPage from './pages/SearchPage'
import ProtectedRoute from './components/ProtectedRoute'

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/login' element={<LoginPage />} />
      <Route path='/search' element={<SearchPage />} />

      {/* Redirect root to login */}
      <Route path='/' element={<Navigate to='/login' replace />} />

      {/* Admin-only routes */}
      <Route
        path='/home'
        element={
          <ProtectedRoute adminOnly>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path='/books/create'
        element={
          <ProtectedRoute adminOnly>
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
          <ProtectedRoute adminOnly>
            <EditBook />
          </ProtectedRoute>
        }
      />
      <Route
        path='/books/delete/:id'
        element={
          <ProtectedRoute adminOnly>
            <DeleteBook />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
