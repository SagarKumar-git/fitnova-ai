# FitNova AI

A Full-Stack Fitness & Nutrition Platform built using FastAPI, React, TypeScript, PostgreSQL, and Tailwind CSS.

# Features

# Phase 1 - User Foundation & Modern Auth UI
- **JWT Authentication**: Secure stateless token authentication with session expiration handling
- **User Registration & Login**: Streamlined onboarding with athlete, trainer, and admin role routing
- **Modern Interactive Auth UI Overhaul**:
  - **Dark Navy & Neon Green/Yellow Visual System**: Deep obsidian navy (`#020817` / `#04111F`) paired with electric neon green (`#39FF14`) and energetic cyber yellow (`#DFFF00`)
  - **Interactive Animated Biometric / ECG Background**: Real-time HTML5 canvas rendering animated pulse ECG waves, drifting fitness nodes, and cursor-reactive particles
  - **Cursor-Following Glow**: Desktop ambient radial follower trailing pointer movement with smooth physics-based easing
  - **Click Ripple & Energy Effects**: Dynamic neon radial shockwave animations expanding on user clicks
  - **Glassmorphism Authentication Card**: High-depth backdrop-blur card featuring layered box shadows and error-triggered shake animations
  - **Neon Green/Yellow Input Focus States**: Interactive input fields with glowing icon accents, focus rings, and high-contrast labels
  - **Animated Gradient Sign In Button**: High-impact button with continuous shimmer sheen sweeps, hover lifts, and scale down on press
  - **Login Loading & Success States**: Multi-state submit buttons featuring spinner animations, success checkmarks, and instant transition routing
  - **Register Page Visual Updates**: Unified neon theme across account creation, role selection dropdowns, and password validation
  - **Responsive Authentication UI**: Mobile-first design optimized for mobile viewports, tablets, and desktop displays
  - **Reduced-Motion Accessibility Support**: Comprehensive `prefers-reduced-motion: reduce` media query support disabling intense visual animations
- Profile Setup
- BMR Calculation
- TDEE Calculation
- Calorie Goals
- Protein Goals
- Water Intake Targets

# Phase 2 - Nutrition Management
- Food Database
- Indian & Global Food Library
- Custom Foods
- Food Diary Logging
- Water Tracking
- Meal Plan Templates
- Weight History Tracking
- Nutrition Analytics

### Phase 3 - Workout Engine
- Exercise Library
- Workout Templates
- Workout Sessions
- Progressive Overload Tracking
- Estimated 1RM Calculation
- Personal Record Detection
- Workout Streak Tracking
- Muscle Volume Analytics
- SVG Progress Charts

# Tech Stack

# Backend
- FastAPI
- SQLAlchemy
- PostgreSQL
- Pydantic
- JWT Authentication

# Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

# DevOps
- Docker
- GitHub

# Project Structure

```text
FitNova AI
├── backend
│   ├── app
│   ├── routes
│   ├── models
│   ├── schemas
│   └── services
├── frontend
│   ├── src
│   │   ├── components
│   │   │   └── auth        # Interactive Auth UI (Card, Input, Button, Background, Glow)
│   │   ├── tokens          # Design tokens & FitNova color system
│   │   ├── pages           # Login, Register, Dashboard, etc.
│   │   ├── features        # Workout, Nutrition, Health, Analytics
│   │   └── assets
└── docker-compose.yml
```

# Installation

# Clone Repository

```bash
git clone https://github.com/SagarKumar-git/fitnova-ai.git
cd fitnova-ai
```

# Backend Setup

```bash
cd backend
pip install -r requirements.txt
python run.py
```

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

# Author

Sagar Kumar

# Status

Current Version: Phase 3 Completed

Upcoming:
- AI Workout Coach
- AI Nutrition Planner
- AI Progress Insights
- Smart Recommendations
