import express, { Application, Request, Response } from "express";
import cors from "cors";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import { rootRoute } from "./app/routes";
import cookieParser from "cookie-parser";
import requestLogger from "./app/middlewares/requestLogger";

const app: Application = express();

// 1. MANUAL CORS FALLBACK (Absolute Priority)
// 1. CORS CONFIGURATION – unified handling
// Explicitly allow the known frontend origin while supporting credentials.
const allowedOrigins = [
  "https://edukai-frontend-orcin.vercel.app",
  "https://edukaicvsub.edukai.co.uk",
  // add other trusted origins here
];

app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    // fallback to generic allow‑origin for non‑credentialed requests
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, ngrok-skip-browser-warning, Accept, X-Requested-With"
  );
  // Only send credentials header when we are echoing a trusted origin
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// 2. STANDARD CORS MIDDLEWARE – keep for any additional routes
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
      "Accept",
      "X-Requested-With",
    ],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use("/uploads", express.static("uploads"));



app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Edukai server is running successfully",
    upTime: process.uptime().toFixed(2) + " sec",
    Date: new Date(),
  });
});

app.use("/api", rootRoute)
app.use(globalErrorHandler);
app.use(notFound)


export default app;
