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

export function submitReport(url, reason) {
  return api.post("/reports", { url, reason }).then((res) => res.data);
}
