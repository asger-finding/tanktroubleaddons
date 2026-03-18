import { setBrowserNamespace } from '../scripts/common/set-browser-namespace.js';

setBrowserNamespace();

const rules: Array<{
	urlFilter: RegExp;
} & ({ redirectUrl: string } | { extensionPath: string })> = [
	// Rule 1: jQuery + jQuery Migrate combined
	{
		urlFilter: /^https:\/\/code\.jquery\.com\/jquery-1\.\d+\.\d+\.min\.js/u,
		redirectUrl: 'https://cdn.jsdelivr.net/combine/npm/jquery@3.7.1/dist/jquery.min.js,npm/jquery-migrate@1.4.1/dist/jquery-migrate.min.js'
	},
	// Rule 2: jQuery UI
	{
		urlFilter: /^https:\/\/code\.jquery\.com\/ui\/1\.\d+\.\d+\/jquery-ui.*\.js/u,
		redirectUrl: 'https://code.jquery.com/ui/1.14.1/jquery-ui.min.js'
	},
	// Rule 3: jQuery UI CSS
	{
		urlFilter: /^https:\/\/code\.jquery\.com\/ui\/1\.\d+\.\d+\/themes\/smoothness\/jquery-ui.*\.css/u,
		extensionPath: '/css/jquery-ui.css'
	},
	// Rule 4: App Store SVG
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/snippets\/downloadOnTheAppStore\.svg/u,
		extensionPath: '/assets/snippets/downloadOnTheAppStore.svg'
	},
	// Rules 5-10: back27 accessories
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back27-140\.png/u,
		extensionPath: '/assets/accessories/back27-140.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back27-140@2x\.png/u,
		extensionPath: '/assets/accessories/back27-140@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back27-200\.png/u,
		extensionPath: '/assets/accessories/back27-200.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back27-200@2x\.png/u,
		extensionPath: '/assets/accessories/back27-200@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back27-320\.png/u,
		extensionPath: '/assets/accessories/back27-320.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back27-320@2x\.png/u,
		extensionPath: '/assets/accessories/back27-320@2x.{{png|avif}}'
	},
	// Rules 11-16: back28 accessories
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back28-140\.png/u,
		extensionPath: '/assets/accessories/back28-140.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back28-140@2x\.png/u,
		extensionPath: '/assets/accessories/back28-140@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back28-200\.png/u,
		extensionPath: '/assets/accessories/back28-200.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back28-200@2x\.png/u,
		extensionPath: '/assets/accessories/back28-200@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back28-320\.png/u,
		extensionPath: '/assets/accessories/back28-320.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back28-320@2x\.png/u,
		extensionPath: '/assets/accessories/back28-320@2x.{{png|avif}}'
	},
	// Rules 17-22: back29 accessories
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back29-140\.png/u,
		extensionPath: '/assets/accessories/back29-140.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back29-140@2x\.png/u,
		extensionPath: '/assets/accessories/back29-140@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back29-200\.png/u,
		extensionPath: '/assets/accessories/back29-200.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back29-200@2x\.png/u,
		extensionPath: '/assets/accessories/back29-200@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back29-320\.png/u,
		extensionPath: '/assets/accessories/back29-320.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back29-320@2x\.png/u,
		extensionPath: '/assets/accessories/back29-320@2x.{{png|avif}}'
	},
	// Rules 23-28: back30 accessories
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back30-140\.png/u,
		extensionPath: '/assets/accessories/back30-140.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back30-140@2x\.png/u,
		extensionPath: '/assets/accessories/back30-140@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back30-200\.png/u,
		extensionPath: '/assets/accessories/back30-200.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back30-200@2x\.png/u,
		extensionPath: '/assets/accessories/back30-200@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back30-320\.png/u,
		extensionPath: '/assets/accessories/back30-320.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back30-320@2x\.png/u,
		extensionPath: '/assets/accessories/back30-320@2x.{{png|avif}}'
	},
	// Rules 29-34: back31 accessories
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back31-140\.png/u,
		extensionPath: '/assets/accessories/back31-140.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back31-140@2x\.png/u,
		extensionPath: '/assets/accessories/back31-140@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back31-200\.png/u,
		extensionPath: '/assets/accessories/back31-200.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back31-200@2x\.png/u,
		extensionPath: '/assets/accessories/back31-200@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back31-320\.png/u,
		extensionPath: '/assets/accessories/back31-320.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back31-320@2x\.png/u,
		extensionPath: '/assets/accessories/back31-320@2x.{{png|avif}}'
	},
	// Rules 35-40: back32 accessories
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back32-140\.png/u,
		extensionPath: '/assets/accessories/back32-140.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back32-140@2x\.png/u,
		extensionPath: '/assets/accessories/back32-140@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back32-200\.png/u,
		extensionPath: '/assets/accessories/back32-200.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back32-200@2x\.png/u,
		extensionPath: '/assets/accessories/back32-200@2x.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back32-320\.png/u,
		extensionPath: '/assets/accessories/back32-320.{{png|avif}}'
	},
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/assets\/images\/accessories\/back32-320@2x\.png/u,
		extensionPath: '/assets/accessories/back32-320@2x.{{png|avif}}'
	},
	// Rule 41: Phaser CE
	{
		urlFilter: /^https:\/\/cdn\.tanktrouble\.com\/RELEASE-[^/]+\/js\/phaser\/phaser\.min\.js/u,
		redirectUrl: 'https://github.com/phaserjs/phaser-ce/releases/download/v2.20.2/phaser{{|.min}}.js'
	}
];

// Collect external redirect targets to prevent re-intercepting redirected requests
const redirectTargets = new Set(
	rules.filter((rule): rule is typeof rule & { redirectUrl: string } => 'redirectUrl' in rule).map(rule => rule.redirectUrl)
);

/**
 * Setup webRequest listener to intercept and redirect requests
 */
const setupWebRequestListener = () => {
	browser.webRequest.onBeforeRequest.addListener(details => {
		if (redirectTargets.has(details.url)) return {};

		for (const rule of rules) {
			if (rule.urlFilter.test(details.url)) {
				if ('redirectUrl' in rule) return { redirectUrl: rule.redirectUrl };
				return { redirectUrl: browser.runtime.getURL(rule.extensionPath) };
			}
		}

		return {};
	}, {
		urls: ['*://*.tanktrouble.com/*', '*://code.jquery.com/*'],
		types: ['script', 'image', 'stylesheet']
	}, ['blocking']);
};

setupWebRequestListener();
