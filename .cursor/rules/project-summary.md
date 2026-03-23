# UF Scheduler - Project Documentation & Rules

## Project Overview
UF Scheduler (https://ufscheduler.com) is a comprehensive schedule planning application for University of Florida students. It provides intelligent course scheduling with automatic conflict detection, prerequisite visualization, model semester plans, an interactive campus map, live student chat, and an AI course assistant.

**Tech Stack:**
- Frontend: React 18.2, TypeScript 4.9, Create React App
- UI Libraries: Material-UI (@mui/material), DevExpress Scheduler
- State Management: React hooks, localStorage (Zustand in deps but unused)
- Routing: React Router v6
- Styling: Tailwind CSS, custom CSS
- Graph Visualization: Cytoscape.js with Klay layout
- Map: Mapbox GL
- Real-time: SSE via @microsoft/fetch-event-source (replaced Socket.io)
- API Communication: Axios (course data), fetch (backend API)
- Analytics: Google Analytics 4 (react-ga4)
- Authentication: AWS Cognito via react-oidc-context + oidc-client-ts
- Markdown: react-markdown (AI chat output)

## Servers & API Configuration

All API config is centralized in `src/config/api.ts`.

**Two separate servers:**
1. **API Server** (`api.ufscheduler.com`) - Flask backend for course data and schedule generation
2. **Backend Server** (`api.ufscheduler.com` via API Gateway) - FastAPI on ECS for metrics, chat, users, AI assistant

**Config exports from `api.ts`:**
- `cognitoConfig` - OIDC config object consumed by AuthProvider in index.tsx, includes `onSigninCallback`
- `getAuthHeaders(auth)` - Extracts id_token from react-oidc-context auth object, returns `{ Authorization: Bearer <token> }`
- `signOutRedirect()` - Redirects to Cognito hosted UI logout endpoint
- `BACKEND_URLS` - Pre-built URLs for all backend endpoints
- `API_URLS` - Pre-built URLs for course data endpoints

## Authentication

**Provider:** AWS Cognito with OIDC Authorization Code flow via `react-oidc-context`.

**Architecture:**
- `AuthProvider` wraps the entire app in `index.tsx` (makes auth *available* everywhere)
- Auth is **NOT required** for browsing the app (scheduler, about, privacy pages)
- Auth is **required** for: Live Chat, AI Chat Assistant
- Components use `useAuth()` hook to check `auth.isAuthenticated` and get `auth.user?.id_token`

**Callback flow:**
- Cognito redirects to `/callback?code=...&state=...`
- `CallbackPage` component in `App.tsx` renders "Signing in..." (does NOT redirect immediately)
- `AuthProvider` processes the authorization code via `signinCallback()`
- `onSigninCallback` in `cognitoConfig` strips query params via `window.history.replaceState`
- `CallbackPage` re-renders, sees `auth.isAuthenticated`, renders `<Navigate to="/" />`

**Important:** The `/callback` route must NOT use `<Navigate>` directly - it must wait for AuthProvider to process the code first (child effects run before parent effects in React).

**Metrics endpoints** send auth headers when available but fail silently if not authenticated.

## Core Architecture

### Application Structure
```
src/
├── App.tsx                    # Root component with routing + CallbackPage
├── index.tsx                  # Entry point with AuthProvider, GA init
├── config/
│   └── api.ts                # Centralized API config, Cognito config, auth helpers
├── pages/
│   ├── Main/Main.tsx         # Main application page (default route)
│   ├── About/About.tsx       # About page
│   ├── Privacy Policy/       # Privacy policy page
│   └── 404/                  # 404 page
├── components/
│   ├── Calendar/            # Schedule calendar with conflict detection
│   ├── Cytoscape/           # Prerequisite graph visualization
│   ├── MapBox/              # Interactive campus map
│   ├── ModelPlan/           # Model semester plans by major
│   ├── CoursesHandler/      # Course search and selection
│   ├── CourseUI/            # Course display components and types
│   ├── Chat/                # LiveChat (SSE), AIChat (SSE streaming), CSS
│   ├── Header/              # Navigation header
│   └── Footer/              # Footer component
├── courses/                  # Static course data (depts_clean.json)
└── data/                     # Static data (buildingCoords, fullTables, parking, scooter)
```

### Main Application Flow (Main.tsx)

**State Management:**
- `selectedCourses`: Array of Course objects (persisted per term/year in localStorage)
- `selectedMajor`: Currently selected major for prerequisite graph
- `customAppointments`: User-created calendar events (persisted per term/year)
- `currentView`: Active view ('calendar' | 'graph' | 'map' | 'plan')
- `term` & `year`: Current semester selection (e.g., "summer", "26")
- `isChatVisible` / `isAIChatVisible`: Toggle states for chat panels
- `activeUsers`: Real-time count from SSE stream
- `hasNewMessage`: Unread message indicator

**Layout:** Header, content area (CoursesHandler + view panels), Chat panel (bottom-right), AI Chat panel (bottom-left), floating active users count, Footer.

## Backend API Endpoints

### Course Data API (api.ufscheduler.com - Flask)

| Method | Endpoint | Body | Used By |
|--------|----------|------|---------|
| POST | `/api/get_courses` | `{searchTerm, itemsPerPage, startFrom, term, year}` | ShowFilteredCourses |
| POST | `/generate_a_list` | `{selectedMajorServ, selectedCoursesServ[], term, year}` | Graph |

### Backend API (api.ufscheduler.com via API Gateway - FastAPI)

All endpoints (except `/health`) require `Authorization: Bearer <id_token>` header.

| Method | Endpoint | Body / Params | Purpose |
|--------|----------|---------------|---------|
| GET | `/users/me` | - | Get user profile (sub, username, email, name, profile_pic, created_at) |
| POST | `/users/username` | `{username}` | Set username (identity from JWT, no googleId/email/name needed) |
| GET | `/messages` | `?last_evaluated_key=JSON` | Load chat messages (paginated) |
| GET | `/messages/stream` | SSE stream | Real-time messages + active user count |
| POST | `/messages` | `{message}` | Send chat message (sender from JWT, returns 403 if no username) |
| POST | `/chat` | `{prompt, session_id?}` | AI assistant (SSE streaming response) |
| DELETE | `/chat/{session_id}` | - | Delete AI chat session |
| POST | `/metrics/search` | `{search_term}` | Search analytics (note: snake_case key) |
| POST | `/metrics/course` | `{code, name}` | Course addition analytics |
| POST | `/metrics/major` | `{major}` | Major selection analytics |

### SSE Event Types

**`/messages/stream`** (live chat):
- `message` → `{id, message, user, timestamp}`
- `active_users` → `{active_users: number}` (snake_case)

**`/chat`** (AI assistant):
- `token` → `{token, session_id}` (each streamed token)
- `done` → `{session_id}` (response complete)
- `error` → `{detail}` (error occurred)

## Core Components

### Calendar (components/Calendar/Calendar.tsx)
Generates all non-overlapping schedule combinations from selected courses using Interval Tree (@flatten-js/interval-tree) for O(log n + k) conflict detection. Supports ICS export, custom appointments, sorting (earliest/latest start/end, most compact), and infinite scroll rendering.

### Courses Handler (components/CoursesHandler/)
- **CourseSearch.tsx**: Search input with term selector, sends `search_term` metrics
- **ShowFilteredCourses.tsx**: Infinite scroll course results with add/remove, color-coded
- **LikedSelectedCourses.tsx**: Sidebar with selected courses, drag-to-reorder, ICS download
- **CoursesHandler.tsx**: Container orchestrating search and display

### Prerequisite Graph (components/Cytoscape/Graph.tsx)
Cytoscape.js with Klay hierarchical layout. Blue nodes (#0021A5), orange for selected (#FA4616). Click node to search for that course.

### Interactive Map (components/MapBox/Map.tsx)
Mapbox GL with building markers from selectedCourses, 15-min isochrone layers (walking/biking/scooter), day filter, parking overlays, fullscreen mode.

### Model Plans (components/ModelPlan/ModelPlan.tsx)
8-semester course plans by major from fullTables.json. React-select dropdown, dynamic table.

### Live Chat (components/Chat/LiveChat.tsx)
Real-time student chat using SSE + REST (replaced Socket.io).
- **Auth**: Requires Cognito sign-in via `useAuth()`. Shows "Sign in to chat" button if not authenticated.
- **Receiving**: SSE stream via `fetchEventSource` to `/messages/stream` for real-time messages and active user count.
- **Sending**: POST to `/messages` with `{message}` only (server identifies sender from JWT).
- **History**: GET `/messages?last_evaluated_key=...` for paginated loading on scroll-to-top.
- **Username**: Fetched from `GET /users/me`, set via `POST /users/username` with `{username}` only.
- **Unread tracking**: localStorage `lastReadTimestamp`, badge notification when chat is closed.

### AI Chat Assistant (components/Chat/AIChat.tsx)
AI course assistant using SSE streaming.
- **Auth**: Requires Cognito sign-in.
- **Streaming**: POST to `/chat` with `{prompt, session_id?}` via `fetchEventSource`. Tokens streamed and rendered incrementally with blinking cursor.
- **Markdown**: Assistant responses rendered via `react-markdown` with dark-theme CSS styling.
- **Sessions**: Maintains `session_id` for conversation continuity. "New Chat" button calls `DELETE /chat/{session_id}`.
- **UI**: Bottom-left panel with toggle button (star icon).

## Data Models

### Course Type (components/CourseUI/CourseTypes.ts)
```typescript
Course { code, name, termInd, description, prerequisites, sections: Section[], inPerson, creditsEditable }
Section { classNumber, display, credits: number|"VAR", deptName, instructors: Instructor[], meetTimes: MeetingTime[], finalExam, selected, courseName, color, waitList, courseCode, startDate, endDate }
MeetingTime { meetDays: string[], meetTimeBegin, meetTimeEnd, meetBuilding, meetBldgCode, meetRoom }
Instructor { name, avgRating, avgDifficulty, professorID }
```

## Environment Variables

**.env (required for build):**
- `REACT_APP_GA_TOKEN` - Google Analytics 4 measurement ID
- `REACT_APP_API_SERVER_IP` - Course data API domain
- `REACT_APP_BACKEND_SERVER_IP` - Backend API domain (API Gateway)
- `REACT_APP_MAPBOX_ACCESS_TOKEN` - Mapbox API key
- `REACT_APP_COGNITO_AUTHORITY` - Cognito user pool OIDC issuer URL
- `REACT_APP_COGNITO_CLIENT_ID` - Cognito app client ID
- `REACT_APP_COGNITO_REDIRECT_URI` - OIDC redirect URI (e.g., `http://localhost:3000/callback`)
- `REACT_APP_COGNITO_DOMAIN` - Cognito hosted UI domain (for logout redirect)
- `REACT_APP_COGNITO_LOGOUT_URI` - Post-logout redirect URI

## State Persistence (localStorage)

| Key | Value |
|-----|-------|
| `version` | Integer for clearing outdated data |
| `selectedMajor` | Major for prerequisite graph |
| `selectedMajorPlan` | Major for model plan |
| `selectedCourses_${term}_${year}` | Selected courses array (per semester) |
| `customAppointments_${term}_${year}` | Custom calendar events (per semester) |
| `selectedCalendar_${term}_${year}` | Preferred schedule combination |
| `graphData` | Cached prerequisite graph |
| `hasClosedChat` | Chat panel visibility |
| `hasNewMessage` | Unread message indicator |
| `lastReadTimestamp` | ISO timestamp of last chat read |
| `hasClickedCalendar` | Tutorial arrow dismissed |

## Development

```bash
npm start          # Development server (port 3000)
npm run build      # Production build (CI=false to ignore warnings)
npm run deploy     # Deploy to GitHub Pages
```

**Key conventions:**
- Day codes: M/T/W/R/F (R = Thursday)
- Time format: 24-hour from backend, sometimes converted to 12-hour for display
- Term/year: lowercase term + 2-digit year (e.g., "spring", "26")
- Credits: `number | "VAR"` for variable credit courses
- Colors: `color-hash` library generates deterministic hex from course code+name
- Custom fork: DevExpress scheduler uses `github:andychen482/scheduler-material-ui`

**Gotchas:**
- Variable credit courses need "VAR" type handling
- Online courses have empty meetTimes arrays
- Calendar resets to next Monday if current day is weekend
- `--legacy-peer-deps` flag required for npm install (DevExpress peer dep conflict)
- The `/callback` route must render a waiting component, not `<Navigate>` directly
