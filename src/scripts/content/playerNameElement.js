if (!customElements.get('player-name')) {
	// The jquery SVG plugin does not support the newer paint-order attribute
	$.svg._attrNames.paintOrder = 'paint-order';

	customElements.define('player-name',

		/**
		 * Custom HTML element that renders a TankTrouble-style player name
		 * from the username, width and height attribute
		 */
		class PlayerName extends HTMLElement {

			/**
			 * Initialize the player name element
			 */
			constructor() {
				super();

				const shadow = this.attachShadow({ mode: 'closed' });

				this.username = this.getAttribute('username') || 'Scrapped';
				this.width = this.getAttribute('width') || '150';
				this.height = this.getAttribute('height') || '25';

				// create the internal implementation
				this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				this.svg.setAttribute('width', this.width);
				this.svg.setAttribute('height', this.height);

				this.name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
				this.name.setAttribute('x', '50%');
				this.name.setAttribute('y', '0');
				this.name.setAttribute('text-anchor', 'middle');
				this.name.setAttribute('dominant-baseline', 'text-before-edge');
				this.name.setAttribute('font-family', 'TankTrouble');
				this.name.setAttribute('font-weight', 'normal');
				this.name.setAttribute('font-size', '16');
				this.name.setAttribute('fill', 'white');
				this.name.setAttribute('stroke', 'black');
				this.name.setAttribute('stroke-line-join', 'round');
				this.name.setAttribute('stroke-width', '2');
				this.name.setAttribute('paint-order', 'stroke');
				this.name.textContent = this.username;

				this.svg.appendChild(this.name);

				shadow.appendChild(this.svg);
			}

			/**
			 * Scale the username SVG text when it's in the DOM.
			 * 
			 * Bounding boxes will first be calculated right when
			 * it can be rendered.
			 */
			connectedCallback() {
				const nameWidth = this.name.getComputedTextLength();
				if (nameWidth > this.width) {
					// Scale text down to match svg size
					const newSize = Math.floor((this.width / nameWidth) * 100);
					this.name.setAttribute('font-size', `${ newSize }%`);
				}
			}

		});
}
