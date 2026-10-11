// Railway infrastructure for ticketex. Preview with `railway config plan`,
// apply with `railway config apply`. Anything removed from this file is
// deleted from Railway on the next apply.
import { defineRailway, github, postgres, preserve, project, service } from "railway/iac";

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
    // Railway-generated public domain (assigned on first apply; the name
    // "ticketex-production" was already taken by another Railway user).
    networking: { serviceDomains: { "web-production-cf06f0.up.railway.app": {} } },
    env: {
      APP_NAME: "ticketex",
      APP_ENV: ctx.environment,
      APP_DEBUG: "False",
      APP_URL: "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      // Secret: value lives only in Railway. Set it with
      //   python craft key --dont-store | <extract key> | railway variable set APP_KEY --stdin -s web
      // preserve() keeps whatever Railway holds; never put the value here.
      APP_KEY: preserve(),
      DB_CONNECTION: "postgres",
      DATABASE_URL: db.env.DATABASE_URL,
      DB_LOG: "False",
      WEB_CONCURRENCY: "2",
    },
  });

  return project("ticketex", { resources: [db, web] });
});
