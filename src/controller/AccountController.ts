import express from 'express';
import {
	IntermediateQueryResult,
} from '../domain/neo4jService/Neo4J';
import { checkNoEmptyBody } from '../middleware/checkNoEmptyBody';
import { Logger } from '../shared/common/logging/logger';
import axios from 'axios';
import { Config } from '../shared/common/config/config';
import Neo4J from '../domain/neo4jService/Neo4J';

const router = express.Router();
const logger = Logger.instance.getLogger();

router.get('/', async (_, res) => {
	const neo4J = new Neo4J();
	const varGen = Neo4J.getVarGenerator();
	try {
		const accountVar = varGen();
		const networkVar = varGen();
		const queryAccount: IntermediateQueryResult = {query: `MATCH (${accountVar}:Account)`, variableNames: accountVar };
		const queryNetworks: IntermediateQueryResult = { query: `OPTIONAL MATCH (${accountVar})-[:IS_PART_OF]->(${networkVar}:Network)`, variableNames: networkVar};
		const queryResult: IntermediateQueryResult = { query: `RETURN ${accountVar}.steamId, ${accountVar}.name, ${accountVar}.info, ${accountVar}.avatarUrl, ${networkVar}.name AS NetworkName` };

		const preparedQuery = neo4J.prepareQueries(queryAccount, queryNetworks, queryResult);
		const result = await neo4J.execute(preparedQuery);

		if (!result) {
			logger.info('Internal Server Error');
			res.sendStatus(500);
			return;
		}

		res.status(200).json(result.records);
	} catch (error) {
		logger.error('Failed to get all Accounts.', { error });
		res.sendStatus(500);
	} finally {
		await neo4J.close();
	}
});

async function getAvatarUrlAndName(
	steamUrl: string
): Promise<{ name: string; avatarUrl: string }> {
	const apiKey = Config.instance.config.steamApiKey;

	const url = steamUrl.endsWith('/')
		? steamUrl.substring(0, steamUrl.length - 1)
		: steamUrl;
	let userId: string | undefined;
	if (url.startsWith('https://steamcommunity.com/id/')) {
		const vanityId = url.slice(url.lastIndexOf('/') + 1);
		const result = await axios.get(
			`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${vanityId}`
		);

		if (result.status !== 200) {
			throw new Error('Could not resolve vanity url');
		}
		userId = ((result.data as { response: unknown }).response as { steamid: string }).steamid as string;
	} else {
		userId = url.slice(url.lastIndexOf('/') + 1);
	}

	const result = await axios.get(
		`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${userId}`
	);

	if (result.status !== 200) {
		throw new Error('Could not resolve avatar url');
	}

	const player = (
		(result.data as { response: unknown }).response as {
			players: { avatarmedium: string; personaname: string }[];
		}
	).players[0];

	if (!player) {
		throw new Error('Account not found.');
	}

	return { name: player.personaname, avatarUrl: player.avatarmedium };
}

router.post('/', checkNoEmptyBody, async (req, res) => {
	const neo4J = new Neo4J();
	try {
		const steamId = req.body.steamId as string | undefined;
		const info = req.body.info as string | undefined;
		const network = req.body.network as string | undefined;

		if (steamId === undefined || info === undefined || network === undefined) {
			res.sendStatus(400);
			return;
		}
		const { avatarUrl, name } = await getAvatarUrlAndName(steamId);

		const varGen = Neo4J.getVarGenerator();

		const queryArr: IntermediateQueryResult[] = [];

		const accountVar = varGen();
		const mergeAccount: IntermediateQueryResult = {
			query: `MERGE (${accountVar}:Account) { steamId: $steamId__${accountVar}}) ON CREATE SET ${accountVar}.name = $name__${accountVar}, ${accountVar}.info = $info__${accountVar}, ${accountVar}.avatarUrl = $avatarUrl__${accountVar}, a.createdAt = timestamp()`,
			props: {
				steamId,
				info,
				avatarUrl,
				name
			},
			variableNames: accountVar,
		};
		queryArr.push(mergeAccount);

		if (network !== '') {
			const networkVar = varGen();
			const relationVar = varGen();

			const mergeNetwork: IntermediateQueryResult = {
				query: `MERGE (${networkVar}:Network { name: $name__${networkVar} }) ON CREATE SET ${networkVar}.createdAt = timestamp()`,
				props: {
					network,
				},
				variableNames: networkVar,
			}
			queryArr.push(mergeNetwork);

			const mergeRelation: IntermediateQueryResult = {
				query: `MERGE (${accountVar})-[${relationVar}:IS_PART_OF]->(${networkVar})`,
				variableNames: relationVar,
			}
			queryArr.push(mergeRelation);

			queryArr.push({
				query: `RETURN ${accountVar}, ${networkVar}, ${relationVar}`
			});
		} else {
			queryArr.push({
				query: `RETURN ${accountVar}`
			});
		}

		const prepared = neo4J.prepareQueries(...queryArr);
		const result = await neo4J.execute(prepared);

		if (!result) {
			res.sendStatus(500);
			return;
		}

		res.status(201).json(result);
	} catch (error) {
		logger.warn('Failed to create account.', { error });
		res.sendStatus(500);
	}
});

export default router;
