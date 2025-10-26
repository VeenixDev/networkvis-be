import { Logger } from './shared/common/logging/logger';
import express from 'express';
import promBundle from 'express-prom-bundle';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { logRequest } from './middleware/logRequest';
import { cors } from './middleware/cors';
import v1Controller from './controller/v1Controller';

const logger = Logger.instance.getLogger();

export default async function (): Promise<express.Express> {
	const app = express();

	app.use(cors);
	app.use(
		promBundle({
			includeMethod: true,
			includePath: true,
			includeStatusCode: true,
			includeUp: true,
			customLabels: {
				project_name: 'networkvis',
				service: 'backend',
			},
			promClient: {
				collectDefaultMetrics: {},
			},
		}) as unknown as express.RequestHandler
	);
	app.use(compression());
	app.use(express.json());
	app.use(cookieParser());
	app.use(logRequest);

	app.use('/v1', v1Controller);

	logger.info('App server is now running.');
	return app;
}
