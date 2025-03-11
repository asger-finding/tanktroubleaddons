if (!customElements.get('stroked-text')) {
	// The jquery SVG plugin does not support the newer paint-order attribute
	$.svg._attrNames.paintOrder = 'paint-order';

	customElements.define('stroked-text',
		/**
		 * Custom HTML element that renders a TankTrouble-style teext
		 * from the text, width and height attribute
		 */
		class extends HTMLElement {
			/**
			 * Create new auto-resizing stroked text element
			 * @example
			 * const text = $(`<stroked-text text="Laika" width="200px height="2em"></stroked-text>`);
			 */
			constructor() {
				super();

				const shadow = this.attachShadow({ mode: 'closed' });

				// Store original width & height attributes
				this.widthAttr = this.getAttribute('width') || '150px';
				this.heightAttr = this.getAttribute('height') || '25px';
				this.textContent = this.getAttribute('text') || '';

				// Create the SVG
				this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				this.svg.setAttribute('width', this.widthAttr);
				this.svg.setAttribute('height', this.heightAttr);
				this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

				// Create the text element
				this.text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
				this.text.setAttribute('x', '50%');
				this.text.setAttribute('y', '50%');
				this.text.setAttribute('text-anchor', 'middle');
				this.text.setAttribute('dominant-baseline', 'middle');
				this.text.setAttribute('font-family', 'TankTrouble');
				this.text.setAttribute('font-weight', 'normal');
				this.text.setAttribute('font-size', '16');
				this.text.setAttribute('fill', 'white');
				this.text.setAttribute('stroke', 'black');
				this.text.setAttribute('stroke-line-join', 'round');
				this.text.setAttribute('stroke-width', '2');
				this.text.setAttribute('paint-order', 'stroke');
				this.text.textContent = this.textContent;

				this.svg.appendChild(this.text);
				shadow.appendChild(this.svg);

				this.isAdjusting = false;
			}

			/**
			 * Adjust the font size of the text to fit within the SVG.
			 */
			adjustFontSize() {
				if (this.isAdjusting) return;
				this.isAdjusting = true;

				// Temporarily detach the element from its parent and attach
				// it to the the body, as to avoid transformation issues.
				const parent = this.parentElement;
				if (parent) parent.removeChild(this);
				document.body.appendChild(this);

				const { width, height } = this.svg.getBoundingClientRect();

				this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

				const textBox = this.text.getBBox();
				const textWidth = textBox.width;

				// Scale font-size down if text is wider than the SVG
				if (textWidth > width) {
					const scaleFactor = width / textWidth;
					const newSize = Math.floor(16 * scaleFactor);
					this.text.setAttribute('font-size', `${newSize}px`);
				}

				// Reattach the element to its original parent
				if (parent) parent.appendChild(this);
				else document.body.removeChild(this);

				this.isAdjusting = false;
			}

			/**
			 * Called when the element is added to the DOM.
			 */
			connectedCallback() {
				if (this.isAdjusting) return;

				// Adjust font size after the element is connected
				this.adjustFontSize();

				// Resize observer to handle dynamic size changes
				this.resizeObserver = new ResizeObserver(() => this.adjustFontSize());
				this.resizeObserver.observe(this);
			}

			/**
			 * Called when the element is removed from the DOM.
			 */
			disconnectedCallback() {
				if (this.resizeObserver) this.resizeObserver.disconnect();
			}
		}
	);
}

export const _isESmodule = true;
