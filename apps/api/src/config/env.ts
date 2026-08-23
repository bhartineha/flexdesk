import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(","),
  checkinGraceMinutes: Number(process.env.CHECKIN_GRACE_MINUTES ?? 120),
  releaseRunnerCron: process.env.RELEASE_RUNNER_CRON ?? "*/5 * * * *",
};
