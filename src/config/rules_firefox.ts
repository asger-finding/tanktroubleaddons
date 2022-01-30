chrome.webRequest.onBeforeRequest.addListener(function(details) {
    if (details.url.includes('forum.js')) {
        return { redirectUrl: chrome.runtime.getURL('/script/injects/forum/forum.js') };
    }
}, {
    urls: ['*://*.tanktrouble.com/*'],
    types: ['script']
}, [ 'blocking' ]);
