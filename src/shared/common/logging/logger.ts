import './instrumentation';

import winston from 'winston';
import LokiTransport from 'winston-loki';
import { Config } from '../config/config';

class Logger {
	private static _instance: Logger | null = null;

	private constructor() {}

	public getLogger(): winston.Logger {
		return winston.createLogger({
			transports: [
				new winston.transports.Console(),
				new LokiTransport({
					host: `${Config.instance.config.loki.host}:${Config.instance.config.loki.port}`,
					json: true,
					labels: { service: 'sysvisual', project: 'sysvisual' },
					batching: false,
					timeout: 5000,
					onConnectionError(error: unknown) {
						console.error('Could not connect to loki!', error);
						process.exit(1);
					},
				}),
			],
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json()
			),
			defaultMeta: {
				service: 'sysvisual',
				project: 'sysvisual',
			},
		});
	}

	public static get instance(): Logger {
		if (!this._instance) {
			this._instance = new Logger();
		}
		return this._instance;
	}
}

export { Logger };
