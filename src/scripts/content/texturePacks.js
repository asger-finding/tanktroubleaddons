import { MaxRectsPacker } from 'maxrects-packer';
import { calculateHash } from '../utils/mathUtils.js';
import { unzip } from 'fflate';

const storeName = 'texturePacks';

/**
 * Add a zip file entry to the database, storing its extracted content.
 * @param {File} file The zip file to be added.
 * @param {string} name The unique name of the file.
 * @returns {Promise<string>} Resolves with hashsum when the operation is complete.
 */
const addTexturePackToStore = async(file, name) => {
	if (!file.name.endsWith('.zip')) throw new Error('Only zip files are supported.');

	const hashsum = await calculateHash(file);

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		/* eslint-disable jsdoc/require-jsdoc */
		reader.addEventListener('load', async(event) => {
			const arrayBuffer = event.target.result;

			try {
				unzip(new Uint8Array(arrayBuffer), (err, decoded) => {
					if (err) {
						reject(new Error('Error unzipping file'));
						return;
					}

					if (!decoded) {
						reject(new Error('No valid data found in the zip file'));
						return;
					}

					const transaction = Addons.indexedDB.transaction([storeName], 'readwrite');
					const store = transaction.objectStore(storeName);

					const index = store.index('hashsum');
					const hashRequest = index.get(hashsum);

					hashRequest.onsuccess = () => {
						const existingFile = hashRequest.result;

						// Case: File with same hashsum exists
						if (existingFile) {
							if (existingFile.name === name) reject(new Error('File with the same name already exists'));
							else reject(new Error('Identical file already exists'));

							return;
						}

						// Check if a file with the same name exists
						const nameRequest = store.get(name);
						nameRequest.onsuccess = () => {
							const existingEntry = nameRequest.result;
							const timestamp = Date.now();

							if (existingEntry) {
								// Overwrite file with the same name but different hashsum
								store.put({ name, hashsum, timestamp, texturepack: decoded });
								resolve(hashsum);
							} else {
								// New unique file
								store.add({ name, hashsum, timestamp, texturepack: decoded });
								resolve(hashsum);
							}
						};
						nameRequest.onerror = () => reject(nameRequest.error);
					};
					hashRequest.onerror = () => reject(hashRequest.error);
				});
			} catch {
				reject(new Error('An error occurred while processing the zip file'));
			}
		});
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsArrayBuffer(file);
		/* eslint-enable jsdoc/require-jsdoc */
	});
};

/**
 * Retrieve all hashsums and names from the database.
 * @returns {Promise<Array<{ name: string, hashsum: string }>>} Resolves with an array of file entries.
 */
const getAllTexturePacksFromStore = () => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction(storeName, 'readonly');
	const store = transaction.objectStore(storeName);
	const request = store.getAll();

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		const files = request.result.map(({ name, hashsum, timestamp }) => ({ name, hashsum, timestamp }));
		resolve(files);
	};
	request.onerror = () => reject(request.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Retrieve a specific entry by its hashsum.
 * @param {string} hashsum The hashsum of the file to retrieve.
 * @returns {Promise<{ name: string, hashsum: string, timestamp: number }>} Resolves with the file entry.
 */
const getTexturePackFromStore = hashsum => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction([storeName], 'readonly');
	const store = transaction.objectStore(storeName);
	const index = store.index('hashsum');
	const request = index.get(hashsum);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		if (request.result)
			resolve(request.result);
		else
			reject(new Error('No file found'));

	};
	request.onerror = () => reject(request.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Remove an entry from the texture packs object store by its hashsum.
 * @param {string} hashsum The hashsum of the entry to be removed.
 * @returns {Promise<void>} Resolves when the entry is successfully removed or if it does not exist.
 */
const removeTexturePackFromStore = hashsum => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction([storeName], 'readwrite');
	const store = transaction.objectStore(storeName);
	const index = store.index('hashsum');

	const request = index.get(hashsum);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		const entry = request.result;

		if (entry) {
			const deleteRequest = store.delete(entry.name);

			deleteRequest.onsuccess = () => { resolve(); };

			deleteRequest.onerror = () => {
				reject(new Error('Failed to delete the texture pack'));
			};
		} else {
			// Entry does not exist
			resolve();
		}
	};

	request.onerror = () => { reject(new Error('Failed to retrieve the texture pack')); };
	/* eslint-enable jsdoc/require-jsdoc */
});


/**
 * Get the user-loaded texture pack
 * @returns {Uint8Array|null} Texture pack or null
 */
const getActiveTexturePack = () => new Promise((resolve, reject) => {
	const hashsum = localStorage.getItem('texturepack');
	if (hashsum === null) {
		reject('No texture pack set');
		return;
	}

	if (/\b[a-fA-F0-9]{64}\b/u.test(hashsum)) {
		getTexturePackFromStore(hashsum)
			.then(texturePack => resolve(texturePack)).
			catch(err => reject(err));
	} else {
		reject('Texture pack has invalid key');
	}
});

/**
 * Store a new texture pack
 * @param {File} file The zip file to be added.
 * @param {string} name The unique name of the file.
 * @returns {Promise<string|null>} Resolves with hashsum if successfully added
 */
const storeTexturePack = async(file, name) => {
	const hashsum = await addTexturePackToStore(file, name);

	return hashsum;
};

/**
 * Set the active texture pack in local storage
 * @param {string} hashsum The unique hashsum of the texture pack.
 * @returns {Promise<object|null>} Resolves with texture pack object if successfully added, else null
 */
const setActiveTexturePack = async(hashsum) => {
	if (!(/\b[a-fA-F0-9]{64}\b/u).test(hashsum)) return null;

	localStorage.setItem('texturepack', hashsum);

	const activeTexturePack = await Addons.getActiveTexturePack();
	if (activeTexturePack === null) return null;

	GameManager.getGame()?.load.addTexturePack('game', activeTexturePack.texturepack);

	return activeTexturePack;
};

/**
 * Remove a texture pack saved to the store
 * @param {string} hashsum The hashsum of the texture pack to remove
 * @returns {Promise<object>} Resolves when texture pack has been removed
 */
const removeTexturePack = hashsum => new Promise((resolve, reject) => {
	removeTexturePackFromStore(hashsum).finally(() => {
		localStorage.removeItem('texturepack');

		getActiveTexturePack().then(({ hashsum: newHashsum }) => {
			setActiveTexturePack(newHashsum);
		}).catch(err => reject(err));
	});
});

/**
 * Retrieve all hashsums and names.
 * @returns {Promise<Array<{ name: string, hashsum: string }>>} Resolves with an array of file entries.
 */
const getAllTexturePacks = () => getAllTexturePacksFromStore();

Object.assign(Addons, {
	getActiveTexturePack,
	storeTexturePack,
	setActiveTexturePack,
	removeTexturePack,
	getAllTexturePacks
});

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
 * @param {Record<string, Uint8Array>} files Texture pack data
 */
Phaser.Loader.prototype.addTexturePack = async function(atlasKey, files) {
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

	const [ spritesheet ] = await Promise.all([
		loadSpritesheet(sourceURL),
		...Object.keys(files).map(async fileName => {
			if (!fileName.endsWith('.png')) return;

			// Load the image into buffer
			const file = files[fileName];
			const blob = new Blob([file], { type: 'image/png' });
			let bmp = await createImageBitmap(blob);

			// Resize to 1x if the user has low pixel density
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
			const basename = fileName.split('/').at(-1);
			const [ext] = (basename.match(/\.(?:[^.]*?)(?=\?|#|$)/u) ?? ['']);
			const frameName = basename.slice(0, -ext.length);

			// Load into image packer
			packer.add({
				width: bmp.width,
				height: bmp.height,
				image: bmp,
				frameName
			});
		})
	]);

	const bin = packer.bins[packer.bins.length - 1];

	// Assume that no images were packed
	// Thus, we reset the spritesheet
	if (!bin) {
		// FIXME: logic to reload the game entirely
		return;
	}

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
				rect.y + spritesheet.height,
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

	Addons.getActiveTexturePack().then(texturePackData => {
		if (texturePackData === null) return;

		GameManager.getGame()?.load.addTexturePack('game', texturePackData.texturepack);
	});

	return result;
});

export const _isESmodule = true;
