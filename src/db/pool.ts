import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

import { env } from "../config/env";

function needsSsl(connectionString: string): boolean {
  return (
    connectionString.includes("sslmode=require") ||
    connectionString.includes("supabase.co") ||
    connectionString.includes("supabase.com") ||
    connectionString.includes("pooler.supabase.com") ||
    connectionString.includes("aws-") ||
    process.env.NODE_ENV === "production" && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1") && !connectionString.includes("@db:")
  );
}

// 1. Primary PostgreSQL Pool
const primaryConfig = {
  connectionString: env.databaseUrl,
  ssl: needsSsl(env.databaseUrl) ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const primaryPool = new Pool(primaryConfig);

primaryPool.on("error", (error) => {
  console.error("[DB:Primary] Unexpected error on idle client:", error.message);
});

// 2. Fallback / Supabase Standby Pool (if configured)
export const fallbackPool: Pool | null = env.supabaseDatabaseUrl
  ? new Pool({
      connectionString: env.supabaseDatabaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 7000,
    })
  : null;

if (fallbackPool) {
  fallbackPool.on("error", (error) => {
    console.error("[DB:Fallback/Supabase] Unexpected error on idle client:", error.message);
  });
}

// Dynamic routing state
let activeTarget: "primary" | "fallback" = "primary";
let lastFailoverTime: Date | null = null;

export function getActiveDatabaseTarget(): "primary" | "fallback" {
  return activeTarget;
}

export function setActiveDatabaseTarget(target: "primary" | "fallback") {
  activeTarget = target;
  if (target === "fallback") {
    lastFailoverTime = new Date();
    console.warn(`[DB:Failover] Active database switched to SUPABASE FALLBACK at ${lastFailoverTime.toISOString()}`);
  } else {
    console.log(`[DB:Failover] Active database switched back to PRIMARY at ${new Date().toISOString()}`);
  }
}

/**
 * Resilient Database Proxy that automatically routes queries to Supabase Fallback if Primary is down.
 */
export const pool = {
  async query<R extends QueryResultRow = any, I extends any[] = any[]>(
    queryTextOrConfig: any,
    values?: I
  ): Promise<QueryResult<R>> {
    // If currently routed to fallback and fallback is configured, use fallback
    if (activeTarget === "fallback" && fallbackPool) {
      return fallbackPool.query<R, I>(queryTextOrConfig, values as any);
    }

    try {
      return await primaryPool.query<R, I>(queryTextOrConfig, values as any);
    } catch (primaryError: any) {
      // Check if this is a connection/server failure error eligible for failover
      const isConnectionError =
        primaryError.code === "ECONNREFUSED" ||
        primaryError.code === "ETIMEDOUT" ||
        primaryError.code === "57P01" || // admin_shutdown
        primaryError.code === "57P02" || // crash_shutdown
        primaryError.code === "57P03" || // cannot_connect_now
        primaryError.message?.includes("Connection terminated") ||
        primaryError.message?.includes("timeout");

      if (isConnectionError && fallbackPool) {
        console.error(`[DB:Primary Error] ${primaryError.message}. Failing over to Supabase Standby database...`);
        setActiveDatabaseTarget("fallback");
        return fallbackPool.query<R, I>(queryTextOrConfig, values as any);
      }

      throw primaryError;
    }
  },

  async connect(): Promise<PoolClient> {
    if (activeTarget === "fallback" && fallbackPool) {
      return fallbackPool.connect();
    }

    try {
      return await primaryPool.connect();
    } catch (primaryError: any) {
      if (fallbackPool) {
        console.error(`[DB:Primary Connect Error] ${primaryError.message}. Connecting to Supabase Standby...`);
        setActiveDatabaseTarget("fallback");
        return fallbackPool.connect();
      }
      throw primaryError;
    }
  },

  on(event: string, listener: (...args: any[]) => void) {
    primaryPool.on(event as any, listener);
    if (fallbackPool) {
      fallbackPool.on(event as any, listener);
    }
    return this;
  },

  async end(): Promise<void> {
    await primaryPool.end();
    if (fallbackPool) {
      await fallbackPool.end();
    }
  },

  /**
   * Diagnostic health check inspecting both Primary and Supabase Fallback connectivity.
   */
  async getDiagnostics() {
    let primaryStatus: "connected" | "disconnected" | "unhealthy" = "disconnected";
    let primaryError: string | null = null;
    let fallbackStatus: "connected" | "disconnected" | "unconfigured" | "unhealthy" = fallbackPool
      ? "disconnected"
      : "unconfigured";
    let fallbackError: string | null = null;

    // Check primary
    try {
      await primaryPool.query("SELECT 1");
      primaryStatus = "connected";
      // If primary came back online, automatically restore active target to primary
      if (activeTarget === "fallback") {
        setActiveDatabaseTarget("primary");
      }
    } catch (err) {
      primaryStatus = "unhealthy";
      primaryError = (err as Error).message;
    }

    // Check fallback
    if (fallbackPool) {
      try {
        await fallbackPool.query("SELECT 1");
        fallbackStatus = "connected";
      } catch (err) {
        fallbackStatus = "unhealthy";
        fallbackError = (err as Error).message;
      }
    }

    return {
      activeTarget,
      lastFailoverTime: lastFailoverTime?.toISOString() ?? null,
      primary: {
        status: primaryStatus,
        error: primaryError,
      },
      supabaseFallback: {
        configured: Boolean(fallbackPool),
        status: fallbackStatus,
        error: fallbackError,
      },
    };
  },
};
