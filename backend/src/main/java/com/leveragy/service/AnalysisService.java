package com.leveragy.service;

import com.leveragy.entity.UrlAnalysis;
import com.leveragy.repository.UrlAnalysisRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

/**
 * TODO: 이 서비스는 팀원 A(XGBoost)/팀원 C(Multimodal)의 실제 파이프라인이
 * 완성되면 해당 API 호출로 교체될 자리표시자(placeholder)다.
 * 지금은 프론트-백엔드-DB 연결 자체를 검증하기 위해 키워드 기반으로 목업 결과를 만든다.
 */
@Service
public class AnalysisService {

    private static final List<String> SUSPICIOUS_KEYWORDS = Arrays.asList(
            "login", "verify", "otp", "auth", "account", "secure",
            "국민", "신한", "우리", "하나", "토스", "카카오뱅크", "환급", "지원금"
    );

    private final UrlAnalysisRepository urlAnalysisRepository;

    public AnalysisService(UrlAnalysisRepository urlAnalysisRepository) {
        this.urlAnalysisRepository = urlAnalysisRepository;
    }

    public UrlAnalysis analyze(String url) {
        int riskScore = computeMockRiskScore(url);
        String finalResult = riskScore >= 70 ? "PHISHING" : riskScore >= 40 ? "SUSPICIOUS" : "NORMAL";

        UrlAnalysis analysis = new UrlAnalysis();
        analysis.setUrl(url);
        analysis.setRiskScore(riskScore);
        analysis.setMlResult("{\"note\":\"placeholder - XGBoost 연동 예정\"}");
        analysis.setMultimodalResult("{\"note\":\"placeholder - Multimodal 분석 연동 예정\"}");
        analysis.setXaiResult(buildMockXaiReasons(url, riskScore));
        analysis.setFinalResult(finalResult);

        return urlAnalysisRepository.save(analysis);
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
}
