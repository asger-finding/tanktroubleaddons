# TankTroubleAddons v2

[![Chrome Web Store](https://img.shields.io/badge/Chrome-21262d.svg?&style=flat-square&logo=google-chrome&logoColor=c9d1d9)](https://chrome.google.com/webstore/detail/tanktroubleaddons/iaahklbbofakekcbhbjnpjbgaadhedhm)
[![Apple App Store](https://img.shields.io/badge/Safari-21262d.svg?&style=flat-square&logo=safari&logoColor=c9d1d9)]()
[![Edge Addons](https://img.shields.io/badge/Edge-21262d.svg?&style=flat-square&logo=microsoft-edge&logoColor=c9d1d9)]()
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-21262d.svg?&style=flat-square&logo=firefox-browser&logoColor=c9d1d9)]()
[![Opera Addons](https://img.shields.io/badge/Opera-21262d.svg?&style=flat-square&logo=opera&logoColor=c9d1d9)]()

TankTroubleAddons v2, a complete rewrite of the original addons compatiable with the obligatory migration to Manifest V3. (Thanks, Google!)\
Written in TypeScript with a SASS preprocessor, compiled with Gulp.

## Minimum browser version

TankTroubleAddons compiles to ES2020 spec. The minimum browser version required to run this addons must be a ECMAScript 2020 release.\
See the table below for safe minimum requirements.

| **Browser** | **Minimum** |
|-------------|-------------|
| Chromium    | 84          |
| Safari      | 14          |
| Edge        | 84          |
| Firefox     | 76          |
| Opera       | 69          |

## To-do's

- Compile eextension for support on all major browsers.
- Add to Chrome Webstore, Firefox, Safari and Opera

## Features checklist

- [ ] Dark Theme
- [ ] Forum Markdown
- [ ] Round timer
- [ ] All previous addons features

## Installing and running for development

1. Fork/clone this repository.
2. Make sure your Node.js version is >= 16.xx, checking with `node -v` in your terminal!
3. Run `npm install` to install the project's necessary dependencies.
4. **Compiling for development**
   - `npm run build:dev` — for development.
   - `npm run build:watch` — for development and watch for file changes in src.
   - `npm run build:prod` — and minify for a production build.
   - `npm run clean` — delete the build and distribution folders.
5. **Running TankTroubleAddons in your browser**
   - **(most) Chromium browsers**
     1. Go to [chrome://extensions/](chrome://extensions)
     2. Check `Developer mode`
     3. Click on `Load unpacked`
     4. Select the `build` or `dist` folder depending on your needs.
     5. To reload the extension to load all your changes!
   - **Firefox**
     1. Go to [about:debugging](about:debugging)
     2. Click `This Firefox`
     3. Press the `Load Temporary Add-on...` button.
     4. Select your folder of need.
   - **Safari**
     - See [this](https://stackoverflow.com/a/41543650/11452298), [this](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension#3744467), or [this](https://youtu.be/ujjgm9CADmQ)!
   - **Opera**
     1. Go to [opera:extensions](opera:extensions)
     2. Check `Developer mode`
     3. Click on `Load unpacked`
     4. Select your folder of need.

Happy hacking!
