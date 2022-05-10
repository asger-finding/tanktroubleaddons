# **TankTroubleAddons v2**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-21262d.svg?&style=flat-square&logo=google-chrome&logoColor=c9d1d9)](https://chrome.google.com/webstore/detail/tanktroubleaddons/iaahklbbofakekcbhbjnpjbgaadhedhm)
<!--
[![Apple App Store](https://img.shields.io/badge/Safari-21262d.svg?&style=flat-square&logo=safari&logoColor=c9d1d9)]()
[![Edge Addons](https://img.shields.io/badge/Edge-21262d.svg?&style=flat-square&logo=microsoft-edge&logoColor=c9d1d9)]()
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-21262d.svg?&style=flat-square&logo=firefox-browser&logoColor=c9d1d9)]()
[![Opera Addons](https://img.shields.io/badge/Opera-21262d.svg?&style=flat-square&logo=opera&logoColor=c9d1d9)]()
-->

TankTroubleAddons v2, a complete rewrite of the original addons compatible with the obligatory migration to Manifest V3. (Thanks, Google!)  
Written in TypeScript with a SASS preprocessor, compiled with gulp.

## Minimum browser version

TankTroubleAddons compiles to ES2020 spec. The minimum browser version required to run this addons must support the ECMAScript 2020 specifications.
See the table below for safe minimum requirements.

| **Browser** | **Minimum** |
|-------------|-------------|
| Chromium    | 84          |
| Safari      | 14          |
| Edge        | 84          |
| Firefox     | 76          |
| Opera       | 69          |

## To-do's

- Compile extension for support on all major browsers.
- Add to Chrome Webstore, Firefox, Safari and Opera

- [x] [Features checklist](https://github.com/CommanderAnime/TankTroubleAddons/issues/1)

## Installing and running for development **(chromium-only)**

1. Fork/clone this repository.
2. Make sure your Node.js version is >= 16.x, checking with `node -v` in your terminal!
3. Navigate to your cloned repository, then run `npm install` to install the project's necessary dependencies.
4. **Compiling for development**
   - `npm run build:dev` — compile dev extensions for all platforms.
   - `npm run build:watch` — for development and watch for file changes in src. Append `:` + your browser to watch to the end to watch a specific platform.
   - `npm run build:prod` — and minify for a production build
   - `npm run clean` — delete the build and distribution folders
5. **Running TankTroubleAddons in your browser**
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
     1. See [this](https://stackoverflow.com/a/41543650/11452298) or [this](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension#3744467)!

Happy hacking!

## Useful tools for development

Of course, this all comes down to preference. Your setup is completely up to you!  
I use Visual Studio Code on Windows with these useful extensions

- ESLint
- EditorConfig for VS Code
- Bracket Pair Colorizer 2
- markdownlint
- Beautify
- GitLens
- YAML
- Material Icon Theme
- GitHub Copilot (invite-only)

## Final notes

A heartfelt thank you goes out to everyone in the TankTrouble community.  
This game has become a huge part of my life and has helped me shape my roadmap for the future.  
For the many years, thank you. May there be many more to come.
