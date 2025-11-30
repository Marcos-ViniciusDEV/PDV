import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import PDV from './pages/PDV';
import InitialLoad from './pages/InitialLoad';
import AberturaCaixa from './pages/AberturaCaixa';
import FechamentoCaixa from './pages/FechamentoCaixa';
import { useAuthStore } from './stores/authStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InitialLoad />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/pdv"
          element={
            <PrivateRoute>
              <PDV />
            </PrivateRoute>
          }
        />
        <Route
          path="/abertura-caixa"
          element={
            <PrivateRoute>
              <AberturaCaixa />
            </PrivateRoute>
          }
        />
        <Route
          path="/fechamento-caixa"
          element={
            <PrivateRoute>
              <FechamentoCaixa />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
