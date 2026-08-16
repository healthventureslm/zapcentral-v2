import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import onboardRouter from "./onboard";
import tenantsRouter from "./tenants";
import usersRouter from "./users";
import departmentsRouter from "./departments";
import adminRouter from "./admin";
import webhooksRouter from "./webhooks";
import whatsappRouter from "./whatsapp";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import agentStatusRouter from "./agentStatus";
import channelSettingsRouter from "./channelSettings";

const router: IRouter = Router();

// Webhooks must come before auth middleware (public endpoint)
router.use(webhooksRouter);

router.use(healthRouter);
router.use(meRouter);
router.use(onboardRouter);
router.use(tenantsRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(adminRouter);
router.use(whatsappRouter);
router.use(conversationsRouter);
router.use(messagesRouter);
router.use(agentStatusRouter);
router.use(channelSettingsRouter);

export default router;
