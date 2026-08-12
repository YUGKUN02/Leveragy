package com.leveragy.controller;

import com.leveragy.dto.ReportRequest;
import com.leveragy.entity.Report;
import com.leveragy.repository.ReportRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reportRepository;

    public ReportController(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    @PostMapping
    public ResponseEntity<Report> createReport(@Valid @RequestBody ReportRequest request) {
        Report report = new Report();
        report.setUrl(request.getUrl());
        report.setReason(request.getReason());
        Report saved = reportRepository.save(report);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<Report>> listReports() {
        return ResponseEntity.ok(reportRepository.findAll());
    }
}
