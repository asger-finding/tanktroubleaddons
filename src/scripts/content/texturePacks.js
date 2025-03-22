import { MaxRectsPacker } from 'maxrects-packer';
import { calculateFileHash } from '../utils/mathUtils.js';
import { unzip } from 'fflate';

const storeName = 'texturePacks';

/**
 * Add a zip file entry to the database, storing its extracted content
 * @protected
 * @param {File} file The zip file to be added
 * @param {string} name The unique name of the file
 * @param {boolean} builtIn Is the texture pack user-added or built-in?
 * @returns {Promise<string>} Resolves with hashsum when the operation is complete
 */
const addTexturePackToStore = async(file, name, builtIn) => {
	if (!file.name.endsWith('.zip')) throw new Error('Only zip files are supported');

	const timestamp = Date.now();
	const hashsum = await calculateFileHash(file);

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		/* eslint-disable jsdoc/require-jsdoc */
		reader.addEventListener('load', async(event) => {
			const arrayBuffer = event.target.result;

			try {
				unzip(new Uint8Array(arrayBuffer), (err, decoded) => {
					if (err) {
						reject(new Error('Error when unzipping file'));
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
							reject(new Error('Texture pack already exists'));
							return;
						}

						// Check if a file with the same name exists
						const nameRequest = store.get(name);
						nameRequest.onsuccess = () => {
							const existingEntry = nameRequest.result;

							if (existingEntry) {
								reject(new Error('Texture pack with same name already exists'));
							} else {
								// New unique file
								store.add({ name, hashsum, timestamp, builtin: builtIn, texturepack: decoded });
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
 * Retrieve all hashsums and names from the database
 * @protected
 * @returns {Promise<Array<{ name: string, hashsum: string }>>} Resolves with an array of file entries
 */
const getAllTexturePacksFromStore = () => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction(storeName, 'readonly');
	const store = transaction.objectStore(storeName);
	const request = store.getAll();

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		const files = request.result.map(({ name, hashsum, builtin, timestamp }) => ({ name, hashsum, builtin, timestamp }));
		files.sort((first, sec) => first.timestamp - sec.timestamp)
			.sort((first, sec) => sec.builtin - first.builtin);

		resolve(files);
	};
	request.onerror = () => reject(request.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Retrieve a specific entry by its hashsum
 * @protected
 * @param {string} hashsum The hashsum of the file to retrieve
 * @returns {Promise<{ name: string, hashsum: string, timestamp: number }>} Resolves with the file entry
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
 * Remove an entry from the texture packs object store
 * @protected
 * @param {string} hashsum The hashsum of the entry to be removed
 * @returns {Promise<void>} Resolves if the entry is successfully removed or if it does not exist
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
 * Add the default texture packs to the object store
 * @protected
 */
const storeDefaultTexturePacks = async() => {
	const texturePacks = await Promise.all(
		[
			Addons.t_url('assets/texturepacks/Normal.zip'),
			Addons.t_url('assets/texturepacks/3D Light.zip'),
			Addons.t_url('assets/texturepacks/Classic.zip')
		].map(url => fetch(url))
	);

	for (const texturePack of texturePacks) {
		const { url } = texturePack;
		texturePack.arrayBuffer().then(arrayBuffer => {
			const fileName = decodeURIComponent(url).replace(/^.*[\\/]/u, '');
			const [name] = fileName.split('.zip');
			const file = new File([arrayBuffer], fileName);
			const builtIn = true;

			addTexturePackToStore(file, name, builtIn)
				// Texture packs are already stored.
				// Intentionally do nothing.
				.catch(() => {});
		});
	}
};

/**
 * Listens to a Phaser event and returns callback with remove function.
 * @protected
 * @param {object} target Phaser signal event manager
 * @param {(removeListener: () => void, ...args: unknown[]) => void} callback Callback function
 */
const phaserUntil = (target, callback) => {
	// eslint-disable-next-line jsdoc/require-jsdoc
	function handler(...args) {
		callback(() => target.remove(handler), ...args);
	}
	target.add(handler);
};

/**
 * Get the user-loaded texture pack
 * @public
 * @returns {Uint8Array} Texture pack or error if unset
 */
const getActiveTexturePack = () => new Promise((resolve, reject) => {
	const hashsum = localStorage.getItem('texturepack');
	if (hashsum === null) {
		reject('Texture pack unset');
		return;
	}

	if (/\b[a-fA-F0-9]{64}\b/u.test(hashsum)) {
		getTexturePackFromStore(hashsum)
			.then(resolve)
			.catch(reject);
	} else {
		reject('Texture pack has an invalid key');
	}
});

/**
 * Store a new texture pack
 * @public
 * @param {File} file The zip file to be added.
 * @param {string} name The unique name of the file.
 * @returns {Promise<string>} Resolves with hashsum or error if fail
 */
const storeTexturePack = (file, name) => new Promise((resolve, reject) => {
	addTexturePackToStore(file, name, false)
		.then(resolve)
		.catch(reject);
});

/**
 * Set the active texture pack in local storage
 * @public
 * @param {string} hashsum The unique hashsum of the texture pack.
 * @returns {Promise<object>} Resolves with texture pack object if successfully added, else rejects with error
 */
const setActiveTexturePack = hashsum => new Promise((resolve, reject) => {
	if (!(/\b[a-fA-F0-9]{64}\b/u).test(hashsum)) {
		reject('Texture pack key has an invalid key');
		return;
	}
	localStorage.setItem('texturepack', hashsum);
	Addons.getActiveTexturePack()
		.then(resolve)
		.catch(reject);
});

/**
 * Get the first available texture pack in the object store.
 * Returns false if the store is empty.
 * @public
 * @returns {Promise<object|false>} Resolves when texture pack is determined, or if none available, with null
 */
const getFirstTexturePackFromStore = () => new Promise((resolve, reject) => {
	getAllTexturePacksFromStore().then(([texturepack]) => {
		if (typeof texturepack !== 'undefined') {
			getTexturePackFromStore(texturepack.hashsum)
				.then(resolve)
				.catch(reject);
		} else {
			resolve(false);
		}
	});
});

/**
 * Remove a texture pack saved to the store
 * @public
 * @param {string} hashsum The hashsum of the texture pack to remove
 * @returns {Promise<object>} Resolves when texture pack has been removed
 */
const removeTexturePack = hashsum => new Promise((resolve, reject) => {
	removeTexturePackFromStore(hashsum).finally(() => {
		localStorage.removeItem('texturepack');

		getFirstTexturePackFromStore().then(result => {
			if (result !== false) {
				Addons.setActiveTexturePack(result.hashsum);
				Addons.reloadGame();
			}

			resolve(result);
		}).catch(err => reject(err));
	});
});

/**
 * Retrieve all hashsums and names.
 * @public
 * @returns {Promise<Array<{ name: string, hashsum: string }>>} Resolves with an array of file entries.
 */
const getAllTexturePacks = () => getAllTexturePacksFromStore();

/**
 * Reload the Phaser game instance and rejoin the current game
 * @public
 */
const reloadGame = () => {
	const game = GameManager.getGame();
	if (game) {
		const gameController = GameManager.getGameController();

		game?.load.reset(true, true);
		game.destroy();
		GameManager.phaserInstance = null;
		const newGameInstance = GameManager.insertGame($('#game'));

		if (!gameController) return;

		// Attempt to rejoin online game after preload has finished.
		//
		// Due to how game controllers are handled, it's difficult
		// to rejoin a local game. Therefore, we exit the user
		// from the bootcamp and don't attempt to rejoin.
		if (Constants.getMode() !== Constants.MODE_CLIENT_ONLINE) {
			gameController.endGame();
			return;
		}

		GameManager.setGameController(null);
		ClientManager.getClient().roundState = null;
		ClientManager.getClient().expandedRoundState = null;

		const gameId = gameController.getId();
		const state = gameController.getState();
		const started = gameController.roundController.model.getStarted();

		/**
		 * Event listener for Phaser state change
		 * @param {string} newState State id
		 */
		phaserUntil(newGameInstance.state.onStateChange, (removeListener, newState) => {
			if (newState === 'Lobby') {
				removeListener();

				const originalLobbyState = newGameInstance.state;
				const originalLobbyCreate = originalLobbyState.onCreateCallback;

				originalLobbyState.onCreateCallback = function(...args) {
					if (originalLobbyCreate) originalLobbyCreate.call(this, ...args);

					const playerIds = ClientManager.getClient().getPlayerIds();
					const ttGame = GameController.withIds(gameId, playerIds);
					ttGame.model.setState(state);
					ttGame.roundController.model.started = started;

					newGameInstance.state.start('Game', true, false, ttGame);
				};
			}
		});
	}
};

Object.assign(Addons, {
	getActiveTexturePack,
	setActiveTexturePack,
	storeTexturePack,
	removeTexturePack,
	getAllTexturePacks,
	reloadGame
});

/**
 * Frames in the format { [frameName: string]: url as string }
 * @typedef {Record<string, string>} FrameDetails
 */

const packer = new MaxRectsPacker(2048, 2048, 2, {
	smart: true,
	square: false,
	pot: true,
	allowRotation: false,
	tag: false,
	border: 1
});

/**
 * Load an image and resolve promise when loaded
 * @protected
 * @param source Image src (url or base64)
 * @returns {Promise<HTMLImageElement>} Resolves with image when loaded
 */
const loadSpritesheet = source => new Promise(resolve => {
	const image = new Image();
	image.crossOrigin = 'anonymous';
	image.src = source;

	image.addEventListener('load', () => resolve(image));
});

/**
 * Check if a file ending follows the @2x convention
 * @protected
 * @param {string} urlOrFile String to match
 * @returns Does the string end in @2x.<anyextension>
 */
const is2xFileEnding = urlOrFile => /@2x\.[a-zA-Z0-9]+$/u.test(urlOrFile);

/**
 * Load texture pack from arraybuffer into an already-loaded sprite atlas, overriding textures in it
 * @public
 * @param {string} atlasKey key
 * @param {Record<string, Uint8Array>} files Texture pack data
 */
// eslint-disable-next-line complexity
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
		loadSpritesheet(sourceURL).then(async sheet => {
			if (is1x && Object.keys(files).length) {
				const { width, height } = sheet;
				const resized = await createImageBitmap(sheet, {
					resizeWidth: width * 2,
					resizeHeight: height * 2,
					resizeQuality: 'pixelated'
				});

				data.frameData._frames.map(frame => {
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
					frame.bottom *= 2;

					return frame;
				});

				return resized;
			}
			return sheet;
		}),
		...Object.keys(files).map(async fileName => {
			if (!fileName.endsWith('.png')) return;

			// Load the image into buffer
			const file = files[fileName];
			const blob = new Blob([file], { type: 'image/png' });
			const bmp = await createImageBitmap(blob);

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
	if (!bin) return;

	const canvas = document.createElement('canvas');
	canvas.width = spritesheet.width;
	canvas.height = spritesheet.height + bin.height;

	// Draw original spritesheet onto dummy canvas
	const context = canvas.getContext('2d');
	context.drawImage(spritesheet, 0, 0);

	// Draw texture pack frames onto the extended canvas below
	for (const rect of packer.rects) {
		// Draw the original image at its position
		context.drawImage(rect.image, rect.x, rect.y + spritesheet.height);

		// Add 1-pixel borders by copying edge pixels outward
		const { x, y, width, height } = rect;
		const drawY = y + spritesheet.height;

		// Top border
		context.drawImage(
			rect.image,
			0, 0, width, 1,
			x, drawY - 1, width, 1
		);

		// Bottom border
		context.drawImage(
			rect.image,
			0, height - 1, width, 1,
			x, drawY + height, width, 1
		);

		// Left border
		context.drawImage(
			rect.image,
			0, 0, 1, height,
			x - 1, drawY, 1, height
		);

		// Right border
		context.drawImage(
			rect.image,
			width - 1, 0, 1, height,
			x + width, drawY, 1, height
		);

		// Top-left corner
		context.drawImage(
			rect.image,
			0, 0, 1, 1,
			x - 1, drawY - 1, 1, 1
		);

		// Top-right corner
		context.drawImage(
			rect.image,
			width - 1, 0, 1, 1,
			x + width, drawY - 1, 1, 1
		);

		// Bottom-left corner
		context.drawImage(
			rect.image,
			0, height - 1, 1, 1,
			x - 1, drawY + height, 1, 1
		);

		// Bottom-right corner
		context.drawImage(
			rect.image,
			width - 1, height - 1, 1, 1,
			x + width, drawY + height, 1, 1
		);

		// Close the image to release resources
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
	this.cache._cache.image[atlasKey].base = new PIXI.BaseTexture(newImg);

	if (is1x) this.cache._cache.image[atlasKey].base.resolution = 2;

	packer.reset();
};

const gamePreloadStage = Game.UIPreloadState.getMethod('preload');
Game.UIPreloadState.method('preload', function(...args) {
	const result = gamePreloadStage.apply(this, ...args);

	Addons.getActiveTexturePack().then(({ texturepack }) => {
		GameManager.getGame()?.load.addTexturePack('game', texturepack);
	}).catch(() => {});

	return result;
});

storeDefaultTexturePacks();

export const _isESmodule = true;
