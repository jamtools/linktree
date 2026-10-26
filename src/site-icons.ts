import {
	faBluesky, faDiscord, faFacebook, faGithub, faGitlab, faInstagram,
	faLinkedin, faMastodon, faMedium, faPatreon, faPinterest, faRedditAlien,
	faSpotify, faStackOverflow, faTelegram, faThreads, faTiktok, faTwitch,
	faXTwitter, faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';

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

const renderIcon = (icon: typeof faGithub): string => {
	const [width, height, , , paths] = icon.icon;
	return `<svg class="site-icon" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${(Array.isArray(paths) ? paths : [paths]).map(path => `<path fill="currentColor" d="${path}"></path>`).join('')}</svg>`;
};

export function renderSiteIcon(url: string): string {
	let destination: URL;
	try {
		destination = new URL(url);
	} catch {
		return renderIcon(faGlobe);
	}
	if (destination.protocol !== 'https:' && destination.protocol !== 'http:') return renderIcon(faGlobe);
	const hostname = destination.hostname.toLowerCase().replace(/\.$/, '');
	const domain = Object.keys(siteIcons).find(domain => hostname === domain || hostname.endsWith(`.${domain}`));
	return renderIcon(domain ? siteIcons[domain] : faGlobe);
}
