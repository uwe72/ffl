# AGENTS.md

This document provides guidelines for AI coding agents working in this repository.

## Project Overview

FFL (Fantasy Football League) is a full-stack application with:
- **Backend**: Java 21 + Spring Boot 3.2.4 + H2/MySQL
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS

## Build Commands

### Backend (from `ffl-backend/`)

```bash
# Start backend server
mvnw.cmd spring-boot:run

# Run all tests
mvnw.cmd test

# Run a single test class
mvnw.cmd test -Dtest=PlayerServiceTest

# Run a single test method
mvnw.cmd test -Dtest=PlayerServiceTest#testMethodName

# Compile only
mvnw.cmd compile

# Package
mvnw.cmd package -DskipTests

# Clean build
mvnw.cmd clean install
```

Backend runs on `http://localhost:8080`

### Frontend (from `ffl-frontend/`)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Type check only
npx tsc --noEmit
```

Frontend runs on `http://localhost:5173`

## Code Style Guidelines

### Backend (Java/Spring Boot)

#### Package Structure
- `de.ffl.config` - Configuration classes
- `de.ffl.controller` - REST controllers
- `de.ffl.service` - Business logic
- `de.ffl.repository` - Spring Data JPA repositories
- `de.ffl.domain` - JPA entities
- `de.ffl.dto` - Data Transfer Objects

#### Naming Conventions
- Classes: PascalCase (e.g., `PlayerService`, `PlayerController`)
- Methods: camelCase (e.g., `findBySeasonId`, `validateTeam`)
- Constants: UPPER_SNAKE_CASE
- Package names: lowercase (e.g., `de.ffl.domain`)
- Database tables: snake_case with `ffl_` prefix (e.g., `ffl_player`)

#### Import Order
```java
// 1. Java standard library
import java.util.List;
import java.util.Map;

// 2. Jakarta/Javax
import jakarta.persistence.*;
import jakarta.validation.Valid;

// 3. Spring Framework
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 4. Third-party libraries
import lombok.*;

// 5. Project imports
import de.ffl.domain.Player;
import de.ffl.repository.PlayerRepository;
```

#### Entity Classes
- Use Lombok annotations: `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`
- Always specify table name with `@Table(name = "ffl_entityname")`
- Use `@GeneratedValue(strategy = GenerationType.IDENTITY)` for IDs
- Use `@Enumerated(EnumType.STRING)` for enums

```java
@Entity
@Table(name = "ffl_player")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    // fields...
}
```

#### Service Classes
- Use constructor injection (no `@Autowired` on fields)
- Annotate write operations with `@Transactional`
- Return entities directly, use `Optional` or null for not-found cases

```java
@Service
public class PlayerService {
    private final PlayerRepository playerRepository;

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    @Transactional
    public Player createPlayer(Player player) {
        return playerRepository.save(player);
    }
}
```

#### Controllers
- Use `@RestController` and `@RequestMapping`
- Return `ResponseEntity<T>` for single entities with potential 404
- Return `List<T>` directly for collections
- Use `@PathVariable` and `@RequestBody` for parameters
- Use `@Valid` for request body validation

```java
@RestController
@RequestMapping("/api/players")
public class PlayerController {
    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Player> getPlayerById(@PathVariable Long id) {
        Player player = playerService.findById(id);
        if (player == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(player);
    }

    @PostMapping
    public Player createPlayer(@Valid @RequestBody Player player) {
        return playerService.save(player);
    }
}
```

#### Repositories
- Extend `JpaRepository<Entity, Long>`
- Use Spring Data query methods (e.g., `findBySeasonId`, `findByTeamId`)

```java
@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findBySeasonId(Long seasonId);
    List<Player> findByTeamId(Long teamId);
}
```

#### Error Handling
- Throw `IllegalArgumentException` for business validation errors
- Return `ResponseEntity.badRequest().body(message)` for client errors
- Use `ResponseEntity.notFound().build()` for 404 responses

### Frontend (React/TypeScript)

#### File Naming
- Components: PascalCase (e.g., `Layout.tsx`, `ProtectedRoute.tsx`)
- Utilities/hooks: camelCase (e.g., `useTeams.ts`, `client.ts`)
- Types: `types/index.ts` for shared types

#### Component Structure
- Use default exports for components
- Use functional components with arrow functions

```tsx
export default function Players() {
  return (
    <div>
      {/* content */}
    </div>
  )
}
```

#### Import Order
```tsx
// 1. React and external libraries
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

// 2. Internal components and hooks
import Layout from './components/Layout'
import { useTeams } from './hooks/useTeams'

// 3. Types
import type { Season, Player } from './types'
```

#### API Client
- Use the pre-configured axios instance from `api/client.ts`
- It automatically adds auth token and handles 401 responses

```tsx
import api from './api/client'

const { data } = useQuery({
  queryKey: ['players'],
  queryFn: () => api.get('/players').then(res => res.data)
})
```

#### Types
- Define shared types in `types/index.ts`
- Use TypeScript strict mode
- Use `type` for unions and interfaces for objects

```tsx
export type Position = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELD' | 'STRIKER'

export interface Player {
  id: number
  nameKicker: string
  position: Position
  prize: number
}
```

#### Styling
- Use Tailwind CSS classes
- Follow existing patterns for consistent spacing and colors

```tsx
<div className="text-3xl font-bold mb-6">
  <div className="bg-white rounded-lg shadow p-6">
```

#### Table Sorting Requirements
- **ALL tables must be sortable by clicking column headers**
- Default sort order: GOALKEEPER → DEFENDER → MIDFIELD → STRIKER (for player tables)
- Use state for `sortKey` and `sortOrder` ('asc' | 'desc')
- Show sort icons: ⇅ (unsorted), ↑ (ascending), ↓ (descending)
- Sort icons should use bronze-gold color (#c9a66b) when active, gray (#6b7280) when inactive
- Column headers must have `cursor-pointer hover:text-[#c9a66b]` classes

## Important Notes

- **No comments in code** unless explicitly requested
- **No tests exist yet** - when adding tests, place them in `ffl-backend/src/test/java/de/ffl/`
- **Port 8080** is the default backend port
- **H2 Console** available at `/h2-console` (JDBC URL: `jdbc:h2:file:./data/ffl`)
- **Swagger UI** available at `/swagger-ui.html`
- **Database tables** use `ffl_` prefix
- **JWT authentication** is required for most API endpoints (except `/api/auth/**`, `/api/public/**`, `/api/migration/**`)