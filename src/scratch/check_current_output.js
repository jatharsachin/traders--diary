import { calculateIndianTaxesAndBrokerage } from '../utils/taxEngine.js';

// Buy Trade: Qty: 1625, Executed at: 53.992
const buyRes = calculateIndianTaxesAndBrokerage('F&O', 'Intraday', 'BUY', 1625, 53.992, 53.992);
// Sell Trade: Qty: 1625, Executed at: 66.204
const sellRes = calculateIndianTaxesAndBrokerage('F&O', 'Intraday', 'SELL', 1625, 66.204, 66.204);

console.log('Buy Side:', buyRes);
console.log('Sell Side:', sellRes);
console.log('Combined Total Charges:', buyRes.totalCharges + sellRes.totalCharges);
console.log('Combined Brokerage:', buyRes.brokerage + sellRes.brokerage);
console.log('Combined Taxes/Charges (Excl Brokerage):', (buyRes.totalCharges + sellRes.totalCharges) - (buyRes.brokerage + sellRes.brokerage));
