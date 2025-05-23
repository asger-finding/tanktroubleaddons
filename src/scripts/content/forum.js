import { timeAgo } from '../utils/timeUtils.js';

/**
 * Add tank previews for all thread creators, not just the primary creator
 * @param {object} threadOrReply Post data
 * @param {JQuery} threadOrReplyElement Post element
 */
const insertMultipleCreators = (threadOrReply, threadOrReplyElement) => {
	// Remove original tank preview
	threadOrReplyElement.find('.tank').remove();

	const creators = {
		...{ creator: threadOrReply.creator },
		...threadOrReply.coCreator1 && { coCreator1: threadOrReply.coCreator1 },
		...threadOrReply.coCreator2 && { coCreator2: threadOrReply.coCreator2 }
	};
	const creatorsContainer = $('<div/>')
		.addClass(`tanks tankCount${Object.keys(creators).length}`)
		.insertBefore(threadOrReplyElement.find('.container'));

	// Render all creator tanks in canvas
	for (const [creatorType, playerId] of Object.entries(creators)) {
		const id = playerId === null ? '-1' : playerId;

		const wrapper = document.createElement('div');
		wrapper.classList.add('tank', creatorType);

		const canvas = document.createElement('canvas');
		canvas.width = UIConstants.TANK_ICON_WIDTH_SMALL;
		canvas.height = UIConstants.TANK_ICON_HEIGHT_SMALL;
		canvas.style.width = `${UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] }px`;
		canvas.style.height = `${UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] * 0.6 }px`;
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		canvas.addEventListener('mouseup', () => {
			const rect = canvas.getBoundingClientRect();
			const win = canvas.ownerDocument.defaultView;

			const top = rect.top + win.scrollY;
			const left = rect.left + win.scrollX;

			TankTrouble.TankInfoBox.show(left + (canvas.clientWidth / 2), top + (canvas.clientHeight / 2), id, canvas.clientWidth / 2, canvas.clientHeight / 4);
		});
		UITankIcon.loadPlayerTankIcon(canvas, UIConstants.TANK_ICON_SIZES.SMALL, id);

		wrapper.append(canvas);
		creatorsContainer.append(wrapper);
	}
	// Render name of primary creator
	Backend.getInstance().getPlayerDetails(result => {
		const username = typeof result === 'object' ? Utils.maskUnapprovedUsername(result) : 'Scrapped';
		const width = UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] + 10;
		const height = 25;

		const playerName = $(`<stroked-text text="${ username }" width="${ width }" height="${ height }"></stroked-text>`);
		creatorsContainer.find('.tank.creator').append(playerName);
	}, () => {}, () => {}, creators.creator || '-1', Caches.getPlayerDetailsCache());
};

/**
 * Scroll a post into view if it's not already
 * and highlight it once in view
 * @param {object} threadOrReply Post element
 */
const highlightThreadOrReply = threadOrReply => {
	const observer = new IntersectionObserver(entries => {
		const [entry] = entries;
		const inView = entry.isIntersecting;

		threadOrReply[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
		if (inView) {
			threadOrReply.addClass('highlight');

			observer.disconnect();
		}
	});

	observer.observe(threadOrReply[0]);
};

/**
 * Insert a share button to the thread or reply that copies the link to the post to clipboard
 * @param {object} threadOrReply Post data
 * @param {JQuery} threadOrReplyElement Post element
 */
const addShare = (threadOrReply, threadOrReplyElement) => {
	const isReply = Boolean(threadOrReply.threadId);

	const url = new URL(window.location.href);
	const wasWindowOpenedFromPostShare = url.searchParams.get('ref') === 'share';
	if (wasWindowOpenedFromPostShare && isReply) {
		const urlReplyId = Number(url.searchParams.get('id'));
		if (urlReplyId === threadOrReply.id) highlightThreadOrReply(threadOrReplyElement);
	}

	const likeAction = threadOrReplyElement.find('.action.like');

	let shareAction = $('<div class="action share"></div>');
	const shareActionStandardImage = $(`<img class="standard" src="${Addons.t_url('assets/forum/share.{{png|avif}}')}" srcset="${Addons.t_url('assets/forum/share@2x.{{png|avif}}')} 2x"/>`);
	const shareActionActiveImage = $(`<img class="active" src="${Addons.t_url('assets/forum/shareActive.{{png|avif}}')}" srcset="${Addons.t_url('assets/forum/shareActive@2x.{{png|avif}}')} 2x"/>`);

	shareAction.append([shareActionStandardImage, shareActionActiveImage]);
	likeAction.after(shareAction);

	// Replies have a duplicate actions container for
	// both right and left-facing replies.
	// So when the share button is appended, there may be multiple
	// and so we need to realize those instances as well
	shareAction = threadOrReplyElement.find('.action.share');

	shareAction.tooltipster({
		position: 'top',
		offsetY: 5,

		/** Reset tooltipster when mouse leaves */
		functionAfter: () => {
			shareAction.tooltipster('content', 'Copy link to clipboard');
		}
	});
	shareAction.tooltipster('content', 'Copy link to clipboard');

	shareAction.on('mouseup', () => {
		const urlConstruct = new URL('/forum', window.location.origin);

		if (isReply) {
			urlConstruct.searchParams.set('id', threadOrReply.id);
			urlConstruct.searchParams.set('threadId', threadOrReply.threadId);
		} else {
			urlConstruct.searchParams.set('threadId', threadOrReply.id);
		}

		urlConstruct.searchParams.set('ref', 'share');

		ClipboardManager.copy(urlConstruct.href);

		shareAction.tooltipster('content', 'Copied!');
	});
};

/**
 * Add text to details that shows when a post was last edited
 * @param {object} threadOrReply Post data
 * @param {JQuery} threadOrReplyElement Post element
 */
const addLastEdited = (threadOrReply, threadOrReplyElement) => {
	const { created, latestEdit } = threadOrReply;

	if (latestEdit) {
		const details = threadOrReplyElement.find('.bubble .details');
		const detailsText = details.text();
		const replyIndex = detailsText.indexOf('-');
		const lastReply = replyIndex !== -1
			? ` - ${ detailsText.slice(replyIndex + 1).trim()}`
			: '';

		// We remake creation time since the timeAgo
		// function estimates months slightly off
		// which may result in instances where the
		// edited happened longer ago than the thread
		// creation date
		const createdAgo = timeAgo(new Date(created * 1000));
		const editedAgo = `, edited ${ timeAgo(new Date(latestEdit * 1000)) }`;

		details.text(`Created ${createdAgo}${editedAgo}${lastReply}`);
	}
};

/**
 * Add anchor tags to links in posts
 * @param {object} _threadOrReply Post data
 * @param {JQuery} threadOrReplyElement Post element
 */
const addHyperlinks = (_threadOrReply, threadOrReplyElement) => {
	const threadOrReplyContent = threadOrReplyElement.find('.bubble .content');

	if (threadOrReplyContent.length) {
		const urlRegex = /(?<_>https?:\/\/[\w\-_]+(?:\.[\w\-_]+)+(?:[\w\-.,@?^=%&amp;:/~+#]*[\w\-@?^=%&amp;/~+#])?)/gu;
		const messageWithLinks = threadOrReplyContent.html().replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
		threadOrReplyContent.html(messageWithLinks);
	}
};

/**
 * Check the latest three replies of a forum thread
 * and highlight the thread if any of them are unmoderated
 * @param {object} threadOrReply Post data
 * @param {JQuery} threadOrReplyElement Post element
 */
const addUnmoderatedHighlight = (threadOrReply, threadOrReplyElement) => {
	const { hasAnyReplies } = threadOrReply;
	if (hasAnyReplies) {
		if (Users.getHighestGmLevel() < UIConstants.ADMIN_LEVEL_DELETE_THREAD_OR_REPLY) return;

		Backend.getInstance().getForumReplies(result => {
			if (typeof result === 'object') {
				if (!result.result) return;

				const { replies } = result.result.data;
				const hasUnmoderatedReplies = replies.some(reply => reply.moderatedBy === null);

				if (hasUnmoderatedReplies) threadOrReplyElement.attr('data-unmoderated', 'true');
				else threadOrReplyElement.attr('data-unmoderated', '');
			}
		}, null, null, threadOrReply.id, Number.MAX_SAFE_INTEGER, 'older', 0, 3);
	}
};

/**
 * Add extra features to a thread or reply
 * @param {object} threadOrReply Post data
 * @param {JQuery} threadOrReplyElement Post element
 */
const addFeaturesToThreadOrReply = (threadOrReply, threadOrReplyElement) => {
	insertMultipleCreators(threadOrReply, threadOrReplyElement);
	addLastEdited(threadOrReply, threadOrReplyElement);
	addShare(threadOrReply, threadOrReplyElement);
	addHyperlinks(threadOrReply, threadOrReplyElement);
	addUnmoderatedHighlight(threadOrReply, threadOrReplyElement);
};

/**
 * Handle a thread  or reply
 * @param {object} threadOrReply Post data
 */
const handleThreadOrReply = threadOrReply => {
	if (threadOrReply === null) return;

	const [key] = Object.keys(threadOrReply.html);
	const html = threadOrReply.html[key];

	if (typeof html === 'string') {
		const threadOrReplyElement = $($.parseHTML(html));

		addFeaturesToThreadOrReply(threadOrReply, threadOrReplyElement);
		threadOrReply.html[key] = threadOrReplyElement;
		threadOrReply.html._backup = html;
	} else if (html instanceof $) {
		// For some reason, the post breaks if it's already
		// been parsed through here. Therefore, we pull
		// from the backup html we set, and re-apply the changes
		const threadOrReplyElement = $($.parseHTML(threadOrReply.html._backup));

		addFeaturesToThreadOrReply(threadOrReply, threadOrReplyElement);
		threadOrReply.html[key] = threadOrReplyElement;
	}
};

/**
 * Infer post type from data
 * @param {object|Array|number} data Post (reply or thread) or post list or post id
 * @returns Type or null if undefined
 */
const getPostType = data => {
	if (typeof data === 'number') return 'postId';
	if (data instanceof Array) return 'postList';
	if (data instanceof Object) return 'post';
	return null;
};

/**
 * Handle an incoming post item (proxy handler)
 * @param {...any} args Function arguments
 */
const postHandler = (...args) => {
	const [postItem] = args;
	const { model } = Forum.getInstance();

	switch (getPostType(postItem)) {
		case 'postId':
			// Both thread and reply with id might exist
			// but the chances are very slim so we ignore that
			handleThreadOrReply(model.getThreadById(postItem) || model.getReplyById(postItem));
			break;
		case 'postList':
			for (const post of postItem) handleThreadOrReply(post);
			break;
		case 'post':
			handleThreadOrReply(postItem);
			break;
		default:
			break;
	}

	// Whenever a change happens we must handle the selected thread
	// as well, as its set by the getter functions, and not sent through
	// the change event listeners
	handleThreadOrReply(Forum.getInstance().model.getSelectedThread());
};

const proxy = new Proxy({}, {
	get(_target, prop) {
		if (/(?:thread|reply)/ui.test(prop)) return postHandler;
		return () => {};
	},
	set(_target, _prop, value) {
		return value;
	}
});

/**
 * Prepend (inject) custom event listeners to modify threads and replies
 */
const { getInstance } = Forum;
Forum.classMethod('getInstance', function(...args) {
	const instance = getInstance.apply(this, args);

	instance.model.threadListChangeListeners = Array.from(new Set([proxy, ...instance.model.threadListChangeListeners]));
	instance.model.replyListChangeListeners = Array.from(new Set([proxy, ...instance.model.replyListChangeListeners]));

	return instance;
});

export const _isESmodule = true;
