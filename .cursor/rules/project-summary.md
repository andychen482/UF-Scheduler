# UF Scheduler - Project Documentation & Rules

## Project Overview
UF Scheduler (https://ufscheduler.com) is a comprehensive schedule planning application for University of Florida students. It provides intelligent course scheduling with automatic conflict detection, prerequisite visualization, model semester plans, and an interactive campus map.

**Tech Stack:**
- Frontend: React 18.2, TypeScript 4.9
- UI Libraries: Material-UI (@mui/material), DevExpress Scheduler
- State Management: Zustand, React hooks, localStorage
- Routing: React Router v6
- Styling: Tailwind CSS, custom CSS
- Graph Visualization: Cytoscape.js with Klay layout
- Map: Mapbox GL
- Real-time: Socket.io-client
- API Communication: Axios
- Analytics: Google Analytics 4 (react-ga4)
- Authentication: Google OAuth (@react-oauth/google)
- Backend API: Flask (Python) at api.ufscheduler.com

## Core Architecture

### Application Structure
```
src/
├── App.tsx                    # Root component with routing
├── index.tsx                  # Entry point with GA initialization
├── pages/                     # Route pages
│   ├── Main/Main.tsx         # Main application page (default route)
│   ├── HomePage.tsx          # Marketing/landing page (commented out)
│   ├── About/About.tsx       # About page
│   └── Privacy Policy/       # Privacy policy page
├── components/               # Reusable components
│   ├── Calendar/            # Schedule calendar with conflict detection
│   ├── Cytoscape/           # Prerequisite graph visualization
│   ├── MapBox/              # Interactive campus map
│   ├── ModelPlan/           # Model semester plans by major
│   ├── CoursesHandler/      # Course search and selection
│   ├── CourseUI/            # Course display components
│   ├── Chat/                # Live chat with Socket.io
│   ├── Header/              # Navigation header
│   └── Footer/              # Footer component
├── courses/                  # Static course data
│   └── depts_clean.json     # Department information
└── data/                     # Static data files
    ├── buildingCoords.json  # Building locations
    ├── fullTables.json      # Model semester plans
    ├── parking_polys.json   # Parking area polygons
    └── scooterParking.json  # Scooter parking locations
```

### Main Application Flow (Main.tsx)

**State Management:**
- `selectedCourses`: Array of Course objects selected by user (persisted per term/year)
- `selectedMajor`: Currently selected major for prerequisite graph
- `customAppointments`: User-created calendar events (persisted per term/year)
- `currentView`: Active view ('calendar' | 'graph' | 'map' | 'plan')
- `term` & `year`: Current semester selection (e.g., "spring", "26")
- `searchTerm` & `debouncedSearchTerm`: Course search state

**Key Features:**
1. **Term-based Storage**: All course selections and custom events are stored per term/year in localStorage
   - Format: `selectedCourses_${term}_${year}`, `customAppointments_${term}_${year}`
   - Switching terms loads the appropriate saved state

2. **Responsive Design**: 
   - Window width tracking (<1001px triggers mobile drawer)
   - Drawer overlay for mobile course selection

3. **Live Chat**: 
   - Socket.io real-time chat with Google OAuth
   - Active user count display
   - New message notifications

4. **Version Management**: localStorage version control for clearing outdated data

## Core Components Deep Dive

### 1. Calendar Component (components/Calendar/Calendar.tsx)

**Purpose:** Generate and display all non-overlapping schedule combinations from selected courses.

**Key Algorithm:**
1. **Section Selection**: For each course, either use the specifically selected section OR all sections with meetTimes
2. **Combination Generation**: Generate Cartesian product of all possible section combinations
3. **Conflict Detection**: Use Interval Tree (@flatten-js/interval-tree) to detect time overlaps
4. **Infinite Scroll**: Progressively generate and render valid schedules (5 at a time)

**Features:**
- **Sorting Options**: Earliest/Latest Start/End, Most Compact
- **ICS Export**: Generate .ics calendar files with recurring events (RRULE)
- **Custom Appointments**: Add personal events that participate in conflict detection
- **Selected Calendar**: Save preferred schedule (persisted per term)
- **Online Course Detection**: Display message for courses without meetTimes
- **Dynamic Time Bounds**: Calendar view adjusts to earliest/latest class times

**Data Flow:**
```typescript
Course[] → Section[][] → combinations (Cartesian product)
  → filter by interval tree (no overlaps)
  → render with DevExpress Scheduler
```

**Day Mapping:** Days coded as M/T/W/R/F map to next week's dates for recurring calendar

### 2. Courses Handler (components/CoursesHandler/)

**CoursesHandler.tsx**: Container managing course search and display
- Integrates CourseSearch (search input) and ShowFilteredCourses (results)
- Persists selectedMajor to localStorage

**CourseSearch.tsx**: Search interface with term selector
- Real-time search input with debouncing
- Term/year dropdown (Spring 26, Fall 25, Summer 25)
- Enter key triggers search and metrics logging

**ShowFilteredCourses.tsx**: Course results display
- **Infinite Scroll**: Load 20 courses at a time from backend
- **Lazy Loading**: POST to `api.ufscheduler.com/api/get_courses` with pagination
- **Course Grouping**: Group by `${code}|${name}` key
- **Actions**:
  - Plus icon: Add all sections
  - Video slash icon: Add only in-person sections (filters out online)
  - Expand/collapse: Show section details
- **Credits Editing**: Inline editing for variable credit courses
- **Color Assignment**: ColorHash generates consistent colors per course

**LikedSelectedCourses.tsx**: Left sidebar displaying selected courses
- Drag-and-drop to reorder
- Remove courses with minus icon
- Download selected schedule as ICS
- Customize section selection per course

### 3. Prerequisite Graph (components/Cytoscape/Graph.tsx)

**Purpose:** Visualize course prerequisite relationships using directed graph.

**Implementation:**
- **Library**: Cytoscape.js with Klay hierarchical layout
- **Backend**: POST to `api.ufscheduler.com/generate_a_list` with:
  - selectedMajor: Major code for full prerequisite tree
  - selectedCoursesServ: Array of course codes to highlight
  - term, year: Current semester
- **Response**: GraphData with nodes and edges
- **Styling**:
  - Blue nodes (#0021A5), orange for selected (#FA4616)
  - Directed edges with triangular arrows
  - Orthogonal edge routing
- **Interaction**:
  - Click node → populate search with that course
  - Mouse/touch pan (different controls for mobile vs desktop)
  - Scroll wheel zoom centered on cursor
- **Storage**: Graph data cached in localStorage as "graphData"

### 4. Interactive Map (components/MapBox/Map.tsx)

**Purpose:** Show class locations on campus with walking/biking/scooter routing.

**Features:**
1. **Building Locations**: Load from buildingCoords.json
2. **Selected Course Mapping**: Extract meetBuilding codes from selectedCourses, plot on map
3. **Isochrone Layers**: 15-minute travel time polygons for each class location
   - Color-coded by course color
   - Switchable transport modes: walking, biking, scooter
4. **Day Filter**: Filter classes by day of week (M/T/W/R/F)
5. **Parking Overlays**: 
   - Vehicle parking polygons (parking_polys.json)
   - Scooter parking markers (scooterParking.json)
6. **Fullscreen Mode**: Expand map to full viewport (large screens only)
7. **Mapbox API**: Fetch isochrones from Mapbox Isochrone API

**Data Sources:**
- buildingCoords.json: {features: {[buildingCode]: {properties: {PropName, Longitude, Latitude}}}}
- selectedCourses → sections → meetTimes → meetBldgCode

### 5. Model Semester Plans (components/ModelPlan/ModelPlan.tsx)

**Purpose:** Display recommended 8-semester course plans for each major.

**Data Source:** fullTables.json 
- Format: {[majorName]: Array<{["Semester One"]: string, ["Semester One.1"]: string, Credits: string}>}
- Each major has array of rows representing semester-by-semester courses

**Features:**
- Major dropdown with react-select
- Dynamic table rendering with merged cells for semester headers
- Alternating row colors (black / rgb(28,28,28))
- Credits column
- Persists selected major to localStorage as "selectedMajorPlan"
- Sends major selection metrics to backend

### 6. Live Chat (components/Chat/LiveChat.tsx)

**Purpose:** Real-time chat for students to communicate and help each other.

**Implementation:**
- **Socket.io Client**: Connect to backend Socket.io server
- **Authentication**: Google OAuth with @react-oauth/google
- **Username**: Custom username stored in DynamoDB, linked to Google sub (user ID)
- **Message Persistence**: Messages loaded from DynamoDB, infinite scroll for history
- **Active Users**: Real-time count broadcast via socket events
- **Events**:
  - "receive message": New message broadcast
  - "load messages": Paginated message history
  - "active users": User count updates
- **Unread Messages**: Badge notification when chat is closed and new message arrives
- **Auto-scroll**: Scroll to bottom on new messages if user is already at bottom

## Data Models

### Course Type (components/CourseUI/CourseTypes.ts)
```typescript
Course {
  code: string              // e.g., "COP3530"
  name: string             // Full course name
  termInd: string          // Term indicator
  description: string      // Course description
  prerequisites: string    // Prerequisite text
  sections: Section[]      // All available sections
  inPerson: boolean       // Flag for in-person only filter
  creditsEditable: boolean // Allow credit editing
}

Section {
  classNumber: string      // Unique 5-digit class number
  display: string         // Display text
  credits: number | "VAR" // Credit hours
  deptName: string        // Department name
  instructors: Instructor[] // Array of instructors
  meetTimes: MeetingTime[] // Meeting times (empty for online)
  finalExam: string       // Final exam info
  selected: boolean       // User explicitly selected this section
  courseName: string      // Parent course name (added dynamically)
  color: string          // Color for calendar (added dynamically)
  waitList: WaitList     // Waitlist information
  courseCode: string     // Parent course code (added dynamically)
  startDate: string      // Semester start date (MM/DD/YYYY)
  endDate: string        // Semester end date (MM/DD/YYYY)
}

MeetingTime {
  meetDays: string[]         // ["M", "W", "F"]
  meetTimeBegin: string      // "10:40" (24-hour)
  meetTimeEnd: string        // "11:30" (24-hour)
  meetBuilding: string       // Building name
  meetBldgCode: string       // Building code for map
  meetRoom: string | number  // Room number
}

Instructor {
  name: string
  avgRating: number         // RateMyProfessors rating
  avgDifficulty: number     // RateMyProfessors difficulty
  professorID: number       // RateMyProfessors ID
}
```

### Graph Data Type (components/Cytoscape/cytoscapeTypes.ts)
```typescript
GraphData {
  nodes: Array<{data: {id: string}}>  // Course codes
  edges: Array<{data: {source: string, target: string}}>  // Prerequisites
}
```

## State Persistence Strategy

**localStorage Keys:**
- `version`: Integer for clearing outdated data (currently 1)
- `selectedMajor`: Selected major for prerequisite graph
- `selectedMajorPlan`: Selected major for model plan
- `selectedCourses_${term}_${year}`: Array of selected courses (per semester)
- `customAppointments_${term}_${year}`: Array of custom calendar events (per semester)
- `selectedCalendar_${term}_${year}`: User's preferred schedule combination (per semester)
- `graphData`: Cached prerequisite graph data
- `hasClosedChat`: Boolean for chat visibility
- `hasNewMessage`: Boolean for unread message indicator
- `lastReadTimestamp`: ISO timestamp of last chat read
- `hasClickedCalendar`: Boolean to hide tutorial arrow
- `user`: JSON string of Google OAuth user info

**Key Insight:** Term-based keys allow users to maintain separate schedules for different semesters.

## Backend API Endpoints

**Base URL:** https://api.ufscheduler.com (Flask backend)

1. **POST /api/get_courses**
   - Body: {searchTerm, itemsPerPage, startFrom, term, year}
   - Returns: Course[] matching search, paginated
   - Used by: ShowFilteredCourses for infinite scroll

2. **POST /generate_a_list**
   - Body: {selectedMajorServ, selectedCoursesServ[], term, year}
   - Returns: GraphData {nodes, edges}
   - Used by: Graph component for prerequisite visualization

3. **POST /search**
   - Body: {searchTerm}
   - Analytics endpoint for search tracking

4. **POST /major**
   - Body: {major}
   - Analytics endpoint for major selection tracking

5. **POST /course**
   - Body: {courseCode}
   - Analytics endpoint for course addition tracking

**Socket.io Events (wss://api.ufscheduler.com):**
- Emit: "send message" {message, user, timestamp}
- Listen: "receive message" {message, user, timestamp}
- Listen: "load messages" {messages[], lastEvaluatedKey}
- Listen: "active users" {activeUsers: number}

## Development Guidelines

### Code Style
- **TypeScript**: Strict typing, use interfaces for props
- **Functional Components**: Use React hooks, no class components
- **CSS**: Mix of Tailwind utility classes and custom CSS modules
- **Naming**: 
  - Components: PascalCase (e.g., CourseDropdown)
  - Files: Match component name (e.g., CourseDropdown.tsx)
  - CSS: camelCase for style objects, kebab-case for CSS files

### State Management Patterns
1. **Prop Drilling**: State lifted to Main.tsx, passed down through props
2. **localStorage**: Used for persistence, JSON.stringify/parse
3. **useEffect**: For side effects, localStorage sync, API calls
4. **useMemo**: For expensive computations (e.g., grouping courses)
5. **useRef**: For DOM access (map container, scroll position) and avoiding stale closures

### Performance Optimizations
1. **Infinite Scroll**: React-infinite-scroller for calendars and courses
2. **Debouncing**: Search input debounced, calendar generation throttled
3. **Lazy Loading**: Courses loaded in batches of 20
4. **Memoization**: useMemo for filtered/grouped data
5. **Calendar Generation**: Progressive rendering (5 schedules at a time)

### Testing
- Jest with @testing-library/react and @testing-library/user-event
- Test file: components/Calendar/Calendar.test.ts (exists but not comprehensive)

## Key Features & How They Work

### 1. Non-Overlapping Schedule Generation
**Algorithm (Calendar.tsx):**
1. Get all sections for selected courses (or user-selected specific sections)
2. Generate Cartesian product: all possible combinations of sections
3. For each combination:
   - Create Interval Tree
   - For each section's meetTimes:
     - Convert meetDays (M/T/W/R/F) to actual dates
     - Convert meetTimeBegin/End to Date objects
     - Check interval tree for conflicts
     - If conflict found, reject combination and break
     - If no conflict, add to interval tree
   - If all sections added without conflict, save combination
4. Render valid combinations with infinite scroll

**Interval Tree:** O(log n + k) conflict detection where k is number of conflicts

### 2. Course Search & Filtering
**Flow:**
1. User types in CourseSearch input
2. On Enter key: setDebouncedSearchTerm(value)
3. ShowFilteredCourses useEffect triggers on debouncedSearchTerm change
4. POST to backend with search term, pagination params, term, year
5. Backend searches course database (likely PostgreSQL or similar)
6. Frontend receives Course[] and displays with infinite scroll
7. User can add all sections or only in-person sections

**Search Format:** Flexible (course code, name, department)

### 3. Prerequisite Graph Generation
**Flow:**
1. User selects major from dropdown OR selects individual courses
2. Graph component sends selectedMajor + selectedCourses[] to backend
3. Backend (Python):
   - If major provided: fetch full prerequisite tree for that major
   - Parse prerequisite strings into graph structure
   - Identify nodes (courses) and edges (prerequisite relationships)
   - Return GraphData {nodes, edges}
4. Frontend renders with Cytoscape.js using Klay hierarchical layout
5. Selected courses highlighted in orange

**Layout:** Klay algorithm for hierarchical directed graphs
- Direction: LEFT to RIGHT (prerequisites on left)
- Edge routing: ORTHOGONAL (right angles)
- Node layering: NETWORK_SIMPLEX (minimize edge crossings)

### 4. Campus Map with Isochrones
**Flow:**
1. Extract building codes from selectedCourses meetTimes
2. Look up coordinates in buildingCoords.json
3. For each unique building:
   - Fetch 15-minute isochrone from Mapbox API
   - Add as GeoJSON layer with course color
   - Add building marker
4. User can switch transport mode (walking/biking/scooter)
5. On mode change, clear layers and regenerate isochrones
6. Day filter shows only classes meeting on selected day

**Isochrone:** Area reachable within 15 minutes from a point

### 5. ICS Calendar Export
**Format:** iCalendar (.ics) standard
- VCALENDAR container
- VEVENT for each class meeting
- RRULE: FREQ=WEEKLY (recurring weekly)
- UNTIL: Last day of semester
- DTSTART/DTEND: First occurrence date + time
- SUMMARY: Course code
- LOCATION: Building + room

**Date Handling:**
1. Parse firstDay/lastDay from section (MM/DD/YYYY)
2. Find first occurrence of each meetDay after firstDay
3. Set RRULE to repeat weekly until lastDay
4. Most calendar apps (Google, Apple, Outlook) support this format

## Important Conventions

### 1. Course Color Generation
- Uses `color-hash` library for consistent colors
- Input: course code + name
- Output: Deterministic hex color
- Applied to: calendar appointments, map markers, graph nodes

### 2. Day Code Mapping
- M = Monday, T = Tuesday, W = Wednesday, R = Thursday, F = Friday
- **Why R?** Traditional academic notation (T already taken for Tuesday)

### 3. Time Format
- Backend sends: 24-hour format (e.g., "14:30")
- Display: Sometimes converted to 12-hour (convert24to12 function)
- Calendar: Uses ISO 8601 datetime strings (e.g., "2024-01-15T10:40:00")

### 4. Term/Year Format
- Storage: lowercase term, 2-digit year (e.g., "spring", "26")
- Display: Title case with space (e.g., "Spring 26")
- Options: Spring, Summer, Fall

### 5. Credits Handling
- Type: number | "VAR" (variable credit courses)
- Editable: creditsEditable flag allows inline editing
- Sum: Total credits calculated in Header, displayed in top-left

## Environment Variables

**.env (not in repo, required for build):**
- `REACT_APP_GA_TOKEN`: Google Analytics 4 measurement ID
- `REACT_APP_BACKEND_SERVER_IP`: Backend API domain (api.ufscheduler.com)
- `REACT_APP_MAPBOX_ACCESS_TOKEN`: Mapbox API key

## Deployment

**Platform:** GitHub Pages (implied by gh-pages dependency)
- Build: `npm run build`
- Deploy: `npm run deploy` (gh-pages -d build)
- Homepage: https://ufscheduler.com
- CNAME: public/CNAME for custom domain

**Browser Support:**
- Modern browsers (Chrome 51+, Safari 10+, no IE)
- Responsive: Mobile and desktop

## Common Debugging Patterns

### 1. Calendar Not Showing
- Check selectedCourses has sections with meetTimes
- Check allCombinations length > 0
- Check interval tree conflict detection
- Console log: combination being processed, isValidCombination flag

### 2. Graph Not Rendering
- Check graphData is not null
- Check cyContainerRef.current exists
- Check localStorage for cached graphData
- Inspect backend response structure

### 3. Map Markers Missing
- Check meetBldgCode in sections
- Verify buildingCoords.json has matching keys
- Check Mapbox token validity
- Inspect browser console for API errors

### 4. Search Not Working
- Check debouncedSearchTerm is set
- Verify backend endpoint is reachable
- Check term/year params in request
- Inspect network tab for 4xx/5xx errors

### 5. localStorage Issues
- Version mismatch → data cleared
- Check key format includes term/year
- JSON.parse errors → corrupted data → localStorage.removeItem

## Future Enhancement Ideas (Based on Codebase)

1. **Test Coverage**: Expand Calendar.test.ts to other components
2. **Error Boundaries**: Add React error boundaries for graceful failures
3. **Service Worker**: PWA capabilities for offline access
4. **Redux/Context**: Replace prop drilling for cleaner state management
5. **WebSocket Reconnection**: Better handling of chat disconnections
6. **Dark Mode**: Theme toggle (currently only dark theme)
7. **Accessibility**: ARIA labels, keyboard navigation improvements
8. **Multi-Year Planning**: Link multiple semesters, track degree progress
9. **Export Options**: PDF schedule export, shareable links
10. **Professor Ratings**: Inline RateMyProfessors integration (data already available)

## Critical Code Locations

**Schedule Conflict Detection:**
- File: `src/components/Calendar/Calendar.tsx`
- Function: `createCalendars` (lines ~400-492)
- Key: Interval Tree insertion and conflict checking

**Course Search & Pagination:**
- File: `src/components/CoursesHandler/ShowFilteredCourses/ShowFilteredCourses.tsx`
- Function: `loadMore` (lines ~173-200)
- API: POST to /api/get_courses

**Prerequisite Graph:**
- File: `src/components/Cytoscape/Graph.tsx`
- Function: `generateAList` (lines ~332-350)
- API: POST to /generate_a_list

**Map Isochrone Generation:**
- File: `src/components/MapBox/Map.tsx`
- Function: `fetchIsochrone` (lines ~104-166)
- API: Mapbox Isochrone API

**Term Switching Logic:**
- File: `src/pages/Main/Main.tsx`
- Function: `handleTermChange` (lines ~173-216)
- Pattern: Save current state, update term/year, load new state

## Development Commands

```bash
npm start          # Development server (port 3000)
npm run build      # Production build
npm test           # Run tests
npm run deploy     # Deploy to GitHub Pages
npm run eject      # Eject from Create React App (irreversible)
```

## Package Management

**Key Dependencies:**
- Scheduler UI: @devexpress/dx-react-scheduler-material-ui (custom fork from andychen482)
- Graph: cytoscape + cytoscape-klay
- Map: mapbox-gl + react-mapbox-gl
- Date handling: date-fns, moment (consider consolidating)
- Icons: react-icons (FontAwesome, Material, Phosphor)
- HTTP: axios
- Realtime: socket.io-client

**Custom Fork Alert:** DevExpress scheduler uses custom GitHub dependency
- May need manual updates or forking strategy

## Gotchas & Edge Cases

1. **Variable Credit Courses**: Must handle "VAR" type in credit calculations
2. **Online Courses**: Sections with empty meetTimes array require special UI handling
3. **Weekend Dates**: Calendar resets to next Monday if current day is Saturday
4. **Day Mapping**: Uses next week's dates for calendar display (not current week if weekend)
5. **localStorage Limits**: Browser ~5-10MB limit, consider IndexedDB for future
6. **Token Expiry**: Google OAuth tokens expire, need refresh logic
7. **Socket Disconnection**: No automatic reconnection handling yet
8. **Mobile Gestures**: Different pan/zoom controls for touch vs mouse
9. **Fullscreen API**: Browser support varies, has user gesture requirement
10. **ICS Format**: Date parsing sensitive to locale, use specific format (MM/DD/YYYY)

---

## Final Notes

This is a production-grade application with real users, so:
- **Test thoroughly** before deploying
- **Preserve localStorage keys** format for backward compatibility
- **Monitor API rate limits** (Mapbox, Google Auth)
- **Keep dependencies updated** but watch for breaking changes
- **Analytics is important** - don't break GA tracking
- **Accessibility matters** - ensure keyboard navigation works

The codebase shows good React patterns, proper TypeScript usage, and thoughtful UX design. The main complexity lies in the schedule generation algorithm and the interconnected state management across multiple views.

