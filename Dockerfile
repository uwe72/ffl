# Stage 1: Frontend bauen
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY ffl-frontend/package*.json ./
RUN npm ci
COPY ffl-frontend/ ./
RUN npm run build

# Stage 2: Backend bauen
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /app
COPY ffl-backend/pom.xml ./
RUN mvn dependency:go-offline -B
COPY ffl-backend/src ./src
COPY --from=frontend-build /app/dist ./src/main/resources/static
RUN mvn package -DskipTests -B

# Stage 3: Schlankes Runtime Image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# H2 Datenbank für Migration kopieren
COPY ffl-backend/data/ffl.mv.db /app/data/ffl.mv.db
COPY --from=backend-build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]