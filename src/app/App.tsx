import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { Skeleton } from "./components/ui/skeleton";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "@/app/layout/AppLayout";

const LoginPage = lazy(() => import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const SetupPage = lazy(() => import("./pages/auth/SetupPage").then((m) => ({ default: m.SetupPage })));
const ControlSpacePage = lazy(() => import("./pages/dashboard/ControlSpacePage").then((m) => ({ default: m.ControlSpacePage })));
const InstitutionListPage = lazy(() => import("./pages/institutions/InstitutionListPage").then((m) => ({ default: m.InstitutionListPage })));
const InstitutionDetailPage = lazy(() => import("./pages/institutions/InstitutionDetailPage").then((m) => ({ default: m.InstitutionDetailPage })));
const CreateInstitutionFlow = lazy(() => import("./pages/institutions/CreateInstitutionFlow").then((m) => ({ default: m.CreateInstitutionFlow })));
const UsersPage = lazy(() => import("./pages/users/UsersPage").then((m) => ({ default: m.UsersPage })));
const ProfilesPage = lazy(() => import("./pages/profiles/ProfilesPage").then((m) => ({ default: m.ProfilesPage })));
const ApplicationsPage = lazy(() => import("./pages/applications/ApplicationsPage").then((m) => ({ default: m.ApplicationsPage })));

function PageFallback() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-[#F9FAFB]">
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<ProtectedRoute><ControlSpacePage /></ProtectedRoute>} />
          <Route path="/institutions" element={<ProtectedRoute><InstitutionListPage /></ProtectedRoute>} />
          <Route path="/institutions/pending" element={<Navigate to="/institutions" replace />} />
          <Route path="/institutions/create" element={<ProtectedRoute><CreateInstitutionFlow /></ProtectedRoute>} />
          <Route path="/institutions/:id" element={<ProtectedRoute><InstitutionDetailPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
          <Route path="/profiles" element={<ProtectedRoute><ProfilesPage /></ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
