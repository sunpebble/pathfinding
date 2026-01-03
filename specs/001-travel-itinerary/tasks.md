# Tasks: 出行攻略 (Travel Itinerary)

**Input**: Design documents from `/specs/001-travel-itinerary/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Tests are NOT included unless explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Mobile app**: `apps/mobile/src/screens/`, `apps/mobile/src/components/`, `apps/mobile/src/services/`
- **Backend API**: `apps/api/src/routes/`, `apps/api/src/services/`, `apps/api/src/models/`
- **Shared code**: `packages/types/src/`, `packages/utils/src/`, `packages/constants/src/`
- **Supabase**: `supabase/migrations/`, `supabase/seed/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Turborepo monorepo with pnpm workspaces at repository root
- [X] T002 [P] Create `apps/mobile` directory with Expo SDK 52 + TypeScript template
- [X] T003 [P] Create `apps/api` directory with Deno + Hono project skeleton
- [X] T004 [P] Create `packages/types` shared TypeScript types package with tsconfig
- [X] T005 [P] Create `packages/utils` shared utilities package with tsconfig
- [X] T006 [P] Create `packages/constants` shared constants package with tsconfig
- [X] T007 Configure Turborepo pipeline with build/dev/lint tasks in turbo.json
- [X] T008 [P] Configure root ESLint with React Native and Deno plugins in eslint.config.js
- [X] T009 [P] Configure root Prettier with consistent formatting in .prettierrc
- [X] T010 [P] Configure Commitlint with conventional commits in commitlint.config.js
- [X] T011 Setup Husky pre-commit hooks for lint-staged in .husky/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Backend Foundation

- [X] T012 Create Supabase project and configure environment variables in .env files
- [X] T013 Create database migration for users table extension in `supabase/migrations/001_create_users.sql`
- [X] T014 Create database migration for cities reference table in `supabase/migrations/002_create_cities.sql`
- [X] T015 Create database migration for POIs table in `supabase/migrations/003_create_pois.sql`
- [X] T016 Create database migration for itineraries table in `supabase/migrations/004_create_itineraries.sql`
- [X] T017 Create database migration for itinerary_days table in `supabase/migrations/005_create_itinerary_days.sql`
- [X] T018 Create database migration for itinerary_items table in `supabase/migrations/006_create_itinerary_items.sql`
- [X] T019 Create database migration for reminders table in `supabase/migrations/007_create_reminders.sql`
- [X] T020 Apply RLS policies for all tables per data-model.md in `supabase/migrations/008_create_rls_policies.sql`
- [X] T021 Create seed data script with sample cities and POIs in `supabase/seed/sample_data.sql`

### Shared Types & Constants

- [X] T022 [P] Define Itinerary, ItineraryDay types in `packages/types/src/itinerary.ts`
- [X] T023 [P] Define ItineraryItem, TransportMode types in `packages/types/src/itinerary-item.ts`
- [X] T024 [P] Define POI, POICategory types in `packages/types/src/poi.ts`
- [X] T025 [P] Define City type in `packages/types/src/city.ts`
- [X] T026 [P] Define Reminder type in `packages/types/src/reminder.ts`
- [X] T027 [P] Define API request/response types in `packages/types/src/api.ts`
- [X] T028 [P] Define POI category constants in `packages/constants/src/categories.ts`
- [X] T029 [P] Define transport mode constants in `packages/constants/src/transportModes.ts`
- [X] T030 [P] Implement timezone utilities in `packages/utils/src/dateUtils.ts`
- [X] T031 [P] Implement distance calculation utilities in `packages/utils/src/geoUtils.ts`

### Backend API Foundation

- [X] T032 Setup Hono app with CORS middleware in `apps/api/src/index.ts`
- [X] T033 [P] Implement JWT auth middleware with Supabase in `apps/api/src/middleware/auth.ts`
- [X] T034 [P] Implement OpenTelemetry tracing middleware in `apps/api/src/middleware/tracing.ts`
- [X] T035 [P] Implement error handling middleware in `apps/api/src/middleware/errorHandler.ts`
- [X] T036 Configure Supabase client singleton in `apps/api/src/lib/supabase.ts`

### Mobile App Foundation

- [X] T037 Configure Expo Router file-based navigation in `apps/mobile/src/app/_layout.tsx`
- [X] T038 [P] Setup Supabase auth provider with session persistence in `apps/mobile/src/providers/AuthProvider.tsx`
- [X] T039 [P] Configure WatermelonDB schema per data-model.md in `apps/mobile/src/database/schema.ts`
- [X] T040 [P] Create WatermelonDB Model classes in `apps/mobile/src/database/models/`
- [X] T041 [P] Initialize WatermelonDB database connection in `apps/mobile/src/database/index.ts`
- [X] T042 [P] Setup Zustand store structure in `apps/mobile/src/store/index.ts`
- [X] T043 Configure Sentry error tracking in `apps/mobile/src/lib/sentry.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 创建出行攻略 (Priority: P1) 🎯 MVP

**Goal**: Users can create a new travel itinerary by selecting destination city and date range, system generates empty timeline framework

**Independent Test**: User creates an itinerary with city "杭州" and dates "2026-01-10 to 2026-01-12", sees 3-day timeline view

### Implementation for User Story 1

#### Backend - US1

- [X] T044 [P] [US1] Define Itinerary model with Zod validation in `apps/api/src/models/itinerary.ts`
- [X] T045 [P] [US1] Define ItineraryDay model with Zod validation in `apps/api/src/models/itineraryDay.ts`
- [X] T046 [US1] Implement ItineraryService.create() with auto day generation in `apps/api/src/services/itineraryService.ts`
- [X] T047 [US1] Implement ItineraryService.list() with pagination in `apps/api/src/services/itineraryService.ts`
- [X] T048 [US1] Implement ItineraryService.getById() with days/items in `apps/api/src/services/itineraryService.ts`
- [X] T049 [US1] Create POST /itineraries endpoint with zValidator in `apps/api/src/routes/itineraries.ts`
- [X] T050 [US1] Create GET /itineraries endpoint with pagination in `apps/api/src/routes/itineraries.ts`
- [X] T051 [US1] Create GET /itineraries/:id endpoint in `apps/api/src/routes/itineraries.ts`

#### Mobile - US1

- [X] T052 [P] [US1] Create itineraryStore with Zustand in `apps/mobile/src/store/itineraryStore.ts`
- [X] T053 [US1] Implement itineraryService.create() API call in `apps/mobile/src/services/itineraryService.ts`
- [X] T054 [US1] Implement itineraryService.list() API call in `apps/mobile/src/services/itineraryService.ts`
- [X] T055 [US1] Implement itineraryService.getById() API call in `apps/mobile/src/services/itineraryService.ts`
- [X] T056 [P] [US1] Create CityPicker component with search in `apps/mobile/src/components/itinerary/CityPicker.tsx`
- [X] T057 [P] [US1] Create DateRangePicker component in `apps/mobile/src/components/itinerary/DateRangePicker.tsx`
- [X] T058 [P] [US1] Create ItineraryCard component for list in `apps/mobile/src/components/itinerary/ItineraryCard.tsx`
- [X] T059 [P] [US1] Create TimelineView component (empty state) in `apps/mobile/src/components/itinerary/TimelineView.tsx`
- [X] T060 [P] [US1] Create DaySection component for timeline in `apps/mobile/src/components/itinerary/DaySection.tsx`
- [X] T061 [US1] Create CreateItineraryScreen with form in `apps/mobile/src/screens/itinerary/CreateItineraryScreen.tsx`
- [X] T062 [US1] Create ItineraryListScreen with FlatList in `apps/mobile/src/screens/itinerary/ItineraryListScreen.tsx`
- [X] T063 [US1] Create ItineraryDetailScreen with TimelineView in `apps/mobile/src/screens/itinerary/ItineraryDetailScreen.tsx`
- [X] T064 [US1] Configure Expo Router routes for itinerary screens in `apps/mobile/src/app/(tabs)/itinerary/`

#### Offline Support - US1

- [X] T065 [US1] Implement offline itinerary creation in WatermelonDB in `apps/mobile/src/services/offlineItineraryActions.ts`
- [X] T066 [US1] Implement useOfflineSync hook for itineraries in `apps/mobile/src/hooks/useOfflineSync.ts`
- [X] T067 [US1] Add offline indicator UI to `apps/mobile/src/components/common/OfflineIndicator.tsx`

**Checkpoint**: User Story 1 complete - users can create itineraries and see timeline

---

## Phase 4: User Story 2 - 添加景点/美食到行程 (Priority: P1)

**Goal**: Users can add POI items to timeline with time slot and notes, detect time conflicts

**Independent Test**: User adds "西湖" to Day 1 with time "09:00-12:00", sees item card on timeline with conflict detection

### Implementation for User Story 2

#### Backend - US2

- [X] T068 [P] [US2] Define ItineraryItem model with Zod in `apps/api/src/models/itineraryItem.ts`
- [X] T069 [P] [US2] Define POI model with Zod in `apps/api/src/models/poi.ts`
- [X] T070 [US2] Implement POIService.search() with keyword matching in `apps/api/src/services/poiService.ts`
- [X] T071 [US2] Implement ItemService.create() with conflict detection in `apps/api/src/services/itineraryItemService.ts`
- [X] T072 [US2] Implement ItemService.list() for day items in `apps/api/src/services/itineraryItemService.ts`
- [X] T073 [US2] Create GET /pois/search endpoint in `apps/api/src/routes/pois.ts`
- [X] T074 [US2] Create POST /itineraries/:id/days/:dayId/items endpoint in `apps/api/src/routes/itinerary-items.ts`
- [X] T075 [US2] Create GET /itineraries/:id/days/:dayId/items endpoint in `apps/api/src/routes/itinerary-items.ts`

#### Mobile - US2

- [X] T076 [P] [US2] Create POICard component with rating display in `apps/mobile/src/components/poi/POICard.tsx`
- [X] T077 [P] [US2] Create RatingStars component in `apps/mobile/src/components/poi/RatingStars.tsx`
- [X] T078 [P] [US2] Create TimeSlotPicker component in `apps/mobile/src/components/itinerary/TimeSlotPicker.tsx`
- [X] T079 [P] [US2] Create ItineraryItemCard component in `apps/mobile/src/components/itinerary/ItineraryItemCard.tsx`
- [X] T080 [P] [US2] Create TimeConflictAlert component in `apps/mobile/src/components/itinerary/TimeConflictAlert.tsx`
- [X] T081 [US2] Implement poiService.search() API call in `apps/mobile/src/services/poiService.ts`
- [X] T082 [US2] Implement itineraryService.addItem() with conflict check in `apps/mobile/src/services/itineraryService.ts`
- [X] T083 [US2] Create POISearchScreen with search input in `apps/mobile/src/screens/poi/POISearchScreen.tsx`
- [X] T084 [US2] Create AddItemScreen with time/notes form in `apps/mobile/src/screens/itinerary/AddItemScreen.tsx`
- [X] T085 [US2] Update TimelineView to display ItineraryItemCards in `apps/mobile/src/components/itinerary/TimelineView.tsx`
- [X] T086 [US2] Implement useItinerary hook with item management in `apps/mobile/src/hooks/useItinerary.ts`

#### Offline Support - US2

- [X] T087 [US2] Implement offline item creation in WatermelonDB in `apps/mobile/src/database/actions/itemActions.ts`
- [X] T088 [US2] Cache POI search results locally in `apps/mobile/src/database/actions/itemActions.ts`

**Checkpoint**: User Story 2 complete - users can add POIs to timeline with conflict warnings

---

## Phase 5: User Story 3 - 按评分推荐景点/美食 (Priority: P2)

**Goal**: Users see POI recommendations sorted by rating, filter by category, with nearby GPS-based suggestions

**Independent Test**: User views recommendations for 杭州, sees attractions sorted by rating, can switch to restaurants

### Implementation for User Story 3

#### Backend - US3

- [X] T089 [US3] Implement RecommendationService.getByRating() in `apps/api/src/services/poiService.ts` (already in poiService.getRecommendations)
- [X] T090 [US3] Implement RecommendationService.getNearby() with geo query in `apps/api/src/services/poiService.ts` (already in poiService.getNearby)
- [X] T091 [US3] Create GET /pois/recommend endpoint with category filter in `apps/api/src/routes/pois.ts`
- [X] T092 [US3] Create GET /pois/nearby endpoint with lat/lng params in `apps/api/src/routes/pois.ts`

#### Mobile - US3

- [X] T093 [P] [US3] Create CategoryFilter component (tabs) in `apps/mobile/src/components/poi/CategoryFilter.tsx`
- [X] T094 [P] [US3] Create SortSelector component in `apps/mobile/src/components/poi/SortSelector.tsx`
- [X] T095 [US3] Implement poiService.getRecommendations() API call in `apps/mobile/src/services/poiService.ts`
- [X] T096 [US3] Implement poiService.getNearby() with GPS in `apps/mobile/src/services/poiService.ts`
- [X] T097 [US3] Create POIRecommendScreen with category tabs in `apps/mobile/src/screens/poi/POIRecommendScreen.tsx`
- [X] T098 [US3] Implement location permission request flow in `apps/mobile/src/hooks/useLocation.ts`
- [X] T098a [US3] Create GPSPermissionModal with consent explanation in `apps/mobile/src/components/common/GPSPermissionModal.tsx`
- [X] T098b [US3] Implement location consent tracking in AsyncStorage in `apps/mobile/src/lib/locationConsent.ts`
- [X] T099 [US3] Add "推荐" tab to add-poi.tsx navigation (integrated search + recommend tabs)

**Checkpoint**: User Story 3 complete - users can browse recommendations by rating

---

## Phase 6: User Story 4 - 一键复制博主攻略 (Priority: P2)

**Goal**: Users can copy community-shared itineraries to their collection with new date selection

**Independent Test**: User copies "杭州 3 日游" itinerary, sees full copy in "我的攻略" with new dates

### Implementation for User Story 4

#### Backend - US4

- [X] T100 [US4] Implement ItineraryService.copy() with date adjustment in `apps/api/src/services/itineraryService.ts`
- [X] T101 [US4] Implement ItineraryService.listPublic() for discovery in `apps/api/src/services/itineraryService.ts`
- [X] T102 [US4] Create POST /itineraries/:id/copy endpoint in `apps/api/src/routes/itineraries.ts`
- [X] T103 [US4] Create GET /itineraries/public endpoint for community in `apps/api/src/routes/itineraries.ts`

#### Mobile - US4

- [X] T104 [P] [US4] Create CommunityItineraryCard component in `apps/mobile/src/components/community/CommunityItineraryCard.tsx`
- [X] T105 [P] [US4] Create CopyDatePicker modal component in `apps/mobile/src/components/itinerary/CopyDatePicker.tsx`
- [X] T106 [US4] Implement itineraryService.copy() API call in `apps/mobile/src/services/itineraryService.ts`
- [X] T107 [US4] Implement itineraryService.listPublic() API call in `apps/mobile/src/services/itineraryService.ts`
- [X] T108 [US4] Create CommunityScreen with public itineraries in `apps/mobile/src/screens/community/CommunityScreen.tsx`
- [X] T109 [US4] Add copy flow to explore.tsx (community tab) with CopyDatePicker integration

**Checkpoint**: User Story 4 complete - users can copy community itineraries

---

## Phase 7: User Story 5 - 编辑行程项目 (Priority: P2)

**Goal**: Users can drag-drop reorder items, edit time/notes, delete items with undo support

**Independent Test**: User drags item 3 to position 1, sees reordered timeline, can undo the change

### Implementation for User Story 5

#### Backend - US5

- [X] T110 [US5] Implement ItemService.update() in `apps/api/src/services/itineraryItemService.ts`
- [X] T111 [US5] Implement ItemService.delete() in `apps/api/src/services/itineraryItemService.ts`
- [X] T112 [US5] Implement ItemService.reorder() bulk update in `apps/api/src/services/itineraryItemService.ts`
- [X] T113 [US5] Create PATCH /itineraries/:id/days/:dayId/items/:itemId endpoint in `apps/api/src/routes/itinerary-items.ts`
- [X] T114 [US5] Create DELETE /itineraries/:id/days/:dayId/items/:itemId endpoint in `apps/api/src/routes/itinerary-items.ts`
- [X] T115 [US5] Create POST /itineraries/:id/days/:dayId/items/reorder endpoint in `apps/api/src/routes/itinerary-items.ts`

#### Mobile - US5

- [X] T116 [P] [US5] Create DraggableItem wrapper with Reanimated in `apps/mobile/src/components/itinerary/DraggableItem.tsx`
- [X] T117 [P] [US5] Create EditItemModal component in `apps/mobile/src/components/itinerary/EditItemModal.tsx`
- [X] T118 [P] [US5] Create UndoSnackbar component in `apps/mobile/src/components/common/UndoSnackbar.tsx`
- [X] T119 [US5] Implement useDragReorder hook with Sortable in `apps/mobile/src/hooks/useDragReorder.ts`
- [X] T120 [US5] Implement undo/redo stack in itineraryStore in `apps/mobile/src/store/itineraryStore.ts`
- [X] T121 [US5] Update TimelineView with drag-drop support using react-native-reanimated-dnd
- [X] T122 [US5] Implement item edit flow in ItineraryDetailScreen
- [X] T123 [US5] Implement swipe-to-delete on ItineraryItemCard

#### Offline Support - US5

- [X] T124 [US5] Implement offline reorder sync in WatermelonDB in `apps/mobile/src/database/actions/itemActions.ts`

**Checkpoint**: User Story 5 complete - users can edit and reorder items with drag-drop

---

## Phase 8: User Story 6 - 出行方式规划 (Priority: P3)

**Goal**: Users can set transport mode between items, see time/distance estimates, deep link to navigation apps

**Independent Test**: User sets "打车" between 西湖 and 雷峰塔, sees "约 15 分钟", taps to open 滴滴

### Implementation for User Story 6

#### Backend - US6

- [X] T125 [US6] Implement TransportService.calculateRoute() with external API in `apps/api/src/services/transportService.ts`
- [X] T126 [US6] Add transport_mode, transport_minutes to item update in `apps/api/src/services/itineraryItemService.ts`

#### Mobile - US6

- [X] T127 [P] [US6] Create TransportBadge component with mode icons in `apps/mobile/src/components/itinerary/TransportBadge.tsx`
- [X] T128 [P] [US6] Create TransportModePicker component in `apps/mobile/src/components/itinerary/TransportModePicker.tsx`
- [X] T129 [US6] Implement deepLinkService for Didi/Gaode in `apps/mobile/src/services/deepLinkService.ts`
- [X] T130 [US6] Add transport mode selector to EditItemModal
- [X] T131 [US6] Display TransportBadge between consecutive items in TimelineView
- [X] T132 [US6] Implement "去打车"/"导航" button actions with deep links

**Checkpoint**: User Story 6 complete - users can plan transport between POIs

---

## Phase 9: User Story 7 - 行程提醒 (Priority: P3)

**Goal**: Users can set reminders for items, receive push notifications at scheduled time

**Independent Test**: User sets "提前 30 分钟提醒" for 西湖 09:00, receives push at 08:30

### Implementation for User Story 7

#### Backend - US7

- [X] T133 [P] [US7] Define Reminder model with Zod in `apps/api/src/models/reminder.ts`
- [X] T134 [US7] Implement ReminderService.schedule() in `apps/api/src/services/reminderService.ts`
- [X] T135 [US7] Implement ReminderService.cancel() in `apps/api/src/services/reminderService.ts`
- [X] T136 [US7] Create POST /items/:itemId/reminders endpoint in `apps/api/src/routes/reminders.ts`
- [X] T137 [US7] Create DELETE /reminders/:id endpoint in `apps/api/src/routes/reminders.ts`
- [X] T138 [US7] Implement reminder cron job with Supabase Edge Function in `supabase/functions/send-reminders/`

#### Mobile - US7

- [X] T139 [P] [US7] Create ReminderPicker component in `apps/mobile/src/components/itinerary/ReminderPicker.tsx`
- [X] T140 [US7] Configure expo-notifications for push in `apps/mobile/src/lib/notifications.ts`
- [X] T141 [US7] Implement reminderService.schedule() API call in `apps/mobile/src/services/reminderService.ts`
- [X] T142 [US7] Add reminder toggle to EditItemModal
- [X] T143 [US7] Handle notification permissions and token registration

**Checkpoint**: User Story 7 complete - users can set and receive reminders

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T144 [P] Implement pull-to-refresh on ItineraryListScreen
- [X] T145 [P] Add loading skeletons for all screens
- [X] T146 [P] Implement empty state illustrations
- [X] T147 [P] Add haptic feedback for drag-drop interactions
- [X] T148 Implement full WatermelonDB sync adapter with conflict resolution in `apps/mobile/src/services/offlineSync.ts`
- [X] T149 Performance optimization: virtualized timeline for 10+ items
- [X] T150 [P] Add comprehensive error boundaries in mobile app
- [X] T151 [P] Document API endpoints in README.md
- [X] T152 Run quickstart.md validation end-to-end
- [X] T153 Security review: verify RLS policies and input sanitization

### NFR Validation (Non-Functional Requirements)

- [X] T154 [NFR-001] Validate itinerary list load time < 2s on 4G network in `apps/mobile/__tests__/performance/loadTime.test.ts`
- [X] T155 [NFR-002] Test offline cache supports 10+ itineraries with full POI data in `apps/mobile/__tests__/offline/cacheCapacity.test.ts`
- [X] T156 [NFR-003] Validate drag-drop maintains 60fps with Reanimated performance profiler
- [X] T157 [NFR-004] Add API response size middleware (warn if > 100KB) in `apps/api/src/middleware/responseSizeLimit.ts`
- [X] T158 [NFR-005] Validate push notification delivery latency < 30s in `supabase/functions/send-reminders/__tests__/latency.test.ts`
- [X] T159 [NFR] Test offline sync conflict resolution (last-write-wins) in `apps/mobile/__tests__/offline/conflictResolution.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
- **Polish (Phase 10)**: Depends on User Stories 1-5 being complete

### User Story Dependencies

| Story          | Dependencies              | Can Parallelize With |
| -------------- | ------------------------- | -------------------- |
| US1 (创建攻略) | Foundational only         | -                    |
| US2 (添加景点) | US1 完成后                | US3, US4             |
| US3 (推荐景点) | US2 完成后 (需要添加功能) | US4, US5             |
| US4 (复制攻略) | US1 完成后                | US3, US5             |
| US5 (编辑行程) | US2 完成后                | US3, US4             |
| US6 (出行方式) | US5 完成后 (需要编辑功能) | US7                  |
| US7 (行程提醒) | US2 完成后                | US6                  |

### Within Each User Story

- Backend models before services
- Backend services before routes
- Mobile components can parallelize
- Mobile screens depend on components and services
- Offline support after main implementation

### Parallel Opportunities

**Phase 2 Parallelization:**

```bash
# Database migrations must be sequential (T012-T021)
# But these can all run in parallel:
T022, T023, T024, T025, T026, T027  # Shared types
T028, T029, T030, T031              # Constants & utils
T033, T034, T035                    # Backend middleware
T038, T039, T040, T041, T042, T043  # Mobile foundation
```

**Phase 3 (US1) Parallelization:**

```bash
# Backend: T044, T045 in parallel → T046-T048 → T049-T051
# Mobile: T052, T056, T057, T058, T059, T060 in parallel → T061-T064
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (~1 day)
2. Complete Phase 2: Foundational (~3 days)
3. Complete Phase 3: US1 创建攻略 (~2 days)
4. Complete Phase 4: US2 添加景点 (~2 days)
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy MVP: Users can create itineraries and add POIs

### Incremental Delivery

| Release | Stories     | Value Delivered    |
| ------- | ----------- | ------------------ |
| MVP     | US1 + US2   | 创建行程、添加景点 |
| v1.1    | + US3 + US5 | 推荐功能、拖拽编辑 |
| v1.2    | + US4       | 社区复制           |
| v1.3    | + US6 + US7 | 出行方式、提醒功能 |

### Parallel Team Strategy

With 2 developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Backend) → US2 (Backend) → US3
   - Developer B: US1 (Mobile) → US2 (Mobile) → US4
3. Sync points at each User Story completion

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All tasks include exact file paths for implementation clarity
- Offline support tasks (WatermelonDB) can be deferred to after MVP if needed
