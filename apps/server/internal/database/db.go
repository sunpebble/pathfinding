package database

import (
	"database/sql"
	"fmt"
	"net/url"
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
// Non-mysql:// strings are returned unchanged (already in Go DSN format).
func convertDSN(dsn string) (string, error) {
	u, err := url.Parse(dsn)
	if err != nil || u.Scheme != "mysql" {
		return dsn, nil
	}

	userInfo := u.User.String() // "user" or "user:pass"
	dbName := ""
	if len(u.Path) > 1 {
		dbName = u.Path[1:] // strip leading "/"
	}

	return fmt.Sprintf("%s@tcp(%s)/%s?parseTime=true&charset=utf8mb4", userInfo, u.Host, dbName), nil
}

// Ping verifies the database connection.
func (db *DB) Ping() error {
	return db.DB.Ping()
}
