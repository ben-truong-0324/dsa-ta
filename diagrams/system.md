# System Architecture: DSA Gamify

This document outlines the system architecture, service responsibilities, and communication flows for the DSA Gamify platform, orchestrated via Docker Compose.

## 1. Containerized Services Overview

The system is composed of several independent services managed by `docker-compose.yml`.

1.  **`nextjs-frontend`**: The client-facing web application.
2.  **`fastapi-backend`**: The core application logic and LLM integration service.
3.  **`postgres-db`**: The primary data store.
4.  **`keycloak-idp`**: The identity provider for user authentication.
5.  **`prometheus`**: The metrics collection server.
6.  **`grafana`**: The metrics visualization dashboard.

![System Architecture Diagram](https://i.imgur.com/Q2yDTRh.png)

---

## 2. Service Breakdown & Responsibilities

### `nextjs-frontend` (Port: 3000)
* **Role:** Serves the user interface built with Next.js and React.
* **Responsibilities:**
    * Render all UI components (dashboard, problem view, editor).
    * Handle user interactions (button clicks, theme toggling).
    * Manage client-side state.
    * **Authentication Flow:** Redirects users to the Keycloak login page. Upon successful login, it receives a JWT and stores it securely.
    * **API Communication:** Attaches the JWT to the `Authorization` header for all requests to the `fastapi-backend`.
* **Monitoring:** Exposes basic health check endpoints.

### `fastapi-backend` (Port: 8000)
* **Role:** The central nervous system of the application. Provides a RESTful API.
* **Responsibilities:**
    * **Business Logic:** Manages all logic related to users, problems, and gamification (XP, levels).
    * **CRUD Operations:** Handles all interactions with the `postgres-db`.
    * **Secure Endpoints:** All endpoints are protected and require a valid JWT issued by Keycloak. The service validates the token on every request.
    * **LLM Service Integration:**
        * Constructs detailed prompts based on user requests (e.g., "Generate a medium-difficulty dynamic programming problem about stock trading").
        * Communicates with an external or locally-hosted LLM to get DSA problems.
        * Parses the LLM response and stores the structured problem/solution in the database.
    * **Daily Job:** A scheduled job (e.g., using `apscheduler`) triggers the daily challenge generation.
* **Monitoring:** Exposes a `/metrics` endpoint for Prometheus to scrape, providing metrics like request latency, error rates, and active users.

### `postgres-db` (Port: 5432)
* **Role:** The single source of truth for application data.
* **Responsibilities:**
    * Persistently store all data as defined in `database.md`.
    * Enforce data integrity through constraints and relationships.
* **Data Persistence:** Uses a Docker volume to ensure data is not lost when the container is restarted.

### `keycloak-idp` (Port: 8080)
* **Role:** Centralized user authentication and identity management.
* **Responsibilities:**
    * Provides customizable login, sign-up, and password reset pages.
    * Manages user identities and credentials securely.
    * Issues industry-standard JSON Web Tokens (JWTs) upon successful authentication.
* **Configuration:** A realm will be configured for DSA Gamify with a registered client for the `nextjs-frontend`.

### `prometheus` (Port: 9090)
* **Role:** Time-series database for metrics.
* **Responsibilities:**
    * Periodically "scrapes" the `/metrics` endpoints of configured services (initially `fastapi-backend`).
    * Stores metrics data efficiently.

### `grafana` (Port: 3001)
* **Role:** Data visualization and dashboarding tool.
* **Responsibilities:**
    * Connects to Prometheus as a data source.
    * Provides dashboards to visualize key application health metrics (e.g., API response times, DB query performance, HTTP error rates).