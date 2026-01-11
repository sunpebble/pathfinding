import type { Database } from '@nozbe/watermelondb';
import React, { createContext, useState } from 'react';
import { database } from '@/database';

interface DatabaseContextType {
  database: Database;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined
);

/**
 * Database provider for WatermelonDB
 * Database is initialized synchronously, so we don't need useEffect
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  // Database is ready immediately as WatermelonDB initialization is synchronous
  const [isReady] = useState(true);

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
