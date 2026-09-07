import { TemplesComponent } from "@temples/components";
import type { ShoppingItemData } from "../../types.ts";
import template from "./shopping-vault.html" with { type: "text" };
import "./shopping-vault.css";

/**
 * A holding place for removed items, with a way to bring them back.
 *
 * The vault listens to `shopping-item:removed` and collects the removed items.
 * Each entry exposes a recall button that emits `recalled`, which the app uses
 * to restore the item into the active list.
 */
export class ShoppingVault extends TemplesComponent {
	constructor() {
		const state = {
			vaultItems: [] as ShoppingItemData[],
			isEmpty() {
				return this.vaultItems.length === 0;
			}
		};

		super(state);
	}

	static override events = {
		"shopping-item:removed": "onRemoved",
		"click .recall": "onRecall"
	};

	/**
	 * Collect a removed item into the vault.
	 */
	onRemoved(evt: CustomEvent): void {
		const items = this.state.vaultItems as ShoppingItemData[];

		items.push(evt.detail as ShoppingItemData);
	}

	/**
	 * Remove an item from the vault and publish it for recall.
	 */
	onRecall(evt: Event): void {
		const button = (evt.target as Element).closest("button.recall");
		const id = button?.getAttribute("data-id");

		if (id === null || id === undefined) return;

		const items = this.state.vaultItems as ShoppingItemData[];
		const item = items.find((entry) => entry.id === id);

		if (item === undefined) return;

		this.state.vaultItems = items.filter((entry) => entry.id !== id);
		this.emit("recalled", item);
	}
}

TemplesComponent.define("shopping-vault", ShoppingVault, {
	template
});
