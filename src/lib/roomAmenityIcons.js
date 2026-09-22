import { Bath, Bed, Briefcase, Coffee, Tv, Wind } from "lucide-react";

export const roomAmenityCategoryIcons = {
  Bedding: Bed,
  "Climate Control": Wind,
  "Furniture & Setup": Briefcase,
  Bathroom: Bath,
  "Electronics & Comfort": Tv,
  "Other Features": Coffee,
};

export function getRoomAmenityCategoryIcon(category) {
  return roomAmenityCategoryIcons[category] || Bed;
}
