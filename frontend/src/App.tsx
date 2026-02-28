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
const DocumentCategoriesListPage = lazy(
  () => import("./documents/DocumentCategoriesListPage"),
);
const DocumentTemplatesListPage = lazy(
  () => import("./documents/DocumentTemplatesListPage"),
);
const DashboardExpiringPage = lazy(
  () => import("./processes/DashboardExpiringPage"),
);
const ClientCompaniesListPage = lazy(
  () => import("./processes/ClientCompaniesListPage"),
);
const ClientCompanyDetailPage = lazy(
  () => import("./processes/ClientCompanyDetailPage"),
);
const EquipmentListPage = lazy(() => import("./processes/EquipmentListPage"));
const EquipmentDetailPage = lazy(
  () => import("./processes/EquipmentDetailPage"),
);
const ProcessTypesListPage = lazy(
  () => import("./processes/ProcessTypesListPage"),
);
const ProcessTemplatesListPage = lazy(
  () => import("./processes/ProcessTemplatesListPage"),
);
const ProcessBindingsListPage = lazy(
  () => import("./processes/ProcessBindingsListPage"),
);
const ProcessRunsListPage = lazy(
  () => import("./processes/ProcessRunsListPage"),
);

const routeFallback = (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: 200,
    }}
  >
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
            <Route path="dashboard" element={<DashboardExpiringPage />} />
            <Route
              path="client-companies"
              element={<ClientCompaniesListPage />}
            />
            <Route
              path="client-companies/:id"
              element={<ClientCompanyDetailPage />}
            />
            <Route path="equipment" element={<EquipmentListPage />} />
            <Route path="equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="processes/types" element={<ProcessTypesListPage />} />
            <Route
              path="processes/templates"
              element={<ProcessTemplatesListPage />}
            />
            <Route
              path="processes/bindings"
              element={<ProcessBindingsListPage />}
            />
            <Route path="processes/runs" element={<ProcessRunsListPage />} />
            <Route path="profile" element={<UserProfilePage />} />
            <Route path="users" element={<UsersListPage />} />
            <Route path="roles" element={<RolesListPage />} />
            <Route path="documents" element={<DocumentsListPage />} />
            <Route
              path="documents/categories"
              element={<DocumentCategoriesListPage />}
            />
            <Route
              path="documents/templates"
              element={<DocumentTemplatesListPage />}
            />
          </Route>
          <Route path="*" element={<RedirectComponent />} />
        </Routes>
      </Suspense>
    );
  }
}
export default App;
