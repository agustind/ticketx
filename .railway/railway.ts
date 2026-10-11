// Railway infrastructure for ticketex. Preview with `railway config plan`,
// apply with `railway config apply`. Anything removed from this file is
// deleted from Railway on the next apply.
import { defineRailway, github, postgres, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  // Amsterdam; keep the app next to its database.
  const region = "europe-west4-drams3a";
  const db = postgres("postgres", { region });

  const web = service("web", {
    source: github("agustind/ticketx", { branch: "main" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    // Start command is the Dockerfile CMD (gunicorn bound to $PORT).
    preDeploy: "python craft migrate --force",
    healthcheck: "/health",
    healthcheckTimeout: 60,
    regions: { [region]: 1 },
    env: {
      APP_NAME: "ticketex",
      APP_ENV: ctx.environment,
      APP_DEBUG: "False",
      APP_URL: "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      // Secret: set once as a shared variable, never stored in this file.
      APP_KEY: ctx.shared.APP_KEY,
      DB_CONNECTION: "postgres",
      DATABASE_URL: db.env.DATABASE_URL,
      DB_LOG: "False",
      WEB_CONCURRENCY: "2",
    },
  });

  return project("ticketex", { resources: [db, web] });
});
