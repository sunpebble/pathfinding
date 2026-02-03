## ADDED Requirements

### Requirement: iOS Display Fields Definition
The system SHALL define a canonical list of fields required for iOS App display, including: `title`, `coverImageUrl`, `authorName`, `destinations`, `likesCount`, `savesCount`, `commentsCount`, `viewsCount`, and `qualityScore`.

#### Scenario: Field list is accessible
- **WHEN** any component needs to validate display fields
- **THEN** the canonical field list SHALL be available as a typed constant

### Requirement: Display Field Validation
The system SHALL provide a validation function that checks whether a travel guide has all required display fields populated with non-empty values.

#### Scenario: Guide with all fields present
- **WHEN** a guide has title, coverImageUrl, authorName, and all count fields
- **THEN** validation SHALL return `{ isValid: true, missingFields: [] }`

#### Scenario: Guide with missing title
- **WHEN** a guide has `title` as undefined or empty string
- **THEN** validation SHALL return `{ isValid: false, missingFields: ['title'] }`

#### Scenario: Guide with missing cover image
- **WHEN** a guide has `coverImageUrl` as undefined and `imageUrls` is empty
- **THEN** validation SHALL return `{ isValid: false, missingFields: ['coverImageUrl'] }`

### Requirement: Display Field Auto-Fill
The system SHALL provide an auto-fill function that generates reasonable default values for missing display fields.

#### Scenario: Fill missing title from content
- **WHEN** `title` is missing but `content` exists
- **THEN** system SHALL set title to first 30 characters of content + "..."

#### Scenario: Fill missing title with no content
- **WHEN** both `title` and `content` are missing
- **THEN** system SHALL set title to "无标题攻略"

#### Scenario: Fill missing coverImageUrl from imageUrls
- **WHEN** `coverImageUrl` is missing but `imageUrls` has items
- **THEN** system SHALL set coverImageUrl to `imageUrls[0]`

#### Scenario: Fill missing coverImageUrl with platform default
- **WHEN** both `coverImageUrl` and `imageUrls` are empty
- **THEN** system SHALL set coverImageUrl to platform-specific default image URL

#### Scenario: Fill missing authorName
- **WHEN** `authorName` is missing or empty
- **THEN** system SHALL set authorName to "匿名用户"

#### Scenario: Fill missing count fields
- **WHEN** any of `likesCount`, `savesCount`, `commentsCount`, `viewsCount` is missing
- **THEN** system SHALL set the missing count to 0

#### Scenario: Fill missing qualityScore
- **WHEN** `qualityScore` is missing
- **THEN** system SHALL set qualityScore to 0.5

### Requirement: Upsert Display Field Enforcement
The system SHALL automatically apply display field auto-fill during upsert operations before persisting to database.

#### Scenario: New guide without title
- **WHEN** upserting a new guide without title
- **THEN** system SHALL auto-fill title before saving

#### Scenario: Updated guide retains original values
- **WHEN** upserting a guide that already has display fields populated
- **THEN** system SHALL NOT overwrite existing non-empty values

### Requirement: Query-Time Display Field Guarantee
The system SHALL provide a query wrapper that ensures all returned guides have display fields populated.

#### Scenario: Query returns guide with missing fields
- **WHEN** querying a guide that has missing display fields in database
- **THEN** query result SHALL include auto-filled values for missing fields

### Requirement: Historical Data Migration
The system SHALL provide a migration function to batch-fix existing guides with missing display fields.

#### Scenario: Migration processes in batches
- **WHEN** migration is executed
- **THEN** system SHALL process guides in batches of 50 to avoid memory limits

#### Scenario: Migration supports cursor-based continuation
- **WHEN** migration batch completes
- **THEN** system SHALL return a cursor for continuing with next batch

#### Scenario: Migration is idempotent
- **WHEN** migration runs on already-fixed guides
- **THEN** system SHALL skip guides that already have all display fields
