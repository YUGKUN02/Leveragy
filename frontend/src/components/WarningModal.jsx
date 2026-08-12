export default function WarningModal({ analysis, onProceed, onReport }) {
  return (
    <div className="modal-overlay">
      <div className="modal warning-modal">
        <h2>⚠ 피싱 위험 사이트로 의심됩니다</h2>
        <p className="warning-url">{analysis.url}</p>
        <p>
          위험도 <strong>{analysis.riskScore}</strong>/100 — 이 사이트는 접속을 차단하는 것을
          권장합니다.
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onReport}>
            제보하기
          </button>
          <button className="btn btn-ghost" onClick={onProceed}>
            위험을 감수하고 계속 보기
          </button>
        </div>
      </div>
    </div>
  );
}
