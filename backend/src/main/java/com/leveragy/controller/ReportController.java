package com.leveragy.controller;

import com.leveragy.dto.ReportRequest;
import com.leveragy.dto.UpdateReportStatusRequest;
import com.leveragy.entity.Report;
import com.leveragy.repository.ReportRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reportRepository;

    public ReportController(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    /**
     * 동일 URL 제보 중복 통합: 같은 URL로 이미 접수된 제보가 있으면 새 행을
     * 만드는 대신 그 행의 reportCount를 올리고 새 의견을 이어붙인다.
     */
    @PostMapping
    public ResponseEntity<Report> createReport(@Valid @RequestBody ReportRequest request) {
        String url = request.getUrl();
        String reason = request.getReason();

        Report report = reportRepository.findFirstByUrlOrderByCreatedAtDesc(url)
                .map(existing -> {
                    existing.setReportCount(existing.getReportCount() + 1);
                    if (reason != null && !reason.isBlank()) {
                        String merged = (existing.getReason() == null || existing.getReason().isBlank())
                                ? reason
                                : existing.getReason() + "\n" + reason;
                        existing.setReason(merged);
                    }
                    if (existing.getAnalysisId() == null && request.getAnalysisId() != null) {
                        existing.setAnalysisId(request.getAnalysisId());
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    Report created = new Report();
                    created.setUrl(url);
                    created.setReason(reason);
                    created.setAnalysisId(request.getAnalysisId());
                    created.setDomain(extractDomain(url));
                    return created;
                });

        return ResponseEntity.ok(reportRepository.save(report));
    }

    @GetMapping
    public ResponseEntity<List<Report>> listReports(@RequestParam(required = false) String status) {
        List<Report> reports = (status == null || status.isBlank())
                ? reportRepository.findAllByOrderByCreatedAtDesc()
                : reportRepository.findAllByStatusOrderByCreatedAtDesc(status);
        return ResponseEntity.ok(reports);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Report> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateReportStatusRequest request) {
        return reportRepository.findById(id)
                .map(report -> {
                    report.setStatus(request.getStatus());
                    return ResponseEntity.ok(reportRepository.save(report));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String extractDomain(String url) {
        try {
            String host = URI.create(url).getHost();
            return host != null ? host : url;
        } catch (Exception e) {
            return url;
        }
    }
}
