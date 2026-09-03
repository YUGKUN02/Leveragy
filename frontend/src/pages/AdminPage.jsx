import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listReports, updateReportStatus, listAnalyses } from "../api/client.js";
import ErrorState from "../components/ErrorState.jsx";

const VERDICT_TONE = { PHISHING: "danger", SUSPICIOUS: "warning", NORMAL: "safe" };

const STATUS_LABEL = {
  PENDING: "검토 대기",
  CONFIRMED_PHISHING: "피싱 확정",
  FALSE_POSITIVE: "오탐",
};

const FILTER_TABS = [
  { key: "ALL", label: "전체" },
  { key: "PENDING", label: "검토 대기" },
  { key: "CONFIRMED_PHISHING", label: "피싱 확정" },
  { key: "FALSE_POSITIVE", label: "오탐" },
];

export default function AdminPage() {
  const [reports, setReports] = useState(null);
  const [analysesById, setAnalysesById] = useState({});
  const [loadError, setLoadError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoadError("");
    Promise.all([listReports(), listAnalyses().catch(() => [])])
      .then(([reportList, analysisList]) => {
        setReports(reportList);
        setAnalysesById(Object.fromEntries(analysisList.map((a) => [a.id, a])));
      })
      .catch(() => setLoadError("제보 목록을 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate(id, status) {
    setUpdatingId(id);
    setUpdateError("");
    try {
      const updated = await updateReportStatus(id, status);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      setUpdateError("상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    const keyword = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesStatus = statusFilter === "ALL" || report.status === statusFilter;
      const matchesSearch = !keyword || report.url?.toLowerCase().includes(keyword);
      return matchesStatus && matchesSearch;
    });
  }, [reports, statusFilter, search]);

  if (loadError) {
    return (
      <div className="page">
        <ErrorState message={loadError} onRetry={load} />
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="page">
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-title">불러오는 중…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">제보 관리자 Dashboard</h1>
      <p className="subtitle">사용자 제보를 확인하고 피싱 여부를 확정합니다.</p>

      <div className="admin-toolbar">
        <div className="admin-filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={"admin-filter-tab" + (statusFilter === tab.key ? " active" : "")}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="URL 검색"
          className="admin-search"
        />
      </div>

      {updateError && <p className="error-text">{updateError}</p>}

      {reports.length === 0 && <p className="empty-text">접수된 제보가 없습니다.</p>}
      {reports.length > 0 && filteredReports.length === 0 && (
        <p className="empty-text">조건에 맞는 제보가 없습니다.</p>
      )}

      <ul className="admin-list">
        {filteredReports.map((report) => (
          <li key={report.id} className="panel-card">
            <div className="admin-item-header">
              <span className="admin-url mono">{report.url}</span>
              <span className={"status-pill " + (statusClassOf(report.status))}>
                {STATUS_LABEL[report.status] || report.status}
              </span>
            </div>
            {report.reportCount > 1 && (
              <span className="owner-tag" style={{ alignSelf: "flex-start" }}>
                동일 URL 제보 {report.reportCount}건 통합됨
              </span>
            )}
            {report.reason && <p className="body-muted" style={{ whiteSpace: "pre-line" }}>{report.reason}</p>}
            <p className="admin-date mono">{formatDate(report.createdAt)}</p>

            {report.analysisId && analysesById[report.analysisId] ? (
              <div className="admin-analysis-preview">
                <span className={"verdict-badge tone-" + (VERDICT_TONE[analysesById[report.analysisId].finalResult] || "safe")}>
                  {analysesById[report.analysisId].finalResult}
                </span>
                <span className="history-score">{analysesById[report.analysisId].riskScore}/100</span>
                <Link to={`/result/${report.analysisId}`} target="_blank" rel="noopener noreferrer" className="link-btn">
                  분석 상세 보기 ↗
                </Link>
              </div>
            ) : report.analysisId ? (
              <p className="body-muted">연결된 분석을 찾을 수 없습니다 (ID {report.analysisId}).</p>
            ) : (
              <p className="body-muted">연결된 분석 이력이 없는 제보입니다.</p>
            )}

            <div className="action-row">
              <button
                className="btn btn-danger btn-small"
                disabled={updatingId === report.id || report.status === "CONFIRMED_PHISHING"}
                onClick={() => handleUpdate(report.id, "CONFIRMED_PHISHING")}
              >
                피싱 확정
              </button>
              <button
                className="btn btn-ghost btn-small"
                disabled={updatingId === report.id || report.status === "FALSE_POSITIVE"}
                onClick={() => handleUpdate(report.id, "FALSE_POSITIVE")}
              >
                오탐 처리
              </button>
              {report.status !== "PENDING" && (
                <button
                  className="btn btn-ghost btn-small"
                  disabled={updatingId === report.id}
                  onClick={() => handleUpdate(report.id, "PENDING")}
                >
                  대기로 되돌리기
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusClassOf(status) {
  if (status === "CONFIRMED_PHISHING") return "status-confirmed";
  if (status === "FALSE_POSITIVE") return "status-rejected";
  return "";
}

function formatDate(iso) {
  if (!iso) return "-";
  return iso.replace("T", " ").slice(0, 19);
}
