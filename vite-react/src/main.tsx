import {createRoot, Root} from "react-dom/client";
import {OmniContentReact} from "./components/OmniContentReact";
import {type OmniContentReactLib, OmniContentReactProps} from "./types";
import "./index.css";

// Store for managing React roots
const rootStore = new Map<HTMLElement, Root>();

// Library implementation
const OmniContentReactLib: OmniContentReactLib = {
	mount: (container: HTMLElement, props: OmniContentReactProps) => {
		// Clean up existing root if any
		if (rootStore.has(container)) {
			OmniContentReactLib.unmount(container);
		}

		// Create new root and render component
		const root = createRoot(container);
		rootStore.set(container, root);

		root.render(<OmniContentReact {...props} />);
	},

	unmount: (container: HTMLElement) => {
		const root = rootStore.get(container);
		if (root) {
			root.unmount();
			rootStore.delete(container);
		}
	},

	update: (container: HTMLElement, props: OmniContentReactProps) => {
		const root = rootStore.get(container);
		if (root) {
			root.render(<OmniContentReact {...props} />);
		} else {
			// If no root exists, create one
			OmniContentReactLib.mount(container, props);
		}
	}
};

// Export for UMD build
if (typeof window !== 'undefined') {
	(window as any).OmniContentReact = OmniContentReactLib;
}

// Export for ES modules
export default OmniContentReactLib;
export {OmniContentReact};
export type {OmniContentReactProps, OmniContentReactLib};
