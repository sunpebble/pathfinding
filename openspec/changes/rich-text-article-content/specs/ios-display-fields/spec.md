## MODIFIED Requirements

### Requirement: iOS Display Fields Definition
The system SHALL define a canonical list of fields required for iOS App display, including: `title`, `coverImageUrl`, `authorName`, `destinations`, `likesCount`, `savesCount`, `commentsCount`, `viewsCount`, `qualityScore`, and `contentHtml`.

#### Scenario: Field list is accessible
- **WHEN** any component needs to validate display fields
- **THEN** the canonical field list SHALL be available as a typed constant
- **THEN** the field list SHALL include `contentHtml` as an optional display field

#### Scenario: Guide with contentHtml present
- **WHEN** a guide has `contentHtml` as a non-empty string
- **THEN** validation SHALL treat `contentHtml` as populated

#### Scenario: Guide without contentHtml
- **WHEN** a guide has `contentHtml` as undefined or empty string
- **THEN** validation SHALL NOT mark the guide as invalid (contentHtml is optional)
- **THEN** the guide SHALL still be considered valid if all other required fields are present

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

#### Scenario: contentHtml not auto-filled
- **WHEN** `contentHtml` is missing
- **THEN** system SHALL NOT auto-fill contentHtml (it requires original HTML from crawler)

## ADDED Requirements

### Requirement: iOS BlogPost Model contentHtml Field
iOS `BlogPost` 模型 SHALL 包含 `contentHtml` 可选字段，用于接收 API 返回的 HTML 格式文章内容。

#### Scenario: Decode contentHtml from API response
- **WHEN** API 返回的 JSON 包含 `content_html` 字段
- **THEN** `BlogPost` SHALL 将其解码到 `contentHtml` 属性

#### Scenario: API response without contentHtml
- **WHEN** API 返回的 JSON 不包含 `content_html` 字段
- **THEN** `BlogPost.contentHtml` SHALL 为 nil

### Requirement: Convex API contentHtml Passthrough
Convex HTTP API SHALL 在返回攻略数据时包含 `contentHtml` 字段（如果存在）。

#### Scenario: Guide with contentHtml in database
- **WHEN** 查询返回的攻略在数据库中有 `contentHtml` 字段
- **THEN** API 响应 SHALL 包含 `content_html` 字段（snake_case 格式）

#### Scenario: Guide without contentHtml in database
- **WHEN** 查询返回的攻略在数据库中无 `contentHtml` 字段
- **THEN** API 响应 SHALL 不包含 `content_html` 字段（或值为 null）
