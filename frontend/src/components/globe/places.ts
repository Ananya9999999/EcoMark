/**
 * Offline gazetteer for the location cascade: country → region → place.
 * Bundled rather than fetched so the demo never depends on a network call
 * or an API key. An optional online search layers on top when available.
 */

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

export interface Region {
  name: string;
  lat: number;
  lng: number;
  places: Place[];
}

export interface Country {
  code: string;
  name: string;
  lat: number;
  lng: number;
  regions: Region[];
}

export const COUNTRIES: Country[] = [
  {
    code: "IN",
    name: "India",
    lat: 22.35,
    lng: 78.66,
    regions: [
      {
        name: "Karnataka",
        lat: 15.32,
        lng: 75.71,
        places: [
          { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
          { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
          { name: "Hubballi", lat: 15.3647, lng: 75.124 },
          { name: "Coorg (Madikeri)", lat: 12.4244, lng: 75.7382 },
        ],
      },
      {
        name: "Tamil Nadu",
        lat: 11.13,
        lng: 78.66,
        places: [
          { name: "Chennai", lat: 13.0827, lng: 80.2707 },
          { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
          { name: "Vellore", lat: 12.9165, lng: 79.1325 },
          { name: "Ooty", lat: 11.4102, lng: 76.695 },
        ],
      },
      {
        name: "Maharashtra",
        lat: 19.75,
        lng: 75.71,
        places: [
          { name: "Mumbai", lat: 19.076, lng: 72.8777 },
          { name: "Pune", lat: 18.5204, lng: 73.8567 },
          { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
        ],
      },
      {
        name: "Kerala",
        lat: 10.85,
        lng: 76.27,
        places: [
          { name: "Kochi", lat: 9.9312, lng: 76.2673 },
          { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
          { name: "Wayanad", lat: 11.6854, lng: 76.132 },
        ],
      },
      {
        name: "Delhi NCR",
        lat: 28.61,
        lng: 77.21,
        places: [
          { name: "New Delhi", lat: 28.6139, lng: 77.209 },
          { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
          { name: "Noida", lat: 28.5355, lng: 77.391 },
        ],
      },
      {
        name: "West Bengal",
        lat: 22.99,
        lng: 87.85,
        places: [
          { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
          { name: "Darjeeling", lat: 27.041, lng: 88.2663 },
          { name: "Sundarbans", lat: 21.9497, lng: 88.9 },
        ],
      },
      {
        name: "Rajasthan",
        lat: 27.02,
        lng: 74.22,
        places: [
          { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
          { name: "Jodhpur", lat: 26.2389, lng: 73.0243 },
          { name: "Udaipur", lat: 24.5854, lng: 73.7125 },
        ],
      },
      {
        name: "Telangana",
        lat: 18.11,
        lng: 79.02,
        places: [
          { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
          { name: "Warangal", lat: 17.9689, lng: 79.5941 },
        ],
      },
    ],
  },
  {
    code: "BR",
    name: "Brazil",
    lat: -14.24,
    lng: -51.93,
    regions: [
      {
        name: "Amazonas",
        lat: -3.42,
        lng: -65.86,
        places: [
          { name: "Manaus", lat: -3.119, lng: -60.0217 },
          { name: "Tefé", lat: -3.3544, lng: -64.7108 },
        ],
      },
      {
        name: "São Paulo",
        lat: -23.55,
        lng: -46.63,
        places: [
          { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
          { name: "Campinas", lat: -22.9099, lng: -47.0626 },
        ],
      },
      {
        name: "Pará",
        lat: -3.79,
        lng: -52.48,
        places: [
          { name: "Belém", lat: -1.4558, lng: -48.4902 },
          { name: "Santarém", lat: -2.4431, lng: -54.7083 },
        ],
      },
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    lat: -0.02,
    lng: 37.91,
    regions: [
      {
        name: "Nairobi",
        lat: -1.29,
        lng: 36.82,
        places: [{ name: "Nairobi", lat: -1.2921, lng: 36.8219 }],
      },
      {
        name: "Rift Valley",
        lat: 0.52,
        lng: 35.27,
        places: [
          { name: "Nakuru", lat: -0.3031, lng: 36.08 },
          { name: "Eldoret", lat: 0.5143, lng: 35.2698 },
        ],
      },
    ],
  },
  {
    code: "ID",
    name: "Indonesia",
    lat: -0.79,
    lng: 113.92,
    regions: [
      {
        name: "Java",
        lat: -7.15,
        lng: 110.14,
        places: [
          { name: "Jakarta", lat: -6.2088, lng: 106.8456 },
          { name: "Bandung", lat: -6.9175, lng: 107.6191 },
        ],
      },
      {
        name: "Kalimantan",
        lat: -1.68,
        lng: 113.38,
        places: [{ name: "Palangkaraya", lat: -2.2136, lng: 113.9108 }],
      },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    lat: 55.38,
    lng: -3.44,
    regions: [
      {
        name: "England",
        lat: 52.36,
        lng: -1.17,
        places: [
          { name: "London", lat: 51.5074, lng: -0.1278 },
          { name: "Manchester", lat: 53.4808, lng: -2.2426 },
        ],
      },
      {
        name: "Scotland",
        lat: 56.49,
        lng: -4.2,
        places: [{ name: "Edinburgh", lat: 55.9533, lng: -3.1883 }],
      },
    ],
  },
  {
    code: "US",
    name: "United States",
    lat: 39.83,
    lng: -98.58,
    regions: [
      {
        name: "California",
        lat: 36.78,
        lng: -119.42,
        places: [
          { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
          { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
        ],
      },
      {
        name: "New York",
        lat: 43.0,
        lng: -75.0,
        places: [{ name: "New York City", lat: 40.7128, lng: -74.006 }],
      },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    lat: -25.27,
    lng: 133.78,
    regions: [
      {
        name: "New South Wales",
        lat: -31.25,
        lng: 146.92,
        places: [{ name: "Sydney", lat: -33.8688, lng: 151.2093 }],
      },
      {
        name: "Queensland",
        lat: -20.92,
        lng: 142.7,
        places: [{ name: "Brisbane", lat: -27.4698, lng: 153.0251 }],
      },
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    lat: -30.56,
    lng: 22.94,
    regions: [
      {
        name: "Western Cape",
        lat: -33.23,
        lng: 21.86,
        places: [{ name: "Cape Town", lat: -33.9249, lng: 18.4241 }],
      },
      {
        name: "Gauteng",
        lat: -26.27,
        lng: 28.11,
        places: [{ name: "Johannesburg", lat: -26.2041, lng: 28.0473 }],
      },
    ],
  },
];

export interface SearchHit {
  label: string;
  lat: number;
  lng: number;
  country: Country;
  region?: Region;
}

/** Flat search across every level of the gazetteer. */
export function searchEverything(query: string, limit = 6): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const country of COUNTRIES) {
    if (country.name.toLowerCase().includes(q)) {
      hits.push({ label: country.name, lat: country.lat, lng: country.lng, country });
    }
    for (const region of country.regions) {
      if (region.name.toLowerCase().includes(q)) {
        hits.push({
          label: `${region.name}, ${country.name}`,
          lat: region.lat,
          lng: region.lng,
          country,
          region,
        });
      }
      for (const place of region.places) {
        if (place.name.toLowerCase().includes(q)) {
          hits.push({
            label: `${place.name}, ${region.name}`,
            lat: place.lat,
            lng: place.lng,
            country,
            region,
          });
        }
      }
    }
  }
  return hits.slice(0, limit);
}

/** Optional online lookup — keyless OpenStreetMap. Silent when offline. */
export async function searchOnline(query: string): Promise<Place[]> {
  if (query.trim().length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return rows.map((r) => ({
      name: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));
  } catch {
    return [];
  }
}
