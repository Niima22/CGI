FROM maven:3.9.9-eclipse-temurin-17 AS build

ARG SERVICE_DIR

WORKDIR /app

COPY pom.xml ./
COPY auth-service/pom.xml auth-service/pom.xml
COPY agent-service/pom.xml agent-service/pom.xml
COPY kpi-service/pom.xml kpi-service/pom.xml
COPY nps-service/pom.xml nps-service/pom.xml

COPY auth-service/src auth-service/src
COPY agent-service/src agent-service/src
COPY kpi-service/src kpi-service/src
COPY nps-service/src nps-service/src

RUN mvn -B -pl ${SERVICE_DIR} -am -DskipTests package

FROM eclipse-temurin:17-jre-jammy

ARG SERVICE_DIR

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/${SERVICE_DIR}/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
