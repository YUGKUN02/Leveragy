package com.leveragy.entity;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "url_analysis")
public class UrlAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Lob
    @Column(name = "ml_result")
    private String mlResult;

    @Lob
    @Column(name = "multimodal_result")
    private String multimodalResult;

    @Lob
    @Column(name = "xai_result")
    private String xaiResult;

    @Column(name = "final_result", length = 32)
    private String finalResult;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public Integer getRiskScore() { return riskScore; }
    public void setRiskScore(Integer riskScore) { this.riskScore = riskScore; }

    public String getMlResult() { return mlResult; }
    public void setMlResult(String mlResult) { this.mlResult = mlResult; }

    public String getMultimodalResult() { return multimodalResult; }
    public void setMultimodalResult(String multimodalResult) { this.multimodalResult = multimodalResult; }

    public String getXaiResult() { return xaiResult; }
    public void setXaiResult(String xaiResult) { this.xaiResult = xaiResult; }

    public String getFinalResult() { return finalResult; }
    public void setFinalResult(String finalResult) { this.finalResult = finalResult; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
