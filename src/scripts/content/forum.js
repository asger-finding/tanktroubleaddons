import { interceptFunction } from '../utils/gameUtils.js';
import { renderMarkdown } from './markdown.js';
import { timeAgo } from '../utils/timeUtils.js';

/**
 * Map post creators to a new object
 * @private
 * @param {object} post Post data
 * @returns {object} Creators in an object
 */
const buildCreatorMap = post => {
	if (!post) return {};

	return {
		creator: post.creator,
		...(post.coCreator1 && { coCreator1: post.coCreator1 }),
		...(post.coCreator2 && { coCreator2: post.coCreator2 })
	};
};

/**
 * Escape a HTML string to prevent XSS
 * @private
 * @param {string} str HTML string to sanitize
 * @returns Escaped HTML
 */
const escapeHTML = str => {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
};

/**
 * Scroll a post into view if it's not already
 * and highlight it once in view
 * @private
 * @param {HTMLElement} postElement Post element
 */
const scrollToPost = postElement => {
	if (!postElement) return;

	const observer = new IntersectionObserver(([entry]) => {
		postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		if (entry.isIntersecting) {
			postElement.classList.add('highlight');
			observer.disconnect();
		}
	});

	observer.observe(postElement);
};

/**
 * Add tank previews for all thread creators, not just the primary creator
 * @param {object} post Post data
 * @param {HTMLElement} postElement Post element
 */
const insertMultipleCreatorsInPost = (post, postElement) => {
	if (!post || !postElement) return;

	// Remove existing tank previews
	postElement.querySelectorAll('.tank').forEach(el => el.remove());

	// Remove tank canvas and name setter script
	postElement.querySelector('script')?.remove();

	const creators = buildCreatorMap(post);
	const creatorsContainer = document.createElement('div');
	creatorsContainer.className = `tanks tankCount${Object.keys(creators).length}`;

	const container = postElement.querySelector('.container');
	if (!container) return;
	container.before(creatorsContainer);

	const fragment = document.createDocumentFragment();
	for (const [creatorType, playerId] of Object.entries(creators)) {
		const id = playerId ?? '-1';
		const wrapper = document.createElement('div');
		wrapper.className = `tank ${creatorType}`;

		const canvas = document.createElement('canvas');
		canvas.width = UIConstants.TANK_ICON_WIDTH_SMALL;
		canvas.height = UIConstants.TANK_ICON_HEIGHT_SMALL;
		canvas.style.width = `${UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL]}px`;
		canvas.style.height = `${UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] * 0.6}px`;

		canvas.addEventListener('mouseup', () => {
			const rect = canvas.getBoundingClientRect();
			const win = canvas.ownerDocument.defaultView;
			const top = rect.top + win.scrollY;
			const left = rect.left + win.scrollX;

			TankTrouble.TankInfoBox.show(
				left + canvas.clientWidth / 2,
				top + canvas.clientHeight / 2,
				id,
				canvas.clientWidth / 2,
				canvas.clientHeight / 4
			);
		});

		UITankIcon.loadPlayerTankIcon(canvas, UIConstants.TANK_ICON_SIZES.SMALL, id);
		wrapper.append(canvas);
		fragment.append(wrapper);
	}
	creatorsContainer.append(fragment);

	// Render primary creator name
	Backend.getInstance().getPlayerDetails(result => {
		const username = typeof result === 'object' ? Utils.maskUnapprovedUsername(result) : 'Scrapped';
		const width = UIConstants.TANK_ICON_RESOLUTIONS[UIConstants.TANK_ICON_SIZES.SMALL] + 10;
		const height = 25;

		const tempWrapper = document.createElement('div');
		tempWrapper.innerHTML = `<stroked-text text="${escapeHTML(username)}" width="${width}" height="${height}"></stroked-text>`;
		const playerName = tempWrapper.firstElementChild;
		creatorsContainer.querySelector('.tank.creator')?.append(playerName);
	}, () => {}, () => {}, creators.creator || '-1', Caches.getPlayerDetailsCache());
};

/**
 * Add a share button to copy the post link to the clipboard
 * @param {object} post - Post data
 * @param {HTMLElement} postElement - Post element
 */
const addShareButton = (post, postElement) => {
	if (!post || !postElement) return;

	const isReply = Boolean(post.threadId);
	const url = new URL(window.location.href);
	const wasWindowOpenedFromPostShare = url.searchParams.get('ref') === 'share';

	if (wasWindowOpenedFromPostShare && isReply && Number(url.searchParams.get('id')) === post.id) scrollToPost(postElement);

	const likeAction = postElement.querySelector('.action.like');
	if (!likeAction) return;

	const shareAction = document.createElement('div');
	shareAction.className = 'action share';

	const standardImg = document.createElement('img');
	standardImg.className = 'standard';
	standardImg.src = Addons.t_url('assets/forum/share.{{png|avif}}');
	standardImg.srcset = `${Addons.t_url('assets/forum/share@2x.{{png|avif}}')} 2x`;

	const activeImg = document.createElement('img');
	activeImg.className = 'active';
	activeImg.src = Addons.t_url('assets/forum/shareActive.{{png|avif}}');
	activeImg.srcset = `${Addons.t_url('assets/forum/shareActive@2x.{{png|avif}}')} 2x`;

	shareAction.append(standardImg, activeImg);
	likeAction.after(shareAction);

	// Initialize tooltip
	$(shareAction).tooltipster({
		position: 'top',
		offsetY: 5,

		/** Reset tooltipster when mouse leaves */
		functionAfter: () => {
			$(shareAction).tooltipster('content', 'Copy link to clipboard');
		}
	}).tooltipster('content', 'Copy link to clipboard');

	shareAction.addEventListener('mouseup', () => {
		const urlConstruct = new URL('/forum', window.location.origin);
		if (isReply) {
			urlConstruct.searchParams.set('id', post.id);
			urlConstruct.searchParams.set('threadId', post.threadId);
		} else {
			urlConstruct.searchParams.set('threadId', post.id);
		}
		urlConstruct.searchParams.set('ref', 'share');

		ClipboardManager.copy(urlConstruct.href);
		$(shareAction).tooltipster('content', 'Copied!');
	});
};

/**
 * Add last edited timestamp to post details
 * @param {object} post Post data
 * @param {HTMLElement} postElement Post element
 */
const addLastEdited = (post, postElement) => {
	if (!post || !postElement || !post.latestEdit) return;

	const details = postElement.querySelector('.bubble .details');
	if (!details) return;

	const detailsText = details.textContent;
	const replyIndex = detailsText.indexOf('-');
	const lastReply = replyIndex !== -1 ? ` - ${detailsText.slice(replyIndex + 1).trim()}` : '';

	const createdAgo = timeAgo(new Date(post.created * 1000));
	const editedAgo = `, edited ${timeAgo(new Date(post.latestEdit * 1000))}`;
	details.textContent = `Created ${createdAgo}${editedAgo}${lastReply}`;
};

/**
 * Add markdown parsing to posts
 * @param {object} post Post data
 * @param {HTMLElement} postElement Post element
 */
const renderMarkdownInPost  = (post, postElement) => {
	const postContent = postElement?.querySelector('.bubble .content');
	if (!postContent) return;

	renderMarkdown(postContent, post.message);
};

/**
 * Highlight threads with unmoderated replies
 * @param {object} post Post data
 * @param {HTMLElement} postElement Post element
 */
const addUnmoderatedHighlight = (post, postElement) => {
	if (!post?.hasAnyReplies || Users.getHighestGmLevel() < UIConstants.ADMIN_LEVEL_DELETE_THREAD_OR_REPLY) return;

	Backend.getInstance().getForumReplies(result => {
		if (typeof result === 'object') {
			if (!result.result?.data?.replies) return;

			const hasUnmoderatedReplies = result.result.data.replies.some(reply => reply.moderatedBy === null);
			postElement.setAttribute('data-unmoderated', hasUnmoderatedReplies ? 'true' : '');
		}
	}, () => {}, () => {}, post.id, Number.MAX_SAFE_INTEGER, 'older', 0, 3);
};

/**
 * Add a markdown preview button to the compose field
 */
const addMarkdownPreviewToComposeFields = () => {
	const compose = $('#threadsWrapper > .compose .bubble textarea')
		.add('#repliesWrapper > .compose .bubble textarea');

	compose.each(function() {
		$(this).mdeditor();
	});
};

/**
 * Add extra features to a thread or reply
 * @param {object} post Post data
 * @param {HTMLElement} postElement Post element
 */
const addFeaturesToPost = (post, postElement) => {
	insertMultipleCreatorsInPost(post, postElement);
	addLastEdited(post, postElement);
	addShareButton(post, postElement);
	renderMarkdownInPost(post, postElement);
	addUnmoderatedHighlight(post, postElement);
};

/**
 * Handle a thread or reply
 * @param {object} post - Post data
 */
const handlePost = post => {
	if (!post?.html) return;

	const [key] = Object.keys(post.html);
	if (typeof post.html[key] === 'string') {
		let postElement = document.createElement('div');
		postElement.innerHTML = post.html[key];
		postElement = postElement.firstElementChild;

		addFeaturesToPost(post, postElement);

		post.html[key] = $(postElement);
		post.html._backup = post.html[key];
	} else if (post.html[key] instanceof $) {
		let postElement = document.createElement('div');
		postElement.innerHTML = post.html._backup;
		postElement = postElement.firstElementChild;

		addFeaturesToPost(post, postElement);

		post.html[key] = $(postElement);
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
			handlePost(model.getThreadById(postItem) || model.getReplyById(postItem));
			break;
		case 'postList':
			for (const post of postItem) handlePost(post);
			break;
		case 'post':
			handlePost(postItem);
			break;
		default:
			break;
	}

	// Whenever a change happens we must handle the selected thread
	// as well, as its set by the getter functions, and not sent through
	// the change event listeners
	handlePost(Forum.getInstance().model.getSelectedThread());
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
	const { model } = instance;

	model.threadListChangeListeners = [...new Set([proxy, ...model.threadListChangeListeners])];
	model.replyListChangeListeners = [...new Set([proxy, ...model.replyListChangeListeners])];

	interceptFunction(instance, 'updateComposeAndStatus', (original, ...funcArgs) => {
		addMarkdownPreviewToComposeFields();

		return original(...funcArgs);
	});

	return instance;
});

interceptFunction(ForumView, 'threadEditStarted', (original, ...args) => {
	const [id] = args;
	$(`#thread-${ id } .bubble .edit textarea`).mdeditor();

	return original(...args);
}, { isClassy: true });

interceptFunction(ForumView, 'replyEditStarted', (original, ...args) => {
	const [id] = args;
	$(`#reply-${ id } .bubble .edit textarea`).mdeditor();

	return original(...args);
}, { isClassy: true });

interceptFunction(ForumView, 'threadEditFinished', (original, ...args) => {
	$('#threadsContainer .thread .bubble .edit textarea').mdeditor('remove');

	return original(...args);
}, { isClassy: true });

interceptFunction(ForumView, 'replyEditFinished', (original, ...args) => {
	$('#repliesContainer .reply .bubble .edit textarea').mdeditor('remove');

	return original(...args);
}, { isClassy: true });
