import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vendorsRouter from "./vendors";
import categoriesRouter from "./categories";
import updatesRouter from "./updates";
import usersRouter from "./users";
import apiKeysRouter from "./apikeys";
import ingestionRouter from "./ingestion";
import newsRouter from "./news";
import likesRouter from "./likes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vendorsRouter);
router.use(categoriesRouter);
router.use(updatesRouter);
router.use(usersRouter);
router.use(apiKeysRouter);
router.use(ingestionRouter);
router.use(newsRouter);
router.use(likesRouter);

export default router;
