## 1. Display Fields Definition

- [x] 1.1 Create `convex/lib/displayFields.ts` with iOS display field constants and types
- [x] 1.2 Define `IOS_REQUIRED_DISPLAY_FIELDS` constant array with field names
- [x] 1.3 Define `PLATFORM_DEFAULT_IMAGES` map with default cover images per platform

## 2. Validation Functions

- [x] 2.1 Implement `validateDisplayFields(guide)` function returning `{ isValid, missingFields }`
- [x] 2.2 Add unit tests for validation with various missing field combinations
- [x] 2.3 Export validation function from `packages/crawler-types/src/validators.ts`

## 3. Auto-Fill Functions

- [x] 3.1 Implement `fillMissingDisplayFields(guide)` function in `convex/lib/displayFields.ts`
- [x] 3.2 Add title generation logic: content truncation or default "无标题攻略"
- [x] 3.3 Add coverImageUrl fallback logic: imageUrls[0] or platform default
- [x] 3.4 Add authorName default: "匿名用户"
- [x] 3.5 Add count fields defaults: 0 for all missing counts
- [x] 3.6 Add qualityScore default: 0.5
- [x] 3.7 Add unit tests for auto-fill function

## 4. Upsert Enhancement

- [x] 4.1 Modify `convex/travelGuides.ts` upsert mutation to call `fillMissingDisplayFields`
- [x] 4.2 Ensure existing non-empty values are preserved during upsert
- [x] 4.3 Add integration test for upsert with missing fields

## 5. Query-Time Guarantee

- [x] 5.1 Create `ensureDisplayFields(guide)` wrapper function for query results
- [x] 5.2 Update `getById` query to apply display field guarantee
- [x] 5.3 Update list queries to apply display field guarantee

## 6. Migration Script

- [x] 6.1 Create `convex/migrations/fillDisplayFields.ts` migration script
- [x] 6.2 Implement `run` mutation with cursor-based pagination (batch size 50)
- [x] 6.3 Implement `verify` mutation to check remaining guides with missing fields
- [x] 6.4 Add dry-run support to preview changes before applying

## 7. Testing & Verification

- [x] 7.1 Run all unit tests to ensure no regressions
- [x] 7.2 Deploy to Convex and run migration on test data
- [x] 7.3 Verify iOS App displays guides correctly with filled fields
