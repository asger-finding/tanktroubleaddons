class Injects {
	constructor() {
		const self = this;

		this.rules.forEach(function(rule, i) {
			self.rules[i].urlFilter = new RegExp(rule.urlFilter);
		});
		this.setupWebRequestSniffer();
	}

	setupWebRequestSniffer() {
		const self = this;
		chrome.webRequest.onBeforeRequest.addListener(function(details) {
			for (let i = 0; i < self.rules.length; i++) {
				const rule = self.rules[i];

				if (rule.urlFilter.test(details.url)) {
					return { redirectUrl: chrome.runtime.getURL(rule.redirectPath) };
				}
			}
		}, {
			urls: ['*://*.tanktrouble.com/*'],
			types: ['script']
		}, ['blocking']);
	}

	rules:any = [
		{
			redirectPath: "/scripts/injects/forum/forum.js",
			urlFilter: "forum.js.*pagespeed."
		},
		{
			redirectPath: "/scripts/injects/game/phaser.js",
			urlFilter: "phaser.min.js.*pagespeed.",
		},
		{
			redirectPath: "/scripts/injects/game/phaser-nineslice.js",
			urlFilter: "phaser-nineslice.min.js.*pagespeed.",
		}
	];
	
}

new Injects();
