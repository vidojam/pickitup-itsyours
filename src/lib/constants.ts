export const LEGAL_DISCLAIMER = `Terms of Use & Disclaimer:
By using this site, you acknowledge that all items listed are considered discarded garbage placed curbside for pickup by the original owner or municipal services.
We are a listing service only. We are not responsible for the condition, safety, or legality of any item listed.
You assume full responsibility for inspecting, transporting, and using any item you pick up.
We are NOT responsible for any damages, injuries, losses, or occurrences that happen during or after the pickup of any item.
Each garbage location is provided to only one person at a time.
If you see the garbage and decide not to pick up any item in it, you will receive a refund or will not be charged for the item. You are then free to select any other PickItUp-ItsYours garbage location.
In the name of fairness, no one person may select two or more garbage locations at a time. `;

export const OFFER_AMOUNTS = [500] as const;

export const DEFAULT_OFFER_AMOUNT = OFFER_AMOUNTS[0];

export function formatOfferAmount(amount: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount / 100);
}
