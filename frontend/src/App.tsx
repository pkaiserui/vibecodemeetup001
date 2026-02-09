import { Route, Routes } from "react-router-dom";

import Header from "./components/Header";
import AuthPage from "./pages/AuthPage";
import CreateEventPage from "./pages/CreateEventPage";
import EventDetailPage from "./pages/EventDetailPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/create" element={<CreateEventPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>Built for vibe coding, shipped fast.</p>
      </footer>
    </div>
  );
}
