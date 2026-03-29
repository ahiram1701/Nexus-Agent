import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentRouter from "./agent";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentRouter);
router.use(chatRouter);

export default router;
