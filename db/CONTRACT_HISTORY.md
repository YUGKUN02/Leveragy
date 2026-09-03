# multimodal_result 계약 변경 이력

`url_analysis.multimodal_result`에 들어가는 JSON 모양이 바뀔 때마다 이전 버전을 여기 남겨둔다.
지금 실제로 쓰는 계약은 [SCHEMA.md](SCHEMA.md)를 보면 된다.

## v1 — 상세 계약 (2026-09-03, 이후 워드 7장 필드명으로 교체됨)

`FinDer_Sandbox_페이지행동AI_연동구조.md` 문서의 3번 AI 출력 계약을 그대로 따라간 첫 버전.
중첩 객체가 많고 필드가 풍부했지만, 팀 보고서(워드 문서) 7장 "권장 핵심 JSON 필드"의 더 단순한
평탄화 계약과 이름이 달라서 이후 그쪽으로 다시 맞췄다.

```json
{
  "pageRiskScore": 70,
  "verdict": "PHISHING",
  "impersonation": {
    "detected": true,
    "brand": "KB국민은행",
    "category": "BANK"
  },
  "credentialIntent": {
    "detected": true,
    "types": ["PASSWORD", "OTP"]
  },
  "domainAnalysis": {
    "currentDomain": "example.com",
    "officialDomains": ["kbstar.com"],
    "domainBrandMismatch": true
  },
  "behaviorAnalysis": {
    "financialActionRequest": false,
    "externalContactRequest": false,
    "downloadRequest": false
  },
  "domSummary": {
    "passwordFields": 1,
    "otpFields": 1,
    "textFields": 2,
    "formCount": 1,
    "formMethod": "POST",
    "formAction": "/verify",
    "externalDomainLinks": 2,
    "externalContactLinks": 0
  },
  "detectedSignals": ["PASSWORD_FIELD", "OTP_FIELD", "POST_FORM", "BRAND_IMPERSONATION", "BRAND_DOMAIN_MISMATCH"],
  "reasons": ["KB국민은행을(를) 사칭하는 정황이 발견되었습니다.", "..."],
  "confidence": 0.88
}
```

**v1 → v2에서 바뀐 것**

| v1 (상세, .md 문서 기준) | v2 (평탄화, 워드 7장 기준) |
|---|---|
| `impersonation.detected` + `impersonation.brand` + `impersonation.category` | `impersonatedBrand` (문자열, null이면 미감지) |
| `credentialIntent.detected` + `credentialIntent.types[]` | `credentialIntent` (boolean) |
| `domainAnalysis.currentDomain` / `officialDomains[]` / `domainBrandMismatch` | `domainBrandMismatch` (boolean) — 나머지는 계약 밖 보조 필드(`currentDomain`, `officialDomain`)로 유지 |
| `behaviorAnalysis.externalContactRequest` 등 | 제거. `detectedSignals`의 `EXTERNAL_CONTACT` 여부로 대체 |
| `verdict` | 제거(화면은 `final_result` 컬럼을 우선 사용하므로 중복) |

`domSummary` / `detectedSignals` / `credentialTypes` / `currentDomain` / `officialDomain`은 워드 7장
계약에는 없지만, 결과 화면(DOM 분석 결과, 위험 신호 목록)에 필요해서 v2에도 계약 밖 보조 필드로
그대로 남겨뒀다.
