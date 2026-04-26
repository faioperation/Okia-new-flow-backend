import { NextFunction, Request, Response } from "express"

import ApiError from "../errors/ApiError";
import httpStatus from "http-status"
import { verifyToken } from "../utils/jwt";
import config from "../config";

const auth = (...roles: string[]) => {
    return async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
        try {
            const token = req.cookies.accessToken;

            if (!token) {
                throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!")
            }

            const verifyUser = verifyToken(token, config.JWT_ACCESS_TOKEN as string);

            req.user = verifyUser;

            if (verifyUser.isBlocked) {
                throw new ApiError(httpStatus.UNAUTHORIZED, "Your account has been blocked!")
            }

            if (roles.length && !roles.includes(verifyUser.role)) {
                throw new ApiError(httpStatus.FORBIDDEN, "You don't have permission to access this feature")
            }

            next();
        }
        catch (err) {
            next(err)
        }
    }
}

export default auth;