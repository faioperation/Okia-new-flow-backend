import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";

export const rootRoute = Router()

const modelRoutes = [
    {
        path: "/auth",
        element: authRouter
    }
]

modelRoutes.forEach((route) => {
    rootRoute.use(route.path, route.element)
})
