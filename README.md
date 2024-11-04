# TankTroubleAddons

[![Chrome Web Store](https://img.shields.io/badge/Chrome-21262d.svg?&style=flat-square&logo=google-chrome&logoColor=c9d1d9)](https://chrome.google.com/webstore/detail/tanktroubleaddons/iaahklbbofakekcbhbjnpjbgaadhedhm)
<!--
[![Apple App Store](https://img.shields.io/badge/Safari-21262d.svg?&style=flat-square&logo=safari&logoColor=c9d1d9)]()
[![Edge Addons](https://img.shields.io/badge/Edge-21262d.svg?&style=flat-square&logo=microsoft-edge&logoColor=c9d1d9)]()
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-21262d.svg?&style=flat-square&logo=firefox-browser&logoColor=c9d1d9)]()
[![Opera Addons](https://img.shields.io/badge/Opera-21262d.svg?&style=flat-square&logo=opera&logoColor=c9d1d9)]()
-->

TankTroubleAddons is the all-encompassing extension for your TankTrouble needs.

With 30+ additions, Addons implements key features to the game, enhancing your user experience and the game itself.

Key features include:

- Dark theme
- Texture packs
- Classic-isque mouse control
- IronVault integration
- Forum, chat, game, lobby, emporium, player *and* admin quality-of-life improvements

This repository contains the source code for TankTroubleAddons v2.  
For legacy TankTroubleAddons, see [turtlesteak/TankTroubleAddonsFinale](https://github.com/turtlesteak/TankTroubleAddonsFinale)

## Minimum browser version

TankTroubleAddons compiles to ES2023 spec. The minimum browser version required to run this addons must support the ECMAScript 2023 specifications.
See the table below for safe minimum requirements.

## To-do

- Ensure support for all major platforms
- Add to Chrome Webstore, Firefox add-ons, Safari extensions and Opera add-ons
- Complete [Features checklist](https://github.com/CommanderAnime/TankTroubleAddons/issues/1) before full release

## Build instructions

Requirements:
- Browser (Chromium, Firefox or Webkit)
- nvm or node >= 16
- pnpm (our package manager)

1. Fork/clone this repository
2. Navigate to the root of the repository
3. Run `pnpm install` and wait for install
4. **Watching/compiling the extension**
   - `pnpm run dev` — defaults to manifest v3.  
     Compiles a dev build (no minification) and watches for changes.  
     Run `pnpm run dev:mv2` or `pnpm run dev:mv3` to target a specific manifest version
   - `pnpm run build:dev`: compile a dev build for all platforms
   - `pnpm run build:prod`: compile a production (minified) build for all platforms
   - `pnpm run clean`: delete the build and dist folders
   - `pnpm run lint`: run eslint on the project
5. **Installing TankTroubleAddons in your browser**
   - **Chromium browsers (Chrome, Edge, Opera)**
     1. Go to one of the following  
       [chrome://extensions/](chrome://extensions) (Chrome)  
       [edge://extensions/](edge://extensions/) (Microsoft Edge)  
       [opera:extensions](opera:extensions) (Opera)
     2. [x] Check on `Developer mode`
     3. Click on `Load unpacked`
     4. Select the `build` or `dist` folder depending on your needs.
     5. To reload the extension, press the spinner icon to load all your changes!
   - **Firefox**
     1. Go to [about:debugging](about:debugging)
     2. Click `This Firefox`
     3. Press the `Load Temporary Add-on...` button.
     4. Select the manifest.json file in your folder of need.
   - **Safari**
     1. See [here](https://stackoverflow.com/a/41543650/11452298) or [here](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension#3744467)!

Happy hacking!
