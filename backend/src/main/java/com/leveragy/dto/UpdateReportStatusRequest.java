package com.leveragy.dto;

import javax.validation.constraints.NotBlank;

public class UpdateReportStatusRequest {

    @NotBlank(message = "status는 필수입니다.")
    private String status;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
