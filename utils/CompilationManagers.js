const origin = './src';

class TargetManager {
    static Chromium = 'chromium';
    static Firefox = 'firefox';
    static Edge = 'edge';
    static Opera = 'opera';
    static Safari = 'safari';

    static allBut(some) {
        return [ this.Chromium, this.Firefox, this.Edge, this.Opera, this.Safari ]
            .filter(browser => some.includes(browser) === false);
    }

    static getFile(path) {
        return this.files.find(file => file.path === path);
    }

    static files = [ {
            target: TargetManager.Chromium,
            path: `${ origin }/manifest_chromium.yml`,
            resultName: 'manifest.json',
            excludeFrom: TargetManager.allBut([ TargetManager.Chromium, TargetManager.Edge ])
        }, {
            target: TargetManager.Firefox,
            path: `${ origin }/manifest_firefox.yml`,
            resultName: 'manifest.json',
            excludeFrom: TargetManager.allBut([ TargetManager.Firefox ])
        }, {
            target: TargetManager.Chromium,
            path: `${ origin }/config/rules.json`,
            resultName: 'rules.json',
            excludeFrom: TargetManager.allBut([ TargetManager.Chromium, TargetManager.Edge ])
        }
    ]
}

exports.TargetManager = TargetManager;
