import express, { Application, Request, Response } from "express";
import cors from "cors";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import { rootRoute } from "./app/routes";
import cookieParser from "cookie-parser";

const app: Application = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());


app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Edukai server is running successfully",
    upTime: process.uptime().toFixed(2) + " sec",
    Date: new Date(),
  });
});

app.use("/api",rootRoute)
app.use(globalErrorHandler);
app.use(notFound)


export default app;
