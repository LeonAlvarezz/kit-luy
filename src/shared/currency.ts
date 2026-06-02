export enum CURRENCY {
  USD = "USD",
}
export const formatAmount = (amount: number) => (amount / 100).toFixed(2);
