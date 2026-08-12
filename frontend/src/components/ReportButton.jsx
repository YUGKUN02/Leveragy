import { useState } from "react";
import { submitReport } from "../api/client.js";

export default function ReportButton({ url }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitReport(url, reason);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <p className="report-success">제보가 접수되었습니다. 감사합니다.</p>;
  }

  if (!open) {
    return (
      <button className="btn btn-outline" onClick={() => setOpen(true)}>
        이 URL 제보하기
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="report-form">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="제보 사유를 입력해주세요 (선택)"
        rows={3}
      />
      <div className="report-form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? "제출 중..." : "제출"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          취소
        </button>
      </div>
    </form>
  );
}
