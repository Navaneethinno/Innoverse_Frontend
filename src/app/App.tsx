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
const ReviewCenterPage = lazy(() => import("./pages/review/ReviewCenterPage").then((m) => ({ default: m.ReviewCenterPage })));
const CompareViewPage = lazy(() => import("./pages/review/CompareViewPage").then((m) => ({ default: m.CompareViewPage })));

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
          <Route path="/institutions/:id" element={<ProtectedRoute><InstitutionDetailPage /></ProtectedRoute>} />
          <Route path="/institutions/create" element={<ProtectedRoute><CreateInstitutionFlow /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><ReviewCenterPage /></ProtectedRoute>} />
          <Route path="/review/:id" element={<ProtectedRoute><CompareViewPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
