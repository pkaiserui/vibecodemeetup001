import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import Header from "./components/Header";

// Route-based code splitting: each page is loaded on demand
const HomePage = lazy(() => import("./pages/HomePage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const CreateEventPage = lazy(() => import("./pages/CreateEventPage"));
const EditEventPage = lazy(() => import("./pages/EditEventPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ProfileViewPage = lazy(() => import("./pages/ProfileViewPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function RouteLoadingFallback() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "40vh",
        color: "var(--accent, #00ffff)",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "1rem",
      }}
    >
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/host" element={<CreateEventPage />} />
            <Route path="/create" element={<CreateEventPage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/events/:eventId/edit" element={<EditEventPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profiles/:userId" element={<ProfileViewPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="site-footer">
        <p>Built for vibe coding, shipped fast.</p>
      </footer>
    </div>
  );
}
