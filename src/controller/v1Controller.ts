import express from "express";
import accountController from "./AccountController";

const router = express.Router();

router.use('/accounts', accountController)

export default router;