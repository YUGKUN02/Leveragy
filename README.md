# AI 기반 금융 피싱 URL 통합 방어 및 제보 플랫폼

## 프로젝트 개요

최근 금융 피싱 사이트는 단순 URL 문자열만으로 탐지하기 어려울 정도로 고도화되고 있다.

기존 서비스는 "위험합니다"라는 경고에 그치는 경우가 많으며,
실제 페이지가 금융기관을 얼마나 정교하게 사칭했는지까지 분석하지 못한다.

우리 팀은 **AI 기반 금융 피싱 URL 탐지 → 정밀 분석 → 차단 → 제보 → 위협정보 축적**까지 가능한 통합 플랫폼을 개발한다.

---

# 프로젝트 목표

- 금융 피싱 URL을 AI 기반으로 탐지
- 실제 사이트 화면까지 분석하여 사칭 여부 판단
- AI 판단 근거(XAI) 제공
- 사용자의 접속을 차단
- 원클릭 제보 기능 제공
- 제보 데이터를 Threat Intelligence DB로 축적
- 향후 금융보안원 등 관계기관 신고 연계

---

# 탐지 대상 범위

## ① 금융기관 사칭형

- 시중은행
  - 국민은행
  - 신한은행
  - 우리은행
  - 하나은행

- 인터넷전문은행
  - 토스뱅크
  - 카카오뱅크

- 카드사

- 캐피탈

- 저축은행

탐지 대상

- 로그인 페이지
- 계좌 인증 페이지
- 대환대출 안내
- 저금리 대출
- 금융 앱 설치 유도
- 공동인증서 유도

---

## ② 정부 지원금 · 정책자금 사칭

금융 피해로 이어지는 정부기관 사칭 사이트

예시

- 정부지원금 신청
- 정책자금 신청
- 소상공인 지원금
- 서민금융 지원
- 환급금 지급
- 긴급생활지원금

주민등록번호

계좌번호

인증번호

등을 입력하도록 유도하는 사이트를 포함한다.

---

## ③ 금융정보 탈취형

- 카드 승인
- 계좌 이상거래
- 본인인증
- 금융앱 설치
- 개인정보 입력
- OTP 입력
- 인증번호 입력

---

# 전체 시스템 구조

```
사용자
    │
    ▼
URL 입력
    │
    ▼
1차 ML(XGBoost)
    │
 ┌──┴──────┐
 │         │
정상      의심
           │
           ▼
Docker Sandbox
(가상 브라우저)
           │
           ▼
Screenshot
HTML
Text
           │
           ▼
Multimodal AI
           │
           ▼
XAI
           │
           ▼
최종 위험도
      │
 ┌────┴────┐
 │         │
정상      피싱
           │
           ▼
경고 및 차단
           │
           ▼
사용자 신고
           │
           ▼
Threat Intelligence DB
           │
           ▼
기관 신고 연계
```

---

# AI 구조

## 1차 AI : XGBoost

목적

- 빠른 URL 위험도 판별

Feature 예시

- URL 길이
- 특수문자 개수
- 서브도메인 수
- HTTPS 여부
- IP 사용 여부
- 브랜드명 포함
- URL Entropy
- Redirect 여부
- Domain Age
- TLD

출력

```
Risk Score : 0~100
```

---

## 2차 AI : Multimodal

의심 URL만 수행

Docker Sandbox에서

- Screenshot
- HTML
- Text

를 수집한다.

AI가 분석하는 요소

- 금융기관 로고
- 로그인 화면
- 개인정보 입력창
- 금융기관 UI
- 브랜드 사칭 여부
- 도메인과 화면 일치 여부

출력

```
사칭 여부

위험도

사칭 대상

판단 근거
```

---

## 3차 AI : XAI

사용자에게

"왜 위험한지"

설명한다.

예시

- 공식 도메인 불일치
- 금융기관 로그인 화면
- 개인정보 입력창 존재
- 브랜드명 사칭
- 비정상 URL 구조

ML 부분은 SHAP를 이용하여 설명 가능 AI를 구현한다.

---

# 데이터 구조

## URL 분석

```
url_analysis

id
url
risk_score
ml_result
multimodal_result
xai_result
final_result
created_at
```

---

## 사용자 제보

```
reports

id
url
reason
status
created_at
```

---

# 차별성

기존

- URL 문자열만 분석

우리

- URL 분석
- 실제 페이지 분석
- 설명 가능한 AI(XAI)
- 사용자 제보
- Threat Intelligence 구축

단순 탐지기가 아닌

**금융 피싱 통합 방어 플랫폼**을 목표로 한다.

---

# 기술 스택

Frontend

- React

Backend

- Spring Boot

Database

- MySQL

AI

- XGBoost
- Multimodal LLM
- SHAP(XAI)

Infra

- Docker
- Playwright
- Chromium

Deployment

- Docker Compose
- Cloud

---

# 1주차 역할 분담

## ① 김태하 (AI / ML)

목표

XGBoost Baseline 구축

작업

- 피싱 데이터셋 조사
- 정상 데이터 수집
- Feature 설계
- Baseline 학습
- SHAP 적용 검토

산출물

- URL → 위험도 예측 모델

---

## ② 민성이 (Infra / Backend)

목표

Sandbox 구축

작업

- Docker 환경 구성
- Playwright
- Chromium
- Screenshot 수집
- HTML 수집
- URL 분석 API

산출물

- URL 입력 시 Screenshot + HTML 반환

---

## ③ 팀원 C (Multimodal)

목표

2차 AI 분석

작업

- Screenshot 분석
- HTML 분석
- Prompt 설계
- JSON 결과 반환

산출물

```
{
  risk_score,
  is_phishing,
  impersonated_brand,
  reasons
}
```

---

## ④ 팀원 D (Frontend / DB)

목표

서비스 화면 제작

작업

- URL 입력 화면
- 결과 화면
- Warning Modal
- 신고 버튼
- DB 설계

산출물

사용 가능한 MVP 화면

---

# 1주차 최종 목표

각자 개발하는 것이 아니라

아래 파이프라인이 한 번이라도 정상적으로 동작하는 것을 목표로 한다.

```
URL 입력

↓

XGBoost

↓

Sandbox

↓

Screenshot

↓

Multimodal

↓

위험도 출력

↓

웹 화면 표시
```

2주차부터

- 성능 개선
- XAI
- 관리자 페이지
- 신고 시스템
- Threat Intelligence 구축

을 진행한다.

---

# 최종 목표

단순 URL 탐지 서비스가 아니라

**AI 기반 금융 피싱 URL 통합 방어 및 제보 플랫폼**을 구축하여

- 사용자 보호
- 위협 정보 수집
- AI 설명
- 기관 연계

까지 가능한 금융 보안 서비스를 구현한다.
