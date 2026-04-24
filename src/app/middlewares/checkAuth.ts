import { NextFunction, Request, Response } from "express"

import ApiError from "../errors/ApiError";
import httpStatus from "http-status"
import { verifyToken } from "../utils/jwt";
import config from "../config";

const auth = () => {
    return async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
        try {
            const token = req.cookies.accessToken;

            if (!token) {
                throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!")
            }

            const verifyUser = verifyToken(token, config.JWT_ACCESS_TOKEN as string);

            req.user = verifyUser;

            next();
        }
        catch (err) {
            next(err)
        }
    }
}

export default auth;