# FitNova AI

[![Frontend CI](https://img.shields.io/badge/Frontend-41%20Suites%20Passed%20(351%20Tests)-39FF14?style=flat-square&logo=vitest&logoColor=black)](frontend/)
[![Backend CI](https://img.shields.io/badge/Backend-23%20Passed-39FF14?style=flat-square&logo=pytest&logoColor=black)](backend/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue?style=flat-square&logo=typescript&logoColor=white)](frontend/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](backend/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](frontend/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)](frontend/)

FitNova AI is an enterprise-grade, offline-first, full-stack fitness and nutrition platform with real-time biometric intelligence, autonomous adaptive workout programming, and physiological safety guardrails.

Built using **FastAPI**, **React 18**, **TypeScript (Strict)**, **PostgreSQL**, **Web Bluetooth API**, and **Tailwind CSS**, FitNova AI bridges live biometric signals and exercise science with a cyber-athletic dark UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Authentication](#authentication)
5. [Nutrition Tracking](#nutrition-tracking)
6. [Expanded Food Database](#expanded-food-database)
7. [AI Food Scanner](#ai-food-scanner)
8. [Workout OS](#workout-os)
9. [Adaptive Training](#adaptive-training)
10. [Real-Time Safety](#real-time-safety)
11. [Wearable Integration](#wearable-integration)
12. [Nova AI](#nova-ai)
13. [Offline & Sync Architecture](#offline--sync-architecture)
14. [Backend API](#backend-api)
15. [Database](#database)
16. [Testing](#testing)
17. [Environment Variables](#environment-variables)
18. [Local Development](#local-development)
19. [Production Deployment](#production-deployment)
20. [Security](#security)
21. [Project Structure](#project-structure)
22. [Validation Status](#validation-status)

---

## Overview

FitNova AI is engineered as an active runtime operating system for athletes, gym-goers, and coaches. Rather than acting as a passive workout logger, FitNova AI actively guides training in real time by:
- Ingesting continuous heart rate data directly from Bluetooth Low Energy (BLE) chest straps and wearables.
- Evaluating fatigue and physiological strain in real time with automated safety down-regulation.
- Dynamically adapting target sets, reps, and loads based on Acute:Chronic Workload Ratios (ACWR), RPE trends, and readiness scores.
- Guaranteeing complete offline survivability with background synchronization, wall-clock time reconciliation, and atomic set locking.

### Visual Identity
FitNova AI features a distinct cyber-athletic design system:
- **Obsidian Dark Background**: Deep space navy (`#020817` / `#04111F`) providing high contrast.
- **Electric Neon Accents**: Cyber Neon Green (`#39FF14`) and High-Voltage Yellow (`#DFFF00`).
- **Glassmorphism**: Backdrop-blur containers with multi-tier glow borders and depth elevation.
- **Interactive Biometric Canvas**: Real-time 60fps HTML5 canvas rendering interactive ECG pulses, floating fitness nodes, and cursor-reactive energy particles.
- **Full Reduced-Motion Accessibility**: Respects user OS `prefers-reduced-motion: reduce` across all animations.

### User Roles
- **Athlete (User)**: Access to personalized dashboard, active workout OS, nutrition tracking, AI scanner, and progression analytics.
- **Trainer**: Client roster management, custom workout programming, and client progress monitoring.
- **Administrator**: System telemetry, user management, and catalog curation.

---

## Technology Stack

### Frontend
- **Framework**: React 18.3
- **Language**: TypeScript 5.5+ (Strict Mode enabled, 0 compiler errors)
- **Bundler & Tooling**: Vite 8.0, Vitest
- **Styling**: Tailwind CSS v3.4, PostCSS, Autoprefixer
- **UI & Icons**: Lucide React, Framer Motion
- **Hardware Integration**: Web Bluetooth API (GATT Heart Rate Profile)

### Backend
- **Framework**: FastAPI (Python 3.10+ / 3.11+)
- **ORM & DB**: SQLAlchemy 2.0, PostgreSQL (`psycopg2`), SQLite fallback
- **Validation**: Pydantic V2, Pydantic-Settings
- **Security**: PyJWT / python-jose, Passlib, Bcrypt
- **AI Integrations**: Google Gemini API client

### DevOps & Infrastructure
- **Containerization**: Docker, Docker Compose
- **Hosting Targets**: Render (Backend), Vercel / Netlify (Frontend)

---

## Architecture

FitNova AI follows a strict three-tier clean architecture separating Platform Infrastructure, Domain Intelligence, and Presentation:

```mermaid
graph TD
    subgraph UI ["Presentation Layer (React 18 + Tailwind)"]
        Pages[Pages & Router]
        Contexts[WorkoutContext / AuthContext / DashboardContext]
        Components[RestTimer / ExerciseCard / NovaAvatar / AudioCoach]
    end

    subgraph Domain ["Domain Intelligence Layer (Pure TypeScript)"]
        WorkoutService[WorkoutService]
        IntelligenceService[WorkoutIntelligenceService]
        ProgressionEngine[ProgressionEngine]
        RecoveryEngine[RecoveryDecisionEngine]
        AdaptiveEngine[AdaptiveTrainingEngine]
        SafetyEngine[RealtimeSafetyEngine]
        AnalyticsEngine[WorkoutAnalyticsService]
    end

    subgraph Platform ["Platform Infrastructure Layer (Resilient Utilities)"]
        EventBus[EventBus - Strongly Typed Pub/Sub]
        OfflineManager[OfflineManager & SyncQueue]
        SyncManager[SyncManager & Conflict Resolvers]
        HealthDataService[HealthDataService & BLE Provider]
        TelemetryService[TelemetryService & Metrics]
        ObservabilityService[ObservabilityService]
        Sanitizer[DefaultLogSanitizer]
        StorageService[StorageService - Namespaced]
        ApiClient[ApiClient - Fetch Wrapper + Idempotency]
    end

    subgraph Backend ["Backend API Layer (FastAPI + PostgreSQL)"]
        FastAPI[FastAPI Gateway]
        AuthRouter[Auth & Profile Routers]
        WorkoutRouter[Workout & Session Routers]
        HealthRouter[Health & Safety Routers]
        AdaptiveRouter[Adaptive Decisions Routers]
        FoodRouter[Foods & Nutrition Routers]
        Database[(PostgreSQL Database)]
    end

    UI --> Domain
    Domain --> Platform
    Platform --> Backend
```

---

## Authentication

FitNova AI provides secure, stateless authentication and profile onboarding:

- **Password Hashing**: Industry-standard `bcrypt` algorithm with salt generation.
- **Stateless Tokens**: HS256 JWT tokens containing user ID, role, and expiration timestamps.
- **Role-Based Access Control (RBAC)**: Tailored access permissions for `user`, `trainer`, and `admin`.
- **Sliding Session Expiration**: Seamless token refresh and authenticated API client interceptors.
- **Onboarding Pipeline**: Collects biological sex, age, height, weight, activity multiplier, fitness goals, and equipment constraints to calculate metabolic targets.

---

## Nutrition Tracking

FitNova AI features a comprehensive nutrition calculation and daily intake management system:

- **BMR & TDEE Engines**: Precise energy expenditure calculations via the Mifflin-St Jeor formula adjusted for user training frequency and body composition.
- **Macronutrient Tracking**: Real-time progress meters for Daily Calories, Protein, Carbohydrates, Fats, and Water intake.
- **Meal Plan Logging**: Logging across Breakfast, Lunch, Dinner, and Snacks with immediate calorie-pool reconciliation.
- **Attribution & Quality**: All calculations display clear macro breakdowns with nutritional estimates.

---

## Expanded Food Database

FitNova AI features a production-ready, verified master food catalog of **190 items** across **29 distinct regional and international cuisines**, calibrated with authentic nutritional profiles from national nutritional institutes.

### Regional & Global Coverage

| Region / Cuisine Group | Covered Cuisines & Territories | Key Dishes & Representative Foods |
| :--- | :--- | :--- |
| **North Indian** | Punjabi, Awadhi, Mughlai, Delhi | Dal Makhani, Dal Tadka, Paneer Butter Masala, Palak Paneer, Kadai Paneer, Shahi Paneer, Paneer Tikka, Butter Naan, Garlic Naan, Tandoori Roti, Aloo Paratha, Paneer Paratha, Rajma Masala, Chole Masala, Butter Chicken, Chicken Tikka Masala, Kadhi Pakora, Jeera Rice, Vegetable Biryani, Chicken Biryani, Mutton Rogan Josh |
| **South Indian** | Tamil, Kerala, Andhra & Telangana, Karnataka | Idli, Medu Vada, Plain Dosa, Masala Dosa, Sambar, Coconut Chutney, Rasam, Curd Rice, Chettinad Chicken, Appam, Avial, Puttu, Kadala Curry, Rava Upma, Onion Uttapam, Ven Pongal, Hyderabadi Mutton Biryani |
| **East Indian** | Bihari & Jharkhandi, Bengali, Odia, Assamese | Litti Chokha, Sattu Paratha, Dhuska, Aloo Chokha, Baingan Chokha, Thekua, Bihari Kabab, Sattu Drink (Namkeen), Marua Roti, Dalma, Pakhala Bhata, Machher Jhol, Shorshe Ilish, Kosha Mangsho, Mishti Doi, Rasgulla, Sandesh, Chhena Poda, Assamese Duck Meat Curry, Bamboo Shoot Fry |
| **West Indian** | Maharashtrian, Gujarati, Rajasthani, Goan | Pav Bhaji, Vada Pav, Misal Pav, Poha, Dhokla, Thepla, Khandvi, Handvo, Dal Baati Churma, Gatte ki Sabzi, Laal Maas, Ker Sangri, Puran Poli, Thalipeeth |
| **Kashmiri & Himalayan** | Kashmiri, Himachali, Ladakhi, Tibetan | Kashmiri Rogan Josh, Kashmiri Yakhni, Kashmiri Dum Aloo, Thukpa, Steamed Momos, Siddu, Tingmo |
| **Asian & East Asian** | Japanese, Chinese, Vietnamese, Korean, Thai | Salmon Avocado Sushi Roll, Shoyu Ramen, Pad Thai, Steamed Dim Sum Dumplings, Beef Pho, Chicken Teriyaki, Kimchi Fried Rice, Bibimbap, Miso Soup, Vegetable Spring Rolls |
| **Middle Eastern & Levantine** | Lebanese, Turkish, Egyptian, Israeli | Hummus, Falafel, Chicken Shawarma Wrap, Tabbouleh, Baba Ganoush, Shakshuka, Chicken Shish Kebab, Whole Wheat Pita |
| **Mediterranean & Italian** | Italian, Greek | Margherita Pizza, Spaghetti Pomodoro, Mushroom Risotto, Lasagna Bolognese, Tomato Basil Bruschetta, Classic Minestrone Soup, Greek Salad, Caprese Salad |
| **Mexican & Latin** | Mexican, Latin American | Grilled Chicken Tacos, Beef Burrito, Cheese Quesadilla, Chicken Fajitas, Chicken Enchiladas, Guacamole, Pico de Gallo Salsa, Seasoned Black Beans |
| **American & Western** | American, British | Classic Cheeseburger, Buttermilk Pancakes, Grilled Sirloin Steak, Macaroni and Cheese, Plain Bagel, Caesar Salad, Fish and Chips |
| **African** | West African, North African, South African | Jollof Rice, Moroccan Lamb Tagine, Injera Bread, Peri-Peri Chicken, South African Bobotie, Egyptian Koshari, Egusi Soup with Spinach |
| **Whole Foods & Sports Nutrition** | Global Staples & Commodities | Boiled Egg, Whey Protein, Greek Yogurt Nonfat, Canned Tuna in Water, Peanut Butter, Raw Walnuts, Raw Almonds, Chia Seeds, Rolled Oats, Sweet Potato, Steamed Broccoli, Cooked Spinach, Chicken Breast Cooked, Cow Milk, Raw Paneer |

### Scientific Attribution & Data Sources
- **114 Foods**: Grounded in **ICMR-IFCT** (Indian Council of Medical Research - Indian Food Composition Tables, National Institute of Nutrition, Hyderabad).
- **76 Foods**: Grounded in **USDA FoodData Central** (SR Legacy and Foundation Foods databases).

### Multi-Tier Search Engine & Relevance Ranking
The search engine (`build_food_query`) enforces a 5-tier relevance ranking strategy:
1. **Tier 1 (Priority 1)**: Exact food name match (`LOWER(name) = :q`).
2. **Tier 2 (Priority 2)**: Prefix food name match (`LOWER(name) LIKE :q%`).
3. **Tier 3 (Priority 3)**: Substring food name match (`LOWER(name) LIKE %:q%`).
4. **Tier 4 (Priority 4)**: Exact or substring match in `common_name` (regional native names).
5. **Tier 5 (Priority 5)**: Match within JSON `aliases` array (phonetic variations, colloquial terms).
- **Tiebreakers**: Ranked by character length `func.length(Food.name).asc()` and alphabetical name `Food.name.asc()`.

### Idempotent Catalog Ingestion Engine
```bash
# Manual CLI ingestion with structured metric reports:
python -m app.services.food_importer app/data/food_catalog.json
```
The startup seeder automatically initializes the catalog upon FastAPI boot without duplicating records.

---

## AI Food Scanner

FitNova AI integrates visual recognition via Google Gemini Vision coupled with master catalog cross-referencing:

- **Visual Detection**: Accepts camera capture or uploaded food photos (JPEG/PNG/WebP).
- **Catalog Cross-Referencing**: Identified foods are cross-referenced with the database to match verified nutrient baselines.
- **Portion Scaling**: Calculates estimated grams and scales calories, protein, carbohydrates, and fats proportionately.
- **Medical Disclaimer**: Every scan result is explicitly presented as an estimate for fitness and nutritional guidance.

---

## Workout OS

The **Workout OS** is the core execution engine of FitNova AI, engineered for rock-solid session tracking:

- **Wall-Clock Duration Integrity**: Computes exact elapsed exercise duration from timestamps (`startedAt`, `endedAt`, `pausedDurationMs`). Eliminates timer drift when the browser is backgrounded, the screen turns off, or the app is reloaded.
- **Atomic Set Locking**: In-flight locks (`activeSetLocks`) prevent accidental double-taps from generating duplicate set entries or inflated volume.
- **Session Crash Recovery**: Active sessions are continuously persisted to local storage. If a user refreshes or reopens the browser mid-workout, the session is seamlessly restored in the exact exercise and set.
- **Smart Rest Timer**: Computes compound-movement and RPE-sensitive rest recommendations with visual countdowns and optional audio cues.
- **Exercise Substitution**: Evaluates biomechanical similarity and equipment availability to replace exercises without dropping historical session volume.
- **Automated PR Engine**: Detects 1RM, maximum weight, and volume records across every set and triggers celebration toasts.

---

## Adaptive Training

FitNova AI implements a multi-factor **Adaptive Training Engine** (`AdaptiveTrainingEngine`):

1. **Recovery & Readiness Analysis**:
   - Calculates a normalized Readiness Score (0–100) using sleep duration, muscle soreness, systemic fatigue, and HRV.
   - Evaluates Acute:Chronic Workload Ratio (ACWR) to prevent overtraining injuries.
2. **Dynamic Session Modification**:
   - **Full Capacity**: Prescribes planned progressive overload (+2.5kg to +5kg jumps).
   - **Moderate Fatigue**: Maintains current intensity while holding volume.
   - **Elevated Strain**: Reduces total working sets by 20–30% or lowers working weight by 5–10%.
   - **Severe Exhaustion**: Converts routine into an active recovery or mobility session.
3. **Confidence Calibration**:
   - Every adaptive recommendation includes an explainability breakdown (`reasons`, `warnings`) and a statistical `confidenceScore` (0.0 to 1.0).

---

## Real-Time Safety

The **Real-Time Safety Engine** (`RealtimeSafetyEngine`) runs continuously during active workouts to monitor physiological strain:

- **HR Safety Zones**:
  - `normal` (< 150 BPM)
  - `elevated` (150–169 BPM)
  - `high` (170–184 BPM)
  - `critical` (>= 185 BPM)
- **Debounced Escalation**:
  - Requires **3 consecutive sustained readings** in an elevated zone before triggering safety actions, preventing false alarms from transient sensor noise.
- **Instant Downgrade**:
  - Immediately downgrades alert state when heart rate drops back into normal recovery zones.
- **Intervention Protocols**:
  - **Sustained High HR**: Triggers an alert and recommends volume reduction (`reduce_volume`).
  - **Sustained Critical HR**: Dispatches an emergency audio/visual notification and commands the user to halt exercise (`stop_and_recover`).

---

## Wearable Integration

FitNova AI communicates directly with modern fitness wearables without third-party companion apps:

- **Standard GATT Heart Rate Profile**: Connects to the standard Bluetooth SIG Heart Rate Service (`0x180D`) and Measurement Characteristic (`0x2A37`).
- **Supports Both 8-bit & 16-bit BPM Encodings**: Decodes standard Bluetooth byte payloads, including contact detection and energy expenditure flags.
- **Signal Sanitization & Quality Filter**:
  - Discards unphysiological values (< 30 BPM or > 220 BPM).
  - Annotates signals with freshness states (`fresh`, `aging`, `stale`, `unavailable`).
- **Resilient Lifecycle**: Automatically handles device disconnections, user-initiated unpairing, and reconnects without interrupting active workout logging.

---

## Nova AI

**Nova AI** acts as an autonomous virtual fitness coach embedded within the platform:

- **Unified Context Engine**: Ingests historical workout data, sleep, soreness, fatigue, and live bio-signals.
- **Natural Language Coaching**: Generates actionable, supportive, and safety-first audio and text prompts before, during, and after workouts.
- **Plateau Detection**: Identifies multi-session stagnation at identical weights with elevated RPE and recommends micro-loading or exercise variations.
- **Deload Recommendation**: Triggers programmed deload periods when cumulative systemic fatigue reaches critical levels.

---

## Offline & Sync Architecture

FitNova AI is designed from the ground up for gym environments with poor or zero cellular connectivity:

```mermaid
sequenceDiagram
    autonumber
    actor Athlete as Athlete (Mobile / Browser)
    participant OS as Workout OS
    participant Offline as OfflineManager (SyncQueue)
    participant Sync as SyncManager
    participant Backend as FastAPI Backend

    Note over Athlete,Backend: Network Offline (Gym Basement)
    Athlete->>OS: Complete Set (10 reps @ 85kg)
    OS->>OS: Update Local Session & Recalculate Volume
    OS->>Offline: Queue WORKOUT_LOG_SET (with Idempotency Key)
    Offline->>Offline: Persist to Storage (Status: Pending)

    Note over Athlete,Backend: Network Restored
    OS->>Sync: Event: NETWORK_ONLINE
    Sync->>Offline: Fetch Pending Operations
    Sync->>Backend: POST /workouts/sessions/log-set (with Idempotency Key)
    Backend-->>Sync: 200 OK
    Sync->>Offline: Remove Completed Operation
    Sync->>OS: Notify "Workout Synchronized"
```

- **Sync Queue & Dead-Letter Handling**: Failed operations retry with exponential backoff and jitter. Operations exceeding max retry counts move to an inspectable dead-letter queue.
- **Conflict Resolution Strategies**:
  - `server_wins`: Merges remote updates while safeguarding completed local sets.
  - `client_wins`: Local modifications overwrite conflicting remote records.
  - `latest_timestamp`: Resolves based on last recorded wall-clock timestamp.
- **API Idempotency**: All mutating network requests include deterministic idempotency keys (`idempotencyKey`), preventing duplicate database records during retry attempts.

---

## Backend API

The backend is organized as a modular FastAPI application with Pydantic V2 data contracts:

| Router | Prefix | Responsibilities |
| :--- | :--- | :--- |
| `auth.py` | `/api/auth` | User registration, login, JWT issuance, profile onboarding |
| `workouts.py` | `/api/workouts` | Workout templates, session creation, set logging, completions, and history |
| `workout_analytics.py` | `/api/workouts/analytics` | Volume trends, consistency metrics, 1RM strength progression |
| `health.py` | `/api/health` | Wearable telemetry ingestion, heart rate logs, provider status |
| `adaptive_decisions.py`| `/api/adaptive-decisions` | Adaptive training audit trails, user preferences, safety events |
| `foods.py` | `/api/foods` | Food catalog search, cuisine/category listings, nutrition lookup |
| `nutrition.py` | `/api/nutrition` | Meal plan generation, daily nutrition summaries, meal logging |
| `food_scan.py` | `/api/food-scan` | Gemini Vision food image scanning and portion estimation |
| `insights.py` | `/api/insights` | Coach insights, readiness calculations, daily briefs |
| `achievements.py` | `/api/achievements` | Badges, streaks, milestone unlocks |
| `admin.py` | `/api/admin` | System health, operational telemetry, user administration |

---

## Database

FitNova AI uses **SQLAlchemy 2.0** with strict relational integrity:

- **Multi-Engine Support**: Native PostgreSQL for production, SQLite for local testing and lightweight development.
- **Composite Indexes**:
  - `foods`: `(cuisine, category)`, `(is_vegetarian, is_vegan)`, `(name)`, `(common_name)`.
  - `workout_sessions`: `(user_id, status)`, `(user_id, started_at)`.
  - `workout_sets`: `(session_id, exercise_id)`.
  - `adaptive_decision_audits`: `(user_id, timestamp)`.
- **Foreign Key Constraints**: Cascading deletes on user account removal and strict session-to-set relational trees.
- **Safe Migrations**: Schema alterations inspect existing table columns and constraints before applying modifications.

---

## Testing

FitNova AI enforces zero-regression quality gates across frontend and backend:

### Frontend Verification (Vitest & TypeScript)
```bash
cd frontend

# Strict TypeScript type safety
npx tsc --noEmit

# Vitest test suite (41 test suites, 351 tests)
npm run test

# Production build bundle check
npm run build
```

### Backend Verification (Pytest & Unittest)
```bash
cd backend

# Pytest test suite (23 tests: auth, workouts, health, food scanner, food database)
pytest

# Specialized full workout flow integration test (18 assertion steps)
python test_workouts.py

# Food database importer verification test
python test_food_database.py

# Food vision scanner verification test
python test_food_scan.py
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | string | `development` | Environment mode (`development`, `production`, `test`) |
| `DATABASE_URL` | string | `postgresql://postgres:postgres@localhost:5432/fitnova` | PostgreSQL connection string |
| `SECRET_KEY` | string | *Insecure dev secret* | Secret key for signing JWT tokens |
| `ALGORITHM` | string | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| int | `480` (8 hours) | Token validity duration |
| `GEMINI_API_KEY` | string | `None` | Google Gemini API key for AI features |
| `FRONTEND_URL` | string | `http://localhost:5173` | Allowed CORS origin |
| `PORT` | int | `8000` | Port for the backend server |

### Frontend Configuration (`frontend/.env`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | string | `http://localhost:8000/api` | Base URL for backend API |
| `VITE_APP_VERSION` | string | `1.0.0` | Application version |
| `VITE_BUILD_VERSION` | string | `release-1.0.0` | Build release identifier |

---

## Local Development

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ / 3.11+
- PostgreSQL 14+ (or local SQLite fallback)

### Step 1: Clone Repository
```bash
git clone https://github.com/SagarKumar-git/fitnova-ai.git
cd fitnova-ai
```

### Step 2: Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
python run.py
```
Backend will start on `http://localhost:8000` (Swagger docs available at `http://localhost:8000/docs`).

### Step 3: Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```
Frontend will be accessible at `http://localhost:5173`.

---

## Production Deployment

### Backend (Render / Cloud Containers)
1. Set the build command to `pip install -r requirements.txt`.
2. Set the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. Configure environment variables in the cloud dashboard (`DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT=production`, `FRONTEND_URL`, `GEMINI_API_KEY`).
4. Note: Render and Neon `postgres://` URLs are automatically normalized to `postgresql://` by `backend/app/config.py`.

### Frontend (Vercel / Netlify)
1. Set the root directory to `frontend`.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Configure `VITE_API_BASE_URL` to point to the deployed backend URL.

---

## Security

FitNova AI treats user biometric and credential data with enterprise privacy standards:

- **Redaction Engine (`DefaultLogSanitizer`)**:
  - Automatically sanitizes Bearer tokens, JWT tokens (`eyJ...`), API keys (`AIza...`, `sk-...`), passwords, and secret strings from all logs and telemetry.
- **Biometric Minimization**:
  - Telemetry never transmits raw millisecond ECG/PPG wave series or high-frequency sensor readings.
  - Only anonymized, aggregated operational metrics (e.g., connection status, sync latency, sample counts) are tracked.
- **No PII Exposure**:
  - Telemetry payloads strip names, emails, and phone numbers.
- **Production Observability (`ObservabilityService`)**:
  - Centralizes tracking for API errors, sync failures, wearable disconnections, and AI timeouts without leaking sensitive data.

---

## Project Structure

```text
FitNova AI
├── backend
│   ├── app
│   │   ├── config.py              # Centralized environment settings
│   │   ├── database.py            # SQLAlchemy async/sync engine
│   │   ├── models.py              # PostgreSQL database models
│   │   ├── schemas.py             # Pydantic V2 validation schemas
│   │   ├── auth.py                # JWT & password hashing logic
│   │   ├── calculations.py        # BMR, TDEE, macronutrient logic
│   │   ├── gemini_client.py       # Google Gemini AI client
│   │   ├── routes                 # API endpoint routers
│   │   │   ├── auth.py
│   │   │   ├── workouts.py
│   │   │   ├── workout_analytics.py
│   │   │   ├── health.py
│   │   │   ├── adaptive_decisions.py
│   │   │   ├── insights.py
│   │   │   ├── nutrition.py
│   │   │   ├── foods.py
│   │   │   └── food_scan.py
│   │   ├── services               # Core domain services
│   │   │   ├── food_importer.py   # Idempotent catalog ingestion engine
│   │   │   └── vision.py          # Gemini Vision & portion scaling
│   │   ├── data                   # Curated nutritional datasets
│   │   │   └── food_catalog.json  # 190-item ICMR & USDA verified catalog
│   │   └── main.py                # FastAPI application entry point
│   ├── run.py                     # Local development launcher
│   ├── requirements.txt           # Python dependencies
│   └── test_*.py                  # Test suites
├── frontend
│   ├── src
│   │   ├── components             # Shared UI components
│   │   │   ├── auth               # Interactive Auth UI system
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── NotificationToastContainer.tsx
│   │   │   └── OfflineIndicator.tsx
│   │   ├── design-system          # Cyber-athletic tokens & avatar
│   │   ├── features
│   │   │   ├── workout            # Workout OS
│   │   │   │   ├── analytics      # Volume, ACWR, and progression analysis
│   │   │   │   ├── components     # RestTimer, SetRow, SessionSummary, etc.
│   │   │   │   ├── health         # Web Bluetooth HR provider
│   │   │   │   ├── intelligence   # Progression, Recovery, Adaptive engines
│   │   │   │   ├── models         # Workout, Set, Exercise types
│   │   │   │   ├── pages          # WorkoutHome, ActiveWorkout, History, etc.
│   │   │   │   ├── repositories   # ApiWorkoutRepository & MockWorkoutRepository
│   │   │   │   ├── services       # WorkoutService orchestrator
│   │   │   │   └── state          # WorkoutContext & WorkoutSessionState
│   │   │   ├── nutrition          # Food logging, meal plans, scanner
│   │   │   └── dashboard          # Readiness score, streak widgets
│   │   ├── platform               # Platform infrastructure layer
│   │   │   ├── analytics          # Privacy-preserving analytics
│   │   │   ├── config             # Environment configuration
│   │   │   ├── container          # Dependency injection container
│   │   │   ├── errors             # Typed error hierarchy
│   │   │   ├── events             # Strongly typed EventBus
│   │   │   ├── logging            # DefaultLogSanitizer & Logger
│   │   │   ├── network            # NetworkService & ApiClient
│   │   │   ├── notifications      # NotificationService
│   │   │   ├── observability      # Unified failure & performance tracking
│   │   │   ├── offline            # OfflineManager & SyncQueue
│   │   │   ├── storage            # Namespaced StorageService
│   │   │   ├── sync               # SyncManager & Conflict Resolution
│   │   │   └── telemetry          # TelemetryService
│   │   ├── App.tsx                # App root & route definitions
│   │   └── main.tsx               # DOM bootstrap
│   ├── package.json               # Node.js dependencies
│   ├── tsconfig.json              # Strict TypeScript configuration
│   └── vite.config.ts             # Vite build configuration
├── docker-compose.yml
└── README.md
```

---

## Validation Status

FitNova AI has successfully passed comprehensive end-to-end regression validation:

| Verification Scope | Status | Notes |
| :--- | :---: | :--- |
| **Complete 21-Step Journey** | **VERIFIED** | Registration to post-workout analytics streak update validated end-to-end |
| **All 14 Failure Scenarios** | **VERIFIED** | Network loss/recovery, refresh, wearable disconnect/reconnect, HR spikes, duplicate clicks |
| **Frontend Unit & E2E Tests** | **351 / 351 PASS** | 41 test files executed with zero errors |
| **TypeScript Compilation** | **0 ERRORS** | Strict typecheck passing cleanly |
| **Production Build** | **SUCCESS** | Vite production bundle compiled with zero errors |
| **Backend Pytest** | **23 / 23 PASS** | Authentication, security, workouts, health, food scanner, and food database tests validated |
| **Specialized Workout Integration** | **18 / 18 PASS** | End-to-end multi-step integration runner in `test_workouts.py` passed |
| **Food Catalog & Ingestion** | **190 / 190 VERIFIED** | 190 items across 29 cuisines (114 ICMR-IFCT, 76 USDA) with idempotent seeder & multi-tier search |

---

## Author

**Sagar Kumar**  
GitHub: [@SagarKumar-git](https://github.com/SagarKumar-git)  
Project Repository: [FitNova AI](https://github.com/SagarKumar-git/fitnova-ai)
