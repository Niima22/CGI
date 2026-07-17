package com.support.kpi.kpi_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class KpiServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(KpiServiceApplication.class, args);
	}

}
