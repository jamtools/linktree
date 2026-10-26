import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function createApi(accountId, token, fetchImpl = fetch) {
	return async (path, options = {}) => {
		const response = await fetchImpl(
			`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}${path}`,
			{
				...options,
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
				signal: AbortSignal.timeout(30_000),
			},
		);
		const body = await response.json();
		if (!response.ok || !body.success) {
			throw new Error(`Cloudflare ${path}: ${JSON.stringify(body.errors ?? response.status)}`);
		}
		return body;
	};
}

export async function ensureNamespace(api, title) {
	const matches = [];
	for (let page = 1; ; page++) {
		const body = await api(`/storage/kv/namespaces?page=${page}&per_page=100`);
		matches.push(...body.result.filter(namespace => namespace.title === title));
		if (body.result.length < 100 || page >= (body.result_info?.total_pages ?? Infinity)) break;
	}
	if (matches.length > 1) throw new Error(`Multiple KV namespaces named ${title}; resolve the ambiguity before deploying.`);
	if (matches.length === 1) return matches[0].id;
	const body = await api('/storage/kv/namespaces', {
		method: 'POST',
		body: JSON.stringify({ title }),
	});
	return body.result.id;
}

export function productionConfig(base, namespaceId, hostname) {
	const { env, ...config } = base;
	return {
		...config,
		name: base.env.production.name,
		main: resolve(root, base.main),
		workers_dev: false,
		preview_urls: false,
		kv_namespaces: [{ binding: 'LINKS_KV', id: namespaceId }],
		routes: [{ pattern: hostname, custom_domain: true }],
	};
}

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const token = process.env.CLOUDFLARE_API_TOKEN;
	if (!dryRun && (!accountId || !token)) {
		throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN before provisioning.');
	}
	const base = JSON.parse(await readFile(resolve(root, 'wrangler.jsonc'), 'utf8'));
	const hostname = process.env.PRODUCTION_HOSTNAME || 'kochell.dev';
	if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname)) {
		throw new Error('PRODUCTION_HOSTNAME must be a hostname without a protocol or path.');
	}
	const namespaceTitle = `${base.env.production.name}-links`;
	const namespaceId = dryRun
		? '00000000000000000000000000000000'
		: await ensureNamespace(createApi(accountId, token), namespaceTitle);
	const config = productionConfig(base, namespaceId, hostname);
	const output = resolve(root, '.wrangler/deploy/wrangler.json');
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, `${JSON.stringify(config, null, 2)}\n`);
	console.log(`${dryRun ? 'Dry-run' : 'Production'} config ready: ${config.name} → https://${hostname} (KV: ${namespaceTitle})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch(error => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
