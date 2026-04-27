import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { candidateRoutes } from "../modules/candidate/candidate.routes";
import { organizationRoutes } from "../modules/organization/organization.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { userRoutes } from "../modules/user/user.routes";
import { bulkImportRoutes } from "../modules/bulkImport/bulkImport.routes";
import { publicRoutes } from "../modules/publicApi/public.routes";
import { qualityCheckRoutes } from "../modules/qualityCheck/qualityCheck.routes";
import { importOrganizationRoutes } from "../modules/importOrganization/importOrganization.routes";
import { generatedCvRoutes } from "../modules/generatedCv/generatedCv.routes";
import { importContactRoutes } from "../modules/importContact/importContact.routes";



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
    },
    {
        path: "/public",
        element: publicRoutes
    },
    {
        path: "/quality-checks",
        element: qualityCheckRoutes
    },
    {
        path: "/import-organization",
        element: importOrganizationRoutes
    },
    {
        path: "/generated-cv",
        element: generatedCvRoutes
    },
    {
        path: "/import-contact",
        element: importContactRoutes
    }
]




modelRoutes.forEach((route) => {
    rootRoute.use(route.path, route.element)
})
