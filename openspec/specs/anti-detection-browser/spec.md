## ADDED Requirements

### Requirement: Kernel.sh stealth browser initialization
The system SHALL initialize browser instances using Kernel.sh SDK with stealth mode enabled by default for all non-ctrip platforms.

#### Scenario: Default stealth initialization
- **WHEN** a crawler requests a browser instance for xiaohongshu, mafengwo, tongcheng, qyer, or qunar
- **THEN** the system creates a Kernel.sh browser with `stealth: true` and connects via CDP

#### Scenario: Fallback to Stagehand when Kernel unavailable
- **WHEN** Kernel.sh API is unreachable or KERNEL_API_KEY is not configured
- **THEN** the system falls back to Stagehand LOCAL mode with a warning log

### Requirement: Browser fingerprint randomization
The system SHALL randomize browser fingerprints for each new browser instance to avoid detection patterns.

#### Scenario: Unique fingerprint per session
- **WHEN** a new browser instance is created
- **THEN** the system applies randomized User-Agent, viewport dimensions, timezone, and language settings

#### Scenario: Fingerprint consistency within session
- **WHEN** multiple pages are opened within the same browser session
- **THEN** all pages share the same fingerprint configuration

### Requirement: Unified browser client interface
The system SHALL provide a unified `AntiDetectionBrowserClient` interface that wraps Kernel.sh with optional Stagehand AI capabilities.

#### Scenario: AI operations through unified client
- **WHEN** a crawler calls `client.act(instruction)` or `client.extract(instruction, schema)`
- **THEN** the system delegates to Stagehand's AI capabilities using the Kernel browser context

#### Scenario: Standard navigation through unified client
- **WHEN** a crawler calls `client.goto(url)` or `client.waitForSelector(selector)`
- **THEN** the system executes via Playwright on the Kernel browser instance
