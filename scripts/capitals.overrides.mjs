// Curated corrections and context for capitals that a plain dataset gets wrong
// or oversimplifies. Every name in `capitals` counts as a correct answer.
// `notDistractor` lists cities with a real governmental role that must never be
// offered as a "wrong" option (that would be unfair). `skipReverse` drops the
// capital → country question where the capital itself is disputed.
//
// Sources: national constitutions and CIA World Factbook "Capital" entries.

export const CAPITAL_OVERRIDES = {
  ZAF: {
    capitals: ['Pretoria', 'Cape Town', 'Bloemfontein'],
    note: 'South Africa has three capitals: Pretoria (executive), Cape Town (legislative) and Bloemfontein (judicial).',
  },
  BOL: {
    capitals: ['Sucre', 'La Paz'],
    note: 'Sucre is the constitutional capital; La Paz is the seat of government.',
  },
  NLD: {
    capitals: ['Amsterdam'],
    notDistractor: ['The Hague'],
    note: 'Amsterdam is the capital, but the government and parliament sit in The Hague.',
  },
  MYS: {
    capitals: ['Kuala Lumpur'],
    notDistractor: ['Putrajaya'],
    note: 'Kuala Lumpur is the capital; most government offices are in nearby Putrajaya.',
  },
  LKA: {
    capitals: ['Sri Jayawardenepura Kotte', 'Colombo'],
    note: 'Sri Jayawardenepura Kotte is the legislative capital; Colombo is the executive and commercial capital.',
  },
  SWZ: {
    capitals: ['Mbabane', 'Lobamba'],
    note: 'Mbabane is the administrative capital; Lobamba is the royal and legislative capital.',
  },
  CIV: {
    capitals: ['Yamoussoukro'],
    notDistractor: ['Abidjan'],
    note: 'Yamoussoukro is the official capital, while many government offices remain in Abidjan.',
  },
  BEN: {
    capitals: ['Porto-Novo'],
    notDistractor: ['Cotonou'],
    note: 'Porto-Novo is the official capital; Cotonou is the seat of government.',
  },
  ISR: {
    capitals: ['Jerusalem'],
    notDistractor: ['Tel Aviv'],
    skipReverse: true,
    note: 'Israel designates Jerusalem as its capital; most countries keep their embassies in Tel Aviv.',
  },
  PSE: {
    capitals: ['Ramallah', 'East Jerusalem'],
    skipReverse: true,
    note: 'Palestine proclaims East Jerusalem as its capital; the government is based in Ramallah.',
  },
  NRU: {
    capitals: ['Yaren'],
    note: 'Nauru has no official capital; government offices are in Yaren District.',
  },
  CHE: {
    capitals: ['Bern'],
    note: 'Bern is officially the “federal city” rather than the capital, but it is the seat of government.',
  },
  TZA: {
    capitals: ['Dodoma'],
    notDistractor: ['Dar es Salaam'],
    note: 'Dodoma is the official capital; Dar es Salaam is the largest city and former capital.',
  },
  CHL: {
    capitals: ['Santiago'],
    notDistractor: ['Valparaíso'],
    note: 'Santiago is the capital; the National Congress meets in Valparaíso.',
  },
  YEM: {
    capitals: ["Sana'a"],
    notDistractor: ['Aden'],
    note: "Sana'a is the constitutional capital; the recognised government has operated from Aden.",
  },
  MNE: {
    capitals: ['Podgorica'],
    notDistractor: ['Cetinje'],
    note: 'Podgorica is the capital; Cetinje holds the title of Old Royal Capital.',
  },
  BDI: {
    capitals: ['Gitega'],
    notDistractor: ['Bujumbura'],
    note: 'Gitega became the political capital in 2019; Bujumbura remains the economic capital.',
  },
  IDN: {
    capitals: ['Jakarta'],
    notDistractor: ['Nusantara'],
    note: 'Jakarta is the capital while the planned new capital, Nusantara, is being built.',
  },
  USA: { capitals: ['Washington, D.C.'] },
  ATG: { capitals: ["St. John's"] },
  KIR: { capitals: ['South Tarawa'], note: 'The capital is South Tarawa, on Tarawa atoll.' },
};

// Display-name fixes (the dataset's common name stays as an alias).
export const NAME_OVERRIDES = {
  CIV: "Côte d'Ivoire",
  COD: 'DR Congo',
  COG: 'Republic of the Congo',
};
