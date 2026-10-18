// Fitxes tècniques dels bolets de CaçaBolets. Text divulgatiu, no substitueix una guia
// micològica ni l'opinió d'un expert. Les il·lustracions són esquemàtiques (SVG).

// Peu i barret genèrics: cada espècie en canvia la forma i els colors.
const svg = body => `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" role="img">
  <ellipse cx="100" cy="138" rx="80" ry="7" fill="rgba(0,0,0,.25)"/>${body}</svg>`;

const ILUS = {
  // Barret deprimit amb zones concèntriques, peu curt amb clotets.
  rovello: svg(`
    <path d="M86 136 L84 98 Q100 92 116 98 L114 136 Z" fill="#e8873a"/>
    <circle cx="94" cy="118" r="3" fill="#c55f1c"/><circle cx="107" cy="126" r="2.5" fill="#c55f1c"/>
    <path d="M28 92 Q30 62 100 58 Q170 62 172 92 Q150 104 100 102 Q50 104 28 92 Z" fill="#e07a2c"/>
    <path d="M44 86 Q100 70 156 86" stroke="#c45a1a" stroke-width="3" fill="none"/>
    <path d="M60 81 Q100 72 140 81" stroke="#c45a1a" stroke-width="2.5" fill="none"/>
    <path d="M78 76 Q100 71 122 76" stroke="#8fa35a" stroke-width="3" fill="none" opacity=".8"/>
    <path d="M70 100 Q74 108 68 112" stroke="#a3201a" stroke-width="3" fill="none"/>`),
  // Barret gros i bru, peu ventrut i blanc amb retícula.
  cep: svg(`
    <path d="M78 136 Q62 110 80 86 L120 86 Q138 110 122 136 Z" fill="#efe6d2"/>
    <path d="M82 96 L118 96 M80 106 L120 106 M80 116 L120 116 M84 126 L116 126 M92 88 L88 134 M108 88 L112 134" stroke="#d6c8a8" stroke-width="1.5"/>
    <path d="M26 86 Q34 36 100 32 Q166 36 174 86 Q100 98 26 86 Z" fill="#7a4a24"/>
    <path d="M30 86 Q100 98 170 86 Q100 104 30 86 Z" fill="#e9e2b8"/>
    <path d="M48 52 Q70 40 90 42" stroke="#9b6537" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  // Embut groc d'ou amb plecs que baixen pel peu.
  rossinyol: svg(`
    <path d="M90 136 Q86 112 74 94 L126 94 Q114 112 110 136 Z" fill="#f0b42a"/>
    <path d="M34 66 Q60 54 100 62 Q140 54 166 66 Q150 74 126 94 L74 94 Q50 74 34 66 Z" fill="#f4c23c"/>
    <path d="M78 92 L92 128 M88 92 L96 130 M100 92 L100 130 M112 92 L104 130 M122 92 L108 128" stroke="#d99a18" stroke-width="2" fill="none"/>
    <path d="M34 66 Q60 54 100 62 Q140 54 166 66" stroke="#d99a18" stroke-width="3" fill="none"/>`),
  // Trompeta petita, barret bru i peu buit groc-taronja.
  camagroc: svg(`
    <path d="M94 136 Q92 110 90 92 L110 92 Q108 110 106 136 Z" fill="#f2a634"/>
    <path d="M62 64 Q80 56 100 66 Q120 56 138 64 Q124 78 110 92 L90 92 Q76 78 62 64 Z" fill="#8a5a2a"/>
    <ellipse cx="100" cy="66" rx="14" ry="4" fill="#5c3a19"/>
    <path d="M86 80 Q92 92 94 104 M114 80 Q108 92 106 104" stroke="#e8b25a" stroke-width="2" fill="none"/>
    <path d="M128 136 Q127 118 126 108 L136 108 Q135 118 134 136 Z" fill="#f2a634"/>
    <path d="M114 94 Q124 90 131 96 Q138 90 148 94 Q140 102 136 108 L126 108 Q120 102 114 94 Z" fill="#8a5a2a"/>`),
  // Barret gris fosc i viscós, làmines blanques decurrents, peu blanc amb punts grisos.
  llenega: svg(`
    <path d="M88 136 L86 92 L114 92 L112 136 Z" fill="#f2efe8"/>
    <circle cx="96" cy="104" r="1.8" fill="#777"/><circle cx="104" cy="112" r="1.8" fill="#777"/><circle cx="98" cy="122" r="1.8" fill="#777"/>
    <path d="M34 90 Q36 50 100 46 Q164 50 166 90 Q100 100 34 90 Z" fill="#5b5753"/>
    <path d="M40 90 Q100 100 160 90 L114 96 L86 96 Z" fill="#f4f1ea"/>
    <path d="M60 60 Q80 50 104 52" stroke="#8d8984" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`),
  // Trompeta negra i buida, sense làmines.
  trompeta: svg(`
    <path d="M94 136 Q90 100 74 70 L126 70 Q110 100 106 136 Z" fill="#3b3533"/>
    <path d="M60 58 Q80 48 100 56 Q120 48 140 58 Q132 66 126 70 L74 70 Q68 66 60 58 Z" fill="#1d1918"/>
    <ellipse cx="100" cy="60" rx="30" ry="7" fill="#0c0a0a"/>
    <path d="M84 76 Q92 100 96 124 M116 76 Q108 100 104 124" stroke="#6b6461" stroke-width="2" fill="none"/>`),
};

export const FITXES = {
  rovello: {
    noms: 'Rovelló, pinetell',
    llati: 'Lactarius sanguifluus (rovelló vinós) i Lactarius deliciosus (pinetell)',
    comest: 'Comestible excel·lent',
    descripcio: "Barret de 4 a 12 cm, taronja amb zones concèntriques més fosques i el centre enfonsat; amb el temps i on es toca agafa taques verdes. En tallar-lo deixa anar una llet de color taronja (pinetell) o vermell vinós (rovelló). Peu curt, buit, sovint amb clotets.",
    habitat: "Pinedes: el rovelló vinós sobretot amb pi blanc i pinyer, en terrenys calcaris; el pinetell amb pi roig i pinastre, més a muntanya. Sovint en grups al llarg de camins i clarianes.",
    temporada: 'De setembre a desembre, després de pluges abundants de finals d\'estiu i tardor.',
    confusio: [
      ['Lactarius torminosus', 'Barret rosat i pelut al marge; llet blanca i molt picant. Tòxic: causa trastorns digestius.'],
      ['Lactarius chrysorrheus', 'Llet blanca que en pocs segons es torna groga. No comestible.'],
    ],
    clau: 'El color de la llet: taronja o vermella sí; blanca, mai.',
  },
  cep: {
    noms: 'Cep, siureny',
    llati: 'Boletus edulis (i espècies properes: B. pinophilus, B. aereus, B. aestivalis)',
    comest: 'Comestible excel·lent',
    descripcio: "Barret de 8 a 25 cm, bru, de cutícula llisa. Sota el barret, tubs i porus blancs que amb l'edat es tornen grocs i verdosos. Peu gruixut i ventrut, blanquinós, amb una fina retícula clara a la part de dalt. Carn blanca que no canvia de color.",
    habitat: 'Fagedes, avetoses, rouredes, castanyedes i pinedes de muntanya, sovint a les vores i en sòls àcids.',
    temporada: "D'agost a novembre; alguns anys també a finals de primavera.",
    confusio: [
      ['Tylopilus felleus', 'Porus que es tornen rosats i retícula fosca al peu. No és tòxic però és tan amarg que espatlla el plat.'],
      ['Rubroboletus satanas (mataparent)', 'Porus vermells i carn que es torna blava. Tòxic.'],
    ],
    clau: 'Porus blancs o grocs i carn que no canvia de color. Si els porus són vermells o la carn es torna blava, no el cullis.',
  },
  rossinyol: {
    noms: 'Rossinyol',
    llati: 'Cantharellus cibarius',
    comest: 'Comestible excel·lent',
    descripcio: "Groc d'ou, de 3 a 10 cm, en forma d'embut amb el marge ondulat. Sota el barret no té làmines vertaderes sinó plecs gruixuts i ramificats que baixen pel peu. Carn blanca i ferma, amb olor afruitada d'albercoc.",
    habitat: 'Rouredes, fagedes, alzinars, castanyedes i pinedes en sòls àcids, sovint entre molsa.',
    temporada: 'De juny a novembre, sobretot després de tempestes d\'estiu.',
    confusio: [
      ['Hygrophoropsis aurantiaca (fals rossinyol)', 'Taronja més intens i amb làmines vertaderes, primes i atapeïdes. Indigest.'],
      ["Omphalotus olearius (gírgola d'olivera)", "Taronja, en mates denses sobre soques d'olivera, alzina o roure, amb làmines vertaderes. Tòxic."],
    ],
    clau: 'Plecs gruixuts i bifurcats, no làmines primes; creix solt a terra, no en mates sobre fusta.',
  },
  camagroc: {
    noms: 'Camagroc',
    llati: 'Craterellus lutescens',
    comest: 'Comestible molt bo',
    descripcio: "Petit, de 2 a 6 cm, en forma de trompeta. Barret bru amb el marge ondulat; la cara de sota, gairebé llisa, és groguenca o rosada. Peu buit, de color groc ataronjat viu.",
    habitat: 'Pinedes humides de pi roig i pi negre, avetoses i fagedes, entre molsa i a prop de rierols i mulladeres.',
    temporada: "D'octubre a desembre, i fins al gener si no glaça fort. Surt en grups nombrosos.",
    confusio: [
      ['Craterellus tubaeformis', 'Molt semblant però amb el peu i la cara inferior grisos. També comestible.'],
      ['Bolets petits de làmines vertaderes', 'Algunes espècies petites i brunes són tòxiques: si té làmines primes i separades, no és un camagroc.'],
    ],
    clau: 'Peu buit i groc viu, i la cara de sota sense làmines.',
  },
  llenega: {
    noms: 'Llenega negra',
    llati: 'Hygrophorus latitabundus (sinònims: H. latitatus, H. limacinus)',
    comest: 'Comestible bo',
    descripcio: "Barret de 4 a 10 cm, gris bru fosc, viscós i brillant quan és humit. Làmines blanques, gruixudes i separades que baixen una mica pel peu. Peu blanc amb petites granulacions grises. Carn blanca, tova.",
    habitat: 'Pinedes de pi roig, pi negre i pinyer, sovint barrejades amb alzines; aguanta bé el fred.',
    temporada: 'De novembre a gener: és dels últims bolets de la temporada.',
    confusio: [
      ['Tricholoma pardinum', "Barret gris clar amb escates, làmines que no baixen pel peu i olor de farina. Tòxic."],
      ['Entoloma sinuatum', 'Barret gris clar, làmines que es tornen rosades i olor de farina. Tòxic.'],
    ],
    clau: 'Barret fosc i viscós, i làmines blanques que baixen pel peu.',
  },
  trompeta: {
    noms: 'Trompeta de la mort, trompeta negra',
    llati: 'Craterellus cornucopioides',
    comest: 'Comestible molt bo (també assecada)',
    descripcio: "Forma de trompeta o d'embut buit fins a baix, de 3 a 10 cm. Interior negre i escatós; exterior gris cendra, llis o lleugerament arrugat, sense làmines. Carn prima i elàstica.",
    habitat: 'Fagedes, rouredes, castanyedes i alzinars humits, entre la fullaraca i sovint en grups grans.',
    temporada: 'De setembre a novembre.',
    confusio: [
      ['Craterellus cinereus i Pseudocraterellus undulatus', 'Semblants, amb plecs a la cara exterior. Comestibles.'],
    ],
    clau: 'És difícil de confondre amb cap espècie tòxica: buida, negra i sense làmines.',
  },
};

export const ILUSTRACIONS = ILUS;

// Fotos de Wikimedia Commons, desades a img/ (reduïdes, sense altres canvis).
export const FOTOS = {
  rovello: { peu: 'Pinetell (Lactarius deliciosus)', autor: 'Strobilomyces', llicencia: 'CC BY-SA 3.0', llicenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', font: 'https://commons.wikimedia.org/wiki/File:Lactarius_deliciosus_20100928w.JPG' },
  cep: { peu: 'Boletus edulis', autor: 'Bernie', llicencia: 'domini públic', llicenciaUrl: null, font: 'https://commons.wikimedia.org/wiki/File:AD2009Sep13_Boletus_edulis_01.jpg' },
  rossinyol: { peu: 'Cantharellus cibarius', autor: 'Andreas Kunze', llicencia: 'CC BY-SA 3.0', llicenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', font: 'https://commons.wikimedia.org/wiki/File:2007-07-14_Cantharellus_cibarius.jpg' },
  camagroc: { peu: 'Craterellus lutescens', autor: 'Lucian Clanet', llicencia: 'CC BY 4.0', llicenciaUrl: 'https://creativecommons.org/licenses/by/4.0/', font: 'https://commons.wikimedia.org/wiki/File:Craterellus_lutescens_01.jpg' },
  llenega: { peu: 'Hygrophorus latitabundus', autor: 'Paffka', llicencia: 'CC BY-SA 3.0', llicenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', font: 'https://commons.wikimedia.org/wiki/File:Hygrophorus_latitabundus1.JPG' },
  trompeta: { peu: 'Craterellus cornucopioides', autor: 'Holger Krisp', llicencia: 'CC BY 3.0', llicenciaUrl: 'https://creativecommons.org/licenses/by/3.0/', font: 'https://commons.wikimedia.org/wiki/File:Black_trumpet_Craterellus_cornucopioides.jpg' },
};
