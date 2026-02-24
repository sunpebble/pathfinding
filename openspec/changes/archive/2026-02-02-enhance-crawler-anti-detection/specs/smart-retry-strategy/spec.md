## ADDED Requirements

### Requirement: Three-layer retry strategy

The system SHALL implement a three-layer retry strategy: request-level → session-level → browser-level, with each layer triggered only when the previous layer fails.

#### Scenario: Request-level retry on transient failure

- **WHEN** a request fails with a network error or timeout
- **THEN** the system retries up to 3 times with exponential backoff (1s, 2s, 4s)

#### Scenario: Session-level retry on session expiration

- **WHEN** request-level retries are exhausted AND the failure is detected as session-expired
- **THEN** the system clears cookies, re-authenticates if applicable, and retries the request

#### Scenario: Browser-level retry on IP ban

- **WHEN** session-level retry fails AND the failure is detected as ip-ban or rate-limit
- **THEN** the system destroys the browser instance, creates a new Kernel.sh browser (new IP), and retries

### Requirement: Unified block detection interface

The system SHALL provide a `detectBlock(response): BlockType` function for each platform that returns a standardized block type.

#### Scenario: Block type detection

- **WHEN** a crawler receives an HTTP response or page content
- **THEN** the platform's `detectBlock` function returns one of: `none`, `captcha`, `rate-limit`, `ip-ban`, `session-expired`

#### Scenario: Captcha detection triggers session retry

- **WHEN** `detectBlock` returns `captcha`
- **THEN** the retry strategy skips to session-level retry (clear cookies and retry)

#### Scenario: IP ban detection triggers browser retry

- **WHEN** `detectBlock` returns `ip-ban`
- **THEN** the retry strategy skips to browser-level retry (new browser instance)

### Requirement: Retry metrics logging

The system SHALL log retry attempts and outcomes for monitoring and tuning.

#### Scenario: Retry attempt logging

- **WHEN** any retry is attempted
- **THEN** the system logs: platform, retry layer, attempt number, block type, and timestamp

#### Scenario: Final outcome logging

- **WHEN** a request succeeds or all retries are exhausted
- **THEN** the system logs: platform, total attempts, final status, and duration
