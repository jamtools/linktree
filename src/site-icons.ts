import {
	faBluesky, faDiscord, faFacebook, faGithub, faGitlab, faInstagram,
	faLinkedin, faMastodon, faMedium, faPatreon, faPinterest, faRedditAlien,
	faSpotify, faStackOverflow, faTelegram, faThreads, faTiktok, faTwitch,
	faXTwitter, faYoutube,
} from '@fortawesome/free-brands-svg-icons';

// Match destinations, not user-provided labels. Subdomains share their site's icon.
const siteIcons: Record<string, typeof faGithub> = {
	'bsky.app': faBluesky,
	'discord.com': faDiscord,
	'discord.gg': faDiscord,
	'facebook.com': faFacebook,
	'fb.com': faFacebook,
	'github.com': faGithub,
	'gitlab.com': faGitlab,
	'instagram.com': faInstagram,
	'linkedin.com': faLinkedin,
	'mastodon.social': faMastodon,
	'medium.com': faMedium,
	'patreon.com': faPatreon,
	'pinterest.com': faPinterest,
	'reddit.com': faRedditAlien,
	'redd.it': faRedditAlien,
	'spotify.com': faSpotify,
	'stackoverflow.com': faStackOverflow,
	't.me': faTelegram,
	'telegram.me': faTelegram,
	'threads.com': faThreads,
	'threads.net': faThreads,
	'tiktok.com': faTiktok,
	'twitch.tv': faTwitch,
	'twitter.com': faXTwitter,
	'x.com': faXTwitter,
	'youtube.com': faYoutube,
	'youtu.be': faYoutube,
};

export function renderSiteIcon(url: string): string | undefined {
	let destination: URL;
	try {
		destination = new URL(url);
	} catch {
		return;
	}
	if (destination.protocol !== 'https:' && destination.protocol !== 'http:') return;
	const hostname = destination.hostname.toLowerCase().replace(/\.$/, '');
	const domain = Object.keys(siteIcons).find(domain => hostname === domain || hostname.endsWith(`.${domain}`));
	if (!domain) return;
	const [width, height, , , paths] = siteIcons[domain].icon;
	return `<svg class="site-icon" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${(Array.isArray(paths) ? paths : [paths]).map(path => `<path fill="currentColor" d="${path}"></path>`).join('')}</svg>`;
}
