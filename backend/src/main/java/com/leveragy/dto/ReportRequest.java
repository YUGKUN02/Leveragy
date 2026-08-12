package com.leveragy.dto;

import javax.validation.constraints.NotBlank;

public class ReportRequest {

    @NotBlank(message = "url은 필수입니다.")
    private String url;

    private String reason;

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
