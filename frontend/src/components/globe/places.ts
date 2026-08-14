/**
 * Offline gazetteer for the location funnel:
 *   country → state → city → PIN code → exact point
 *
 * Bundled rather than fetched, so the picker never depends on a network
 * call or an API key. An optional online postal lookup layers on top for
 * codes that are not in this list.
 */

export interface Pin {
  /** Postal / PIN code. */
  code: string;
  /** Area name, where one is worth showing. */
  area?: string;
  lat: number;
  lng: number;
}

export interface City {
  name: string;
  lat: number;
  lng: number;
  pins: Pin[];
}

export interface State {
  name: string;
  lat: number;
  lng: number;
  cities: City[];
}

export interface Country {
  code: string;
  name: string;
  lat: number;
  lng: number;
  /** What this country calls its postal code, for the field label. */
  postalLabel: string;
  states: State[];
}

export const COUNTRIES: Country[] = [
  {
    code: "IN",
    name: "India",
    lat: 22.35,
    lng: 78.66,
    postalLabel: "PIN code",
    states: [
      {
        name: "Karnataka",
        lat: 15.32,
        lng: 75.71,
        cities: [
          {
            name: "Bengaluru",
            lat: 12.9716,
            lng: 77.5946,
            pins: [
              { code: "560001", area: "Bengaluru GPO", lat: 12.9767, lng: 77.6033 },
              { code: "560034", area: "Koramangala", lat: 12.9345, lng: 77.6266 },
              { code: "560066", area: "Whitefield", lat: 12.9698, lng: 77.7499 },
              { code: "560103", area: "Bellandur", lat: 12.9264, lng: 77.6762 },
            ],
          },
          {
            name: "Mysuru",
            lat: 12.2958,
            lng: 76.6394,
            pins: [
              { code: "570001", area: "Mysuru GPO", lat: 12.3052, lng: 76.6552 },
              { code: "570011", area: "Vijayanagar", lat: 12.3186, lng: 76.6194 },
            ],
          },
          {
            name: "Coorg (Madikeri)",
            lat: 12.4244,
            lng: 75.7382,
            pins: [{ code: "571201", area: "Madikeri", lat: 12.4208, lng: 75.7397 }],
          },
        ],
      },
      {
        name: "Tamil Nadu",
        lat: 11.13,
        lng: 78.66,
        cities: [
          {
            name: "Chennai",
            lat: 13.0827,
            lng: 80.2707,
            pins: [
              { code: "600001", area: "Parrys", lat: 13.0925, lng: 80.2874 },
              { code: "600042", area: "Velachery", lat: 12.9755, lng: 80.2207 },
              { code: "600113", area: "Taramani", lat: 12.9895, lng: 80.2447 },
            ],
          },
          {
            name: "Coimbatore",
            lat: 11.0168,
            lng: 76.9558,
            pins: [{ code: "641001", area: "Coimbatore GPO", lat: 11.0018, lng: 76.9629 }],
          },
          {
            name: "Vellore",
            lat: 12.9165,
            lng: 79.1325,
            pins: [
              { code: "632001", area: "Vellore GPO", lat: 12.9184, lng: 79.1325 },
              { code: "632014", area: "Katpadi", lat: 12.9698, lng: 79.1559 },
            ],
          },
          {
            name: "Ooty",
            lat: 11.4102,
            lng: 76.695,
            pins: [{ code: "643001", area: "Udhagamandalam", lat: 11.4064, lng: 76.6932 }],
          },
        ],
      },
      {
        name: "Maharashtra",
        lat: 19.75,
        lng: 75.71,
        cities: [
          {
            name: "Mumbai",
            lat: 19.076,
            lng: 72.8777,
            pins: [
              { code: "400001", area: "Fort", lat: 18.9339, lng: 72.8356 },
              { code: "400050", area: "Bandra West", lat: 19.0606, lng: 72.8365 },
              { code: "400076", area: "Powai", lat: 19.1197, lng: 72.9051 },
            ],
          },
          {
            name: "Pune",
            lat: 18.5204,
            lng: 73.8567,
            pins: [
              { code: "411001", area: "Pune GPO", lat: 18.5196, lng: 73.8553 },
              { code: "411057", area: "Hinjawadi", lat: 18.5913, lng: 73.7389 },
            ],
          },
          {
            name: "Nagpur",
            lat: 21.1458,
            lng: 79.0882,
            pins: [{ code: "440001", area: "Nagpur GPO", lat: 21.1498, lng: 79.0806 }],
          },
        ],
      },
      {
        name: "Kerala",
        lat: 10.85,
        lng: 76.27,
        cities: [
          {
            name: "Kochi",
            lat: 9.9312,
            lng: 76.2673,
            pins: [
              { code: "682001", area: "Fort Kochi", lat: 9.9658, lng: 76.2422 },
              { code: "682030", area: "Kakkanad", lat: 10.0159, lng: 76.3419 },
            ],
          },
          {
            name: "Thiruvananthapuram",
            lat: 8.5241,
            lng: 76.9366,
            pins: [{ code: "695001", area: "Trivandrum GPO", lat: 8.4875, lng: 76.9525 }],
          },
          {
            name: "Wayanad",
            lat: 11.6854,
            lng: 76.132,
            pins: [{ code: "673121", area: "Kalpetta", lat: 11.6087, lng: 76.083 }],
          },
        ],
      },
      {
        name: "Delhi",
        lat: 28.61,
        lng: 77.21,
        cities: [
          {
            name: "New Delhi",
            lat: 28.6139,
            lng: 77.209,
            pins: [
              { code: "110001", area: "Connaught Place", lat: 28.6304, lng: 77.2177 },
              { code: "110075", area: "Dwarka", lat: 28.5921, lng: 77.046 },
            ],
          },
        ],
      },
      {
        name: "West Bengal",
        lat: 22.99,
        lng: 87.85,
        cities: [
          {
            name: "Kolkata",
            lat: 22.5726,
            lng: 88.3639,
            pins: [
              { code: "700001", area: "Kolkata GPO", lat: 22.5697, lng: 88.3468 },
              { code: "700091", area: "Salt Lake", lat: 22.5804, lng: 88.4174 },
            ],
          },
          {
            name: "Darjeeling",
            lat: 27.041,
            lng: 88.2663,
            pins: [{ code: "734101", area: "Darjeeling", lat: 27.0416, lng: 88.2627 }],
          },
        ],
      },
      {
        name: "Rajasthan",
        lat: 27.02,
        lng: 74.22,
        cities: [
          {
            name: "Jaipur",
            lat: 26.9124,
            lng: 75.7873,
            pins: [{ code: "302001", area: "Jaipur GPO", lat: 26.9239, lng: 75.8267 }],
          },
          {
            name: "Udaipur",
            lat: 24.5854,
            lng: 73.7125,
            pins: [{ code: "313001", area: "Udaipur City", lat: 24.5788, lng: 73.6866 }],
          },
        ],
      },
      {
        name: "Telangana",
        lat: 18.11,
        lng: 79.02,
        cities: [
          {
            name: "Hyderabad",
            lat: 17.385,
            lng: 78.4867,
            pins: [
              { code: "500001", area: "Hyderabad GPO", lat: 17.3846, lng: 78.4867 },
              { code: "500081", area: "Gachibowli", lat: 17.4401, lng: 78.3489 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "BR",
    name: "Brazil",
    lat: -14.24,
    lng: -51.93,
    postalLabel: "CEP",
    states: [
      {
        name: "Amazonas",
        lat: -3.42,
        lng: -65.86,
        cities: [
          {
            name: "Manaus",
            lat: -3.119,
            lng: -60.0217,
            pins: [{ code: "69005-040", area: "Centro", lat: -3.1316, lng: -60.0233 }],
          },
        ],
      },
      {
        name: "São Paulo",
        lat: -23.55,
        lng: -46.63,
        cities: [
          {
            name: "São Paulo",
            lat: -23.5505,
            lng: -46.6333,
            pins: [{ code: "01310-100", area: "Paulista", lat: -23.5614, lng: -46.6559 }],
          },
        ],
      },
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    lat: -0.02,
    lng: 37.91,
    postalLabel: "Postal code",
    states: [
      {
        name: "Nairobi",
        lat: -1.29,
        lng: 36.82,
        cities: [
          {
            name: "Nairobi",
            lat: -1.2921,
            lng: 36.8219,
            pins: [{ code: "00100", area: "Nairobi GPO", lat: -1.2864, lng: 36.8172 }],
          },
        ],
      },
      {
        name: "Rift Valley",
        lat: 0.52,
        lng: 35.27,
        cities: [
          {
            name: "Nakuru",
            lat: -0.3031,
            lng: 36.08,
            pins: [{ code: "20100", area: "Nakuru", lat: -0.3031, lng: 36.08 }],
          },
        ],
      },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    lat: 55.38,
    lng: -3.44,
    postalLabel: "Postcode",
    states: [
      {
        name: "England",
        lat: 52.36,
        lng: -1.17,
        cities: [
          {
            name: "London",
            lat: 51.5074,
            lng: -0.1278,
            pins: [
              { code: "EC1A", area: "City of London", lat: 51.5202, lng: -0.1 },
              { code: "SW1A", area: "Westminster", lat: 51.5014, lng: -0.1419 },
            ],
          },
          {
            name: "Manchester",
            lat: 53.4808,
            lng: -2.2426,
            pins: [{ code: "M1", area: "City Centre", lat: 53.4794, lng: -2.2374 }],
          },
        ],
      },
      {
        name: "Scotland",
        lat: 56.49,
        lng: -4.2,
        cities: [
          {
            name: "Edinburgh",
            lat: 55.9533,
            lng: -3.1883,
            pins: [{ code: "EH1", area: "Old Town", lat: 55.9505, lng: -3.1875 }],
          },
        ],
      },
    ],
  },
  {
    code: "US",
    name: "United States",
    lat: 39.83,
    lng: -98.58,
    postalLabel: "ZIP code",
    states: [
      {
        name: "California",
        lat: 36.78,
        lng: -119.42,
        cities: [
          {
            name: "San Francisco",
            lat: 37.7749,
            lng: -122.4194,
            pins: [{ code: "94103", area: "SoMa", lat: 37.7726, lng: -122.4108 }],
          },
        ],
      },
      {
        name: "New York",
        lat: 43.0,
        lng: -75.0,
        cities: [
          {
            name: "New York City",
            lat: 40.7128,
            lng: -74.006,
            pins: [{ code: "10001", area: "Chelsea", lat: 40.7506, lng: -73.9971 }],
          },
        ],
      },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    lat: -25.27,
    lng: 133.78,
    postalLabel: "Postcode",
    states: [
      {
        name: "New South Wales",
        lat: -31.25,
        lng: 146.92,
        cities: [
          {
            name: "Sydney",
            lat: -33.8688,
            lng: 151.2093,
            pins: [{ code: "2000", area: "Sydney CBD", lat: -33.8688, lng: 151.2093 }],
          },
        ],
      },
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    lat: -30.56,
    lng: 22.94,
    postalLabel: "Postal code",
    states: [
      {
        name: "Western Cape",
        lat: -33.23,
        lng: 21.86,
        cities: [
          {
            name: "Cape Town",
            lat: -33.9249,
            lng: 18.4241,
            pins: [{ code: "8001", area: "City Bowl", lat: -33.9249, lng: 18.4241 }],
          },
        ],
      },
    ],
  },
  {
    code: "ID",
    name: "Indonesia",
    lat: -0.79,
    lng: 113.92,
    postalLabel: "Postal code",
    states: [
      {
        name: "Java",
        lat: -7.15,
        lng: 110.14,
        cities: [
          {
            name: "Jakarta",
            lat: -6.2088,
            lng: 106.8456,
            pins: [{ code: "10110", area: "Gambir", lat: -6.1754, lng: 106.8272 }],
          },
        ],
      },
    ],
  },
];

/** Camera distance for each funnel level — smaller is closer in. */
export const ZOOM = {
  world: 3.0,
  country: 2.15,
  state: 1.78,
  city: 1.52,
  pin: 1.36,
} as const;

/**
 * Look a postal code up online when it is not in the bundled list.
 * Keyless OpenStreetMap; returns null when offline or not found.
 */
export async function lookupPostalOnline(
  code: string,
  countryCode: string,
): Promise<{ lat: number; lng: number } | null> {
  if (code.trim().length < 3) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1` +
        `&postalcode=${encodeURIComponent(code.trim())}&countrycodes=${countryCode.toLowerCase()}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    if (!rows.length) return null;
    return { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
  } catch {
    return null;
  }
}
