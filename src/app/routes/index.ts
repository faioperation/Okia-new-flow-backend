import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { candidateRoutes } from "../modules/candidate/candidate.routes";
import { organizationRoutes } from "../modules/organization/organization.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { userRoutes } from "../modules/user/user.routes";
import { bulkImportRoutes } from "../modules/bulkImport/bulkImport.routes";

export const rootRoute = Router()

const modelRoutes = [
    {
        path: "/auth",
        element: authRouter
    },
    {
        path: "/candidates",
        element: candidateRoutes
    },
    {
        path: "/organizations",
        element: organizationRoutes
    },
    {
        path: "/contacts",
        element: contactRoutes
    },
    {
        path: "/users",
        element: userRoutes
    },
    {
        path: "/bulk-import",
        element: bulkImportRoutes
    }
]

modelRoutes.forEach((route) => {
    rootRoute.use(route.path, route.element)
})
