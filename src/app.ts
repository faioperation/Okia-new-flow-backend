import express, { Application, Request, Response } from "express";
import cors from "cors";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import { rootRoute } from "./app/routes";
import cookieParser from "cookie-parser";
import requestLogger from "./app/middlewares/requestLogger";

const app: Application = express();

// 1. MANUAL CORS FALLBACK (Absolute Priority)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, ngrok-skip-browser-warning, Accept, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 2. STANDARD CORS MIDDLEWARE
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
      "Accept",
      "X-Requested-With",
    ],
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
