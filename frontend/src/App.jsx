import { Routes, Route, Link } from "react-router-dom";
import UrlInputPage from "./pages/UrlInputPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="mark">L</span>
          <span className="brand-text">
            <span className="name">Leveragy</span>
            <span className="tag">금융 피싱 탐지 플랫폼</span>
          </span>
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
