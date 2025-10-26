import { NextFunction, Request, Response } from 'express';

export const checkNoEmptyBody = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (!req.body) {
		res.sendStatus(400);
		return;
	}
	next();
};
