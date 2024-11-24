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


export const _isESmodule = true;
