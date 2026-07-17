package com.support.kpi.nps_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class NpsServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(NpsServiceApplication.class, args);
	}

}
