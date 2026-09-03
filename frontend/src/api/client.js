import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export function analyzeUrl(url) {
  return api.post("/analyze", { url }).then((res) => res.data);
}

export function getAnalysis(id) {
  return api.get(`/analyze/${id}`).then((res) => res.data);
}

export function listAnalyses() {
  return api.get("/analyze").then((res) => res.data);
}

export function submitReport(url, reason) {
  return api.post("/reports", { url, reason }).then((res) => res.data);
}

export function listReports(status) {
  return api.get("/reports", { params: status ? { status } : {} }).then((res) => res.data);
}

export function updateReportStatus(id, status) {
  return api.patch(`/reports/${id}`, { status }).then((res) => res.data);
}
