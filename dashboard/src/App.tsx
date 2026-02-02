import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import AccountPage from './pages/account';
import AdminPage from './pages/admin';
import CalendarPage from './pages/calendar';
import Chat from './pages/chat';
import Documentation from './pages/docs';
import GroupDetails from './pages/groupDetails';
import Groups from './pages/groups';
import Login from './pages/login';
import RouteDetails from './pages/routeDetails';
import RoutesPage from './pages/routes';
import Stops from './pages/stops';

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Documentation route - accessible without authentication */}
        <Route path="/docs" element={<Layout />}>
          <Route index element={<Documentation />} />
        </Route>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/stops" />} />
          <Route path="chat" element={<Chat />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="routes/:routeId" element={<RouteDetails />} />
          <Route path="stops" element={<Stops />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:groupId" element={<GroupDetails />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="trips" element={<ComingSoon title="Trips" />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

// Placeholder component for pages not yet implemented
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold text-muted-foreground">{title}</h1>
      <p className="text-muted-foreground mt-2">Coming soon...</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
