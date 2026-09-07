# FFL - Fantasy Football League

Ein modernes Fantasy-Football-Manager-Spiel

## Technologie-Stack

### Backend
- Java 21
- Spring Boot 3.2.4
- Spring Data JPA
- PostgreSQL (Embedded via Zonky für Entwicklung)
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

Einmaliges Setup: `ffl-backend/.env.example` nach `ffl-backend/.env` kopieren und
`APP_JWT_SECRET` setzen (mind. 32 Byte). Die Datei ist gitignored und liefert das
JWT-Secret für den lokalen Start; in Docker/Prod setzt das Compose File
`APP_JWT_SECRET` als Umgebungsvariable und hat Vorrang.

```bash
cd ffl-backend
./mvnw spring-boot:run
```

Backend läuft auf http://localhost:8080
- API: http://localhost:8080/api
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
