# Discovery Service and API Gateway

## Overview

The discovery service is a standalone Netflix Eureka server. It maintains the
registry of available Spring Boot service instances.

The API Gateway is the backend entry point. It registers with Eureka, resolves
`lb://` destinations through Spring Cloud LoadBalancer, and forwards AI requests
directly to the existing FastAPI service.

All Spring applications in this setup use Java 17, Spring Boot 3.5.15, and
Spring Cloud 2025.0.2.

## Ports

| Application | Port |
| --- | ---: |
| discovery-service | 8761 |
| api-gateway | 8080 |
| auth-user-service | 8081 |
| employee-service | 8082 |
| ticket-service | 8083 |
| sla-service | 8084 |
| FastAPI ai_service | 8001 |

The API Gateway owns port 8080. Run the React development server on another
port, such as 5173, if its current development command also uses port 8080.

## Gateway Routes

| Incoming path | Destination |
| --- | --- |
| `/api/auth/**` | `lb://auth-user-service` |
| `/api/employees/**` | `lb://employee-service` |
| `/api/tickets/**` | `lb://ticket-service` |
| `/api/sla/**` | `lb://sla-service` |
| `/api/plannings/**` | `lb://planning-service` |
| `/api/knowledge/**` | `lb://knowledge-service` |
| `/api/dashboard/**` | `lb://dashboard-service` |
| `/api/messages/**` | `lb://messaging-service` |
| `/api/notifications/**` | `lb://notification-service` |
| `/api/transport/**` | `lb://transport-service` |
| `/api/ai/**` | `http://localhost:8001` |

Only the first four core services are currently implemented and registered.
Routes for the remaining Spring services are ready for their future
implementations. Until those services register with Eureka, their gateway
routes return a service-unavailable response.

The AI route applies `StripPrefix=2`. For example:

```text
/api/ai/generate-resolution-frame
```

is forwarded to:

```text
http://localhost:8001/generate-resolution-frame
```

## Startup Order

1. discovery-service
2. api-gateway
3. auth-user-service
4. employee-service
5. ticket-service
6. sla-service
7. ai_service FastAPI
8. frontend React

Starting Eureka before its clients avoids initial registration errors. The
gateway can start before the core services and will discover them after they
register.

## Terminal Commands

Run each command in a separate terminal from the repository root:

```powershell
cd backend\discovery-service
mvn spring-boot:run
```

```powershell
cd backend\api-gateway
mvn spring-boot:run
```

```powershell
cd backend\auth-user-service
mvn spring-boot:run
```

```powershell
cd backend\employee-service
mvn spring-boot:run
```

```powershell
cd backend\ticket-service
mvn spring-boot:run
```

```powershell
cd backend\sla-service
mvn spring-boot:run
```

The existing FastAPI service can be started separately:

```powershell
cd ai_service
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

To keep port 8080 available for the gateway, start the existing frontend on a
different development port without changing its files:

```powershell
cd frontend
.\node_modules\.bin\vite.cmd dev --host 127.0.0.1 --port 5173
```

## IntelliJ IDEA

Import each of these files as an independent Maven project:

```text
backend/discovery-service/pom.xml
backend/api-gateway/pom.xml
backend/auth-user-service/pom.xml
backend/employee-service/pom.xml
backend/ticket-service/pom.xml
backend/sla-service/pom.xml
```

Set the Project SDK and Maven Runner JRE to Java 17. Run these application
classes in the startup order shown above:

```text
com.cgi.intranet.discovery.DiscoveryServiceApplication
com.cgi.intranet.apigateway.ApiGatewayApplication
com.cgi.intranet.authuser.AuthUserServiceApplication
com.cgi.intranet.employee.EmployeeServiceApplication
com.cgi.intranet.ticket.TicketServiceApplication
com.cgi.intranet.sla.SlaServiceApplication
```

## Verification

Open the Eureka dashboard:

```text
http://localhost:8761
```

After startup and registration, the dashboard should list:

```text
API-GATEWAY
AUTH-USER-SERVICE
EMPLOYEE-SERVICE
TICKET-SERVICE
SLA-SERVICE
```

Test the services directly:

```text
http://localhost:8081/api/auth/health
http://localhost:8082/api/employees/health
http://localhost:8083/api/tickets/health
http://localhost:8084/api/sla/health
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:8081/api/auth/health
Invoke-RestMethod http://localhost:8082/api/employees/health
Invoke-RestMethod http://localhost:8083/api/tickets/health
Invoke-RestMethod http://localhost:8084/api/sla/health
```

Test the same endpoints through the gateway:

```text
http://localhost:8080/api/auth/health
http://localhost:8080/api/employees/health
http://localhost:8080/api/tickets/health
http://localhost:8080/api/sla/health
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:8080/api/auth/health
Invoke-RestMethod http://localhost:8080/api/employees/health
Invoke-RestMethod http://localhost:8080/api/tickets/health
Invoke-RestMethod http://localhost:8080/api/sla/health
```

The FastAPI endpoint expects a POST request with its normal request body. Use
the gateway URL instead of port 8001:

```text
http://localhost:8080/api/ai/generate-resolution-frame
```
