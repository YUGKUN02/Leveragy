import { Routes, Route, Link } from "react-router-dom";
import UrlInputPage from "./pages/UrlInputPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          Leveragy
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<UrlInputPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
        </Routes>
      </main>
    </div>
  );
}
