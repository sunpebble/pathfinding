package cron

import (
	"log/slog"
	"time"

	"github.com/pathfinding/server/internal/database"
	"github.com/pathfinding/server/internal/eventbus"
)

// Manager manages periodic jobs.
type Manager struct {
	db     *database.DB
	bus    *eventbus.EventBus
	done   chan struct{}
	ticker *time.Ticker
}

// New creates a new cron manager.
func New(db *database.DB, bus *eventbus.EventBus) *Manager {
	return &Manager{db: db, bus: bus, done: make(chan struct{})}
}

// Start begins running cron jobs.
func (m *Manager) Start() {
	// Poll pending guides every 30 seconds
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				slog.Debug("Polling pending guides...")
			case <-m.done:
				return
			}
		}
	}()

	// Session cleanup every hour
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				slog.Info("Cleaning up expired sessions...")
			case <-m.done:
				return
			}
		}
	}()

	slog.Info("Cron jobs started", "jobs", 2)
}

// Stop gracefully stops all cron jobs.
func (m *Manager) Stop() {
	close(m.done)
	slog.Info("Cron jobs stopped")
}
