import { Route, Routes } from "react-router-dom";

import Header from "./components/Header";
import AuthPage from "./pages/AuthPage";
import CreateEventPage from "./pages/CreateEventPage";
import EditEventPage from "./pages/EditEventPage";
import EventDetailPage from "./pages/EventDetailPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileViewPage from "./pages/ProfileViewPage";

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">
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
      </main>
      <footer className="site-footer">
        <p>Built for vibe coding, shipped fast.</p>
      </footer>
    </div>
  );
}
