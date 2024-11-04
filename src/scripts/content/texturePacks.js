import { MaxRectsPacker } from 'maxrects-packer';
import { unzip } from 'fflate';

// FIXME: if a texture pack is loaded while in the game, textures break
// reload/rejoin the game or prompt a "are you sure?" if the user
// selects a new texture pack while in a game

/**
 * Frames in the format { [frameName: string]: url as string }
 * @typedef {Record<string, string>} FrameDetails
 */

const packer = new MaxRectsPacker(2048, 2048, 2, {
	smart: true,
	square: true,
	pot: true,
	allowRotation: false,
	tag: false,
	border: 0
});

/**
 * Unzip an arraybuffer
 * @param {ArrayBuffer} buffer Zip file arrayBuffer
 * @returns {Promise<Unzipped>} Promise for unzipped file
 */
const decodeZipFromArrayBuffer = buffer => new Promise((resolve, reject) => {
	const zipFile = new Uint8Array(buffer);
	unzip(zipFile, (err, decoded) => {
		if (err) return reject(err);

		return resolve(decoded);
	});
});

/**
 * Load an image and resolve promise when loaded
 * @param source Image src
 * @returns {Promise<HTMLImageElement>} Image when loaded
 */
const loadSpritesheet = source => new Promise(resolve => {
	const image = new Image();
	image.crossOrigin = 'anonymous';
	image.src = source;

	image.addEventListener('load', () => resolve(image));
});

/**
 * Check if a file ending follows the @2x convention
 * @param {string} urlOrFile String to match
 * @returns Does the string end in @2x.<anyextension>
 */
const is2xFileEnding = urlOrFile => /@2x\.[a-zA-Z0-9]+$/u.test(urlOrFile);

/**
 * Load texture pack from arraybuffer into an already-loaded sprite atlas, overriding textures in it
 * @param {string} atlasKey key
 * @param {ArrayBuffer} buffer Zip file arrayBuffer
 */
Phaser.Loader.prototype.addTexturePack = async function(atlasKey, buffer) {
	// Wait for the atlas to have loaded
	if (!this.cache.hasFrameData(atlasKey)) {
		await new Promise(resolve => {
			this.onFileComplete.add((_progress, key) => {
				if (key === atlasKey) resolve();
			});
		});
	}

	const data = this.cache._cache.image[atlasKey];
	const { url: sourceURL, frameData } = data;
	const is1x = !is2xFileEnding(sourceURL);

	// Decode the zip file and render the original sprite sheet in parallel
	const [files, spritesheet] = await Promise.all([
		decodeZipFromArrayBuffer(buffer),
		loadSpritesheet(sourceURL)
	]);

	await Promise.all(Object.keys(files).map(async fileName => {
		// Load the image into buffer
		const blob = new Blob([files[fileName]], { type: 'image/png' });
		let bmp = await createImageBitmap(blob);

		// Resize to 1x if the game is in low-fi
		if (is1x) {
			const { width, height } = bmp;
			bmp.close();
			bmp = await createImageBitmap(blob, {
				resizeWidth: width / 2,
				resizeHeight: height / 2,
				resizeQuality: 'pixelated'
			});
		}

		// Create frame name from file name
		const [ext] = (fileName.match(/\.(?:[^.]*?)(?=\?|#|$)/u) ?? ['']);
		const frameName = fileName.slice(0, -ext.length);

		// Load into image packer
		packer.add({
			width: bmp.width,
			height: bmp.height,
			image: bmp,
			frameName
		});
	}));

	const bin = packer.bins[packer.bins.length - 1];

	const canvas = document.createElement('canvas');
	canvas.width = spritesheet.width;
	canvas.height = spritesheet.height + bin.height;

	// Draw original spritesheet onto dummy canvas
	const context = canvas.getContext('2d');
	context.drawImage(spritesheet, 0, 0);

	// Draw texture pack frames onto the extended canvas below
	for (const rect of packer.rects) {
		context.drawImage(rect.image, rect.x, rect.y + spritesheet.height);
		rect.image.close();

		const exists = frameData.checkFrameName(rect.frameName);
		if (exists) {
			const frame = frameData.getFrameByName(rect.frameName);

			frame.x = rect.x;
			frame.y = rect.y + spritesheet.height;
			frame.width = rect.width;
			frame.height = rect.height;
			frame.rotated = false;
		} else {
			frameData.addFrame(new Phaser.Frame(
				frameData._frames.length,
				rect.x,
				rect.y + originalSpritesheet.height,
				rect.width,
				rect.height,
				rect.frameName
			));
		}
	}

	// Create image from canvas
	const newImg = await loadSpritesheet(canvas.toDataURL());
	data.base = new PIXI.BaseTexture(newImg);

	packer.reset();
};

const gamePreloadStage = Game.UIPreloadState.getMethod('preload');
Game.UIPreloadState.method('preload', function(...args) {
	const result = gamePreloadStage.apply(this, ...args);

	const files = Addons.menu.content.find('#texturepackpicker').prop('files');
	if (files && files.length) {
		const [file] = files;
		const fileReader = new FileReader();

		fileReader.addEventListener('load', () => {
			const data = fileReader.result;
			GameManager.getGame()?.load.addTexturePack('game', data);
		});

		fileReader.readAsArrayBuffer(file);
	}

	if (this.game.device.pixelRatio > 1) {
		this.load.image('tankiconplaceholderaddons-small', Addons.t_url('assets/lobby/placeholder-140@2x.png'));
		this.load.image('tankiconplaceholderaddons-large', Addons.t_url('assets/lobby/placeholder-320@2x.png'));
	} else {
		this.load.image('tankiconplaceholderaddons-small', Addons.t_url('assets/lobby/placeholder-140.png'));
		this.load.image('tankiconplaceholderaddons-large', Addons.t_url('assets/lobby/placeholder-320.png'));
	}

	return result;
});

export const _isESmodule = true;
