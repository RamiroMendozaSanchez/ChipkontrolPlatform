import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Map from "./pages/Map";
import Groups from "./pages/Groups";
import CreateGroup from "./pages/CreateGroup";
import CreateUser from "./pages/CreateUser";

import ProtectedRoute from "./routes/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* LOGIN */}
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "group_admin",
                  "user",
                ]}
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/map"
            element={
              <ProtectedRoute
                allowedRoles={["admin",
                  "group_admin",
                  "user",]}
              >
                <Map />
              </ProtectedRoute>
            }
          />

          <Route
            path="/groups"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
              >
                <Groups />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/groups/new"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
              >
                <CreateGroup />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users/new"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "group_admin",
                ]}
              >
                <CreateUser />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}