type PolygonPoint = {
	x: number;
	y: number;
	flipped: boolean;
};

/**
 * Rounds a float to the nearest decimal point `precision`
 * @param value Value to round
 * @param precision Integer: decimals to round to
 * @returns Rounded float
 */
export const roundToPrecision = (value: number, precision = 6): number => {
	if (isNaN(value)) throw new Error('Value provided is Not a Number');

	const factor = Math.pow(10, precision);
	return Math.round(value * factor) / factor;
};

/**
 * Generate a polygon with n amount of points and transform it as given
 * @param points Amount of points to add
 * @param width Width of the returned polygon
 * @param height Height of the returned polygon
 * @param rotation Rotation translation
 * @returns New polygon
 */
export const createPolygon = (points: number, width = 1, height = 1, rotation = Math.PI / points + Math.PI / 2): PolygonPoint[] => {
	if (points === 2) {
		return [
			{ x: 0, y: height / 2, flipped: false },
			{ x: width, y: height / 2, flipped: true }
		];
	}
	const vertices = [];

	for (let i = 0; i < points; i++) {
		const angle = (i * (2 * Math.PI / points)) + rotation;
		const x = Math.cos(angle);
		const y = Math.sin(angle);
		vertices.push([x, y]);
	}

	// Find the min and max for both x and y
	const xValues = vertices.map(([x]) => x);
	const yValues = vertices.map(([, y]) => y);

	const minX = Math.min(...xValues);
	const maxX = Math.max(...xValues);
	const minY = Math.min(...yValues);
	const maxY = Math.max(...yValues);

	const normalizedVertices = vertices.map(([x, y]) => {
		const normalizedX = (x - minX) / (maxX - minX);
		const normalizedY = (y - minY) / (maxY - minY);
		return {
			x: roundToPrecision(normalizedX * width, 6),
			y: roundToPrecision(normalizedY * height, 6),
			flipped: normalizedX > 0.5
		};
	});

	return normalizedVertices;
};

/**
 * JS adaptation of the CSS `justify-content: space-around;` property, to space things evenly on the x-axis
 * @param width Width of container
 * @param items Item count
 * @returns Item points
 */
export const spaceAround = (width: number, items: number) => {
	if (items <= 0) return { leftMargin: 0, spacing: 0 };

	const spacing = width / items;
	const leftMargin = spacing / 2;

	return { leftMargin, spacing };
};

/**
 * Calculate the SHA-256 hashsum of a given file
 * @param file File input
 * @returns Hashsum string
 */
export const calculateFileHash = async(file: File) => {
	const arrayBuffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a new UUID
 * @author Jeff Ward (jcward.com)
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 * @returns RFC4122 version 4 compliant UUID
 */
export const generateUUID = (() => {
	const lut: string[] = [];
	for (let i = 0; i < 256; i++)  lut[i] = (i < 16 ? '0' : '') + (i).toString(16);

	return () => {
		const d0 = Math.random() * 0xffffffff | 0;
		const d1 = Math.random() * 0xffffffff | 0;
		const d2 = Math.random() * 0xffffffff | 0;
		const d3 = Math.random() * 0xffffffff | 0;
		return `${lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff]}-${
			lut[d1 & 0xff]}${lut[d1 >> 8 & 0xff]}-${lut[d1 >> 16 & 0x0f | 0x40]}${lut[d1 >> 24 & 0xff]}-${
			lut[d2 & 0x3f | 0x80]}${lut[d2 >> 8 & 0xff]}-${lut[d2 >> 16 & 0xff]}${lut[d2 >> 24 & 0xff]
		}${lut[d3 & 0xff]}${lut[d3 >> 8 & 0xff]}${lut[d3 >> 16 & 0xff]}${lut[d3 >> 24 & 0xff]}`;
	};
})();

/**
 * A function that transitions smoothly from y0 at x0 to y1 at x1,
 * and remains constant beyond x1.
 * @param x The input value.
 * @param x0 The start of the transition region.
 * @param x1 The end of the transition region.
 * @param y0 The value of y at x0.
 * @param y1 The value of y at x1.
 * @returns The value of y at x.
 */
export const smoothTransition = (x: number, x0: number, x1: number, y0: number, y1: number): number => {
	if (x <= x0) return y0;
	else if (x >= x1) return y1;

	// Smooth transition using a sigmoid-like function
	const diff = (x - x0) / (x1 - x0);
	return y0 + (y1 - y0) * (1 - Math.cos(Math.PI * diff)) / 2;
};

export const _isESmodule = true;
