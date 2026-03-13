package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type DB struct {
	*sql.DB
}

// New creates a connection pool to TiDB/MySQL.
// dsn format: "mysql://root@127.0.0.1:4000/pathfinding"
// or standard Go DSN: "root@tcp(127.0.0.1:4000)/pathfinding"
func New(dsn string) (*DB, error) {
	goDSN, err := convertDSN(dsn)
	if err != nil {
		return nil, fmt.Errorf("invalid DATABASE_URL: %w", err)
	}

	db, err := sql.Open("mysql", goDSN)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)
	db.SetConnMaxIdleTime(60 * time.Second)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return &DB{db}, nil
}

// convertDSN converts "mysql://user:pass@host:port/dbname" to Go DSN format.
func convertDSN(dsn string) (string, error) {
	// Handle mysql:// URI format
	if len(dsn) > 8 && dsn[:8] == "mysql://" {
		rest := dsn[8:] // "root@127.0.0.1:4000/pathfinding" or "root:pass@127.0.0.1:4000/pathfinding"

		// Find @ separator
		atIdx := -1
		for i, c := range rest {
			if c == '@' {
				atIdx = i
				break
			}
		}
		if atIdx == -1 {
			return "", fmt.Errorf("missing @ in DSN: %s", dsn)
		}

		userInfo := rest[:atIdx]   // "root" or "root:pass"
		hostPath := rest[atIdx+1:] // "127.0.0.1:4000/pathfinding"

		// Find / to separate host:port from dbname
		slashIdx := -1
		for i, c := range hostPath {
			if c == '/' {
				slashIdx = i
				break
			}
		}

		var hostPort, dbName string
		if slashIdx == -1 {
			hostPort = hostPath
			dbName = ""
		} else {
			hostPort = hostPath[:slashIdx]
			dbName = hostPath[slashIdx+1:]
		}

		// Remove query parameters from dbName
		for i, c := range dbName {
			if c == '?' {
				dbName = dbName[:i]
				break
			}
		}

		return fmt.Sprintf("%s@tcp(%s)/%s?parseTime=true&charset=utf8mb4", userInfo, hostPort, dbName), nil
	}

	// Already in Go DSN format
	return dsn, nil
}

// Ping verifies the database connection.
func (db *DB) Ping() error {
	return db.DB.Ping()
}
