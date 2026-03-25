import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import vendorsRouter from "./vendors";
import categoriesRouter from "./categories";
import updatesRouter from "./updates";
import usersRouter from "./users";
import apiKeysRouter from "./apikeys";
import ingestionRouter from "./ingestion";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(vendorsRouter);
router.use(categoriesRouter);
router.use(updatesRouter);
router.use(usersRouter);
router.use(apiKeysRouter);
router.use(ingestionRouter);

export default router;
