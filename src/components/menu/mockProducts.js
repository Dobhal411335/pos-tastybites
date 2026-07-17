export const mockProducts = [
  // Burgers
  {
    id: "b1",
    name: "Prime Rib Burger",
    desc: "Aged beef patty, caramelized onions, white cheddar, horseradish aioli on brioche.",
    price: 18.50,
    category: "burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    available: true,
    ingredients: "AAA Prime Rib Chuck, White Cheddar, Caramelized Onions, Brioche, Horseradish Sauce",
    sizes: [
      { name: "Regular Size", price: 0.00, tax: 2.40 },
      { name: "Double Patty Stack", price: 6.50, tax: 3.25 }
    ],
    addons: [
      { name: "Extra Smoked Bacon", price: 3.00, tax: 0.39 },
      { name: "Fried Organic Egg", price: 2.00, tax: 0.26 }
    ]
  },
  {
    id: "b2",
    name: "Classic Cheeseburger",
    desc: "Canadian chuck patty, american cheese, pickles, lettuce, tomato, house sauce.",
    price: 15.00,
    category: "burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    available: true,
    ingredients: "Ground Beef, American Cheese, Pickles, Butter Lettuce, Roma Tomato, Classic Dressing",
    sizes: [
      { name: "Single Patty", price: 0.00, tax: 1.95 },
      { name: "Double Cheese Stack", price: 4.50, tax: 2.50 }
    ],
    addons: [
      { name: "Cheddar Slice", price: 1.50, tax: 0.20 },
      { name: "Pickled Jalapenos", price: 1.00, tax: 0.13 }
    ]
  },
  {
    id: "b3",
    name: "Crispy Bacon Burger",
    desc: "Smoked bacon, double cheddar, crispy onions, sweet BBQ glaze, toasted sesame bun.",
    price: 19.50,
    category: "burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    available: true,
    ingredients: "Beef Patty, Applewood Bacon, Double Cheddar, Crispy Fried Onions, Hickory BBQ Sauce",
    sizes: [
      { name: "Single Patty", price: 0.00, tax: 2.50 },
      { name: "Gluten Free Bun", price: 2.00, tax: 0.26 }
    ],
    addons: [
      { name: "Extra Bacon Strip", price: 2.50, tax: 0.33 },
      { name: "Guacamole Scoop", price: 3.00, tax: 0.39 }
    ]
  },
  {
    id: "b4",
    name: "Avocado Garden Burger",
    desc: "Plant-based patty, fresh smashed avocado, sprouts, butter lettuce, herb vinaigrette.",
    price: 17.50,
    category: "burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    available: false,
    ingredients: "Beyond Meat Patty, Avocado Mash, Clover Sprouts, Herb Vinaigrette, Vegan Bun",
    sizes: [
      { name: "Regular Patty", price: 0.00, tax: 2.28 }
    ],
    addons: [
      { name: "Vegan Cheese", price: 2.00, tax: 0.26 }
    ]
  },

  // Steaks
  {
    id: "s1",
    name: "AAA New York Striploin",
    desc: "12oz center-cut, garlic mashed potatoes, seasonal vegetables, red wine reduction.",
    price: 38.00,
    category: "steaks",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
    available: true,
    ingredients: "AAA Beef Striploin, Garlic Mash, Asparagus, Cabernet Sauvignon Jus, Butter",
    sizes: [
      { name: "12oz Striploin Cut", price: 0.00, tax: 4.94 },
      { name: "16oz Big Cut", price: 10.00, tax: 6.24 }
    ],
    addons: [
      { name: "Garlic Butter Prawns", price: 8.00, tax: 1.04 },
      { name: "Caramelized Mushrooms", price: 4.50, tax: 0.59 }
    ]
  },

  // Seafood
  {
    id: "sf1",
    name: "Wild Salmon Platter",
    desc: "Pan-seared BC salmon, jasmine rice, fresh asparagus, warm citrus caper butter.",
    price: 26.50,
    category: "seafood",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop",
    available: true,
    ingredients: "BC Coho Salmon, Jasmine Rice, Capers, Lemon, Asparagus, Dill Butter",
    sizes: [
      { name: "Standard Fillet", price: 0.00, tax: 3.45 }
    ],
    addons: [
      { name: "Extra Asparagus", price: 4.00, tax: 0.52 }
    ]
  }
];
