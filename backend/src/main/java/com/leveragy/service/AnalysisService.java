package com.leveragy.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leveragy.entity.UrlAnalysis;
import com.leveragy.repository.UrlAnalysisRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * TODO: 이 서비스는 팀원 A(XGBoost)/팀원 C(Sandbox+페이지·행동 분석 AI)의 실제
 * 파이프라인이 완성되면 해당 API 호출로 교체될 자리표시자(placeholder)다.
 * 지금은 프론트-백엔드-DB 연결 자체를 검증하기 위해 키워드 기반으로 목업 결과를 만든다.
 *
 * multimodalResult는 "FinDer_Sandbox_페이지행동AI_연동구조.md"에 정의된 3번 AI 출력
 * 계약(pageRiskScore/verdict/impersonation/credentialIntent/domainAnalysis/
 * behaviorAnalysis/detectedSignals/reasons/confidence)과 같은 모양으로 채운다.
 * 실제 Sandbox·3번 AI가 붙으면 이 메서드 내부만 교체하면 되고 프론트는 수정할 필요가 없다.
 */
@Service
public class AnalysisService {

    private static final List<String> SUSPICIOUS_KEYWORDS = Arrays.asList(
            "login", "verify", "otp", "auth", "account", "secure",
            "국민", "신한", "우리", "하나", "토스", "카카오뱅크", "환급", "지원금"
    );

    private static final List<BrandRef> REFERENCE_BRANDS = List.of(
            new BrandRef("KB국민은행", "BANK", "kbstar.com", List.of("국민", "kb-")),
            new BrandRef("신한은행", "BANK", "shinhan.com", List.of("신한", "shinhan")),
            new BrandRef("정부24", "GOVERNMENT", "gov.kr", List.of("정부24", "gov-"))
    );

    private final UrlAnalysisRepository urlAnalysisRepository;
    private final ObjectMapper objectMapper;

    public AnalysisService(UrlAnalysisRepository urlAnalysisRepository, ObjectMapper objectMapper) {
        this.urlAnalysisRepository = urlAnalysisRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 비동기 분석 Job의 1단계: analysisId를 바로 내주기 위해 PROCESSING 행부터
     * 만든다("Frontend는 하나의 HTTP 요청을 오래 기다리기보다 analysisId 기반
     * 비동기 구조를 사용한다" - 보고서 5장). 실제 분석은 runAnalysisAsync가 이어서 한다.
     */
    public UrlAnalysis createPendingAnalysis(String url) {
        UrlAnalysis analysis = new UrlAnalysis();
        analysis.setUrl(url);
        analysis.setProcessingStatus("PROCESSING");
        return urlAnalysisRepository.save(analysis);
    }

    /**
     * 비동기 분석 Job의 2단계. 실제 Sandbox·AI 연동 시 여기서 외부 API를 호출하게
     * 되며 몇 초가 걸릴 수 있다 - 지금은 그 지연을 흉내내기 위해 짧게 sleep한다.
     */
    @Async
    public void runAnalysisAsync(Long analysisId, String url) {
        try {
            Thread.sleep(1500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        urlAnalysisRepository.findById(analysisId).ifPresent(analysis -> {
            try {
                int riskScore = computeMockRiskScore(url);
                String finalResult = riskScore >= 70 ? "PHISHING" : riskScore >= 40 ? "SUSPICIOUS" : "NORMAL";

                analysis.setRiskScore(riskScore);
                analysis.setMlResult("{\"note\":\"placeholder - XGBoost 연동 예정\"}");
                analysis.setMultimodalResult(buildMockPageAnalysis(url, riskScore, finalResult));
                analysis.setXaiResult(buildMockXaiReasons(url, riskScore));
                analysis.setFinalResult(finalResult);
                analysis.setScreenshotData(captureScreenshot(url, finalResult));
                analysis.setProcessingStatus("COMPLETED");
            } catch (Exception e) {
                analysis.setProcessingStatus("FAILED");
            }
            urlAnalysisRepository.save(analysis);
        });
    }

    private int computeMockRiskScore(String url) {
        String lower = url.toLowerCase();
        int score = 10;
        for (String keyword : SUSPICIOUS_KEYWORDS) {
            if (lower.contains(keyword.toLowerCase())) {
                score += 20;
            }
        }
        if (!lower.startsWith("https://")) {
            score += 15;
        }
        return Math.min(score, 100);
    }

    private String buildMockXaiReasons(String url, int riskScore) {
        StringBuilder sb = new StringBuilder("[");
        if (!url.toLowerCase().startsWith("https://")) {
            sb.append("\"HTTPS 미사용\",");
        }
        if (riskScore >= 40) {
            sb.append("\"금융기관 관련 키워드 포함\",");
        }
        sb.append("\"AI 파이프라인 연동 전 임시 결과\"]");
        return sb.toString();
    }

    /**
     * 실제 구조: 1차 URL 위험도가 낮으면 Sandbox를 실행하지 않는다("의심 URL이면
     * Sandbox 실행"). 그 경우 페이지·행동 분석 결과 자체가 없다는 뜻으로 note만 남긴다.
     */
    private String buildMockPageAnalysis(String url, int riskScore, String finalResult) {
        if ("NORMAL".equals(finalResult)) {
            return "{\"note\":\"위험도가 낮아 Sandbox가 실행되지 않았습니다.\"}";
        }

        String lower = url.toLowerCase();
        BrandRef matchedBrand = REFERENCE_BRANDS.stream()
                .filter(b -> b.keywords.stream().anyMatch(k -> lower.contains(k.toLowerCase())))
                .findFirst()
                .orElse(null);

        String currentDomain = extractDomain(url);
        boolean domainMismatch = matchedBrand != null
                && !currentDomain.toLowerCase().contains(matchedBrand.officialDomain.toLowerCase());
        boolean wantsPassword = lower.contains("login") || lower.contains("verify") || lower.contains("auth");
        boolean wantsOtp = lower.contains("otp");
        boolean externalContact = lower.contains("contact") || lower.contains("counsel") || lower.contains("상담");

        List<String> credentialTypes = new ArrayList<>();
        if (wantsPassword) credentialTypes.add("PASSWORD");
        if (wantsOtp) credentialTypes.add("OTP");

        List<String> signals = new ArrayList<>();
        if (wantsPassword) signals.add("PASSWORD_FIELD");
        if (wantsOtp) signals.add("OTP_FIELD");
        if (wantsPassword || wantsOtp) signals.add("POST_FORM");
        if (matchedBrand != null) signals.add("BRAND_IMPERSONATION");
        if (domainMismatch) signals.add("BRAND_DOMAIN_MISMATCH");
        if (externalContact) signals.add("EXTERNAL_CONTACT");

        List<String> reasons = new ArrayList<>();
        if (matchedBrand != null) {
            reasons.add(matchedBrand.brand + "을(를) 사칭하는 정황이 발견되었습니다.");
        }
        if (domainMismatch) {
            reasons.add("공식 도메인(" + matchedBrand.officialDomain + ")과 현재 접속 도메인이 일치하지 않습니다.");
        }
        if (!credentialTypes.isEmpty()) {
            reasons.add(String.join("·", credentialTypes) + " 입력을 요구합니다.");
        }
        if (externalContact) {
            reasons.add("외부 상담 채널로 이동을 유도합니다.");
        }
        reasons.add("AI 파이프라인 연동 전 임시 결과입니다.");

        Map<String, Object> impersonation = new LinkedHashMap<>();
        impersonation.put("detected", matchedBrand != null);
        impersonation.put("brand", matchedBrand != null ? matchedBrand.brand : null);
        impersonation.put("category", matchedBrand != null ? matchedBrand.category : null);

        Map<String, Object> credentialIntent = new LinkedHashMap<>();
        credentialIntent.put("detected", !credentialTypes.isEmpty());
        credentialIntent.put("types", credentialTypes);

        Map<String, Object> domainAnalysis = new LinkedHashMap<>();
        domainAnalysis.put("currentDomain", currentDomain);
        domainAnalysis.put("officialDomains", matchedBrand != null ? List.of(matchedBrand.officialDomain) : List.of());
        domainAnalysis.put("domainBrandMismatch", domainMismatch);

        Map<String, Object> behaviorAnalysis = new LinkedHashMap<>();
        behaviorAnalysis.put("financialActionRequest", false);
        behaviorAnalysis.put("externalContactRequest", externalContact);
        behaviorAnalysis.put("downloadRequest", false);

        // Sandbox가 아직 없어 원시 DOM 수집 결과도 함께 목업으로 채운다 (실제로는 2번 Sandbox JSON에서 옴).
        boolean hasForm = wantsPassword || wantsOtp;
        Map<String, Object> domSummary = new LinkedHashMap<>();
        domSummary.put("passwordFields", wantsPassword ? 1 : 0);
        domSummary.put("otpFields", wantsOtp ? 1 : 0);
        domSummary.put("textFields", 2);
        domSummary.put("formCount", hasForm ? 1 : 0);
        domSummary.put("formMethod", hasForm ? "POST" : null);
        domSummary.put("formAction", hasForm ? extractPath(url) : null);
        domSummary.put("externalDomainLinks", domainMismatch ? 2 : 0);
        domSummary.put("externalContactLinks", externalContact ? 1 : 0);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("pageRiskScore", riskScore);
        result.put("verdict", finalResult);
        result.put("impersonation", impersonation);
        result.put("credentialIntent", credentialIntent);
        result.put("domainAnalysis", domainAnalysis);
        result.put("behaviorAnalysis", behaviorAnalysis);
        result.put("domSummary", domSummary);
        result.put("detectedSignals", signals);
        result.put("reasons", reasons);
        result.put("confidence", Math.round(Math.min(0.6 + riskScore / 250.0, 0.97) * 100) / 100.0);

        try {
            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException e) {
            return "{\"note\":\"mock generation failed\"}";
        }
    }

    /**
     * TODO: 2번 Sandbox가 붙으면 실제로 페이지를 렌더링해 캡처한 뒤
     * "data:image/png;base64,..." 형태의 data URI를 반환하도록 교체한다.
     * 지금은 진짜 스크린샷이 없으므로 null을 반환하고, 프론트는 null일 때
     * 예시 화면을 대신 보여준다.
     */
    private String captureScreenshot(String url, String finalResult) {
        return null;
    }

    private String extractDomain(String url) {
        try {
            String host = URI.create(url).getHost();
            return host != null ? host : url;
        } catch (Exception e) {
            return url;
        }
    }

    private String extractPath(String url) {
        try {
            String path = URI.create(url).getPath();
            return (path == null || path.isBlank()) ? "/" : path;
        } catch (Exception e) {
            return "/";
        }
    }

    private static final class BrandRef {
        final String brand;
        final String category;
        final String officialDomain;
        final List<String> keywords;

        BrandRef(String brand, String category, String officialDomain, List<String> keywords) {
            this.brand = brand;
            this.category = category;
            this.officialDomain = officialDomain;
            this.keywords = keywords;
        }
    }
}
