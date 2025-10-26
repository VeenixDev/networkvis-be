import { NextFunction, Request, Response } from 'express';
import { Config } from '../shared/common/config/config';
import { Logger } from '../shared/common/logging/logger';

const logger = Logger.instance.getLogger();

const cors = (req: Request, res: Response, next: NextFunction) => {
	const remoteHost = (req.headers.origin ?? req.headers.referer)?.replace(
		/\/$/,
		''
	);

	if (remoteHost === Config.instance.config.host) {
		res.setHeader('Access-Control-Allow-Origin', remoteHost);
	} else {
		logger.warn(`Got request from unknown remoteHost ${remoteHost}`, {
			remoteHost,
		});
		res.end();
		return;
	}

	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Accept, Origin, X-Requested-With'
	);
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, PATCH, DELETE, OPTIONS'
	);

	if ('OPTIONS' === req.method) {
		res.sendStatus(200);
	} else {
		next();
	}
};

export { cors };
