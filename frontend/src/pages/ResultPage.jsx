import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAnalysis } from "../api/client.js";
import RiskGauge from "../components/RiskGauge.jsx";
import ReportFlow from "../components/ReportFlow.jsx";

const VERDICT_META = {
  PHISHING: { label: "피싱 사이트로 의심됩니다", tone: "danger" },
  SUSPICIOUS: { label: "의심스러운 사이트입니다", tone: "warning" },
  NORMAL: { label: "안전한 사이트로 보입니다", tone: "safe" },
};

export default function ResultPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAnalysis(id)
      .then((data) => {
        if (!cancelled) setAnalysis(data);
      })
      .catch(() => {
        if (!cancelled) setError("분석 결과를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // clipboard access unavailable, silently ignore
    }
  }

  if (error) {
    return (
      <div className="page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="page">
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-title">분석 결과를 불러오는 중입니다…</div>
        </div>
      </div>
    );
  }

  const reasons = safeParseReasons(analysis.xaiResult);
  const verdict = analysis.finalResult || "NORMAL";
  const meta = VERDICT_META[verdict] || VERDICT_META.NORMAL;
  const riskScore = analysis.riskScore ?? 0;

  return (
    <div className="page result-page">
      <div className="result-header">
        <div>
          <div className="field-label">분석한 URL</div>
          <a className="analyzed-url mono" href={analysis.url} target="_blank" rel="noopener noreferrer">
            {analysis.url}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 4h6v6M20 4 10 14M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
            </svg>
          </a>
          <div className="meta-row mono">
            <span>분석 시간 {formatDate(analysis.createdAt)}</span>
            <span>분석 ID {analysis.id}</span>
          </div>
        </div>
        <button className="btn btn-ghost btn-small" onClick={handleShare}>
          {shared ? "링크 복사됨" : "결과 공유"}
        </button>
      </div>

      <div className={"risk-banner tone-" + meta.tone}>
        <div className="risk-banner-left">
          {meta.tone === "safe" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M10.3 3.86 1.8 18a1.5 1.5 0 0 0 1.3 2.25h17.8a1.5 1.5 0 0 0 1.3-2.25L13.7 3.86a1.5 1.5 0 0 0-2.6 0Z" />
            </svg>
          )}
          <div className="risk-banner-title">
            {meta.label}
            <span className={"verdict-badge tone-" + meta.tone}>{verdict}</span>
          </div>
        </div>
        <RiskGauge score={riskScore} tone={meta.tone} />
      </div>

      <div className="panel-card">
        <h4>AI 판단 근거</h4>
        {reasons.length ? (
          <ol className="ai-reasons">
            {reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ol>
        ) : (
          <p className="body-muted">표시할 판단 근거가 없습니다.</p>
        )}
      </div>

      <div className="cols3">
        <PendingCard
          owner="2번"
          title="사이트 미리보기"
          desc="Sandbox가 페이지를 안전하게 수집하면 분석 당시 화면이 여기에 표시됩니다."
        />
        <PendingCard
          owner="2번"
          title="DOM 분석 결과"
          desc="입력 필드·Form·외부 연결 정보가 Sandbox 연동 후 표시됩니다."
        />
        <PendingCard
          owner="3번"
          title="공식기관 비교 결과"
          desc="접속 도메인과 공식 도메인 비교 결과가 페이지 분석 AI 연동 후 표시됩니다."
        />
      </div>

      <ReportFlow url={analysis.url} verdict={verdict} riskScore={riskScore} reasons={reasons} />
    </div>
  );
}

function PendingCard({ owner, title, desc }) {
  return (
    <div className="panel-card pending-card">
      <h4>
        <span className="owner-tag">{owner}</span> {title}
      </h4>
      <p className="body-muted">{desc}</p>
      <span className="pending-tag">연동 예정</span>
    </div>
  );
}

function safeParseReasons(xaiResult) {
  try {
    const parsed = JSON.parse(xaiResult);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(iso) {
  if (!iso) return "-";
  return iso.replace("T", " ").slice(0, 19);
}
