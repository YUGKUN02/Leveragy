# Leveragy DB 구조

MySQL 8.0, 테이블 2개(`url_analysis`, `reports`). 실제 DDL은 [schema.sql](schema.sql)에 있고,
컬럼 추가는 Hibernate `ddl-auto: update`로 자동 반영된다(운영 배포 시에는 이 스키마 파일 기준으로
직접 마이그레이션할 것).

## url_analysis

한 번의 URL 분석 요청 = 한 행. `POST /api/analyze`에서 생성되고 `GET /api/analyze`,
`GET /api/analyze/{id}`로 조회한다.

| 컬럼 | 타입 | 채우는 주체 | 설명 |
|---|---|---|---|
| `id` | BIGINT PK | - | |
| `url` | VARCHAR(2048) | 사용자 입력 | 분석 대상 URL |
| `risk_score` | INT | **1번 URL AI** | 0~100 최종 위험 점수. 지금은 키워드 기반 목업(`AnalysisService.computeMockRiskScore`) |
| `final_result` | VARCHAR(32) | **1번 URL AI** | `NORMAL` / `SUSPICIOUS` / `PHISHING` (`risk_score` 임계값으로 목업 판정) |
| `ml_result` | TEXT | **1번 URL AI** | XGBoost 원본 출력 자리. 현재 `{"note":"placeholder - XGBoost 연동 예정"}` 고정값 |
| `xai_result` | TEXT (JSON 배열) | **1번 URL AI** | 1번 판정 근거 문자열 배열. 예: `["HTTPS 미사용", "금융기관 관련 키워드 포함"]` |
| `multimodal_result` | TEXT (JSON) | **2번 Sandbox → 3번 페이지·행동 분석 AI** | 아래 "multimodal_result 구조" 참고. `NORMAL`이면 Sandbox 자체를 실행하지 않으므로 `{"note":"위험도가 낮아 Sandbox가 실행되지 않았습니다."}`만 들어있다 |
| `screenshot_data` | LONGTEXT | **2번 Sandbox** | 분석 당시 페이지 캡처. `data:image/png;base64,...` 형태의 data URI. 아직 실제 캡처가 없어서 항상 `NULL` |
| `created_at` | DATETIME | - | 생성 시각(analysis ID·분석 시간 표시에 사용) |

### `multimodal_result` JSON 구조 (2번·3번 계약)

`FinDer_Sandbox_페이지행동AI_연동구조.md` 문서의 3번 AI 출력 계약과 같은 모양이다.
`AnalysisService.buildMockPageAnalysis()`가 지금은 URL 문자열만 보고 이 모양을 목업으로 채운다.

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

- `impersonation` / `credentialIntent` / `domainAnalysis` / `behaviorAnalysis` / `detectedSignals` / `reasons` / `confidence` — 문서에 정의된 **3번 페이지·행동 분석 AI**의 실제 출력 필드. 결과 화면의 "주요 위험 요약", "공식기관 비교 결과", "AI 분석 근거" 카드가 여기서 나온다.
- `domSummary` — 원래는 **2번 Sandbox**가 원시 수집하는 DOM 통계(입력 필드/Form/외부 링크 개수)다. 아직 Sandbox가 없어서 3번 AI 목업 안에 같이 끼워 넣었다. 실제 Sandbox가 붙으면 이 부분만 Sandbox의 원시 JSON을 그대로 옮겨 담으면 된다. 결과 화면의 "DOM 분석 결과" 카드가 여기서 나온다.
- `pageRiskScore` / `verdict`는 참고용으로만 같이 넣었고, 실제 화면 표시는 `risk_score` / `final_result` 컬럼(1번 AI 결과)을 우선 사용한다.

## reports

사용자 제보 1건 = 한 행. `POST /api/reports`에서 생성되고, `GET /api/reports`(옵션 `status` 필터),
`PATCH /api/reports/{id}`(상태 변경)로 다룬다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | BIGINT PK | 제보 번호(`REP-{id}`로 표시) |
| `url` | VARCHAR(2048) | 제보 대상 URL |
| `reason` | TEXT | 사용자가 남긴 추가 의견(선택) |
| `analysis_id` | BIGINT (nullable) | 이 제보가 어떤 `url_analysis` 행에서 나왔는지. 결과 화면에서 제보하면 채워지고, 오래된/외부 제보는 `NULL`일 수 있다. 관리자 페이지가 이 값으로 "분석 상세 보기" 링크를 만든다 |
| `status` | VARCHAR(32) | `PENDING`(검토 대기, 기본값) / `CONFIRMED_PHISHING`(피싱 확정) / `FALSE_POSITIVE`(오탐) |
| `created_at` | DATETIME | 접수 시각 |

`CONFIRMED_PHISHING` 상태인 제보들이 Threat Intelligence 페이지(`GET /api/reports?status=CONFIRMED_PHISHING`)에 노출된다.

## 실제 파이프라인 연동 시 바꿔야 하는 곳

DB 스키마와 프론트엔드는 이미 이 모양을 기준으로 만들어져 있어서, 아래 두 메서드 내부만
실제 API 호출로 교체하면 된다(`backend/src/main/java/com/leveragy/service/AnalysisService.java`).

- `buildMockPageAnalysis(url, riskScore, finalResult)` → 2번 Sandbox + 3번 페이지·행동 분석 AI 실제 호출로 교체
- `captureScreenshot(url, finalResult)` → 2번 Sandbox의 실제 스크린샷 캡처로 교체, `data:image/...;base64,...` 문자열 반환

두 메서드 모두 반환값을 그대로 `UrlAnalysis.multimodalResult` / `screenshotData`에 저장하므로,
반환하는 JSON/데이터 모양만 위 구조와 같으면 DB 마이그레이션이나 프론트엔드 수정이 필요 없다.
