import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AddTaskPage from "./pages/AddTaskPage";
import EditTaskPage from "./pages/EditTaskPage";
import ProfilePage from "./pages/ProfilePage";
import TaskDetailPage from "./pages/TaskDetailPage";
import ProgressPage from "./pages/ProgressPage";
import AdminPanel from "./pages/AdminPanel";
import UsersAdminPage from "./pages/UsersAdminPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header"; // ← новая шапка

export default function App() {
  return (
    <div className="min-h-screen bg-black bg-opacity-70 text-white backdrop-blur-md px-4 py-6">
      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/task/:id" element={<TaskDetailPage />} />
        <Route path="/progress" element={<ProgressPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/add-task"
          element={
            <ProtectedRoute roles={["admin", "moderator", "founder"]}>
              <AddTaskPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/task/:id/edit"
          element={
            <ProtectedRoute roles={["admin", "moderator", "founder"]}>
              <EditTaskPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin", "founder"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute roles={["admin", "founder"]}>
              <UsersAdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/suggestions"
          element={
            <ProtectedRoute roles={["moderator", "admin", "founder"]}>
              <SuggestionsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
