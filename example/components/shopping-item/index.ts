import { TemplesComponent } from "@temples/components";
import type { ShoppingItemData } from "../../types.ts";
import template from "./shopping-item.html" with { type: "text" };
import "./shopping-item.css";

/**
 * The complete state shape of a shopping item: the observed attributes from
 * the `attributes` map, plus the internal editor flag and the two computed
 * helpers the template calls.
 */
type ShoppingItemState = ShoppingItemData & {
	editing: boolean;
	checkedClass(): string;
	notEditing(): boolean;
};

/**
 * A single shopping list entry, configured through plain attributes.
 *
 * `id`, `label`, and `checked` are observed attributes declared in the
 * `attributes` map of `define()`, fed by the parent `shopping-app`. `editing`
 * is internal state that toggles the inline editor. The component never
 * mutates the shared list directly: it emits `updated` and `removed` messages
 * carrying the full item, and the app owns the data.
 */
export class ShoppingItem extends TemplesComponent<ShoppingItemState> {
	constructor() {
		super({
			id: "",
			label: "",
			checked: false,
			editing: false,
			checkedClass() {
				return this.checked ? "checked" : "unchecked";
			},
			notEditing() {
				return !this.editing;
			}
		});
	}

	/**
	 * Flip the checked flag and publish the updated item.
	 */
	onToggle(): void {
		this.state.checked = !this.state.checked;
		this.emit("updated", this.snapshot());
	}

	/**
	 * Enter inline edit mode.
	 */
	onEdit(): void {
		this.state.editing = true;
	}

	/**
	 * Commit the edited label and leave edit mode.
	 */
	onSave(): void {
		const input = this.querySelector<HTMLInputElement>("input.edit-input");
		const label = input?.value.trim() ?? "";

		if (label === "") return;

		this.emit("updated", { id: this.state.id, label, checked: this.state.checked });
		this.state.editing = false;
	}

	/**
	 * Publish a removal request for this item.
	 */
	onRemove(): void {
		this.emit("removed", this.snapshot());
	}

	/**
	 * Build the plain data payload carried by every message.
	 */
	private snapshot(): ShoppingItemData {
		const { id, label, checked } = this.state;

		return { id, label, checked };
	}
}

TemplesComponent.define("shopping-item", ShoppingItem, {
	template,
	attributes: { id: "string", label: "string", checked: "boolean" },
	events: {
		"change .toggle": "onToggle",
		"click .edit": "onEdit",
		"click .save": "onSave",
		"click .remove": "onRemove"
	}
});
