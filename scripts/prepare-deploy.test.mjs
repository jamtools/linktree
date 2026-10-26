import assert from 'node:assert/strict';
import test from 'node:test';
import { createApi, ensureNamespace, productionConfig } from './prepare-deploy.mjs';

test('reuses an existing namespace on a later page without creating or modifying it', async () => {
	const calls = [];
	const id = await ensureNamespace(async (path, options) => {
		calls.push(path);
		assert.equal(options, undefined);
		return path.includes('page=1&')
			? { result: Array.from({ length: 100 }, (_, i) => ({ title: `other-${i}`, id: `${i}` })), result_info: { total_pages: 2 } }
			: { result: [{ title: 'production-links', id: 'existing' }] };
	}, 'production-links');
	assert.equal(id, 'existing');
	assert.equal(calls.length, 2);
});

test('creates a missing namespace with the stable title', async () => {
	const id = await ensureNamespace(async (path, options) => {
		if (!options) return { result: [] };
		assert.equal(path, '/storage/kv/namespaces');
		assert.equal(options.method, 'POST');
		assert.deepEqual(JSON.parse(options.body), { title: 'production-links' });
		return { result: { id: 'created' } };
	}, 'production-links');
	assert.equal(id, 'created');
});

test('fails on API errors rather than treating a failed list as an empty namespace list', async () => {
	const api = createApi('account', 'token', async () => new Response(JSON.stringify({
		success: false, errors: [{ message: 'Permission denied' }],
	}), { status: 403 }));
	await assert.rejects(ensureNamespace(api, 'production-links'), /Permission denied/);
});

test('production config binds real KV and exposes only the custom hostname', () => {
	const config = productionConfig({ main: 'src/index.ts', env: { production: { name: 'linktree-production' } } }, 'real-id', 'kochell.dev');
	assert.equal(config.name, 'linktree-production');
	assert.equal(config.env, undefined);
	assert.equal(config.workers_dev, false);
	assert.equal(config.preview_urls, false);
	assert.deepEqual(config.kv_namespaces, [{ binding: 'LINKS_KV', id: 'real-id' }]);
	assert.deepEqual(config.routes, [{ pattern: 'kochell.dev', custom_domain: true }]);
});
