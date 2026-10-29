/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'hi';

export interface SupportedLanguage {
  code: Language;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
];

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    appName: 'NaviFlow',
    appTagline: 'Journey Intelligence Engine for Indian Highways',
    navHome: 'Home',
    navPlanner: 'Journey Planner',
    navSaved: 'Saved Journeys',
    navTestLab: 'Test Lab',
    navMethodology: 'Methodology',
    navSettings: 'Settings',

    heroTitle: 'One input. One explained plan.',
    heroSubtitle: 'Multi-criteria route intelligence comparing travel time, fuel & FASTag toll expenses, verified highway amenities, and EV charging stops across India.',
    replaces6Apps: 'Replaces 6 fragmented apps for Indian drivers',
    step1Title: '1. Tell Us',
    step1Desc: 'Origin, destination, vehicle & style (Fast, Cheap, Comfort).',
    step2Title: '2. We Compare',
    step2Desc: 'Live OSRM routes, NHAI tolls, verified Overpass stops & fuel prices.',
    step3Title: '3. You Get One Plan',
    step3Desc: 'Clear deterministic winner with mathematically proven reasons.',

    originLabel: 'Origin (City, NH junction, or landmark)',
    destLabel: 'Destination',
    useMyLocation: 'Use Current Location',
    vehicleLabel: 'Vehicle & Powertrain',
    styleLabel: 'Journey Style',
    styleFastDesc: 'Prioritizes expressways and minimum total travel time (50% time weight).',
    styleCheapDesc: 'Minimizes FASTag toll fees and total fuel/energy expenditure (50% cost weight).',
    styleComfortDesc: 'Prefers smooth expressways, verified rest plazas and minimal driving fatigue (30% comfort + 30% stops).',
    planJourneyBtn: 'Plan My Journey',
    planningRoute: 'Finding routes across Indian road corridors...',
    checkingTolls: 'Calculating NHAI FASTag toll plazas...',
    findingStops: 'Mapping verified fuel, CNG, EV chargers & amenities...',
    scoringCandidates: 'Scoring multi-attribute utility matrix...',

    recommendedHeroBadge: 'Mathematically Proven Recommendation',
    bestOverall: 'Best Overall',
    fastest: 'Fastest',
    cheapest: 'Cheapest',
    scoreLabel: 'NaviFlow Score',
    totalEstimatedCost: 'Total Cost',
    totalTravelTime: 'Total Time',
    comfortIndex: 'Comfort Score',
    timelineTitle: 'Journey Timeline & Planned Stops',
    costBreakdown: 'Cost Breakdown',
    timeBreakdown: 'Time Breakdown',
    compareStyles: 'Compare Across Styles',
    whatIfTitle: 'Live "What If?" Dynamic Re-Scoring',
    saveJourney: 'Save Journey',
    shareLink: 'Share Plan',
    openGoogleMaps: 'Open in Google Maps',
    printReport: 'Print / Export PDF',

    savedTitle: 'Saved Journeys',
    savedEmpty: 'No saved journeys yet. Plan a route and tap "Save Journey" to access it offline.',
    testLabTitle: 'NaviFlow Automated Verification Test Lab',
    testLabSubtitle: 'Live integration and deterministic unit tests validating multi-attribute scoring and real Indian highway APIs.',
    methodologyTitle: 'Decision Science & Architecture Methodology',
    dashboardMode: 'In-Car Dashboard Mode',
  },
  hi: {
    appName: 'नवीफ्लो (NaviFlow)',
    appTagline: 'भारतीय राजमार्गों के लिए यात्रा बुद्धिमत्ता इंजन',
    navHome: 'होम',
    navPlanner: 'यात्रा योजना',
    navSaved: 'सहेजी गई यात्राएं',
    navTestLab: 'टेस्ट लैब',
    navMethodology: 'प्रणाली',
    navSettings: 'सेटिंग्स',

    heroTitle: 'एक इनपुट। एक समझाई गई योजना।',
    heroSubtitle: 'यात्रा का समय, पेट्रोल/डीजल और FASTag टोल खर्च, सत्यापित ढाबे/शौचालय और EV चार्जिंग की तुलना करने वाला इंजन।',
    replaces6Apps: 'भारतीय चालकों के 6 अलग-अलग ऐप्स का काम एक में',
    step1Title: '1. विवरण दें',
    step1Desc: 'शुरुआत, गंतव्य, वाहन और प्राथमिकता (तेज, किफायती, आरामदायक)।',
    step2Title: '2. हम तुलना करते हैं',
    step2Desc: 'लाइव OSRM रूट, NHAI टोल, ओवरपास स्टॉप्स और ईंधन दरें।',
    step3Title: '3. आपको मिलती है स्पष्ट योजना',
    step3Desc: 'तार्किक और गणितीय रूप से सिद्ध सबसे बेहतर विकल्प।',

    originLabel: 'शुरुआत का स्थान (शहर, NH चौराहा या लैंडमार्क)',
    destLabel: 'गंतव्य स्थान',
    useMyLocation: 'मेरा वर्तमान स्थान चुनें',
    vehicleLabel: 'वाहन और ईंधन प्रकार',
    styleLabel: 'यात्रा का प्रकार',
    styleFastDesc: 'एक्सप्रेसवे और सबसे कम समय को प्राथमिकता (50% समय भार)।',
    styleCheapDesc: 'कम FASTag टोल और ईंधन बचत पर ध्यान (50% लागत भार)।',
    styleComfortDesc: 'आरामदायक सड़कें, अच्छे रेस्ट स्टॉप्स और न्यूनतम थकान (30% आराम + 30% स्टॉप)।',
    planJourneyBtn: 'मेरी यात्रा की योजना बनाएं',
    planningRoute: 'भारतीय सड़कों पर सर्वोत्तम मार्ग खोजे जा रहे हैं...',
    checkingTolls: 'NHAI FASTag टोल प्लाजा की गणना हो रही है...',
    findingStops: 'ईंधन, CNG, EV चार्जर और भोजन स्थल तलाशे जा रहे हैं...',
    scoringCandidates: 'बहु-मानदंड स्कोरिंग की जा रही है...',

    recommendedHeroBadge: 'सर्वश्रेष्ठ अनुशंसित विकल्प',
    bestOverall: 'सर्वश्रेष्ठ समग्र',
    fastest: 'सबसे तेज़',
    cheapest: 'सबसे किफायती',
    scoreLabel: 'नवीफ्लो स्कोर',
    totalEstimatedCost: 'कुल अनुमानित खर्च',
    totalTravelTime: 'कुल यात्रा समय',
    comfortIndex: 'आराम सूचकांक',
    timelineTitle: 'यात्रा समयरेखा और नियोजित स्टॉप',
    costBreakdown: 'खर्च का विवरण',
    timeBreakdown: 'समय का विवरण',
    compareStyles: 'अन्य शैलियों से तुलना',
    whatIfTitle: 'लाइव "अगर-मगर" त्वरित परीक्षण',
    saveJourney: 'यात्रा सहेजें',
    shareLink: 'लिंक साझा करें',
    openGoogleMaps: 'गूगल मैप्स में खोलें',
    printReport: 'प्रिंट / PDF निर्यात',

    savedTitle: 'सहेजी गई यात्राएं',
    savedEmpty: 'कोई सहेजी गई यात्रा नहीं मिली। योजना बनाकर "यात्रा सहेजें" पर टैप करें।',
    testLabTitle: 'नवीफ्लो स्वचालित परीक्षण लैब',
    testLabSubtitle: 'लाइव एकीकरण और सटीक गणितीय यूनिट परीक्षण।',
    methodologyTitle: 'निर्णय विज्ञान और आर्किटेक्चर प्रणाली',
    dashboardMode: 'कार डैशबोर्ड मोड (हाई कंट्रास्ट)',
  },
};
