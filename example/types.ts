/**
 * A shopping list item shared by the app, the item, and the vault.
 *
 * The `id` is a generated key used for reconciliation and message routing.
 * `label` is the item name, and `checked` marks it as added to the cart.
 */
export interface ShoppingItemData {
	id: string;
	label: string;
	checked: boolean;
}

/**
 * Check that a message payload is a shopping list item.
 *
 * Message details are `unknown` at the bus boundary. This guard narrows the
 * payload before the receiving component touches it, so the data flows on
 * typed without a cast.
 *
 * @param value - The message payload to check.
 * @returns True when the payload carries the three item fields.
 */
export const isShoppingItemData = (value: unknown): value is ShoppingItemData =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	"label" in value &&
	"checked" in value;
