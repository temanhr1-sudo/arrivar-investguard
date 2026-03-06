// src/lib/constants.js

export const SC = {
  "Keuangan": "#1849A9", "Telekomunikasi": "#6D28D9", "Konsumer": "#92400E",
  "Industri": "#991B1B", "Energi": "#78350F", "Energi Hijau": "#166534",
  "Teknologi": "#0E7490", "Pertambangan": "#713F12", "Ritel": "#0F766E",
};

export const STOCKS = {
  dividen: [
    { code: "BBCA", name: "Bank Central Asia", sector: "Keuangan", dy: 2.8, cagr: 14.2, price: 9800 },
    { code: "BBRI", name: "Bank Rakyat Indonesia", sector: "Keuangan", dy: 5.6, cagr: 11.8, price: 4830 },
    { code: "TLKM", name: "Telkom Indonesia", sector: "Telekomunikasi", dy: 5.9, cagr: 8.4, price: 3200 },
    { code: "UNVR", name: "Unilever Indonesia", sector: "Konsumer", dy: 7.2, cagr: 6.1, price: 2550 },
    { code: "BMRI", name: "Bank Mandiri", sector: "Keuangan", dy: 5.1, cagr: 13.5, price: 6175 },
    { code: "ASII", name: "Astra International", sector: "Industri", dy: 4.3, cagr: 9.7, price: 5550 },
    { code: "PTBA", name: "Bukit Asam", sector: "Energi", dy: 12.4, cagr: 15.8, price: 3420 },
    { code: "ICBP", name: "Indofood CBP", sector: "Konsumer", dy: 3.8, cagr: 10.2, price: 9375 },
  ],
  capital: [
    { code: "BREN", name: "Barito Renewables", sector: "Energi Hijau", dy: 0.4, cagr: 28.7, price: 7825 },
    { code: "AMMN", name: "Amman Mineral", sector: "Pertambangan", dy: 0.8, cagr: 19.6, price: 9300 },
    { code: "ADRO", name: "Adaro Energy", sector: "Energi", dy: 2.1, cagr: 18.3, price: 3300 },
    { code: "MDKA", name: "Merdeka Copper Gold", sector: "Pertambangan", dy: 0.3, cagr: 24.8, price: 1810 },
    { code: "GOTO", name: "GoTo Gojek Tokopedia", sector: "Teknologi", dy: 0, cagr: 22.4, price: 82 },
    { code: "CUAN", name: "Petrindo Jaya Kreasi", sector: "Energi", dy: 0.2, cagr: 31.2, price: 8150 },
    { code: "PGAS", name: "PGN", sector: "Energi", dy: 5.8, cagr: 17.5, price: 1575 },
    { code: "MAPI", name: "Mitra Adiperkasa", sector: "Ritel", dy: 1.2, cagr: 20.1, price: 1695 },
  ],
};