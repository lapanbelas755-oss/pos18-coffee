import { CartItem } from "../types";

export const calculateItemUnitPrice = (item: CartItem): number => {
  let finalPrice = item.product.price;
  const mods = item.product.priceModifiers;
  
  if (mods) {
    if (item.selectedSize && mods[item.selectedSize]) finalPrice += mods[item.selectedSize];
    if (item.selectedIce && mods[item.selectedIce]) finalPrice += mods[item.selectedIce];
    if (item.selectedMood && mods[item.selectedMood]) finalPrice += mods[item.selectedMood];
    if (item.selectedSugar && mods[item.selectedSugar]) finalPrice += mods[item.selectedSugar];
  }
  
  return finalPrice;
};
