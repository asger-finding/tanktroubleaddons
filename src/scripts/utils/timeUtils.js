const ranges = {
	years: 3600 * 24 * 365,
	months: (365 * 3600 * 24) / 12,
	weeks: 3600 * 24 * 7,
	days: 3600 * 24,
	hours: 3600,
	minutes: 60,
	seconds: 1
};

/**
 * Format a timestamp to relative time ago from now
 * @param date Date object
 * @returns Time ago
 */
export const timeAgo = date => {
	const formatter = new Intl.RelativeTimeFormat('en');
	const secondsElapsed = (date.getTime() - Date.now()) / 1000;

	for (const key in ranges) {
		if (ranges[key] < Math.abs(secondsElapsed)) {
			const delta = secondsElapsed / ranges[key];
			return formatter.format(Math.ceil(delta), key);
		}
	}

	return 'now';
};

export const _isESmodule = true;
