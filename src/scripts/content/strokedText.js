if (!customElements.get('stroked-text')) {
	// The jquery SVG plugin does not support the newer paint-order attribute
	$.svg._attrNames.paintOrder = 'paint-order';

	customElements.define('stroked-text',

		/**
		 * Custom HTML element that renders a TankTrouble-style teext
		 * from the text, width and height attribute
		 */
		class StrokedText extends HTMLElement {

			/**
			 * Initialize the text element
			 */
			constructor() {
				super();

				const shadow = this.attachShadow({ mode: 'closed' });

				this.innerText = this.getAttribute('text');
				this.width = this.getAttribute('width') || '150';
				this.height = this.getAttribute('height') || '25';

				// create the internal implementation
				this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				this.svg.setAttribute('width', this.width);
				this.svg.setAttribute('height', this.height);

				this.text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
				this.text.setAttribute('x', '50%');
				this.text.setAttribute('y', '0');
				this.text.setAttribute('text-anchor', 'middle');
				this.text.setAttribute('dominant-baseline', 'text-before-edge');
				this.text.setAttribute('font-family', 'TankTrouble');
				this.text.setAttribute('font-weight', 'normal');
				this.text.setAttribute('font-size', '16');
				this.text.setAttribute('fill', 'white');
				this.text.setAttribute('stroke', 'black');
				this.text.setAttribute('stroke-line-join', 'round');
				this.text.setAttribute('stroke-width', '2');
				this.text.setAttribute('paint-order', 'stroke');
				this.text.textContent = this.innerText;

				this.svg.appendChild(this.text);

				this.hasResized = false;

				shadow.appendChild(this.svg);
			}

			/**
			 * Scale the SVG text when it's in the DOM.
			 *
			 * Bounding boxes will first be calculated right when
			 * it can be rendered.
			 */
			connectedCallback() {
				if (this.hasResized) return;

				const textWidth = this.text.getComputedTextLength();
				if (textWidth > this.clientWidth) {
					// Scale text down to match svg size
					const newSize = Math.floor((this.clientWidth / textWidth) * 100);
					this.text.setAttribute('font-size', `${ newSize }%`);
				}

				const newY = this.svg.clientHeight / 2 - this.text.clientHeight;
				this.text.setAttribute('y', `${ newY }px`);

				this.hasResized = true;
			}

		});
}

export const _isESmodule = true;
