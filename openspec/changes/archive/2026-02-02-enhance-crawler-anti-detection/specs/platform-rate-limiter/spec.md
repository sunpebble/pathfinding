## ADDED Requirements

### Requirement: Platform-specific rate limit configuration

The system SHALL maintain a centralized configuration defining rate limit parameters for each platform.

#### Scenario: Configuration structure

- **WHEN** the rate limiter is initialized
- **THEN** the system loads platform configurations with: minDelay, maxDelay, burstLimit, and cooldownPeriod for each platform

#### Scenario: Default configuration for unknown platforms

- **WHEN** a platform is not in the configuration
- **THEN** the system applies conservative defaults: minDelay=3000ms, maxDelay=6000ms, burstLimit=5

### Requirement: Adaptive delay calculation

The system SHALL calculate request delays based on platform configuration and recent request history.

#### Scenario: Random delay within bounds

- **WHEN** a request is about to be sent
- **THEN** the system waits for a random duration between minDelay and maxDelay

#### Scenario: Burst limit enforcement

- **WHEN** the number of requests in the last minute exceeds burstLimit
- **THEN** the system waits for cooldownPeriod before allowing the next request

#### Scenario: Backoff after block detection

- **WHEN** a rate-limit block type is detected
- **THEN** the system doubles the minDelay and maxDelay for subsequent requests to that platform (up to 4x maximum)

### Requirement: Rate limiter state persistence

The system SHALL track request timestamps per platform to enforce rate limits across multiple crawl sessions.

#### Scenario: In-memory state tracking

- **WHEN** a request is sent to a platform
- **THEN** the system records the timestamp in a per-platform request history queue

#### Scenario: History cleanup

- **WHEN** the request history for a platform exceeds 100 entries
- **THEN** the system removes entries older than 5 minutes

### Requirement: Rate limiter bypass for ctrip

The system SHALL NOT apply the platform rate limiter to ctrip crawlers.

#### Scenario: Ctrip excluded from rate limiting

- **WHEN** a request is made by the ctrip crawler
- **THEN** the system skips rate limit checks and proceeds immediately
