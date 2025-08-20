/**
 * Currency utilities for Iraqi Dinars only
 * دوال العملة للدينار العراقي فقط
 */

import {
  formatCurrency as formatCurrencyUtil,
  formatPriceWithDiscount,
  formatProductPrice,
  calculateDiscountPercentage,
  calculateFinalPrice
} from './currencyUtils';

// Re-export the main currency formatting function
export const formatCurrency = formatCurrencyUtil;

// Display price as-is without conversion
export const formatPrice = (price: number): string => {
  return formatCurrency(price);
};

// Re-export additional utilities
export {
  formatPriceWithDiscount,
  formatProductPrice,
  calculateDiscountPercentage,
  calculateFinalPrice
};
