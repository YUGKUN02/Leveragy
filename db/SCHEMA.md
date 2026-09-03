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
| `processing_status` | VARCHAR(32) | 백엔드(Job 흐름) | `PROCESSING` → `COMPLETED`(또는 `FAILED`). 아래 "비동기 분석 Job 흐름" 참고 |
| `created_at` | DATETIME | - | 생성 시각(analysis ID·분석 시간 표시에 사용) |

### `multimodal_result` JSON 구조 (2번·3번 계약)

팀 보고서(워드 문서) 7장 "권장 핵심 JSON 필드" 중 "페이지 분석 AI → Backend" 계약과 같은
필드명·모양이다. `AnalysisService.buildMockPageAnalysis()`가 지금은 URL 문자열만 보고 이 모양을
목업으로 채운다. (이전에는 `.md` 문서 기준의 더 상세한 중첩 구조를 썼는데, 보고서 7장 필드명에
맞춰 평탄화했다 — 옛 구조는 [CONTRACT_HISTORY.md](CONTRACT_HISTORY.md)에 남겨뒀다.)

```json
{
  "pageRiskScore": 70,
  "impersonatedBrand": "KB국민은행",
  "credentialIntent": true,
  "domainBrandMismatch": true,
  "reasons": ["KB국민은행을(를) 사칭하는 정황이 발견되었습니다.", "..."],

  "currentDomain": "example.com",
  "officialDomain": "kbstar.com",
  "credentialTypes": ["PASSWORD", "OTP"],
  "detectedSignals": ["PASSWORD_FIELD", "OTP_FIELD", "POST_FORM", "BRAND_IMPERSONATION", "BRAND_DOMAIN_MISMATCH"],
  "domSummary": {
    "passwordFields": 1,
    "otpFields": 1,
    "textFields": 2,
    "formCount": 1,
    "formMethod": "POST",
    "formAction": "/verify",
    "externalDomainLinks": 2,
    "externalContactLinks": 0
  }
}
```

**계약 필드 (보고서 7장과 이름·타입이 정확히 같음)** — 실제 3번 AI가 붙을 때 반드시 이 5개는
이 이름·모양 그대로 와야 한다.

- `pageRiskScore` (number) · `impersonatedBrand` (string 또는 null) · `credentialIntent` (boolean)
  · `domainBrandMismatch` (boolean) · `reasons` (string 배열)

**계약 밖 보조 필드** — 결과 화면의 "DOM 분석 결과"·"공식기관 비교 결과" 카드에 필요해서 같이
넣어둔 것들. 7장 계약에는 없으므로 3번 AI가 안 줘도 그만이고, 없으면 해당 화면 요소만 빠진다.

- `currentDomain` / `officialDomain` — 공식기관 비교 결과 카드의 도메인 표시용
- `credentialTypes` — `["PASSWORD", "OTP"]`처럼 어떤 민감정보를 요구하는지(사이트 미리보기·주요 위험 요약에 사용)
- `detectedSignals` — 위험 신호 코드 목록(주요 위험 요약 카드에 사용)
- `domSummary` — 원래 **2번 Sandbox**가 원시 수집하는 DOM 통계(입력 필드/Form/외부 링크 개수). 아직 Sandbox가 없어서 여기 같이 끼워 넣었고, 실제 Sandbox가 붙으면 그 원시 JSON을 그대로 옮겨 담으면 된다("DOM 분석 결과" 카드용)

## 비동기 분석 Job 흐름 (보고서 5장)

실제 Sandbox·AI 호출은 시간이 걸릴 수 있으므로, `POST /api/analyze`는 분석이 끝나기를 기다리지
않고 `processing_status = PROCESSING`인 행을 즉시 만들어 `id`를 돌려준다(HTTP 202). 실제 분석은
`AnalysisService.runAnalysisAsync()`가 `@Async`로 백그라운드에서 이어서 실행하고, 끝나면 같은 행에
결과를 채우고 `processing_status = COMPLETED`(실패 시 `FAILED`)로 갱신한다.

프론트엔드(`ResultPage.jsx`)는 `GET /api/analyze/{id}`를 1.2초 간격으로 폴링하다가
`PROCESSING`이 아니게 되면 폴링을 멈추고 결과를 그린다 — 폴링 중에는 로딩 화면(`LoadingOverlay`)을
그대로 재사용해서 보여준다. 지금은 실제 작업이 없어서 `Thread.sleep(1500)`으로 지연을 흉내내는데,
실제 Sandbox·AI 호출로 교체해도 이 흐름 자체는 바뀌지 않는다.

## reports

사용자 제보 1건 = 한 행. `POST /api/reports`에서 생성되고, `GET /api/reports`(옵션 `status` 필터),
`PATCH /api/reports/{id}`(상태 변경)로 다룬다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | BIGINT PK | 제보 번호(`REP-{id}`로 표시) |
| `url` | VARCHAR(2048) | 제보 대상 URL |
| `reason` | TEXT | 사용자가 남긴 추가 의견(선택) |
| `analysis_id` | BIGINT (nullable) | 이 제보가 어떤 `url_analysis` 행에서 나왔는지. 결과 화면에서 제보하면 채워지고, 오래된/외부 제보는 `NULL`일 수 있다. 관리자 페이지가 이 값으로 "분석 상세 보기" 링크를 만든다 |
| `domain` | VARCHAR(255) | 제보 URL의 호스트(예: `example.com`). 새 행을 만들 때만 채워짐 |
| `report_count` | INT (기본 1) | **동일 URL 제보 중복 통합**. 이미 같은 URL로 접수된 제보가 있으면 새 행을 만들지 않고 이 카운트만 올린다 |
| `status` | VARCHAR(32) | `PENDING`(검토 대기, 기본값) / `CONFIRMED_PHISHING`(피싱 확정) / `FALSE_POSITIVE`(오탐) |
| `created_at` | DATETIME | 최초 접수 시각(중복 통합되어도 바뀌지 않음) |

`CONFIRMED_PHISHING` 상태인 제보들이 Threat Intelligence 페이지(`GET /api/reports?status=CONFIRMED_PHISHING`)에 노출된다.

### 중복 통합 동작 (`ReportController.createReport`)

같은 `url`로 기존 제보가 있으면(`findFirstByUrlOrderByCreatedAtDesc`) 새 행을 만드는 대신:
1. `report_count`를 1 올린다.
2. 새로 들어온 의견(`reason`)이 있으면 기존 `reason`에 줄바꿈으로 이어붙인다(둘 다 보존).
3. 기존 행에 `analysis_id`가 비어 있었으면 새로 들어온 값으로 채운다.

즉 제보 번호(`REP-{id}`)와 접수 시각은 **최초 제보 기준으로 고정**되고, 이후 제보는 같은 행에
누적된다. 도메인이 같고 경로만 다른 URL(예: `example.com/a` vs `example.com/b`)은 별도 행으로
유지되며, `domain` 컬럼으로 필요하면 도메인 단위 조회만 가능하다 — 서로 다른 페이지를 하나로
합쳐버리면 오히려 각 제보의 구체적인 정황을 잃게 되기 때문에 자동 통합은 URL이 정확히 같을 때만 한다.

## 실제 파이프라인 연동 시 바꿔야 하는 곳

DB 스키마와 프론트엔드는 이미 이 모양을 기준으로 만들어져 있어서, 아래 두 메서드 내부만
실제 API 호출로 교체하면 된다(`backend/src/main/java/com/leveragy/service/AnalysisService.java`).

- `buildMockPageAnalysis(url, riskScore, finalResult)` → 2번 Sandbox + 3번 페이지·행동 분석 AI 실제 호출로 교체
- `captureScreenshot(url, finalResult)` → 2번 Sandbox의 실제 스크린샷 캡처로 교체, `data:image/...;base64,...` 문자열 반환

두 메서드 모두 반환값을 그대로 `UrlAnalysis.multimodalResult` / `screenshotData`에 저장하므로,
반환하는 JSON/데이터 모양만 위 구조와 같으면 DB 마이그레이션이나 프론트엔드 수정이 필요 없다.
