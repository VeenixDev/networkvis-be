import { Config } from './shared/common/config/config';
Config.instance.init();

import {Logger} from "./shared/common/logging/logger";
import * as http from "node:http";
import app from './app';

const logger = Logger.instance.getLogger();

(async () => {
    const SERVER_PORT: number = Number(Config.instance.config.port ?? '8080');

    const appServer = http.createServer(await app());

    appServer.listen(SERVER_PORT);
})();

process.on('SIGINT', () => {
    logger.info('App server is stopping.');
});