export interface Env {
	LINKS_KV: KVNamespace;
}

type Link = {
	id: string;
	title: string;
	url: string;
};

type PageSettings = {
	title: string;
	subtitle: string;
};

const getPageSettings = async (kv: KVNamespace): Promise<PageSettings> => {
	const defaults = { title: 'Linktree', subtitle: 'All my links in one place.' };
	const raw = await kv.get('page-settings');
	if (!raw) return defaults;
	try {
		const settings = JSON.parse(raw) as Partial<PageSettings> | null;
		return {
			title: typeof settings?.title === 'string' ? settings.title : defaults.title,
			subtitle: typeof settings?.subtitle === 'string' ? settings.subtitle : defaults.subtitle,
		};
	} catch {
		return defaults;
	}
};

const getLinks = async (kv: KVNamespace): Promise<Link[]> => {
	const raw = await kv.get('links');
	if (!raw) return [];
	try {
		return JSON.parse(raw) as Link[];
	} catch {
		return [];
	}
};

const putLinks = (kv: KVNamespace, links: Link[]) => {
	return kv.put('links', JSON.stringify(links));
};

const escapeHtml = (str: string) => {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
};

const htmlResponse = (html: string) =>
	new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

const renderLinkTreePage = (links: Link[], settings: PageSettings) => {
	const linkButtons = links.length > 0
		? links.map((link, index) => `
		<a href="${escapeHtml(link.url)}" class="link-btn" target="_blank" rel="noopener noreferrer">
			<span class="link-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
			<span class="link-label">${escapeHtml(link.title)}</span>
			<span class="link-arrow" aria-hidden="true">↗</span>
			<span class="sr-only"> (opens in a new tab)</span>
		</a>`).join('')
		: '<p class="empty"><span aria-hidden="true">[ -- ]</span> No links yet.</p>';

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(settings.title || 'Linktree')}</title>
	<meta name="theme-color" content="#080f1c">
	<style>
		:root {
			color-scheme: dark;
			--bg: #080f1c;
			--panel: #0c1627;
			--surface: #101f35;
			--text: #dce8fa;
			--muted: #91a7c4;
			--accent: #83b4ff;
			--border: #2b4262;
			--space: 1.5rem;
		}
		*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
			background: var(--bg);
			color: var(--text);
			font-size: 14px;
			line-height: 1.6;
			min-height: 100vh;
			min-height: 100svh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 3rem 1rem;
		}
		body::before {
			content: '';
			position: fixed;
			inset: 0;
			pointer-events: none;
			background: repeating-linear-gradient(transparent 0 3px, rgba(131, 180, 255, 0.025) 3px 4px);
		}
		.container {
			width: 100%;
			max-width: 560px;
			min-width: 0;
		}
		.terminal { border: 1px solid var(--border); background: var(--panel); }
		.window-bar {
			display: flex;
			justify-content: flex-end;
			padding: 0.75rem var(--space);
			border-bottom: 1px solid var(--border);
			background: var(--surface);
			color: var(--accent);
			font-size: 11px;
			letter-spacing: 0.2em;
		}
		.terminal-body { padding: 2rem var(--space); }
		.intro { margin-bottom: 2rem; overflow-wrap: anywhere; }
		.prompt { color: var(--accent); margin-bottom: 1rem; font-size: 12px; }
		.prompt-path { color: var(--muted); }
		.cursor {
			display: inline-block;
			width: 0.6em;
			height: 1em;
			margin-left: 0.5em;
			vertical-align: -0.15em;
			background: var(--accent);
			animation: blink 1.2s step-end infinite;
		}
		h1 {
			font-size: clamp(1.5rem, 5vw, 2rem);
			font-weight: 700;
			line-height: 1.3;
			letter-spacing: -0.04em;
			text-transform: uppercase;
			color: var(--accent);
			text-shadow: 0 0 16px rgba(131, 180, 255, 0.15);
		}
		.tagline {
			font-size: 13px;
			color: var(--muted);
			margin-top: 0.75rem;
		}
		.tagline::before { content: '// '; color: var(--accent); }
		.links {
			display: flex;
			flex-direction: column;
			gap: 0.625rem;
		}
		.link-btn {
			display: grid;
			grid-template-columns: 2ch minmax(0, 1fr) auto;
			align-items: center;
			gap: 1rem;
			width: 100%;
			min-height: 56px;
			padding: 0.875rem 1rem;
			background: var(--surface);
			border: 1px solid var(--border);
			color: var(--text);
			text-decoration: none;
			transition: background 0.15s, border-color 0.15s, color 0.15s;
		}
		.link-index { color: var(--muted); font-size: 11px; }
		.link-label { overflow-wrap: anywhere; }
		.link-arrow { color: var(--accent); font-size: 18px; }
		.link-btn:hover, .link-btn:focus-visible {
			background: var(--accent);
			border-color: var(--accent);
			color: var(--bg);
		}
		.link-btn:is(:hover, :focus-visible) :is(.link-index, .link-arrow) { color: inherit; }
		.link-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
		.link-btn:active { transform: translateY(1px); }
		.empty { padding: 1rem; border: 1px dashed var(--border); color: var(--muted); }
		.sr-only {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
			border: 0;
		}
		@keyframes blink { 50% { opacity: 0; } }
		@media (max-width: 600px) {
			body { align-items: flex-start; padding-top: 2rem; }
		}
		@media (max-width: 400px) {
			:root { --space: 1rem; }
			body { padding: 1.5rem 0.75rem; }
			.link-btn { gap: 0.75rem; }
		}
		@media (prefers-reduced-motion: reduce) {
			*, *::before, *::after { animation: none !important; transition: none !important; }
		}
	</style>
</head>
<body>
	<main class="container">
		<section class="terminal" aria-label="Link directory">
			<div class="window-bar" aria-hidden="true"><span>− + ×</span></div>
			<div class="terminal-body">
				<div class="prompt" aria-hidden="true"><span class="prompt-path">~</span> $ ls --links<span class="cursor"></span></div>
				${settings.title || settings.subtitle ? `<header class="intro">
					${settings.title ? `<h1>${escapeHtml(settings.title)}</h1>` : ''}
					${settings.subtitle ? `<p class="tagline">${escapeHtml(settings.subtitle)}</p>` : ''}
				</header>` : ''}
				<nav class="links" aria-label="Links">
					${linkButtons}
				</nav>
			</div>
		</section>
	</main>
</body>
</html>`;
};

const renderAdminPage = (links: Link[], settings: PageSettings, message?: string) => {
	const linkRows = links.map((link, i) => `
		<tr>
			<td>${i + 1}</td>
			<td>
				<form method="POST" action="/admin/links" style="display:contents">
					<input type="hidden" name="_action" value="edit">
					<input type="hidden" name="id" value="${escapeHtml(link.id)}">
					<input class="input" name="title" value="${escapeHtml(link.title)}" required>
				</td>
				<td>
					<input class="input" name="url" value="${escapeHtml(link.url)}" required>
				</td>
				<td class="actions">
					<button class="btn btn-sm" type="submit">Save</button>
				</form>
				<form method="POST" action="/admin/links" style="display:contents" onsubmit="return confirm('Delete this link?')">
					<input type="hidden" name="_action" value="delete">
					<input type="hidden" name="id" value="${escapeHtml(link.id)}">
					<button class="btn btn-sm btn-danger" type="submit">Delete</button>
				</form>
			</td>
		</tr>`).join('');

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Admin — Links</title>
	<style>
		*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			background: #0f0f11;
			color: #e0e0e8;
			padding: 2rem 1rem;
		}
		.page {
			max-width: 720px;
			margin: 0 auto;
		}
		h1 {
			font-size: 1.5rem;
			font-weight: 700;
			margin-bottom: 1.5rem;
		}
		.message {
			background: #1a3a1a;
			border: 1px solid #2a5a2a;
			color: #7dda7d;
			padding: 0.75rem 1rem;
			border-radius: 8px;
			margin-bottom: 1.5rem;
			font-size: 0.9rem;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 2rem;
		}
		th, td {
			text-align: left;
			padding: 0.6rem 0.75rem;
			border-bottom: 1px solid #2a2a34;
			vertical-align: middle;
		}
		th {
			font-size: 0.8rem;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: #666;
		}
		.input {
			width: 100%;
			background: #1e1e24;
			border: 1px solid #2e2e38;
			border-radius: 6px;
			color: #e0e0e8;
			padding: 0.4rem 0.6rem;
			font-size: 0.9rem;
			font-family: inherit;
		}
		.input:focus {
			outline: none;
			border-color: #5a5aaa;
		}
		.actions {
			display: flex;
			gap: 0.5rem;
			white-space: nowrap;
		}
		.btn {
			padding: 0.4rem 0.9rem;
			border-radius: 6px;
			border: none;
			cursor: pointer;
			font-size: 0.85rem;
			font-family: inherit;
			font-weight: 500;
			background: #3a3a4a;
			color: #e0e0e8;
			transition: background 0.15s;
		}
		.btn:hover { background: #4a4a5a; }
		.btn-sm { padding: 0.35rem 0.7rem; }
		.btn-danger { background: #4a1a1a; color: #f88; }
		.btn-danger:hover { background: #5a2a2a; }
		.btn-primary { background: #3a3a9a; color: #c8c8ff; }
		.btn-primary:hover { background: #4a4aaa; }
		h2 {
			font-size: 1rem;
			font-weight: 600;
			margin-bottom: 1rem;
			color: #999;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
		.add-form {
			background: #1a1a20;
			border: 1px solid #2a2a34;
			border-radius: 10px;
			padding: 1.25rem;
			margin-bottom: 2rem;
		}
		.form-row {
			display: flex;
			gap: 0.75rem;
			flex-wrap: wrap;
		}
		.form-field {
			display: flex;
			flex-direction: column;
			gap: 0.3rem;
			flex: 1;
			min-width: 160px;
		}
		label {
			font-size: 0.8rem;
			color: #888;
		}
		.form-actions {
			margin-top: 1rem;
		}
		.empty {
			color: #444;
			font-size: 0.9rem;
			padding: 1rem 0;
		}
	</style>
</head>
<body>
	<div class="page">
		<h1>Links</h1>
		${message ? `<div class="message">${escapeHtml(message)}</div>` : ''}

		<h2>Page Settings</h2>
		<div class="add-form">
			<form method="POST" action="/admin/links">
				<input type="hidden" name="_action" value="settings">
				<div class="form-row">
					<div class="form-field">
						<label for="page-title">Page title (leave blank to hide)</label>
						<input class="input" id="page-title" name="pageTitle" value="${escapeHtml(settings.title)}">
					</div>
					<div class="form-field">
						<label for="page-subtitle">Subtitle (leave blank to hide)</label>
						<input class="input" id="page-subtitle" name="pageSubtitle" value="${escapeHtml(settings.subtitle)}">
					</div>
				</div>
				<div class="form-actions">
					<button class="btn btn-primary" type="submit">Save Settings</button>
				</div>
			</form>
		</div>

		<table>
			<thead>
				<tr>
					<th>#</th>
					<th>Title</th>
					<th>URL</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				${links.length > 0 ? linkRows : `<tr><td colspan="4" class="empty">No links yet. Add one below.</td></tr>`}
			</tbody>
		</table>

		<h2>Add Link</h2>
		<div class="add-form">
			<form method="POST" action="/admin/links">
				<input type="hidden" name="_action" value="add">
				<div class="form-row">
					<div class="form-field">
						<label for="title">Title</label>
						<input class="input" id="title" name="title" placeholder="My Website" required>
					</div>
					<div class="form-field">
						<label for="url">URL</label>
						<input class="input" id="url" name="url" type="url" placeholder="https://example.com" required>
					</div>
				</div>
				<div class="form-actions">
					<button class="btn btn-primary" type="submit">Add Link</button>
				</div>
			</form>
		</div>
	</div>
</body>
</html>`;
};

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);
		const path = url.pathname;

		// Public link tree page at root
		if (path === '/' || path === '/qr') {
			const [links, settings] = await Promise.all([
				getLinks(env.LINKS_KV), getPageSettings(env.LINKS_KV),
			]);
			return htmlResponse(renderLinkTreePage(links, settings));
		}

		// Admin UI for managing links
		if (path === '/admin/links') {
			const settings = await getPageSettings(env.LINKS_KV);
			if (request.method === 'POST') {
				const formData = await request.formData();
				const action = formData.get('_action');
				const links = await getLinks(env.LINKS_KV);

				if (action === 'settings') {
					const title = formData.get('pageTitle');
					const subtitle = formData.get('pageSubtitle');
					const updated = {
						title: typeof title === 'string' ? title.trim() : settings.title,
						subtitle: typeof subtitle === 'string' ? subtitle.trim() : settings.subtitle,
					};
					await env.LINKS_KV.put('page-settings', JSON.stringify(updated));
					return htmlResponse(renderAdminPage(links, updated, 'Page settings saved.'));
				}

				if (action === 'add') {
					const title = (formData.get('title') as string | null)?.trim();
					const linkUrl = (formData.get('url') as string | null)?.trim();
					if (title && linkUrl) {
						links.push({ id: crypto.randomUUID(), title, url: linkUrl });
						await putLinks(env.LINKS_KV, links);
						return htmlResponse(renderAdminPage(links, settings, 'Link added.'));
					}
					return htmlResponse(renderAdminPage(links, settings, 'Title and URL are required.'));
				}

				if (action === 'delete') {
					const id = formData.get('id') as string | null;
					const updated = links.filter(l => l.id !== id);
					await putLinks(env.LINKS_KV, updated);
					return htmlResponse(renderAdminPage(updated, settings, 'Link deleted.'));
				}

				if (action === 'edit') {
					const id = formData.get('id') as string | null;
					const title = (formData.get('title') as string | null)?.trim();
					const linkUrl = (formData.get('url') as string | null)?.trim();
					const updated = links.map(l => l.id === id && title && linkUrl ? { ...l, title, url: linkUrl } : l);
					await putLinks(env.LINKS_KV, updated);
					return htmlResponse(renderAdminPage(updated, settings, 'Link saved.'));
				}

				return htmlResponse(renderAdminPage(links, settings));
			}

			const links = await getLinks(env.LINKS_KV);
			return htmlResponse(renderAdminPage(links, settings));
		}

		return new Response('Not found', { status: 404 });
	},
};
