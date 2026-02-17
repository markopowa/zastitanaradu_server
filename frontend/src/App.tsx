import { Component, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import RedirectComponent from "./components/RedirectComponent";

const LoginPage = lazy(() => import("./auth/LoginPage"));
const UserProfilePage = lazy(() => import("./auth/UserProfilePage"));
const UsersListPage = lazy(() => import("./auth/UsersListPage"));
const RolesListPage = lazy(() => import("./auth/RolesListPage"));
const DocumentsListPage = lazy(() => import("./documents/DocumentsListPage"));
const DocumentCategoriesListPage = lazy(() => import("./documents/DocumentCategoriesListPage"));
const TrainingsDashboardPage = lazy(() => import("./trainings/TrainingsDashboardPage"));
const TrainingSessionsListPage = lazy(() => import("./trainings/TrainingSessionsListPage"));
const TrainingAttendanceListPage = lazy(() => import("./trainings/TrainingAttendanceListPage"));
const TrainingProgramsListPage = lazy(() => import("./trainings/TrainingProgramsListPage"));
const TrainingTypesListPage = lazy(() => import("./trainings/TrainingTypesListPage"));
const EmployeesListPage = lazy(() => import("./trainings/EmployeesListPage"));

const routeFallback = (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <CircularProgress />
    </Box>
);

class App extends Component {
    render() {
        return (
            <Suspense fallback={routeFallback}>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<ProtectedRoute element={<AppLayout />} />}>
                        <Route index element={<RedirectComponent />} />
                        <Route path="profile" element={<UserProfilePage />} />
                        <Route path="users" element={<UsersListPage />} />
                        <Route path="roles" element={<RolesListPage />} />
                        <Route path="documents" element={<DocumentsListPage />} />
                        <Route path="documents/categories" element={<DocumentCategoriesListPage />} />
                        <Route path="trainings" element={<TrainingsDashboardPage />} />
                        <Route path="trainings/sessions" element={<TrainingSessionsListPage />} />
                        <Route path="trainings/attendance" element={<TrainingAttendanceListPage />} />
                        <Route path="trainings/programs" element={<TrainingProgramsListPage />} />
                        <Route path="trainings/types" element={<TrainingTypesListPage />} />
                        <Route path="trainings/employees" element={<EmployeesListPage />} />
                    </Route>
                    <Route path="*" element={<RedirectComponent />} />
                </Routes>
            </Suspense>
        );
    }
}
export default App;
