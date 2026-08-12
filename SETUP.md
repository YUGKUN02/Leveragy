# 로컬 실행 가이드

이 머신에는 JDK 17(Eclipse Temurin), Maven 3.9.9, Node.js LTS, MySQL 8.0이 설치되어 있습니다.
Maven은 `C:\Users\user\tools\apache-maven-3.9.9`에 압축 해제된 형태로 설치했고, 사용자 PATH에 등록해뒀습니다.

## 1. DB 준비

로컬 MySQL(Docker 없이)을 사용 중입니다. `leveragy` DB와 `leveragy` 계정이 이미 만들어져 있고
[db/schema.sql](db/schema.sql)의 `url_analysis`, `reports` 테이블도 적용되어 있습니다.

Docker로 띄우고 싶다면 [docker-compose.yml](docker-compose.yml)을 사용하세요:

```bash
docker compose up -d
```

## 2. 백엔드 실행 (Spring Boot, 포트 8080)

```bash
cd backend
mvn spring-boot:run
```

DB 접속 정보는 환경변수로 덮어쓸 수 있습니다 (`backend/src/main/resources/application.yml` 참고):
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` (기본값은 모두 `leveragy`).

## 3. 프론트엔드 실행 (React + Vite, 포트 5173)

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속. `/api` 요청은 vite 프록시를 통해
`http://localhost:8080`으로 전달됩니다.

## 동작 확인 순서

1. MySQL 서비스 실행 확인 (Windows 서비스 `MySQL80`)
2. `backend`에서 `mvn spring-boot:run` → `http://localhost:8080`
3. `frontend`에서 `npm install && npm run dev` → `http://localhost:5173`
4. 브라우저에서 URL 입력 → 결과 페이지에서 위험도/판단근거 확인 → 제보 버튼 테스트

## 현재 상태

- `AnalysisService`(`backend/src/main/java/com/leveragy/service/AnalysisService.java`)는
  키워드 기반 **목업(mock)** 로직입니다. 팀원 A(XGBoost)·팀원 C(Multimodal) 파이프라인이 준비되면
  이 서비스 내부를 실제 API 호출로 교체하면 됩니다. 프론트/DB/API 계약(`risk_score`, `final_result`,
  `xai_result` 등)은 README의 데이터 구조를 그대로 따르므로 교체 시 프론트 수정은 필요 없습니다.
