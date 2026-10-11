export interface CategoryTheme {
  name: string;
  subcategories: string[];
}

export const POSTER_CATEGORIES: CategoryTheme[] = [
  {
    name: "Art and entertainment",
    subcategories: [
      "Anime and manga",
      "Movies and TV shows",
      "Video games",
      "Music and bands",
      "Celebrities and characters",
      "Comics and graphic novels",
      "Fantasy and mythology",
      "Horror and sci-fi",
      "Memes and internet culture",
    ],
  },
  {
    name: "Vehicles and travel",
    subcategories: [
      "Cars and automotive",
      "Motorcycles",
      "Racing and motorsports",
      "Aviation and aircraft",
      "Trains and railways",
      "Ships and sailing",
      "Travel destinations",
      "Maps and cityscapes",
    ],
  },
  {
    name: "Sports and activities",
    subcategories: [
      "Football, basketball, cricket, and other sports",
      "Esports",
      "Fitness and bodybuilding",
      "Skateboarding and BMX",
      "Outdoor adventure",
      "Hobbies and crafts",
    ],
  },
  {
    name: "Nature and science",
    subcategories: [
      "Animals and wildlife",
      "Landscapes and nature",
      "Space and astronomy",
      "Science and technology",
      "Plants and flowers",
      "Environmental causes",
    ],
  },
  {
    name: "Style and visual design",
    subcategories: [
      "Minimalist",
      "Typography and quote posters",
      "Photography",
      "Abstract art",
      "Vintage and retro",
      "Street art and graffiti",
      "Pop art",
      "Dark academia, cyberpunk, or other aesthetics",
    ],
  },
  {
    name: "Information and promotion",
    subcategories: [
      "Events and concerts",
      "Products and brands",
      "Fashion and beauty",
      "Food and drinks",
      "Education and research",
      "Motivational and inspirational",
      "Political and social causes",
      "Safety and public awareness",
    ],
  },
];

export const ALL_CATEGORIES: string[] = POSTER_CATEGORIES.flatMap(
  (theme) => theme.subcategories,
);

export function getThemeForCategory(category: string): string {
  const clean = category.trim().toLowerCase();
  for (const theme of POSTER_CATEGORIES) {
    if (theme.subcategories.some((sub) => sub.toLowerCase() === clean)) {
      return theme.name;
    }
  }
  return "General";
}
