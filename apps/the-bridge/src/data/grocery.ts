import type { GrocerySection } from '@/types'

export const GROCERY_TEMPLATE: GrocerySection[] = [
  {
    name: 'Proteins',
    items: [
      { name: 'Chicken breast', qty: '1 kg', checked: false },
      { name: 'Ground beef (lean)', qty: '500 g', checked: false },
      { name: 'Salmon fillets', qty: '400 g', checked: false },
      { name: 'Eggs', qty: '12', checked: false },
      { name: 'Whey protein', qty: '1 tub', checked: false },
    ],
  },
  {
    name: 'Dairy',
    items: [
      { name: 'Greek yogurt (full fat)', qty: '1 kg', checked: false },
      { name: 'Whole milk', qty: '2 L', checked: false },
      { name: 'Ricotta', qty: '250 g', checked: false },
      { name: 'Parmigiano', qty: '200 g', checked: false },
    ],
  },
  {
    name: 'Carbs',
    items: [
      { name: 'Pasta (whole wheat)', qty: '500 g', checked: false },
      { name: 'Rice', qty: '1 kg', checked: false },
      { name: 'Oats', qty: '500 g', checked: false },
      { name: 'Sourdough bread', qty: '1 loaf', checked: false },
      { name: 'Potatoes', qty: '1 kg', checked: false },
    ],
  },
  {
    name: 'Pantry & Fats',
    items: [
      { name: 'Olive oil (extra virgin)', qty: '500 ml', checked: false },
      { name: 'Peanut butter', qty: '1 jar', checked: false },
      { name: 'Mixed nuts', qty: '300 g', checked: false },
      { name: 'Honey', qty: '1 jar', checked: false },
      { name: 'Tomato passata', qty: '2 jars', checked: false },
    ],
  },
  {
    name: 'Produce',
    items: [
      { name: 'Bananas', qty: '7', checked: false },
      { name: 'Berries', qty: '500 g', checked: false },
      { name: 'Spinach', qty: '1 bag', checked: false },
      { name: 'Broccoli', qty: '1 head', checked: false },
      { name: 'Onions', qty: '4', checked: false },
      { name: 'Garlic', qty: '1 bulb', checked: false },
      { name: 'Lemons', qty: '4', checked: false },
    ],
  },
  {
    name: 'Smoothie & Supplements',
    items: [
      { name: 'Vitamin D3 (2-4k IU)', qty: '1 bottle', checked: false },
      { name: 'Omega-3 fish oil', qty: '1 bottle', checked: false },
      { name: 'Frozen banana (for smoothie)', qty: 'as needed', checked: false },
    ],
  },
]
