export function isTruncated(
	node: HTMLElement,
	callback: (truncated: boolean) => void
) {
	function check() {
		callback(node.scrollWidth > node.clientWidth);
	}
	check();
	window.addEventListener('resize', check);
	return {
		destroy() {
			window.removeEventListener('resize', check);
		}
	};
}
