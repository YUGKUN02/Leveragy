import { useState } from "react";
import { submitReport, listReports } from "../api/client.js";

const STEPS = ["정보 확인", "제출 중", "완료"];

const STATUS_LABEL = {
  PENDING: "검토 대기",
  CONFIRMED_PHISHING: "피싱 확정",
  FALSE_POSITIVE: "오탐",
};

const STATUS_CLASS = {
  PENDING: "",
  CONFIRMED_PHISHING: "status-confirmed",
  FALSE_POSITIVE: "status-rejected",
};

export default function ReportFlow({ url, verdict, riskScore, reasons }) {
  const [stage, setStage] = useState("closed"); // closed | confirm | submitting | done
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const [duplicateCount, setDuplicateCount] = useState(null);
  const [error, setError] = useState("");

  function openConfirm(prefill) {
    setError("");
    if (prefill) setNote(prefill);
    setStage("confirm");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStage("submitting");
    setError("");
    try {
      const saved = await submitReport(url, note.trim() || undefined);
      setResult(saved);
      try {
        const all = await listReports();
        setDuplicateCount(all.filter((r) => r.url === url).length);
      } catch {
        setDuplicateCount(null);
      }
      setStage("done");
    } catch {
      setError("제보 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setStage("confirm");
    }
  }

  function reset() {
    setStage("closed");
    setNote("");
    setResult(null);
    setDuplicateCount(null);
    setError("");
  }

  if (stage === "closed") {
    return (
      <div className="action-row">
        <button className="btn btn-danger" onClick={() => openConfirm("")}>
          🚩 이 사이트 제보하기
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => openConfirm("이 사이트는 안전한 것 같은데 오탐으로 보입니다.")}
        >
          URL이 안전한가요? 오탐 제보하기
        </button>
      </div>
    );
  }

  const stepIndex = stage === "confirm" ? 0 : stage === "submitting" ? 1 : 2;

  return (
    <div className="panel-card">
      <div className="steps">
        {STEPS.map((label, i) => (
          <span key={label} className={"step" + (i === stepIndex ? " active" : i < stepIndex ? " done" : "")}>
            <span className="num">{i + 1}</span>
            {label}
          </span>
        ))}
      </div>

      {stage === "confirm" && (
        <form onSubmit={handleSubmit}>
          <div className="confirm-card">
            <div className="confirm-title">이 사이트를 제보하시겠습니까?</div>
            <div className="confirm-sub">분석 결과가 아래에 자동으로 입력됩니다.</div>
            <dl className="info">
              <dt>URL</dt>
              <dd className="mono">{url}</dd>
              <dt>최종 판정</dt>
              <dd>
                <span className={"verdict-badge tone-" + toneOf(verdict)}>{verdict}</span> {riskScore}/100
              </dd>
              <dt>탐지 항목</dt>
              <dd>{reasons.length ? reasons.join(" · ") : "없음"}</dd>
            </dl>
          </div>
          <label className="field-label" htmlFor="report-note" style={{ display: "block", marginTop: 12 }}>
            추가 의견 (선택)
          </label>
          <textarea
            id="report-note"
            className="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="해당 사이트에 대한 추가 정보나 경험을 남겨주세요."
            style={{ marginTop: 6 }}
          />
          {error && <p className="error-text">{error}</p>}
          <div className="privacy-note" style={{ marginTop: 10 }}>
            제보 정보는 Leveragy 위험 정보 DB에 저장되며, 관계 기관 검토 및 신고에 활용될 수 있습니다.
          </div>
          <div className="action-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              취소
            </button>
            <button type="submit" className="btn btn-danger">
              제보하기
            </button>
          </div>
        </form>
      )}

      {stage === "submitting" && (
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-title">제보를 접수하는 중입니다…</div>
        </div>
      )}

      {stage === "done" && result && (
        <div>
          <div className="done-wrap">
            <div className="done-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="done-title">제보가 완료되었습니다</div>
            <div className="done-sub">Leveragy에 소중한 제보를 해주셔서 감사합니다.</div>
          </div>
          <dl className="info" style={{ marginTop: 14 }}>
            <dt>제보 번호</dt>
            <dd className="mono">REP-{result.id}</dd>
            <dt>접수 시간</dt>
            <dd className="mono">{formatDate(result.createdAt)}</dd>
            <dt>현재 상태</dt>
            <dd>
              <span className={"status-pill " + (STATUS_CLASS[result.status] || "")}>
                {STATUS_LABEL[result.status] || result.status}
              </span>
            </dd>
            {duplicateCount != null && (
              <>
                <dt>동일 URL 제보</dt>
                <dd>현재 총 {duplicateCount}건 (이번 제보 포함)</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

function toneOf(verdict) {
  if (verdict === "PHISHING") return "danger";
  if (verdict === "SUSPICIOUS") return "warning";
  return "safe";
}

function formatDate(iso) {
  if (!iso) return "-";
  return iso.replace("T", " ").slice(0, 19);
}
