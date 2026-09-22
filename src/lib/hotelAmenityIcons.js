import {
  Bath,
  Bed,
  Coffee,
  Luggage,
  ParkingCircle,
  Phone,
  ShowerHead,
  Snowflake,
  Tv,
  Utensils,
  Wifi,
} from "lucide-react";

export const hotelAmenityIcons = {
  Restaurant: Utensils,
  Bed,
  "Room Phone": Phone,
  Parking: ParkingCircle,
  Shower: ShowerHead,
  "Towel In Room": Bath,
  "Wi-Fi": Wifi,
  Television: Tv,
  "Bath Tub": Bath,
  Elevator: Luggage,
  Laggage: Luggage,
  Luggage,
  "Tea Maker": Coffee,
  "Room AC": Snowflake,
};

export function getHotelAmenityIcon(label) {
  return hotelAmenityIcons[label] || Bed;
}
