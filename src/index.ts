export interface Env {
	LINKS_KV: KVNamespace;
}

type Link = {
	id: string;
	title: string;
	url: string;
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

const renderLinkTreePage = (links: Link[]) => {
	const linkButtons = links.length > 0
		? links.map(link => `
		<a href="${escapeHtml(link.url)}" class="link-btn" target="_blank" rel="noopener noreferrer">
			${escapeHtml(link.title)}
		</a>`).join('')
		: '<p class="empty">No links yet.</p>';

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Linktree</title>
	<style>
		*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			background: #0f0f11;
			color: #fff;
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 2rem 1rem;
		}
		.container {
			width: 100%;
			max-width: 480px;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 1rem;
		}
		h1 {
			font-size: 1.5rem;
			font-weight: 700;
			letter-spacing: -0.02em;
		}
		.tagline {
			font-size: 0.95rem;
			color: #888;
			margin-bottom: 0.5rem;
		}
		.links {
			width: 100%;
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			margin-top: 0.5rem;
		}
		.link-btn {
			display: block;
			width: 100%;
			padding: 0.875rem 1.5rem;
			background: #1e1e24;
			border: 1px solid #2e2e38;
			border-radius: 12px;
			color: #fff;
			text-decoration: none;
			font-size: 1rem;
			font-weight: 500;
			text-align: center;
			transition: background 0.15s, border-color 0.15s, transform 0.1s;
		}
		.link-btn:hover {
			background: #27272f;
			border-color: #4a4a5a;
			transform: translateY(-1px);
		}
		.link-btn:active {
			transform: translateY(0);
		}
		.empty {
			color: #555;
			font-size: 0.9rem;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>SongDrive</h1>
		<div class="links">
			${linkButtons}
		</div>
	</div>
</body>
</html>`;
};

const renderAdminPage = (links: Link[], message?: string) => {
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
			const links = await getLinks(env.LINKS_KV);
			return htmlResponse(renderLinkTreePage(links));
		}

		// Admin UI for managing links
		if (path === '/admin/links') {
			if (request.method === 'POST') {
				const formData = await request.formData();
				const action = formData.get('_action');
				const links = await getLinks(env.LINKS_KV);

				if (action === 'add') {
					const title = (formData.get('title') as string | null)?.trim();
					const linkUrl = (formData.get('url') as string | null)?.trim();
					if (title && linkUrl) {
						links.push({ id: crypto.randomUUID(), title, url: linkUrl });
						await putLinks(env.LINKS_KV, links);
						return htmlResponse(renderAdminPage(links, 'Link added.'));
					}
					return htmlResponse(renderAdminPage(links, 'Title and URL are required.'));
				}

				if (action === 'delete') {
					const id = formData.get('id') as string | null;
					const updated = links.filter(l => l.id !== id);
					await putLinks(env.LINKS_KV, updated);
					return htmlResponse(renderAdminPage(updated, 'Link deleted.'));
				}

				if (action === 'edit') {
					const id = formData.get('id') as string | null;
					const title = (formData.get('title') as string | null)?.trim();
					const linkUrl = (formData.get('url') as string | null)?.trim();
					const updated = links.map(l => l.id === id && title && linkUrl ? { ...l, title, url: linkUrl } : l);
					await putLinks(env.LINKS_KV, updated);
					return htmlResponse(renderAdminPage(updated, 'Link saved.'));
				}

				return htmlResponse(renderAdminPage(links));
			}

			const links = await getLinks(env.LINKS_KV);
			return htmlResponse(renderAdminPage(links));
		}

		return new Response('Not found', { status: 404 });
	},
};
