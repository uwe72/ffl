# Deployment Guide

## Server Setup

Der Server läuft unter `192.168.178.124` mit Docker Compose.

## Normaler Update-Ablauf

### 1. SSH-Verbindung zum Server
```bash
ssh root@192.168.178.124
# Passwort: SmartHome347
```

### 2. Ins Projektverzeichnis wechseln
```bash
cd /home/uwe72/clement/docker/my-images/fflng
```

### 3. Lokale Änderungen prüfen und ggf. stashen
```bash
git status
# Falls lokale Änderungen existieren:
git stash
```

### 4. Neuesten Stand pullen
```bash
git pull
```

### 5. Container neu bauen und starten
```bash
cd /home/uwe72/clement/docker
docker-compose build fflng
docker-compose up -d fflng
```

### 6. Logs prüfen
```bash
docker logs -f fflng
```

## Befehle Übersicht

### Container stoppen
```bash
docker-compose stop fflng
```

### Container starten
```bash
docker-compose start fflng
```

### Container neu starten
```bash
docker-compose restart fflng
```

### Container komplett neu erstellen
```bash
docker-compose down fflng
docker-compose up -d fflng
```

### Alle Container stoppen
```bash
docker-compose down
```

### Alle Container starten
```bash
docker-compose up -d
```

### Logs anzeigen
```bash
# Aktuelle Logs
docker logs fflng

# Follow Logs (live)
docker logs -f fflng

# Letzte 100 Zeilen
docker logs --tail 100 fflng
```

## Datenbank

### PostgreSQL Container Name finden
```bash
docker ps | grep postgres
```

### In PostgreSQL einloggen
```bash
docker exec -it <postgres-container-name> psql -U admin -d fflng
```

### Tabellen anzeigen
```sql
\dt
```

### User prüfen
```sql
SELECT id, login, email FROM ffl_user;
```

## Fehlerbehebung

### PostgreSQL Connection Error
Falls der PostgreSQL Container gestoppt ist:
```bash
docker-compose up -d
```

### Port bereits belegt
```bash
# Prüfen was auf Port 8080 läuft
netstat -tlnp | grep 8080

# Container stoppen
docker-compose down
```

### Container wird nicht neu gebaut
```bash
# Cache ignorieren und neu bauen
docker-compose build --no-cache fflng
docker-compose up -d fflng
```

### Alte Images aufräumen
```bash
docker image prune -f
```

## URL's

- **Frontend:** http://192.168.178.124:8080/
- **API:** http://192.168.178.124:8080/api/
- **Swagger UI:** http://192.168.178.124:8080/swagger-ui.html
- **H2 Console (nur lokal):** http://localhost:8080/h2-console

## Standard-Credentials

- **Login:** admin
- **Passwort:** admin123