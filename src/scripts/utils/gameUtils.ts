/* eslint-disable @typescript-eslint/naming-convention, init-declarations */
declare global {
	function g_url(url: string): string;

	const Addons: {
		t_url(url: string): string;
		[key: string]: any;
	};

	const Content: {
		init(...args: unknown[]): unknown;
		[key: string]: any;
	};

	const UIConstants: {
		[key: string]: any;
	};

	interface JQuery<TElement = HTMLElement> {
		tooltipster(options: {
			position?: string;
			theme?: string;
			offsetX?: number;
			trigger?: string;
			[key: string]: any;
		}): JQuery<TElement>;
	}
}
/* eslint-enable @typescript-eslint/naming-convention, init-declarations */

type SomeFunction = (...args: unknown[]) => unknown;
type InterceptHandler = (original: SomeFunction, ...args: unknown[]) => unknown;

interface InterceptOptions {
	isClassy?: boolean;
	propertyAttributes?: PropertyDescriptor;
}

interface TankPart {
	type: 'accessory' | 'base' | 'shade';
	data: [string, { type: 'numeric'; numericValue: string } | { type: 'image'; imageValue: string } | string | null];
}

type TankPartResult = [number | null, HTMLImageElement] | [null, HTMLImageElement] | [HTMLImageElement, HTMLImageElement] | null;

/**
 * Load a source into an image and resolve when loaded
 * @param src Image source
 * @private
 * @returns Resolves once image is loaded
 */
const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
	const image = new Image();
	image.crossOrigin = 'Anonymous';
	image.src = src;
	/**
	 * Resolve when the image has loaded
	 * @returns {HTMLImageElement} Image once loaded
	 */
	image.onload = () => resolve(image);
	/**
	 * Reject promise if image load fails
	 * @param {Event} ev Error reason
	 * @returns {Event} Error event
	 */
	image.onerror = ev => reject(ev);
});

/**
 * Trim a canvas to remove alpha pixels from each side
 * @param ctx Canvas context
 * @param threshold Alpha threshold. Range 0-255.
 * @private
 * @returns Width and height of trimmed canvas and left-top coordinate of trimmed area
 */
const trimCanvas = (ctx: CanvasRenderingContext2D, threshold = 0) => {
	const { canvas } = ctx;
	const { width } = canvas;
	const { height } = canvas;
	const imageData = ctx.getImageData(0, 0, width, height);
	const tlCorner = { x: width + 1, y: height + 1 };
	const brCorner = { x:-1, y:-1 };

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (imageData.data[((y * width + x) * 4) + 3] > threshold) {
				tlCorner.x = Math.min(x, tlCorner.x);
				tlCorner.y = Math.min(y, tlCorner.y);
				brCorner.x = Math.max(x, brCorner.x);
				brCorner.y = Math.max(y, brCorner.y);
			}
		}
	}

	const cut = ctx.getImageData(
		tlCorner.x,
		tlCorner.y,
		brCorner.x - tlCorner.x,
		brCorner.y - tlCorner.y
	);

	canvas.width = brCorner.x - tlCorner.x;
	canvas.height = brCorner.y - tlCorner.y;

	ctx.putImageData(cut, 0, 0);

	return { width: canvas.width, height: canvas.height, x: tlCorner.x, y: tlCorner.y };
};

/**
 * Merge two image data layers into one layer, ignoring alpha.
 * @param baseLayer Base image data
 * @param onTopLayer Image data to add on top
 * @private
 * @returns Merged layers
 */
const layerImageData = (baseLayer: ImageData, onTopLayer: ImageData): ImageData => {
	const { width } = onTopLayer;
	const { height } = onTopLayer;

	// Create a new ImageData object to store the result
	const resultImageData = new ImageData(width, height);

	// Get the pixel data arrays
	const data1 = onTopLayer.data;
	const data2 = baseLayer.data;
	const resultData = resultImageData.data;

	for (let i = 0; i < data1.length; i += 4) {
		// Extract RGBA values for imageData1
		const r1 = data1[i];
		const g1 = data1[i + 1];
		const b1 = data1[i + 2];
		const a1 = data1[i + 3] / 255;

		// Extract RGBA values for imageData2
		const r2 = data2[i];
		const g2 = data2[i + 1];
		const b2 = data2[i + 2];
		const a2 = data2[i + 3] / 255;

		// Calculate the resulting alpha
		const alpha = a1 + a2 * (1 - a1);

		// Calculate the resulting color
		const r = Math.round((r1 * a1 + r2 * a2 * (1 - a1)) / alpha);
		const g = Math.round((g1 * a1 + g2 * a2 * (1 - a1)) / alpha);
		const b = Math.round((b1 * a1 + b2 * a2 * (1 - a1)) / alpha);

		// Set the resulting pixel data
		resultData[i] = r;
		resultData[i + 1] = g;
		resultData[i + 2] = b;

		// Denormalize alpha to [0, 255]
		resultData[i + 3] = Math.round(alpha * 255);
	}

	return resultImageData;
};

/**
 * Apply a hook to Content.init which resolves when the function finishes
 * @returns {Promise<void>} Promise which resolves when Content.init has finished
 * @private
 */
const instanceInitHook = () => {
	const functionString = Function.prototype.toString.call(Content.init);
	const isAlreadyHooked = /hooked-by-userscript/u.test(functionString);

	return new Promise<void>(resolve => {
		if (isAlreadyHooked) {
			addEventListener('content-initialized', () => resolve(), { once: true, passive: true });
		} else {
			const event = new CustomEvent('content-initialized');

			const { init } = Content;
			Reflect.defineProperty(Content, 'init', {
				/**
				 * Intercept the Content.init function, add a stamp, dispatch the custom event and resolve
				 * @param args Arguments passed from outside
				 * @returns Original function return value
				 */
				value: (...args: unknown[]) => {
					// Hack that will add the string to
					// the return of toString so we can
					// lookup if it's already hooked
					// eslint-disable-next-line no-void
					void 'hooked-by-userscript';

					const result = init(...args);

					dispatchEvent(event);
					resolve();
					return result;
				},
				configurable: true
			});
		}
	});
};

/**
 * Pass a function to a hook with the correct context
 * @param {object} context The object containing the function to intercept
 * @param funcName Name of the function in the context
 * @param handler Function to call before the original
 * @param options Configuration options
 */
export const interceptFunction = (
	context: any,
	funcName: string,
	handler: InterceptHandler,
	options?: InterceptOptions
) => {
	const { isClassy = false, propertyAttributes = {} } = options || {};

	// Handle Classy library methods
	if (isClassy) {
		const original = context.getMethod(funcName);
		if (typeof original !== 'function') throw new Error('Classy method is not a function');

		context.method(funcName, function(this: any, ...args: any[]) {
			return handler.apply(this, [original.bind(this), ...args]);
		});
		return;
	}

	const original = Reflect.get(context, funcName);
	if (typeof original !== 'function') throw new Error('Item to intercept is not a function');

	Reflect.defineProperty(context, funcName, {
		value(this: any, ...args: any[]) {
			const boundOriginal = original.bind(this);
			return handler.call(this, boundOriginal, ...args);
		},
		...propertyAttributes
	});
};

/**
 * Fires when the document is readyState `interactive` or `complete`
 */
export const whenContentLoaded = () => new Promise<void>(resolve => {
	if (document.readyState === 'interactive' || document.readyState === 'complete') resolve();
	else addEventListener('DOMContentLoaded', () => resolve());
});

/**
 * Fires when the `main()` function is done on TankTrouble.
 * @returns {Promise<void>} Promise that resolves when Content.init() finishes
 */
export const whenContentInitialized = () => whenContentLoaded().then(() => instanceInitHook());

/**
 * Render a tank (player details) onto a new canvas
 * @param playerDetails Player details object
 * @param onerror Error handler
 * @returns Canvas with render in progress
 */
export const renderTankIcon = (
	playerDetails: Record<string, any>,
	onerror: (err: string) => void
): HTMLCanvasElement => {
	const canvas = document.createElement('canvas');
	canvas.width = UIConstants.TANK_ICON_WIDTH_LARGE;
	canvas.height = UIConstants.TANK_ICON_HEIGHT_LARGE;

	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('Failed to get canvas context');

	const tankParts: TankPart[] = [
		{ type: 'accessory', data: ['back', playerDetails.getBackAccessory()] },
		{ type: 'base', data: [ 'turret', playerDetails.getTurretColour() ] },
		{ type: 'shade', data: ['turretShade', null] },
		{ type: 'base', data: [ 'leftTread', playerDetails.getTreadColour() ] },
		{ type: 'shade', data: ['leftTreadShade', null] },
		{ type: 'base', data: [ 'barrel', playerDetails.getTurretColour() ] },
		{ type: 'shade', data: ['barrelShade', null] },
		{ type: 'base', data: [ 'base', playerDetails.getBaseColour() ] },
		{ type: 'shade', data: ['baseShade', null] },
		{ type: 'base', data: [ 'rightTread', playerDetails.getTreadColour() ] },
		{ type: 'shade', data: ['rightTreadShade', null] },
		{ type: 'accessory', data: ['turret', playerDetails.getTurretAccessory()] },
		{ type: 'accessory', data: ['front', playerDetails.getFrontAccessory()] },
		{ type: 'accessory', data: ['barrel', playerDetails.getBarrelAccessory()] }
	];

	Promise.all(tankParts.map(part => {
		const [key, data] = part.data;
		switch (part.type) {
			case 'shade':
				return loadImage(g_url(`assets/images/tankIcon/${key}-320@2x.png`))
					.then(accessory => [null, accessory] as [null, HTMLImageElement])
					.catch(url => Promise.reject(new Error(`Failed to load shading: ${url}`)));
			case 'accessory':
				return data !== '0'
					? loadImage(g_url(`assets/images/accessories/${key}${data}-320@2x.png`))
						.then(accessory => [null, accessory] as [null, HTMLImageElement])
						.catch(url => Promise.reject(new Error(`Failed to load accessory: ${url}`)))
					: Promise.resolve(null);
			case 'base':
				return new Promise<TankPartResult>((resolve, reject) => {
					loadImage(g_url(`assets/images/tankIcon/${key}-320@2x.png`))
						.then(flat => {
							if (!(data instanceof Object)) {
								reject(new Error('Tank part carried wrong data'));
							} else if (data.type === 'numeric') {
								resolve([parseInt(data.numericValue), flat]);
							} else {
								loadImage(g_url(`assets/images/colours/colour${data.imageValue}-320@2x.png`))
									.then(color => resolve([color, flat]))
									.catch(url => reject(new Error(`Failed to load color texture: ${url}`)));
							}
						})
						.catch(url => reject(new Error(`Failed to load color mask: ${url}`)));
				});
			default:
				return Promise.reject(new Error('Tank part must be "shade", "accessory", or "base"'));
		}
	})).then((results: TankPartResult[]) => {
		const result = results.filter((res): res is TankPartResult => !(res instanceof Error));

		const { width, height } = canvas;
		const initialBuffer = ctx.getImageData(0, 0, width, height);

		result.reduce((currentBuffer, part) => {
			if (part === null) return currentBuffer;

			const [fill, image] = part;

			ctx.clearRect(0, 0, width, height);

			// We simply draw the part
			if (!fill) {
				ctx.putImageData(currentBuffer, 0, 0);
				ctx.drawImage(image, 0, 0, width, height);

				return ctx.getImageData(0, 0, width, height);
			}

			// We need to mask a shape with an image or fill color
			ctx.save();

			// Draw mask
			ctx.drawImage(image, 0, 0, width, height);

			// Only apply where the mask is
			ctx.globalCompositeOperation = 'source-in';

			// Apply the fill (color or texture)
			if (typeof fill === 'number') {
				ctx.fillStyle = `#${ fill.toString(16).padStart(6, '0') }`;
				ctx.fillRect(0, 0, width, height);
				ctx.globalCompositeOperation = 'source-over';
			} else if (fill instanceof HTMLImageElement) {
				ctx.drawImage(fill, 0, 0, width, height);
				ctx.globalCompositeOperation = 'source-over';
			}

			const maskBuffer = ctx.getImageData(0, 0, width, height);
			return layerImageData(currentBuffer, maskBuffer);
		}, initialBuffer);
	}).catch(async() => {
		// An image errored. Show the 404 tank
		await loadImage(Addons.t_url('assets/menu/ironvault/404-tank.{{png|avif}}'))
			.then(image => {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

				const $canvas = $(canvas);
				$canvas.tooltipster({
					position: 'right',
					theme: 'tooltipster-error',
					offsetX: -20,
					trigger: 'custom'
				});
				onerror('Failed to load tank');
			});
	}).finally(() => {
		trimCanvas(ctx);
	});

	return canvas;
};

export const _isESmodule = true;
