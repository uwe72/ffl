# FFL - Fantasy Football League

Ein modernes Fantasy-Football-Manager-Spiel

## Technologie-Stack

### Backend
- Java 21
- Spring Boot 3.2.4
- Spring Data JPA
- H2 / MySQL
- Spring Security
- JWT Authentication
- OpenAPI/Swagger

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Query
- React Router

## Projektstruktur

```
ffl-opencode/
├── ffl-backend/          # Spring Boot Backend
│   ├── src/main/java/de/ffl/
│   │   ├── config/       # Konfiguration
│   │   ├── controller/   # REST Controller
│   │   ├── domain/       # Entities
│   │   ├── repository/   # Spring Data Repositories
│   │   ├── service/      # Business Logic
│   │   └── dto/          # Data Transfer Objects
│   └── pom.xml
├── ffl-frontend/         # React Frontend
│   ├── src/
│   │   ├── api/          # API Client
│   │   ├── components/   # React Komponenten
│   │   ├── hooks/        # Custom Hooks
│   │   ├── pages/        # Seiten
│   │   └── types/        # TypeScript Types
│   └── package.json
```

## Setup

### Backend starten

```bash
cd ffl-backend
./mvnw spring-boot:run
```

Backend läuft auf http://localhost:8080
- API: http://localhost:8080/api
- H2 Console: http://localhost:8080/h2-console
- Swagger UI: http://localhost:8080/swagger-ui.html

### Frontend starten

```bash
cd ffl-frontend
npm install
npm run dev
```

Frontend läuft auf http://localhost:5173

## Docker:
```bash
docker compose pull fflng
```
```bash
docker compose up -d fflng
```
