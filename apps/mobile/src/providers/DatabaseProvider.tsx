import type { Database } from '@nozbe/watermelondb';
import React, { createContext, useEffect, useState } from 'react';
import { database } from '../database';

interface DatabaseContextType {
  database: Database;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined
);

/**
 * Database provider for WatermelonDB
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Database initialization is synchronous in WatermelonDB
    // but we might want to run migrations here
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <DatabaseContext value={{ database, isReady }}>{children}</DatabaseContext>
  );
}

/**
 * Hook to access database context
 */
export function useDatabase() {
  const context = use(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
