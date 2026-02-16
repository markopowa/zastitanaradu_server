import { Component } from "react";
import { Routes, Route } from "react-router-dom";

import LoginPage from "./auth/LoginPage";
import RolesListPage from "./auth/RolesListPage";
import UserProfilePage from "./auth/UserProfilePage";
import UsersListPage from "./auth/UsersListPage";
import DocumentsListPage from "./documents/DocumentsListPage";
import DocumentCategoriesListPage from "./documents/DocumentCategoriesListPage";
import TrainingsDashboardPage from "./trainings/TrainingsDashboardPage";
import TrainingSessionsListPage from "./trainings/TrainingSessionsListPage";
import TrainingAttendanceListPage from "./trainings/TrainingAttendanceListPage";
import TrainingProgramsListPage from "./trainings/TrainingProgramsListPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RedirectComponent from "./components/RedirectComponent";
import "./App.css";

class App extends Component {
    render() {
        return (
            <Routes>
                <Route path="/auth/login" element={<LoginPage />} />
                <Route
                    path="/auth/profile"
                    element={<ProtectedRoute element={<UserProfilePage />} />}
                />
                <Route
                    path="/auth/users"
                    element={<ProtectedRoute element={<UsersListPage />} />}
                />
                <Route
                    path="/auth/roles"
                    element={<ProtectedRoute element={<RolesListPage />} />}
                />
                <Route
                    path="/documents"
                    element={<ProtectedRoute element={<DocumentsListPage />} />}
                />
                <Route
                    path="/documents/categories"
                    element={<ProtectedRoute element={<DocumentCategoriesListPage />} />}
                />
                <Route
                    path="/trainings"
                    element={<ProtectedRoute element={<TrainingsDashboardPage />} />}
                />
                <Route
                    path="/trainings/sessions"
                    element={<ProtectedRoute element={<TrainingSessionsListPage />} />}
                />
                <Route
                    path="/trainings/attendance"
                    element={<ProtectedRoute element={<TrainingAttendanceListPage />} />}
                />
                <Route
                    path="/trainings/programs"
                    element={<ProtectedRoute element={<TrainingProgramsListPage />} />}
                />
                <Route path="*" element={<RedirectComponent />} />
            </Routes>
        );
    }
}
export default App;
