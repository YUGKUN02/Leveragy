package com.leveragy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LeveragyApplication {
    public static void main(String[] args) {
        SpringApplication.run(LeveragyApplication.class, args);
    }
}
