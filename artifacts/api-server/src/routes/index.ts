import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import onboardRouter from "./onboard";
import tenantsRouter from "./tenants";
import usersRouter from "./users";
import departmentsRouter from "./departments";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(onboardRouter);
router.use(tenantsRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(adminRouter);

export default router;
