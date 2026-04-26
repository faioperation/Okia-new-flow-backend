import { NextFunction, Request, Response } from "express";
import config from "../config";
import ApiError from "../errors/ApiError";
import httpStatus from "http-status";

const checkBackendHeader = (req: Request, res: Response, next: NextFunction) => {
  const backendHeader = req.headers["backend-header"];
  if (backendHeader !== config.BACKEND_HEADER_KEY) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized access: Invalid backend-header");
  }
  next();
};

export default checkBackendHeader;
