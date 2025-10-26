import { Config } from './config';

function init() {
	process.env['LOKI_HOST'] = 'lokiHost';
	process.env['LOKI_PORT'] = '0';
	process.env['PORT'] = '8080';
	process.env['ENVIRONMENT'] = 'LOCAL';
	process.env['HOST'] = 'localhost';
	process.env['NEO4J_HOST'] = 'neo4jHost';
	process.env['NEO4J_PORT'] = '0';
	process.env['NEO4J_USER'] = 'neo4jUser';
	process.env['NEO4J_PASSWORD'] = 'neo4jPasswd';
	process.env['STEAM_API_KEY'] = 'localhost';

	Config.instance.init();
}

export {
	init,
}