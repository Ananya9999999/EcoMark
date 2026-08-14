/** A small offline gazetteer for the location search — no external API. */

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

export const PLACES: Place[] = [
  { name: "Bengaluru, India", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai, India", lat: 13.0827, lng: 80.2707 },
  { name: "Mumbai, India", lat: 19.076, lng: 72.8777 },
  { name: "Delhi, India", lat: 28.7041, lng: 77.1025 },
  { name: "Hyderabad, India", lat: 17.385, lng: 78.4867 },
  { name: "Kolkata, India", lat: 22.5726, lng: 88.3639 },
  { name: "Pune, India", lat: 18.5204, lng: 73.8567 },
  { name: "Vellore, India", lat: 12.9165, lng: 79.1325 },
  { name: "Ooty, India", lat: 11.4102, lng: 76.695 },
  { name: "Kochi, India", lat: 9.9312, lng: 76.2673 },
  { name: "Jaipur, India", lat: 26.9124, lng: 75.7873 },
  { name: "London, UK", lat: 51.5074, lng: -0.1278 },
  { name: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { name: "Berlin, Germany", lat: 52.52, lng: 13.405 },
  { name: "Nairobi, Kenya", lat: -1.2921, lng: 36.8219 },
  { name: "Lagos, Nigeria", lat: 6.5244, lng: 3.3792 },
  { name: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
  { name: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 },
  { name: "New York, USA", lat: 40.7128, lng: -74.006 },
  { name: "San Francisco, USA", lat: 37.7749, lng: -122.4194 },
  { name: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333 },
  { name: "Manaus, Brazil", lat: -3.119, lng: -60.0217 },
  { name: "Lima, Peru", lat: -12.0464, lng: -77.0428 },
  { name: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332 },
  { name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Jakarta, Indonesia", lat: -6.2088, lng: 106.8456 },
  { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Auckland, New Zealand", lat: -36.8485, lng: 174.7633 },
  { name: "Reykjavík, Iceland", lat: 64.1466, lng: -21.9426 },
];

export function searchPlaces(query: string, limit = 5): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return PLACES.filter((p) => p.name.toLowerCase().includes(q)).slice(0, limit);
}
