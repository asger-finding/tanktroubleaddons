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
 * Listens to a Phaser event and returns callback with remove function.
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
 * Reload the Phaser game instance and rejoin the current game
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
		if (Constants.getMode() !== Constants.MODE_CLIENT_ONLINE) return;

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

				// eslint-disable-next-line complexity
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

/**
 * Get the user-loaded texture pack
 * @returns {Uint8Array|null} Texture pack or null
 */
const getActiveTexturePack = () => new Promise((resolve, reject) => {
	const hashsum = localStorage.getItem('texturepack');
	if (hashsum === null) {
		reject('Texture pack unset');
		return;
	}

	if (/\b[a-fA-F0-9]{64}\b/u.test(hashsum)) {
		getTexturePackFromStore(hashsum)
			.then(texturePack => resolve(texturePack)).
			catch(err => reject(err));
	} else {
		reject('Texture pack has an invalid key');
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
const setActiveTexturePack = hashsum => new Promise((resolve, reject) => {
	if (!(/\b[a-fA-F0-9]{64}\b/u).test(hashsum)) {
		reject('Texture pack key has an invalid key');
		return;
	}

	localStorage.setItem('texturepack', hashsum);

	Addons.getActiveTexturePack().then(activeTexturePack => {
		// GameManager.getGame()?.load.addTexturePack('game', activeTexturePack.texturepack);
		reloadGame();

		resolve(activeTexturePack);
	}).catch(err => reject(err));
});

/**
 * Get the first available texture pack in the object store.
 * Returns false if the store is empty.
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
 * @param {string} hashsum The hashsum of the texture pack to remove
 * @returns {Promise<object>} Resolves when texture pack has been removed
 */
const removeTexturePack = hashsum => new Promise((resolve, reject) => {
	removeTexturePackFromStore(hashsum).finally(() => {
		localStorage.removeItem('texturepack');

		getFirstTexturePackFromStore().then(result => {
			if (result !== false) setActiveTexturePack(result.hashsum);

			resolve(result);
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
	setActiveTexturePack,
	storeTexturePack,
	removeTexturePack,
	getAllTexturePacks,
	reloadGame
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

	Addons.getActiveTexturePack().then(({ texturepack }) => {
		GameManager.getGame()?.load.addTexturePack('game', texturepack);
	}).catch(() => {});

	return result;
});

export const _isESmodule = true;
