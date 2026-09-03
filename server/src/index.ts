import path from "node:path";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import Database from "better-sqlite3";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SqliteStoreFactory = require("better-sqlite3-session-store")(session);

import { seedSuperAdmin } from "./seed";
import { ensureCsrfToken, verifyCsrfToken } from "./middleware/csrf";
import { apiRateLimiter } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { customersRouter } from "./routes/customers";

const DEV_SESSION_SECRET = "dev_secret_change_me";
const sessionSecret = process.env.SESSION_SECRET || DEV_SESSION_SECRET;
if (process.env.NODE_ENV === "production" && sessionSecret === DEV_SESSION_SECRET) {
  console.error(
    "SESSION_SECRET nincs beállítva (.env). Éles környezetben kötelező egy erős, egyedi értéket megadni - a szerver nem indul el ezzel az alapértelmezett titokkal."
  );
  process.exit(1);
}

seedSuperAdmin();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json({ limit: "200kb" }));

const sessionDb = new Database(path.join(__dirname, "..", "..", "data", "app.db"));

app.use(
  session({
    store: new SqliteStoreFactory({
      client: sessionDb,
      expired: { clear: true, intervalMs: 900000 },
    }),
    name: "sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      // "auto": Secure attribute is set when the request is actually HTTPS
      // (directly, or via X-Forwarded-Proto since trust proxy is enabled).
      // A hardcoded `secure: true` would silently break sessions whenever
      // the app is reached over plain HTTP (e.g. proxy misconfigured, or
      // testing directly against the container).
      secure: "auto",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  })
);

app.use("/api", apiRateLimiter);
app.use(ensureCsrfToken);
app.use("/api", (req, res, next) => verifyCsrfToken(req, res, next));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/customers", customersRouter);

const clientDist = path.join(__dirname, "..", "..", "client-dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Ügyfélkövető szerver fut a ${PORT} porton`);
});
