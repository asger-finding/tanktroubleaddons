/**
 * A Phaser 2 plugin for dynamically replacing texture atlases, images and sounds in a game.
 *
 * Usage:
 * In main create function:
 * game.plugins.resourcePack = game.plugins.add(Phaser.Plugin.ResourcePack);
 *
 * To replace multiple resources at once:
 * game.plugins.resourcePack.replaceResources({
 *   atlases: [{
 *     key: 'game',
 *     frames: {
 *       player: playerImage,
 *       enemy: enemyImage
 *     }
 *   }],
 *   images: {
 *     background: newBackgroundImage,
 *     logo: newLogoImage
 *   },
 *   sounds: {
 *     explosion: explosionSoundData,
 *     music: musicSoundData
 *   }
 * });
 *
 * To replace an atlas with new frames:
 * game.plugins.resourcePack.insertFramesIntoAtlas('game', frames);
 *
 * To replace a single image:
 * game.plugins.resourcePack.replaceImage('imageKey', newImg);
 *
 * To replace a sound:
 * game.plugins.resourcePack.replaceSound('soundKey', soundData);
 * @class Phaser.Plugin.ResourcePack
 * @augments Phaser.Plugin
 * @param {Phaser.Game} game Reference to the current game instance
 * @param {object} parent The parent object
 */
import { MaxRectsPacker } from 'maxrects-packer';

Phaser.Plugin.ResourcePack = function(game, parent) {
	Phaser.Plugin.call(this, game, parent);

	/** @protected */
	this.Packer = new MaxRectsPacker(2048, 2048, 2, {
		smart: true,
		square: false,
		pot: true,
		allowRotation: false,
		tag: false,
		border: 1
	});

	/**
	 * Waits for an image to load in the Phaser cache.
	 * @private
	 * @function Phaser.Plugin.ResourcePack#waitForImageLoad
	 * @param {string} imageKey The key of the image to wait for
	 * @returns {Promise<void>}
	 */
	this.waitForImageLoad = function(imageKey) {
		return new Promise(resolve => {
			if (!this.game.cache.checkImageKey(imageKey) || !this.game.cache.hasFrameData(imageKey)) {
				/**
				 * Resolve when file has comleted load
				 * @param {number} _progress Percent progress indication
				 * @param {string} key File key
				 */
				const listener = (_progress, key) => {
					if (key === imageKey) {
						this.game.load.onFileComplete.remove(listener);
						resolve();
					}
				};
				this.game.load.onFileComplete.add(listener);
			} else {
				resolve();
			}
		});
	};

	/**
	 * Waits for a sound to load in the Phaser sound manager.
	 * @private
	 * @function Phaser.Plugin.ResourcePack#waitForSoundLoad
	 * @param {string} soundKey The key of the sound to wait for
	 * @returns {Promise<void>}
	 */
	this.waitForSoundLoad = function(soundKey) {
		return new Promise(resolve => {
			if (!this.game.cache.checkSoundKey(soundKey)) {
				/**
				 * Resolve when the file has decoded
				 * @param {string} key Sound key
				 */
				const listener = key => {
					if (key === soundKey) {
						this.game.sound.onSoundDecode.remove(listener);
						resolve();
					}
				};
				this.game.sound.onSoundDecode.add(listener);
			} else {
				resolve();
			}
		});
	};

	/**
	 * Checks if the atlas URL uses the @2x convention, indicating Retina resolution.
	 * @private
	 * @function Phaser.Plugin.ResourcePack#is1xResolution
	 * @param {string} url The atlas URL identifier
	 * @returns {boolean} true if the atlas is 1x resolution
	 */
	this.is1xResolution = function(url) {
		return !/@2x\.[a-zA-Z0-9]+$/u.test(url);
	};

	/**
	 * Scales frame data for 2x resolution.
	 * @private
	 * @function Phaser.Plugin.ResourcePack#scaleFrameData
	 * @param {Phaser.FrameData} frameData The frame data to scale
	 */
	this.scaleFrameData = function(frameData) {
		frameData._frames.forEach(frame => {
			frame.bottom *= 2;
			frame.x *= 2;
			frame.y *= 2;
			frame.width *= 2;
			frame.height *= 2;
			frame.centerX *= 2;
			frame.centerY *= 2;
			frame.sourceSizeW *= 2;
			frame.sourceSizeH *= 2;
			frame.right *= 2;
		});
	};

	/**
	 * Draws the image onto the canvas at the given coordinates with 1px padding.
	 * @private
	 * @function Phaser.Plugin.ResourcePack#drawFrameToCanvas
	 * @param {CanvasRenderingContext2D} context The canvas context
	 * @param {object} rect The packed rectangle data with x, y, width, height, and image
	 * @param {number} spritesheetHeight The height of the original spritesheet
	 */
	this.drawFrameToCanvas = function(context, rect, spritesheetHeight) {
		const { x, y, width, height, image } = rect;
		const drawY = y + spritesheetHeight;

		// Draw image
		context.drawImage(image, x, drawY);

		// Draw 1px padding to correct sizing issues
		// Top, bottom, left, right borders
		context.drawImage(image, 0, 0, width, 1, x, drawY - 1, width, 1);
		context.drawImage(image, 0, height - 1, width, 1, x, drawY + height, width, 1);
		context.drawImage(image, 0, 0, 1, height, x - 1, drawY, 1, height);
		context.drawImage(image, width - 1, 0, 1, height, x + width, drawY, 1, height);

		// Corners: top-left, top-right, bottom-left, bottom-right
		context.drawImage(image, 0, 0, 1, 1, x - 1, drawY - 1, 1, 1);
		context.drawImage(image, width - 1, 0, 1, 1, x + width, drawY - 1, 1, 1);
		context.drawImage(image, 0, height - 1, 1, 1, x - 1, drawY + height, 1, 1);
		context.drawImage(image, width - 1, height - 1, 1, 1, x + width, drawY + height, 1, 1);
	};

	/**
	 * Inserts or updates frame data for resource pack frames.
	 * @private
	 * @function Phaser.Plugin.ResourcePack#insertFrameData
	 * @param {Phaser.FrameData} frameData The frame data to update
	 * @param {object} rect The packed rectangle data with x, y, width, height, and frameName
	 * @param {number} spritesheetHeight The height of the original spritesheet
	 */
	this.insertFrameData = function(frameData, rect, spritesheetHeight) {
		const exists = frameData.checkFrameName(rect.frameName);
		const frame = exists
			? frameData.getFrameByName(rect.frameName)
			: new Phaser.Frame(frameData._frames.length, rect.x, rect.y + spritesheetHeight, rect.width, rect.height, rect.frameName);

		if (exists) {
			frame.x = rect.x;
			frame.y = rect.y + spritesheetHeight;
			frame.rotated = false;
			frame.resize(rect.width, rect.height);
		} else {
			frameData.addFrame(frame);
		}
	};
};

Phaser.Plugin.ResourcePack.prototype = Object.create(Phaser.Plugin.prototype);
Phaser.Plugin.ResourcePack.prototype.constructor = Phaser.Plugin.ResourcePack;

/**
 * Batch replaces multiple resources in a single call.
 * @function Phaser.Plugin.ResourcePack#replaceResources
 * @public
 * @param {object} resources Resources to replace
 * @param {Array<{key: string, frames: object}>} resources.atlases Atlas replacements
 * @param {object} resources.images Image replacements (key: newImage)
 * @param {object} resources.sounds Sound replacements (key: soundData)
 * @returns {Promise<boolean>} true if all replacements succeeded
 */
Phaser.Plugin.ResourcePack.prototype.replaceResources = async function(resources) {
	try {
		const atlasPromises = (resources.atlases || []).map(async atlas => this.insertFramesIntoAtlas(atlas.key, atlas.frames));
		const imagePromises = Object.entries(resources.images || {}).map(async([key, image]) => this.replaceImage(key, image));
		const soundPromises = Object.entries(resources.sounds || {}).map(async([key, soundData]) => this.replaceSound(key, soundData));

		const results = await Promise.all([
			...atlasPromises,
			...imagePromises,
			...soundPromises
		]);

		// Check if all succeeded
		return results.every(success => success === true);
	} catch (error) {
		console.error('Batch replace failed:', error);

		return false;
	}
};

/**
 * Inserts pre-loaded resource pack images into an existing sprite atlas, overriding existing textures.
 * @function Phaser.Plugin.ResourcePack#insertFramesIntoAtlas
 * @public
 * @param {string} atlasKey The Phaser atlas key (e.g., 'game')
 * @param {Record<string, HTMLImageElement | ImageBitmap>} frames Resource pack images with frame names as keys
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise
 */
// eslint-disable-next-line complexity
Phaser.Plugin.ResourcePack.prototype.insertFramesIntoAtlas = async function(atlasKey, frames) {
	try {
		await this.waitForImageLoad(atlasKey);

		const data = this.game.cache.getItem(atlasKey, Phaser.Cache.IMAGE);
		if (!data) return false;

		const { url: sourceURL, frameData, base: baseTexture } = data;
		const is1x = this.is1xResolution(sourceURL);
		let spritesheet = baseTexture.source;

		// Resize atlas for 1x resolution if needed
		if (is1x && Object.keys(frames).length) {
			const { width, height } = spritesheet;
			spritesheet = await createImageBitmap(spritesheet, {
				resizeWidth: width * 2,
				resizeHeight: height * 2,
				resizeQuality: 'pixelated'
			});
			this.scaleFrameData(frameData);
		}

		// Pack textures
		const images = await Promise.all(
			Object.keys(frames).map(async frameName => ({
				width: frames[frameName].width,
				height: frames[frameName].height,
				image: frames[frameName],
				frameName
			}))
		);
		for (const { width, height, image, frameName } of images) this.Packer.add({ width, height, image, frameName });

		const bin = this.Packer.bins[this.Packer.bins.length - 1];
		if (!bin) {
			spritesheet.close?.();
			this.Packer.reset();

			return false;
		}

		// Setup new atlas canvas
		const canvas = document.createElement('canvas');
		canvas.width = spritesheet.width;
		canvas.height = spritesheet.height + bin.height;
		const context = canvas.getContext('2d');
		context.drawImage(spritesheet, 0, 0);

		// Draw frames with padding
		for (const rect of this.Packer.rects) {
			this.drawFrameToCanvas(context, rect, spritesheet.height);
			this.insertFrameData(frameData, rect, spritesheet.height);
			rect.image.close?.();
		}

		// Create image from canvas
		const newImg = new Image();
		newImg.src = canvas.toDataURL();
		await new Promise(resolve => { newImg.onload = resolve; });

		// Update atlas texture
		const success = await this.replaceImage(atlasKey, newImg);
		if (is1x) this.game.cache._cache.image[atlasKey].base.resolution = 2;

		spritesheet.close?.();
		this.Packer.reset();

		return success;
	} catch (error) {
		console.error('Failed to insert frames into atlas:', error);

		this.Packer.reset();
		return false;
	}
};

/**
 * Replaces an existing image in the Phaser cache with a new image
 * @function Phaser.Plugin.ResourcePack#replaceImage
 * @public
 * @param {string} imageKey The key of the image to replace
 * @param {HTMLImageElement | ImageBitmap} newImg The new image to use
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise
 */
Phaser.Plugin.ResourcePack.prototype.replaceImage = async function(imageKey, newImg) {
	try {
		await this.waitForImageLoad(imageKey);

		const imageData = this.game.cache._cache.image[imageKey];
		if (!imageData) return false;

		const { url: sourceURL } = imageData;
		const is1x = this.is1xResolution(sourceURL);

		this.game.cache._cache.image[imageKey].base = new PIXI.BaseTexture(newImg);
		if (is1x) this.game.cache._cache.image[imageKey].base.resolution = 2;

		return true;
	} catch (error) {
		console.error('Failed to replace image:', error);

		return false;
	}
};

/**
 * Replaces an existing sound in the Phaser cache with new sound data
 * @function Phaser.Plugin.ResourcePack#replaceSound
 * @public
 * @param {string} soundKey The key of the sound to replace
 * @param {ArrayBuffer} soundData The new sound data as an ArrayBuffer
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise
 */
Phaser.Plugin.ResourcePack.prototype.replaceSound = async function(soundKey, soundData) {
	try {
		await this.waitForSoundLoad(soundKey);

		const sound = this.game.cache.getSound(soundKey);
		if (!sound) return false;

		const buffer = await this.game.sound.context.decodeAudioData(soundData);
		this.game.cache.decodedSound(soundKey, buffer);
		this.game.sound.onSoundDecode.dispatch(soundKey, sound);
		this.game.cache.reloadSoundComplete(soundKey);
		return true;
	} catch (error) {
		console.error('Failed to replace sound:', error);

		return false;
	}
};
