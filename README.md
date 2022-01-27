# TankTroubleAddons 2

TankTroubleAddons 2, a complete rewrite of the original addons compatiable with the obligatory migration to Manifest V3.
Written in TypeScript and SASS, compiled with Gulp!

## To-do's

- Implement markdown in the forum
- Recreate dark theme in SASS
- Add to Chrome Webstore, Firefox, Safari and Opera

## Features checklist

- [ ] Dark Theme
- [ ] Forum Markdown
- [ ] Round timer
- [ ] All previous addons features

## Installing and running for development

1. Clone/fork this repository.
2. Make sure your Node version is >= 14 with `node -v` in your CLI!
3. Run `npm install` to install the necessary dependencies.
4. Running for development:
   - `npm run build:dev` — Compile for development.
   - `npm run build:watch` — Compile for development and watch for file changes in src.
   - `npm run build:prod` — Compile and minify for a production build.
   - `npm run clean` — Delete the build and distribution folders.
5. Loading TankTroubleAddons in your browser
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
