const {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback
} = React;

/* ================= Guided tooltips =================
   A single fixed-position tooltip bubble that reads text from the nearest
   ancestor carrying a `data-tip` attribute. Rendering it once at the app root
   (position:fixed) keeps it from being clipped by scrollable tables or panels
   with overflow:hidden, and lets every control document itself on hover/focus.
   Optional `data-tip-pos="top|bottom"` forces a side; otherwise it auto-flips. */
function GuideTooltips() {
  const [tip, setTip] = useState(null);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    visibility: "hidden",
    opacity: 0
  });
  const [place, setPlace] = useState("top");
  const [arrowLeft, setArrowLeft] = useState(20);
  const nodeRef = useRef(null);
  useEffect(() => {
    let current = null;
    const capture = el => {
      const text = el.getAttribute("data-tip");
      if (!text) return;
      const r = el.getBoundingClientRect();
      current = el;
      setTip({
        text,
        pos: el.getAttribute("data-tip-pos") || "auto",
        rect: {
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
          width: r.width,
          height: r.height
        }
      });
    };
    const clear = () => {
      current = null;
      setTip(null);
    };
    const onOver = e => {
      const el = e.target && e.target.closest ? e.target.closest("[data-tip]") : null;
      if (el) {
        if (el !== current) capture(el);
      } else if (current) clear();
    };
    const onOut = e => {
      if (!current) return;
      const to = e.relatedTarget;
      if (to && (current === to || current.contains && current.contains(to))) return;
      if (to && to.closest && to.closest("[data-tip]") === current) return;
      clear();
    };
    const onFocusIn = e => {
      const el = e.target && e.target.closest ? e.target.closest("[data-tip]") : null;
      if (el) capture(el);else if (current) clear();
    };
    const onScroll = () => {
      if (current) clear();
    };
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", clear, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll, true);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") clear();
    }, true);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", clear, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll, true);
    };
  }, []);
  useLayoutEffect(() => {
    if (!tip || !nodeRef.current) {
      setCoords(c => ({
        ...c,
        visibility: "hidden",
        opacity: 0
      }));
      return;
    }
    const gap = 10,
      margin = 8;
    const b = nodeRef.current.getBoundingClientRect();
    const w = b.width,
      h = b.height;
    const r = tip.rect;
    const vw = window.innerWidth,
      vh = window.innerHeight;
    let pl = tip.pos;
    if (pl !== "top" && pl !== "bottom") pl = r.top >= h + gap + margin ? "top" : "bottom";
    if (pl === "top" && r.top < h + gap + margin) pl = "bottom";
    if (pl === "bottom" && r.bottom + h + gap + margin > vh) pl = "top";
    const cx = r.left + r.width / 2;
    let left = Math.max(margin, Math.min(cx - w / 2, vw - w - margin));
    let top = pl === "top" ? r.top - gap - h : r.bottom + gap;
    top = Math.max(margin, Math.min(top, vh - h - margin));
    setPlace(pl);
    setArrowLeft(Math.max(14, Math.min(cx - left, w - 14)));
    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      visibility: "visible",
      opacity: 1
    });
  }, [tip]);
  if (!tip) return null;
  return /*#__PURE__*/React.createElement("div", {
    ref: nodeRef,
    className: "guide-tip place-" + place,
    style: {
      position: "fixed",
      top: coords.top,
      left: coords.left,
      visibility: coords.visibility,
      opacity: coords.opacity,
      zIndex: 5000,
      pointerEvents: "none"
    },
    role: "tooltip"
  }, tip.text, /*#__PURE__*/React.createElement("span", {
    className: "guide-tip-arrow",
    style: {
      left: arrowLeft
    }
  }));
}

/* ============================================================
   LCCE Manager — Local Commercial Corn Equivalent
   A modern UI for the LCCE (Local Commercial Corn Equivalent) workflow.
   ============================================================ */

const CROP_YEARS = [2027, 2026, 2025, 2024, 2023];
const COUNTRIES = [{
  code: "US",
  name: "United States"
}, {
  code: "CA",
  name: "Canada"
}, {
  code: "MX",
  name: "Mexico"
}];
const US_STATES = ["IA", "IL", "MN", "NE", "MO", "WI", "IN", "OH", "KS", "SD", "ND", "MI", "KY"];
const STATE_NAMES = {
  IA: "Iowa",
  IL: "Illinois",
  MN: "Minnesota",
  NE: "Nebraska",
  MO: "Missouri",
  WI: "Wisconsin",
  IN: "Indiana",
  OH: "Ohio",
  KS: "Kansas",
  SD: "South Dakota",
  ND: "North Dakota",
  MI: "Michigan",
  KY: "Kentucky"
};
const countryName = code => (COUNTRIES.find(c => c.code === code) || {}).name || code || "";
const stateName = code => STATE_NAMES[code] || code || "";
/* Plants — the production sites. A plant owns its cooperators and their field
   nominations, and its selected fields are averaged into one LCCE.
   `id` is the internal key that `n.group` points at, so it is never shown; the
   user-facing identifier is the editable `plant` code. Persisted under the
   `groups` key so state saved by an earlier build still loads. */
const SEED_PLANTS = [{
  id: "0001",
  plant: "8H13",
  name: "BP Boone IA",
  area: "South Area — Boone / Madrid / Ankeny",
  growLoc: "GrowLoc 8H13-A",
  comment: ""
}, {
  id: "0002",
  plant: "8H14",
  name: "BP Nevada IA",
  area: "Nevada Area",
  growLoc: "GrowLoc 8H14-A",
  comment: ""
}];
const ELEVATORS = ["Key Cooperative", "Heartland Co-op", "NEW Cooperative", "Landus", "On-Farm Bin"];
const INVALID_REASONS = ["Abnormal growing practices", "Field damage (weather) uncommon to area", "Cooperator did not cooperate as required", "Not harvested by November 15th", "Did not meet nomination requirements"];
const STATUSES = ["Draft", "Submitted", "QC", "Approved"];
const SCENARIOS = ["Base", "Alternate"];
const GROW_LOCS = ["GrowLoc 8H13-A", "GrowLoc 8H14-A"];
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- Calculations (from LCCE Process spec) ---------- */
// Net weight per scale ticket
const netWeight = (gross, tare) => Math.max(0, (+gross || 0) - (+tare || 0));
// Moisture shrink: if moisture > 15.0%, reduce shelled weight 1.4% per point over 15.0
const shrinkFactor = moisture => {
  const m = +moisture || 0;
  return m > 15 ? 1 - 0.014 * (m - 15) : 1;
};
const adjustedWeight = (gross, tare, moisture) => netWeight(gross, tare) * shrinkFactor(moisture);
// 56 lbs of shelled corn = 1 bushel @ 15% moisture
const LBS_PER_BU = 56;
const ticketBushels = t => adjustedWeight(t.gross, t.tare, t.moisture) / LBS_PER_BU;
// Yield for a contract = total adjusted bushels / measured acres
function contractYield(tickets, measuredAcres) {
  const acres = +measuredAcres || 0;
  if (!tickets.length || acres <= 0) return null;
  const bu = tickets.reduce((s, t) => s + ticketBushels(t), 0);
  return bu / acres;
}
/* Alternate-scenario fields are back-ups: they sit in a separate pool at the
   bottom of the nomination list and stay out of the LCCE average until an
   operator activates one to stand in for a base field that went Invalid. */
const ALT_SCENARIO = "Alternate";
const isBackupField = n => !!n && (n.scenario || "Base") === ALT_SCENARIO;
const countsTowardLcce = n => !!n && !!n.selected && !n.invalid && (!isBackupField(n) || !!n.backupActive);

/* Discarding the high and low leaves nothing to average until a location has
   three qualifying fields, so under that the LCCE is refused rather than
   approximated. Every screen reads `short` / `needed` off the same result, and
   nothing downstream may substitute a zero for a missing LCCE. */
const MIN_LCCE_FIELDS = 3;
const lcceQualifiers = noms => noms.filter(n => countsTowardLcce(n) && +n.buPerAcre > 0);
const lcceShortNote = res => "Needs " + res.needed + " more qualifying field" + (res.needed === 1 ? "" : "s") + ". A location LCCE takes at least " + MIN_LCCE_FIELDS + " because the single highest and lowest yields are discarded before averaging.";

// LCCE for a group = discard single high & low, average the rest (unweighted)
function lcceForGroup(noms) {
  const yields = lcceQualifiers(noms).map(n => +n.buPerAcre).sort((a, b) => a - b);
  const count = yields.length;
  if (count < MIN_LCCE_FIELDS) return {
    lcce: null,
    kept: yields,
    high: null,
    low: null,
    count,
    short: true,
    needed: MIN_LCCE_FIELDS - count
  };
  const low = yields[0],
    high = yields[yields.length - 1];
  const kept = yields.slice(1, -1);
  const lcce = Math.round(kept.reduce((s, y) => s + y, 0) / kept.length);
  return {
    lcce,
    kept,
    high,
    low,
    count,
    short: false,
    needed: 0
  };
}
// Final bushels = (40% * LCCE) + (60% * GYI * LCCE) + Premium
const finalBushels = (lcce, gyi, premium) => lcce === null || lcce === undefined || lcce === "" ? null : 0.4 * (+lcce || 0) + 0.6 * (+gyi || 0) * (+lcce || 0) + (+premium || 0);
const fmt = (n, d = 0) => n === null || n === undefined || isNaN(n) ? "—" : (+n).toLocaleString(undefined, {
  minimumFractionDigits: d,
  maximumFractionDigits: d
});

/* ---------- File download ---------- */
function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- CSV export ---------- */
function exportCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => {
    const s = c === null || c === undefined ? "" : String(c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
  downloadBlob(filename, new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  }));
}

/* ---------- Seed data (fresh 2026 demo set) ----------
   A clean end-to-end demo: 12 cooperators, 18 nominated fields split across the
   two plants, and scale tickets that mathematically resolve to each field's
   yield so Scale Tickets -> Yield Check -> LCCE all tie out.
   Plant 8H13 final LCCE = 236 · Plant 8H14 final LCCE = 267. */
const SEED_COOPERATORS = [{
  code: "001",
  name: "Prairie Ridge Farms",
  address: "1820 220th Street",
  city: "Boone",
  state: "IA",
  zip: "50036",
  phone: "515-555-0101",
  plant: "0001",
  country: "US",
  comment: ""
}, {
  code: "002",
  name: "Timber Creek Ag",
  address: "512 W 1st Street",
  city: "Madrid",
  state: "IA",
  zip: "50156",
  phone: "515-555-0102",
  plant: "0001",
  country: "US",
  comment: ""
}, {
  code: "003",
  name: "Halverson Family Farms",
  address: "3104 NW 158th Ave",
  city: "Ankeny",
  state: "IA",
  zip: "50023",
  phone: "515-555-0103",
  plant: "0001",
  country: "US",
  comment: ""
}, {
  code: "004",
  name: "Sorenson Grain Co",
  address: "2277 R Avenue",
  city: "Boone",
  state: "IA",
  zip: "50036",
  phone: "515-555-0104",
  plant: "0001",
  country: "US",
  comment: ""
}, {
  code: "005",
  name: "Meadowlark Acres",
  address: "1490 310th Street",
  city: "Madrid",
  state: "IA",
  zip: "50156",
  phone: "515-555-0105",
  plant: "0001",
  country: "US",
  comment: ""
}, {
  code: "006",
  name: "Delaney Brothers Farms",
  address: "6650 NE 46th Ave",
  city: "Ankeny",
  state: "IA",
  zip: "50021",
  phone: "515-555-0106",
  plant: "0001",
  country: "US",
  comment: ""
}, {
  code: "007",
  name: "Windy Hill Farms",
  address: "1409 SW 3rd Street",
  city: "Nevada",
  state: "IA",
  zip: "50201",
  phone: "515-555-0107",
  plant: "0002",
  country: "US",
  comment: ""
}, {
  code: "008",
  name: "Riverbend Ag LLC",
  address: "58210 250th Street",
  city: "Nevada",
  state: "IA",
  zip: "50201",
  phone: "515-555-0108",
  plant: "0002",
  country: "US",
  comment: ""
}, {
  code: "009",
  name: "Stonebrook Farms",
  address: "409 Main Street",
  city: "Colo",
  state: "IA",
  zip: "50056",
  phone: "515-555-0109",
  plant: "0002",
  country: "US",
  comment: ""
}, {
  code: "010",
  name: "Cedar Valley Grain",
  address: "1075 W Avenue",
  city: "Nevada",
  state: "IA",
  zip: "50201",
  phone: "515-555-0110",
  plant: "0002",
  country: "US",
  comment: ""
}, {
  code: "011",
  name: "Oakdale Farms",
  address: "69909 170th Street",
  city: "Zearing",
  state: "IA",
  zip: "50278",
  phone: "515-555-0111",
  plant: "0002",
  country: "US",
  comment: ""
}, {
  code: "012",
  name: "Prescott Ag Partners",
  address: "23188 620th Ave",
  city: "Colo",
  state: "IA",
  zip: "50056",
  phone: "515-555-0112",
  plant: "0002",
  country: "US",
  comment: ""
}];
const HYBRIDS = [{
  brand: "DEKALB",
  desig: "DKC62-08"
}, {
  brand: "DEKALB",
  desig: "DKC64-35"
}, {
  brand: "Pioneer",
  desig: "P1197AM"
}, {
  brand: "Channel",
  desig: "209-12VT2P"
}];

// Build scale tickets whose moisture-adjusted bushels ÷ measured acres rounds to
// the field's target yield, so the Yield Check and LCCE numbers stay consistent.
let __seedTkt = 88500;
function seedTickets(contract, acres, targetYield, moistures) {
  const perBu = targetYield * acres / moistures.length;
  return moistures.map((m, i) => {
    const tare = 14850 + i * 260 % 950;
    const gross = Math.round(perBu * LBS_PER_BU / shrinkFactor(m) + tare);
    const test = Math.round((55.6 + i * 3 % 9 / 10) * 10) / 10;
    return {
      id: uid(),
      contract,
      ticket: "SC-" + __seedTkt++,
      moisture: m,
      gross,
      tare,
      test,
      elevator: ELEVATORS[i % ELEVATORS.length]
    };
  });
}

/* Each field carries everything needed to build its nomination + tickets.
   status: Approved | QC | Submitted | Draft ; draft = nominated but not harvested;
   invalid = excluded from LCCE. moist[] drives the generated scale tickets. */
const FIELD_DEFS = [
// ----- Plant 8H13 (GrowLoc 8H13-A) -> LCCE 236 -----
{
  nom: "101",
  contract: "300101",
  coop: "001",
  group: "0001",
  desc: "Prairie Ridge — Home 80 (SE¼ Sec 20)",
  township: "Worth T-84-N",
  section: "20",
  estAcres: 78,
  meas: 12,
  yield: 233,
  status: "Approved",
  harvest: "2026-10-24",
  moist: [15.7, 15.3, 14.9]
}, {
  nom: "102",
  contract: "300102",
  coop: "001",
  group: "0001",
  desc: "Prairie Ridge — River 40",
  township: "Worth T-84-N",
  section: "21",
  estAcres: 41,
  meas: 11,
  yield: 241,
  status: "Approved",
  harvest: "2026-10-24",
  moist: [15.5, 15.0, 14.8]
}, {
  nom: "103",
  contract: "300103",
  coop: "002",
  group: "0001",
  desc: "Timber Creek — North Ridge",
  township: "Des Moines T-83-N",
  section: "8",
  estAcres: 63,
  meas: 13,
  yield: 228,
  status: "Approved",
  harvest: "2026-10-26",
  moist: [16.0, 15.4, 15.1]
}, {
  nom: "104",
  contract: "300104",
  coop: "003",
  group: "0001",
  desc: "Halverson — Cushman Farm (W½ NE¼)",
  township: "Douglas T-84-N",
  section: "12",
  estAcres: 52,
  meas: 12,
  yield: 239,
  status: "Approved",
  harvest: "2026-10-27",
  moist: [15.2, 14.9, 15.6]
}, {
  nom: "105",
  contract: "300105",
  coop: "004",
  group: "0001",
  desc: "Sorenson — Pratt 60",
  township: "Yell T-83-N",
  section: "30",
  estAcres: 60,
  meas: 12,
  yield: 236,
  status: "QC",
  harvest: "2026-10-28",
  moist: [15.8, 15.1, 14.7]
}, {
  nom: "106",
  contract: "300106",
  coop: "005",
  group: "0001",
  desc: "Meadowlark — Bell Timber",
  township: "Marcy T-82-N",
  section: "9",
  estAcres: 44,
  meas: 11,
  yield: 231,
  status: "QC",
  harvest: "2026-10-29",
  moist: [15.3, 15.0, 14.9]
}, {
  nom: "107",
  contract: "300107",
  coop: "006",
  group: "0001",
  desc: "Delaney — Airport 120",
  township: "Peoples T-83-N",
  section: "22",
  estAcres: 120,
  meas: 14,
  yield: 258,
  status: "Submitted",
  harvest: "2026-11-02",
  moist: [15.6, 15.2, 15.0, 14.8]
}, {
  nom: "108",
  contract: "300108",
  coop: "002",
  group: "0001",
  desc: "Timber Creek — South 40",
  township: "Des Moines T-83-N",
  section: "9",
  estAcres: 40,
  meas: 11,
  yield: 0,
  status: "Draft",
  draft: true,
  selected: false
}, {
  nom: "109",
  contract: "300109",
  coop: "003",
  group: "0001",
  desc: "Halverson — Creek Bottom",
  township: "Douglas T-84-N",
  section: "13",
  estAcres: 47,
  meas: 12,
  yield: 0,
  status: "Draft",
  invalid: true,
  invalidReason: "Field damage (weather) uncommon to area"
}, {
  nom: "110",
  contract: "300110",
  coop: "004",
  group: "0001",
  scenario: "Alternate",
  selected: false,
  desc: "Sorenson — Pratt 60 Alt Strip",
  township: "Yell T-83-N",
  section: "29",
  estAcres: 58,
  meas: 12,
  yield: 236,
  status: "Approved",
  harvest: "2026-10-30",
  moist: [15.6, 15.2, 14.9]
}, {
  nom: "111",
  contract: "300111",
  coop: "005",
  group: "0001",
  scenario: "Alternate",
  selected: false,
  desc: "Meadowlark — Bell Timber Alt",
  township: "Marcy T-82-N",
  section: "10",
  estAcres: 46,
  meas: 11,
  yield: 235,
  status: "QC",
  harvest: "2026-10-31",
  moist: [15.4, 15.0, 14.8]
},
// ----- Plant 8H14 (GrowLoc 8H14-A) -> LCCE 267 -----
{
  nom: "201",
  contract: "300201",
  coop: "007",
  group: "0002",
  desc: "Windy Hill — Home Place",
  township: "Nevada T-83-N",
  section: "5",
  estAcres: 55,
  meas: 12,
  yield: 259,
  status: "Approved",
  harvest: "2026-10-23",
  moist: [15.9, 15.4, 15.0]
}, {
  nom: "202",
  contract: "300202",
  coop: "007",
  group: "0002",
  desc: "Windy Hill — West Quarter",
  township: "Nevada T-83-N",
  section: "6",
  estAcres: 58,
  meas: 13,
  yield: 268,
  status: "Approved",
  harvest: "2026-10-23",
  moist: [15.5, 15.1, 14.8]
}, {
  nom: "203",
  contract: "300203",
  coop: "008",
  group: "0002",
  desc: "Riverbend — Skunk River 60",
  township: "Indian Creek T-82-N",
  section: "18",
  estAcres: 61,
  meas: 13,
  yield: 246,
  status: "Approved",
  harvest: "2026-10-25",
  moist: [16.1, 15.6, 15.2]
}, {
  nom: "204",
  contract: "300204",
  coop: "009",
  group: "0002",
  desc: "Stonebrook — Colo North",
  township: "Collins T-82-N",
  section: "3",
  estAcres: 64,
  meas: 14,
  yield: 274,
  status: "Approved",
  harvest: "2026-10-26",
  moist: [15.4, 15.0, 14.7, 15.2]
}, {
  nom: "205",
  contract: "300205",
  coop: "010",
  group: "0002",
  desc: "Cedar Valley — Isolation Strip",
  township: "Nevada T-83-N",
  section: "12",
  estAcres: 43,
  meas: 11,
  yield: 263,
  status: "QC",
  harvest: "2026-10-27",
  moist: [15.7, 15.2, 14.9]
}, {
  nom: "206",
  contract: "300206",
  coop: "011",
  group: "0002",
  desc: "Oakdale — Zearing 80",
  township: "Lafayette T-85-N",
  section: "17",
  estAcres: 79,
  meas: 13,
  yield: 269,
  status: "QC",
  harvest: "2026-10-28",
  moist: [15.3, 15.0, 15.5]
}, {
  nom: "207",
  contract: "300207",
  coop: "012",
  group: "0002",
  desc: "Prescott — Timber 120",
  township: "Collins T-82-N",
  section: "22",
  estAcres: 118,
  meas: 14,
  yield: 291,
  status: "Submitted",
  harvest: "2026-11-03",
  moist: [15.6, 15.2, 14.9, 15.0]
}, {
  nom: "208",
  contract: "300208",
  coop: "008",
  group: "0002",
  desc: "Riverbend — East 90",
  township: "Indian Creek T-82-N",
  section: "16",
  estAcres: 90,
  meas: 13,
  yield: 286,
  status: "Approved",
  harvest: "2026-10-25",
  moist: [15.8, 15.3, 15.0]
}, {
  nom: "209",
  contract: "300209",
  coop: "010",
  group: "0002",
  desc: "Cedar Valley — Prairie Loop",
  township: "Nevada T-83-N",
  section: "24",
  estAcres: 46,
  meas: 12,
  yield: 251,
  status: "Approved",
  harvest: "2026-10-29",
  moist: [15.5, 15.1, 14.8]
}, {
  nom: "210",
  contract: "300210",
  coop: "009",
  group: "0002",
  scenario: "Alternate",
  selected: false,
  desc: "Stonebrook — Colo South Alt",
  township: "Collins T-82-N",
  section: "4",
  estAcres: 66,
  meas: 13,
  yield: 267,
  status: "Approved",
  harvest: "2026-10-30",
  moist: [15.7, 15.3, 15.0]
}, {
  nom: "211",
  contract: "300211",
  coop: "011",
  group: "0002",
  scenario: "Alternate",
  selected: false,
  desc: "Oakdale — Zearing 80 Alt",
  township: "Lafayette T-85-N",
  section: "18",
  estAcres: 72,
  meas: 13,
  yield: 268,
  status: "QC",
  harvest: "2026-11-01",
  moist: [15.5, 15.1, 14.9]
}];
const SEED_NOMINATIONS = FIELD_DEFS.map((f, i) => {
  const h = HYBRIDS[i % HYBRIDS.length];
  const harvested = !f.draft && !f.invalid;
  const barren = f.draft || f.invalid;
  return {
    id: uid(),
    plant: f.group,
    contract: f.contract,
    nom: f.nom,
    coop: f.coop,
    group: f.group,
    growLoc: f.group === "0001" ? "GrowLoc 8H13-A" : "GrowLoc 8H14-A",
    scenario: f.scenario || "Base",
    // Back-ups start dormant: no LCCE contribution until an operator activates one.
    backupActive: false,
    backupFor: "",
    estAcres: f.estAcres,
    measuredAcres: f.meas,
    country: "US",
    state: "IA",
    township: f.township,
    section: f.section,
    fieldDesc: f.desc,
    selected: f.selected !== false,
    pmSelect: !!f.pm,
    invalid: !!f.invalid,
    invalidReason: f.invalidReason || "",
    dateHarvested: harvested ? f.harvest : "",
    hybridBrand: barren ? "" : h.brand,
    hybridDesignation: barren ? "" : h.desig,
    buPerAcre: harvested ? f.yield : 0,
    cropYear: 2026,
    status: f.status || "Draft",
    signed: f.status === "QC" || f.status === "Approved"
  };
});
const SEED_TICKETS = FIELD_DEFS.filter(f => !f.draft && !f.invalid).reduce((acc, f) => acc.concat(seedTickets(f.contract, f.meas, f.yield, f.moist)), []);

/* ---------- Persistence ---------- */
const LS_KEY = "lcce_state_v4";
/* State written before plants absorbed the production site kept the area
   description in `name` and the site code in `plant`, and every plant pointed at
   the same single site — so migrated records would otherwise share one code and
   be indistinguishable in every picker. The first plant carrying a code gets the
   real site name restored; the rest get a distinct code and keep their own text
   as the name. `id` is never touched, so field and cooperator links survive. */
const LEGACY_SITE_NAMES = {
  "8H13": "BP Boone IA"
};
function migratePlants(list) {
  const seen = new Set();
  return list.map(p => {
    const code = p.plant || p.id;
    const first = !seen.has(code);
    let plant = code;
    if (!first) {
      let n = 2;
      while (seen.has(code + "-" + n)) n++;
      plant = code + "-" + n;
    }
    seen.add(plant);
    if (p.area !== undefined) return p.plant === plant ? p : {
      ...p,
      plant
    };
    const siteName = first ? LEGACY_SITE_NAMES[code] : null;
    return {
      ...p,
      plant,
      name: siteName || p.name || plant,
      area: siteName ? p.name || "" : ""
    };
  });
}
// Drop null / malformed records so one bad entry in persisted state can't throw
// during render and blank the entire app (every page iterates these arrays).
function sanitizeState(s) {
  if (!s || typeof s !== "object") return null;
  return {
    cooperators: Array.isArray(s.cooperators) ? s.cooperators.filter(c => c && c.code != null) : [],
    // Plants live under `groups` for backward compatibility. State saved by an
    // older build has no key at all — fall back to the seeds in that case. An
    // empty array is honoured, so deleting every plant survives a reload.
    groups: Array.isArray(s.groups) ? migratePlants(s.groups.filter(g => g && g.id != null)) : SEED_PLANTS,
    nominations: Array.isArray(s.nominations) ? s.nominations.filter(n => n && n.id != null) : [],
    tickets: Array.isArray(s.tickets) ? s.tickets.filter(t => t && t.id != null) : []
  };
}
// Deep-copied so a reset never hands out the seed arrays themselves, which
// would otherwise be shared across resets and by every later edit.
const seedState = () => JSON.parse(JSON.stringify({
  cooperators: SEED_COOPERATORS,
  groups: SEED_PLANTS,
  nominations: SEED_NOMINATIONS,
  tickets: SEED_TICKETS
}));
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = sanitizeState(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch (e) {}
  return seedState();
}
function saveState(s) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch (e) {}
}
/* The stored dataset, or null when there is nothing usable there. Distinct
   from loadState(), which falls back to the seed data — the one-time adoption
   below has to tell "this browser is holding the user's work" apart from
   "this is a fresh browser". */
function readLocalState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return sanitizeState(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

/* ---------- Server-backed persistence ----------
   Behind server/index.mjs, which also hands out these files, the SQLite
   document at /api/state is the authoritative copy: it outlives the browser
   profile, it is one dataset across every tab, and it keeps a version history.
   With no server — opened straight from disk over file://, or published to a
   static host that only returns files — the original localStorage path is used
   unchanged.

   Only the backend that owns the database sets this marker, injected into the
   page it serves. The branch is on that and nothing else: an http:// origin is
   not evidence of an API, and falling back to localStorage because a request
   failed would leave both copies live and quietly diverging, with no way for
   the user to tell which one they were editing. */
const SERVED = typeof window !== "undefined" && window.__LCCE_BACKEND__ === true;
/* Trailing debounce. The Nominations grid calls store.set on every keystroke,
   so an unthrottled write would be one request per character typed. */
const SAVE_DEBOUNCE_MS = 400;

// Relative to the page, so the API is always same-origin — no CORS, and no
// second host that could be pointed somewhere else.
function apiUrl(name) {
  return String(location.pathname || "/").replace(/[^/]*$/, "") + "api/" + name;
}
async function apiRead() {
  const res = await fetch(apiUrl("state"), {
    cache: "no-store",
    headers: {
      accept: "application/json"
    }
  });
  if (!res.ok) throw new Error("the server answered " + res.status);
  return res.json();
}

/* Resolves to {version, updatedAt}. A 409 (the stored version has moved on) is
   thrown with .conflict set: it must never be retried by simply resending, as
   that is precisely the silent overwrite the version check exists to stop. */
async function apiWrite(version, state) {
  const res = await fetch(apiUrl("state"), {
    method: "PUT",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      version: version,
      state: state
    })
  });
  if (res.status === 409) {
    let body = null;
    try {
      body = await res.json();
    } catch (e) {}
    const err = new Error("conflict");
    err.conflict = true;
    err.version = body ? body.version : null;
    throw err;
  }
  if (!res.ok) throw new Error("the server answered " + res.status);
  return res.json();
}

/* Last-chance write as the page goes away. fetch(keepalive) caps the body at
   64 KB and a real dataset is larger, and a plain async fetch started in
   beforeunload may never be dispatched — a synchronous XHR is the one request
   the browser will still finish. It runs only on unload, so nobody feels it. */
function apiWriteSync(version, state) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", apiUrl("state"), false);
    xhr.setRequestHeader("content-type", "application/json");
    xhr.send(JSON.stringify({
      version: version,
      state: state
    }));
    if (xhr.status < 200 || xhr.status >= 300) return null;
    return JSON.parse(xhr.responseText);
  } catch (e) {
    return null;
  }
}

/* First load in served mode.

   If the database has never been written and this browser is holding a dataset
   in localStorage, that dataset becomes the initial server state. That is how
   work entered before the backend existed survives the move to it.

   One-way and one-time by construction: the upload is a create, sent with
   version 0, and the server rejects it with a 409 the moment any document
   exists. A stale localStorage copy therefore cannot overwrite real server
   data even if this runs again. The localStorage copy is deliberately left
   where it is, as a fallback, and is never read again. */
async function bootRemoteState() {
  const doc = await apiRead();
  const fromServer = d => {
    const clean = sanitizeState(d.state);
    if (!clean) throw new Error("the data on the server could not be read");
    return {
      state: clean,
      version: d.version,
      adopted: false
    };
  };
  if (doc.state) return fromServer(doc);
  const local = readLocalState();
  const initial = local || seedState();
  try {
    const saved = await apiWrite(0, initial);
    return {
      state: initial,
      version: saved.version,
      adopted: !!local
    };
  } catch (err) {
    if (!err.conflict) throw err;
    return fromServer(await apiRead()); // another tab got there first; its copy wins
  }
}

/* ================= Shared UI ================= */
function Field({
  label,
  children,
  hint
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, label), children, hint ? /*#__PURE__*/React.createElement("span", {
    className: "notice"
  }, hint) : null);
}
function TextInput({
  value,
  onChange,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("input", {
    value: value ?? "",
    onChange: e => onChange(e.target.value),
    ...rest
  });
}
function ReqLabel({
  text
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, text, " ", /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*"));
}
/* The app's one status-message pattern: a coloured strip saying in plain words
   what just happened. Used by the app-level persistence banner. */
function Flash({
  msg,
  style,
  children
}) {
  if (!msg) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "flash " + (msg.ok ? "ok" : "bad"),
    style: style
  }, msg.text, children);
}
function StatusBadge({
  status
}) {
  const map = {
    Draft: "draft",
    Submitted: "sub",
    QC: "qc",
    Approved: "appr"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: "badge " + (map[status] || "draft")
  }, status);
}
function Modal({
  title,
  onClose,
  children,
  footer,
  wide
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-bg",
    onMouseDown: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    style: wide ? {
      maxWidth: 980
    } : null
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    className: "x",
    onClick: onClose
  }, "×")), /*#__PURE__*/React.createElement("div", {
    className: "mb"
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    className: "mf"
  }, footer) : null));
}
function coopName(store, code) {
  const c = (store.state.cooperators || []).find(c => c && c.code === code);
  return c ? c.name : code;
}
// Plants are user-maintained, so drop any malformed record before iterating.
function storePlants(store) {
  return (store.state.groups || []).filter(p => p && p.id);
}
/* Cooperators and nominations reference a plant by its internal id, but state
   written by an earlier build stored the bare site code, so accept either. */
function findPlant(store, ref) {
  if (!ref) return null;
  const plants = storePlants(store);
  return plants.find(p => p.id === ref) || plants.find(p => p.plant === ref) || null;
}
const plantId = (store, ref) => {
  const p = findPlant(store, ref);
  return p ? p.id : "";
};
const plantCode = (store, ref) => {
  const p = findPlant(store, ref);
  return p ? p.plant : ref || "";
};
function plantLabel(store, ref) {
  const p = findPlant(store, ref);
  if (!p) return ref || "";
  return [p.plant, p.name].filter(Boolean).join(" — ");
}
/* Small "?" badge that explains a nearby section on hover/focus. */
function HelpDot({
  tip,
  pos
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "help-hint",
    "data-tip": tip,
    "data-tip-pos": pos,
    tabIndex: 0,
    role: "img",
    "aria-label": "Help: " + tip
  }, "?");
}

/* Three-dot actions button for a table row. Table bodies scroll and clip their
   overflow, so the popup is positioned fixed from the button's rect instead of
   absolutely inside the cell, and closes on any scroll so it can't drift away
   from the row it belongs to. */
function RowMenu({
  items,
  label
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const b = btnRef.current;
    if (b) {
      const r = b.getBoundingClientRect();
      setPos({
        top: r.bottom + 6,
        right: Math.max(8, window.innerWidth - r.right)
      });
    }
    const onDown = e => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = e => {
      if (e.key === "Escape") setOpen(false);
    };
    const dismiss = () => setOpen(false);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    ref: btnRef,
    type: "button",
    className: "kebab" + (open ? " open" : ""),
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-label": label || "Row actions",
    "data-tip": label || "Row actions",
    onClick: e => {
      e.stopPropagation();
      setOpen(v => !v);
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "⋮")), open && pos ? /*#__PURE__*/React.createElement("div", {
    className: "row-menu",
    role: "menu",
    ref: menuRef,
    style: {
      top: pos.top,
      right: pos.right
    }
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.label,
    type: "button",
    role: "menuitem",
    className: it.danger ? "danger" : "",
    onClick: e => {
      e.stopPropagation();
      setOpen(false);
      it.onClick();
    }
  }, it.label))) : null);
}

/* ================= Dashboard =================
   Read-only overview. Every number is derived from the same nominations and
   scale tickets the workflow screens edit, filtered to the crop year in the
   header, and every tile or row links to the screen that can act on it — so the
   overview doubles as the program's queue of outstanding work. */

/* Harvest after November 15 is one of the selectable invalid reasons, so a field
   recorded past that date is surfaced for a second look rather than quietly
   averaging into its location's LCCE. */
const harvestDeadline = year => year + "-11-15";
const shareOf = (part, whole) => whole > 0 ? Math.round(part / whole * 100) : 0;
const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");

/* Headline tile. Given an onClick it renders as a button so the whole tile is
   the target, which is how every metric here reaches its detail screen. */
function Kpi({
  label,
  value,
  unit,
  sub,
  tip,
  tone,
  bar,
  onClick
}) {
  const body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "kpi-k"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "kpi-v"
  }, value, unit ? /*#__PURE__*/React.createElement("small", null, unit) : null), typeof bar === "number" ? /*#__PURE__*/React.createElement("div", {
    className: "kpi-bar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: Math.max(0, Math.min(100, bar)) + "%"
    }
  })) : null, sub ? /*#__PURE__*/React.createElement("div", {
    className: "kpi-s"
  }, sub) : null);
  const cls = "kpi" + (tone ? " tone-" + tone : "");
  if (!onClick) return /*#__PURE__*/React.createElement("div", {
    className: cls,
    "data-tip": tip,
    "data-tip-pos": "bottom"
  }, body);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: cls,
    onClick: onClick,
    "data-tip": tip,
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kpi-go",
    "aria-hidden": "true"
  }, "›"), body);
}
const PIPELINE = [{
  status: "Draft",
  cls: "s-draft",
  view: "nominations",
  note: "Nominated, no yield posted yet"
}, {
  status: "Submitted",
  cls: "s-sub",
  view: "yield",
  note: "Yield posted, waiting on a QC signature"
}, {
  status: "QC",
  cls: "s-qc",
  view: "review",
  note: "Signed, waiting on approval"
}, {
  status: "Approved",
  cls: "s-appr",
  view: "review",
  note: "Final — feeds the location LCCE"
}];
function Dashboard({
  store,
  cropYear,
  go
}) {
  const d = useMemo(() => {
    const plants = storePlants(store);
    const noms = (store.state.nominations || []).filter(n => n && n.cropYear === cropYear);
    const yearContracts = new Set(noms.map(n => n.contract));
    const tickets = (store.state.tickets || []).filter(t => t && yearContracts.has(t.contract));
    const loadsFor = contract => tickets.filter(t => t.contract === contract).length;
    const counting = noms.filter(countsTowardLcce);
    const harvested = counting.filter(n => +n.buPerAcre > 0);
    // A field with loads but no bu/ac is waiting on someone to finish it on the
    // Yield Check screen; one with neither simply hasn't been harvested.
    const unposted = counting.filter(n => !(+n.buPerAcre > 0));
    const readyToPost = unposted.filter(n => loadsFor(n.contract) > 0);
    const notHarvested = unposted.filter(n => loadsFor(n.contract) === 0);
    const invalid = noms.filter(n => n.invalid);
    const backups = noms.filter(isBackupField);
    const backupsOn = backups.filter(n => n.backupActive);
    const late = counting.filter(n => n.dateHarvested && n.dateHarvested > harvestDeadline(cropYear));
    const orphans = noms.filter(n => !plants.some(p => p.id === n.group));

    /* Invalid fields are excluded from the workflow counts so the pipeline ties
       out with the Approval Status screen it links to, which lists valid fields
       only. They are reported on their own beneath the pipeline instead. */
    const active = noms.filter(n => !n.invalid);
    const byStatus = {};
    STATUSES.forEach(s => {
      byStatus[s] = active.filter(n => (n.status || "Draft") === s);
    });
    const locations = plants.map(g => {
      const gnoms = noms.filter(n => n.group === g.id);
      const res = lcceForGroup(gnoms);
      const sel = gnoms.filter(countsTowardLcce);
      const q = lcceQualifiers(gnoms).slice().sort((a, b) => +a.buPerAcre - +b.buPerAcre);
      return {
        g,
        res,
        gnoms,
        sel,
        q,
        // Yields can tie, so the discarded pair is identified by its position in
        // the sorted list — the same two rows lcceForGroup itself trims.
        lowId: res.short || !q.length ? null : q[0].id,
        highId: res.short || !q.length ? null : q[q.length - 1].id,
        acres: sel.reduce((s, n) => s + (+n.estAcres || 0), 0),
        coops: new Set(gnoms.map(n => n.coop).filter(Boolean)).size,
        waiting: sel.filter(n => !(+n.buPerAcre > 0)).length
      };
    });
    const finals = locations.map(l => l.res.lcce).filter(v => v);
    const avgLcce = finals.length ? Math.round(finals.reduce((a, b) => a + b, 0) / finals.length) : null;

    // Every qualifying field ranked across all locations, tagged with the
    // high/low that its own location discards before averaging.
    const fields = [];
    locations.forEach(l => l.q.forEach(n => fields.push({
      n,
      plant: l.g.plant,
      mark: n.id === l.highId ? "high" : n.id === l.lowId ? "low" : ""
    })));
    fields.sort((a, b) => +b.n.buPerAcre - +a.n.buPerAcre);
    const yHi = fields.length ? +fields[0].n.buPerAcre : 0;
    const yLo = fields.length ? +fields[fields.length - 1].n.buPerAcre : 0;

    // Grain quality across every load delivered for the crop year.
    let net = 0,
      adj = 0,
      moistWt = 0,
      testSum = 0,
      testN = 0;
    const elevMap = new Map();
    tickets.forEach(t => {
      const nw = netWeight(t.gross, t.tare);
      net += nw;
      adj += nw * shrinkFactor(t.moisture);
      moistWt += nw * (+t.moisture || 0);
      if (+t.test > 0) {
        testSum += +t.test;
        testN++;
      }
      const key = t.elevator || "Unassigned";
      const e = elevMap.get(key) || {
        name: key,
        loads: 0,
        bu: 0
      };
      e.loads++;
      e.bu += ticketBushels(t);
      elevMap.set(key, e);
    });
    const grain = {
      loads: tickets.length,
      bushels: adj / LBS_PER_BU,
      shrink: net > 0 ? (1 - adj / net) * 100 : null,
      moisture: net > 0 ? moistWt / net : null,
      test: testN ? testSum / testN : null,
      acres: harvested.reduce((s, n) => s + (+n.measuredAcres || 0), 0)
    };
    const elevators = Array.from(elevMap.values()).sort((a, b) => b.bu - a.bu);
    const hyMap = new Map();
    harvested.forEach(n => {
      const key = (n.hybridBrand || "—") + " " + (n.hybridDesignation || "—");
      const h = hyMap.get(key) || {
        key,
        brand: n.hybridBrand || "—",
        desig: n.hybridDesignation || "—",
        fields: 0,
        acres: 0,
        sum: 0
      };
      h.fields++;
      h.acres += +n.estAcres || 0;
      h.sum += +n.buPerAcre || 0;
      hyMap.set(key, h);
    });
    const hybrids = Array.from(hyMap.values()).map(h => ({
      ...h,
      avg: h.sum / h.fields
    })).sort((a, b) => b.avg - a.avg);

    /* Work queue, most blocking first. Each entry names the screen that can
       clear it so nothing here is a dead end. */
    const attn = [];
    locations.forEach(l => {
      if (l.gnoms.length && l.res.short) attn.push({
        tone: "bad",
        ic: "!",
        t: l.g.plant + " can't produce an LCCE yet",
        n: lcceShortNote(l.res) + " " + l.res.count + " of " + l.sel.length + " selected fields have a yield so far.",
        cta: "Nominations",
        view: "nominations"
      });
    });
    if (orphans.length) attn.push({
      tone: "bad",
      ic: orphans.length,
      t: plural(orphans.length, "field") + " not assigned to a plant",
      n: "A field outside a plant is left out of every location LCCE. Assign it on the Plant screen.",
      cta: "Plants",
      view: "groups"
    });
    if (readyToPost.length) attn.push({
      tone: "warn",
      ic: readyToPost.length,
      t: plural(readyToPost.length, "field") + " with scale tickets but no posted yield",
      n: "The loads are entered — review the calculated bu/acre on Yield Check and post it to the nomination.",
      cta: "Yield Check",
      view: "yield"
    });
    if (byStatus.Submitted.length) attn.push({
      tone: "warn",
      ic: byStatus.Submitted.length,
      t: plural(byStatus.Submitted.length, "field") + " waiting on a QC signature",
      n: "Yield is posted and the field is submitted. Sign it on Yield Check to move it into QC.",
      cta: "Yield Check",
      view: "yield"
    });
    if (byStatus.QC.length) attn.push({
      tone: "info",
      ic: byStatus.QC.length,
      t: plural(byStatus.QC.length, "field") + " in QC waiting for approval",
      n: "Approve these on the Approval Status screen to finish the workflow.",
      cta: "Approval Status",
      view: "review"
    });
    if (late.length) attn.push({
      tone: "warn",
      ic: late.length,
      t: plural(late.length, "field") + " harvested after November 15",
      n: "Late harvest is one of the reasons a field can be marked invalid — confirm these still qualify for the average.",
      cta: "Nominations",
      view: "nominations"
    });
    if (notHarvested.length) attn.push({
      tone: "info",
      ic: notHarvested.length,
      t: plural(notHarvested.length, "selected field") + " with no harvest recorded",
      n: "No scale tickets yet. Enter each load's weights and moisture to calculate the yield.",
      cta: "Scale Tickets",
      view: "tickets"
    });
    if (invalid.length) attn.push({
      tone: backupsOn.length >= invalid.length ? "info" : "warn",
      ic: invalid.length,
      t: plural(invalid.length, "invalid field") + " excluded, " + backupsOn.length + " of " + backups.length + " back-ups activated",
      n: "Activating an Alternate field lets it stand in for an invalid base field so the location keeps its field count.",
      cta: "Nominations",
      view: "nominations"
    });
    return {
      plants,
      noms,
      active,
      counting,
      harvested,
      invalid,
      backups,
      backupsOn,
      byStatus,
      locations,
      finals,
      avgLcce,
      fields,
      yHi,
      yLo,
      grain,
      elevators,
      hybrids,
      attn,
      coopCount: new Set(noms.map(n => n.coop).filter(Boolean)).size,
      acres: counting.reduce((s, n) => s + (+n.estAcres || 0), 0),
      pendingReview: byStatus.Submitted.length + byStatus.QC.length
    };
  }, [store.state, cropYear]);
  const steps = [{
    n: "1",
    t: "Plant",
    view: "groups",
    d: "Create the production sites and choose which fields belong to each.",
    m: plural(d.plants.length, "plant"),
    tip: "Plant — production sites. A plant owns its cooperators and their nominations, and its selected fields average into one LCCE."
  }, {
    n: "2",
    t: "Cooperators",
    view: "cooperators",
    d: "Set up the growers you contract with, including address and contact details.",
    m: plural((store.state.cooperators || []).length, "grower"),
    tip: "Step 2 — Cooperators: set up the growers you contract with."
  }, {
    n: "3",
    t: "Nominations",
    view: "nominations",
    d: "Nominate fields, mark which are Bayer-selected or invalid, and record harvest.",
    m: d.counting.length + " of " + d.noms.length + " selected",
    tip: "Step 3 — Nominations: nominate fields, mark which are Bayer-selected, and record harvest."
  }, {
    n: "4",
    t: "Scale Tickets",
    view: "tickets",
    d: "Enter each load's gross, tare, and moisture; the app computes net weight and bushels.",
    m: plural(d.grain.loads, "load"),
    tip: "Step 4 — Scale Tickets: enter each load's weights and moisture for a selected field."
  }, {
    n: "5",
    t: "Yield Check",
    view: "yield",
    d: "Review the calculated bu/acre for a field, then sign and send it to QC.",
    m: plural(d.byStatus.Submitted.length, "field") + " to sign",
    tip: "Step 5 — Yield Check: review the calculated yield, then sign and send it to QC."
  }, {
    n: "6",
    t: "Approval Status",
    view: "review",
    d: "Work every field by workflow status: approve QC fields or send them back.",
    m: plural(d.byStatus.QC.length, "field") + " to approve",
    tip: "Step 6 — Approval Status: a list of every field grouped by workflow status."
  }, {
    n: "7",
    t: "LCCE Location",
    view: "lcce",
    d: "The final step: lock the location LCCE, calculate final bushels, and export the SAP settlement file.",
    m: d.finals.length + " of " + d.locations.length + " final",
    tip: "Step 7 — LCCE Location: the final step. Discard high/low, calculate final bushels, and export for SAP."
  }, {
    n: "↗",
    t: "Grower Portal",
    view: "grower",
    d: "Preview the read-only results a cooperator sees for their own fields, yields, and location LCCE.",
    m: "Read-only view",
    aux: true,
    tip: "Grower Portal — preview the read-only field results a cooperator sees."
  }];
  const shortcuts = /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Workflow", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Jump straight to any step of the LCCE process. The steps run in order, and each card shows where that step stands for the selected crop year."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "The LCCE process in order, with where each step stands right now"))), /*#__PURE__*/React.createElement("div", {
    className: "bd steps"
  }, steps.map(s => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: s.t,
    className: "step" + (s.aux ? " aux" : ""),
    onClick: () => go(s.view),
    "data-tip": s.tip
  }, /*#__PURE__*/React.createElement("div", {
    className: "step-hd"
  }, /*#__PURE__*/React.createElement("span", {
    className: "step-n",
    "aria-hidden": "true"
  }, s.n), /*#__PURE__*/React.createElement("span", {
    className: "step-t"
  }, s.t)), /*#__PURE__*/React.createElement("div", {
    className: "step-d"
  }, s.d), /*#__PURE__*/React.createElement("div", {
    className: "step-m"
  }, s.m)))));
  if (!d.noms.length) {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "hd"
    }, /*#__PURE__*/React.createElement("div", {
      className: "hd-l"
    }, /*#__PURE__*/React.createElement("h2", null, "No field data for Crop Year ", cropYear), /*#__PURE__*/React.createElement("div", {
      className: "sub"
    }, "Nothing has been nominated for this crop year yet"))), /*#__PURE__*/React.createElement("div", {
      className: "bd"
    }, /*#__PURE__*/React.createElement("p", {
      className: "help",
      style: {
        marginTop: 0
      }
    }, "Every screen reports on the crop year chosen in the header. ", d.plants.length ? plural(d.plants.length, "plant") + " and " + plural((store.state.cooperators || []).length, "cooperator") + " are already set up, so nominations can start straight away." : "No plants are set up yet, so start by creating one.", " Switch the Crop Year to a season with harvest data, or begin this one below."), /*#__PURE__*/React.createElement("div", {
      className: "row-actions",
      style: {
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => go("nominations")
    }, "Nominate fields"), /*#__PURE__*/React.createElement("button", {
      className: "btn sec",
      onClick: () => go("groups")
    }, "Manage plants"), /*#__PURE__*/React.createElement("button", {
      className: "btn sec",
      onClick: () => go("cooperators")
    }, "Manage cooperators")))), shortcuts);
  }
  const harvestPct = shareOf(d.harvested.length, d.counting.length);
  const spreadPos = v => d.yHi > d.yLo ? (v - d.yLo) / (d.yHi - d.yLo) * 100 : 50;
  const barPct = v => d.yHi > d.yLo ? 12 + (v - d.yLo) / (d.yHi - d.yLo) * 88 : 100;
  const totals = {
    coops: d.coopCount,
    sel: d.locations.reduce((s, l) => s + l.sel.length, 0),
    harv: d.locations.reduce((s, l) => s + l.res.count, 0),
    acres: d.locations.reduce((s, l) => s + l.acres, 0)
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "dash-kpis"
  }, /*#__PURE__*/React.createElement(Kpi, {
    tone: "green",
    label: "Average LCCE",
    value: fmt(d.avgLcce),
    unit: "bu/ac",
    sub: d.finals.length ? /*#__PURE__*/React.createElement(React.Fragment, null, "Final at ", /*#__PURE__*/React.createElement("b", null, d.finals.length), " of ", d.locations.length, " locations", d.finals.length > 1 ? /*#__PURE__*/React.createElement(React.Fragment, null, " · range ", fmt(Math.min.apply(null, d.finals)), "–", fmt(Math.max.apply(null, d.finals))) : null) : "No location has enough qualifying fields yet",
    tip: "Average LCCE — the mean of each location's final LCCE for this crop year, in bushels per acre. Opens the Location report.",
    onClick: () => go("lcce")
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: "blue",
    label: "Selected Fields",
    value: d.counting.length,
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, fmt(d.acres)), " est. acres · ", plural(d.coopCount, "cooperator")),
    tip: "Selected Fields — fields marked Bayer-selected (and not invalid) that feed the LCCE calculation, plus their estimated acres. Opens Nominations.",
    onClick: () => go("nominations")
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: "green",
    label: "Harvest Progress",
    value: harvestPct,
    unit: "%",
    bar: harvestPct,
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, d.harvested.length), " of ", d.counting.length, " selected fields have a posted yield"),
    tip: "Harvest Progress — how many selected fields already have a yield posted, out of every field feeding the LCCE. Opens Nominations.",
    onClick: () => go("nominations")
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: "blue",
    label: "Grain Delivered",
    value: fmt(d.grain.bushels),
    unit: "bu",
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, plural(d.grain.loads, "load"), d.grain.moisture !== null ? /*#__PURE__*/React.createElement(React.Fragment, null, " · ", fmt(d.grain.moisture, 1), "% avg moisture") : null),
    tip: "Grain Delivered — moisture-adjusted bushels across every scale ticket recorded for this crop year. Opens Scale Tickets.",
    onClick: () => go("tickets")
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: d.pendingReview ? "amber" : "green",
    label: "Pending Review",
    value: d.pendingReview,
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, d.byStatus.Submitted.length), " awaiting signature · ", /*#__PURE__*/React.createElement("b", null, d.byStatus.QC.length), " in QC"),
    tip: "Pending Review — fields submitted or sitting in QC that still need a signature or approval. Opens Approval Status.",
    onClick: () => go("review")
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: "green",
    label: "Approved",
    value: d.byStatus.Approved.length,
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, shareOf(d.byStatus.Approved.length, d.active.length), "%"), " of ", plural(d.active.length, "field"), " in the workflow"),
    tip: "Approved — fields that have cleared QC and approval, and the share of the valid fields in the workflow they represent. Opens Approval Status.",
    onClick: () => go("review")
  })), /*#__PURE__*/React.createElement("div", {
    className: "dash-2 lead"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Workflow pipeline", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Where this crop year's fields sit in the workflow. A field moves Draft → Submitted → QC → Approved, and only harvested, selected fields average into the LCCE. Invalid fields leave the workflow and are counted separately."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, plural(d.active.length, "field"), " in the workflow", d.invalid.length ? " · " + d.invalid.length + " invalid excluded" : "", " · Crop Year ", cropYear))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pipe-bar",
    role: "img",
    "aria-label": "Workflow status split across " + d.active.length + " fields"
  }, PIPELINE.map(p => {
    const w = shareOf(d.byStatus[p.status].length, d.active.length);
    return w ? /*#__PURE__*/React.createElement("span", {
      key: p.status,
      className: p.cls,
      style: {
        width: w + "%"
      }
    }) : null;
  })), /*#__PURE__*/React.createElement("div", {
    className: "pipe-cap"
  }, "Share of valid fields by status"), PIPELINE.map(p => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: p.status,
    className: "pipe-row",
    onClick: () => go(p.view),
    "data-tip": "Open " + (p.view === "yield" ? "Yield Check" : p.view === "review" ? "Approval Status" : "Nominations") + " to work the " + p.status + " fields."
  }, /*#__PURE__*/React.createElement("span", {
    className: "pipe-dot " + p.cls
  }), /*#__PURE__*/React.createElement("span", {
    className: "pipe-nm"
  }, p.status, /*#__PURE__*/React.createElement("small", null, p.note)), /*#__PURE__*/React.createElement("span", {
    className: "pipe-ct"
  }, d.byStatus[p.status].length), /*#__PURE__*/React.createElement("span", {
    className: "pipe-pc"
  }, shareOf(d.byStatus[p.status].length, d.active.length), "%"))), /*#__PURE__*/React.createElement("div", {
    className: "pipe-foot"
  }, /*#__PURE__*/React.createElement("span", {
    "data-tip": "Invalid fields are excluded from every LCCE average and from the status counts above, whatever status they were left in."
  }, "Invalid ", /*#__PURE__*/React.createElement("b", null, d.invalid.length)), /*#__PURE__*/React.createElement("span", {
    "data-tip": "Alternate fields are back-ups. They stay out of the average until one is activated to stand in for an invalid base field."
  }, "Back-ups ", /*#__PURE__*/React.createElement("b", null, d.backupsOn.length), " of ", d.backups.length, " active"), /*#__PURE__*/React.createElement("span", {
    "data-tip": "Fields counted in the LCCE: selected, valid, and either a base field or an activated back-up."
  }, "Feeding LCCE ", /*#__PURE__*/React.createElement("b", null, d.counting.length))))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Needs attention", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Everything blocking a complete LCCE for this crop year, most blocking first. Each item links to the screen that can clear it."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, d.attn.length ? plural(d.attn.length, "item") + " to work" : "Nothing outstanding"))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, d.attn.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "attn-clear"
  }, /*#__PURE__*/React.createElement("span", {
    className: "attn-ic",
    "aria-hidden": "true"
  }, "✓"), /*#__PURE__*/React.createElement("div", {
    className: "attn-tx"
  }, /*#__PURE__*/React.createElement("div", {
    className: "attn-t"
  }, "Every location has a final LCCE"), /*#__PURE__*/React.createElement("div", {
    className: "attn-n"
  }, "All selected fields are harvested, reviewed, and approved for Crop Year ", cropYear, ". Nothing is waiting on you."))) : d.attn.map((a, i) => /*#__PURE__*/React.createElement("div", {
    className: "attn " + a.tone,
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "attn-ic",
    "aria-hidden": "true"
  }, a.ic), /*#__PURE__*/React.createElement("div", {
    className: "attn-tx"
  }, /*#__PURE__*/React.createElement("div", {
    className: "attn-t"
  }, a.t), /*#__PURE__*/React.createElement("div", {
    className: "attn-n"
  }, a.n)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "attn-b",
    onClick: () => go(a.view)
  }, a.cta, " ›")))))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "LCCE by Location — Crop Year ", cropYear, /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Each location's LCCE for the crop year: how many fields were selected and harvested, the spread of their yields, the discarded high and low, and the final averaged result."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Yield spread shows every qualifying field's range, with the final LCCE marked")), /*#__PURE__*/React.createElement("button", {
    className: "btn sm",
    onClick: () => go("lcce"),
    "data-tip": "Open the final location report: discard-high/low detail, Final Bushels, and the SAP settlement export."
  }, "Open Location Report")), /*#__PURE__*/React.createElement("div", {
    className: "bd scroll-x"
  }, /*#__PURE__*/React.createElement("table", {
    className: "loc-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant — the production site whose selected fields are averaged together."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant Name and the geographic description of the plant's growing area."
  }, "Plant Name / Area"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Cooperators — distinct growers with a nominated field at this plant."
  }, "Coops"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Selected — valid, Bayer-selected fields at this plant, including activated back-ups."
  }, "Selected"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Harvested — selected fields with a posted yield. Only these can be averaged."
  }, "Harvested"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Est. Acres — estimated acres across the selected fields."
  }, "Est. Acres"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Yield spread — the low-to-high range of this location's qualifying fields, with the final LCCE marked. All locations share one scale."
  }, "Yield Spread"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "High — the single highest field yield, which is discarded before averaging."
  }, "High (disc.)"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Low — the single lowest field yield, which is discarded before averaging."
  }, "Low (disc.)"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Final LCCE — the averaged bu/ac after removing the high and low fields."
  }, "Final LCCE"))), /*#__PURE__*/React.createElement("tbody", null, d.locations.map(l => /*#__PURE__*/React.createElement("tr", {
    key: l.g.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, l.g.plant)), /*#__PURE__*/React.createElement("td", {
    className: "wrap"
  }, l.g.name, l.g.area ? /*#__PURE__*/React.createElement("span", {
    className: "loc-sub"
  }, l.g.area) : null), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, l.coops), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, l.sel.length), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, l.res.count, l.waiting ? /*#__PURE__*/React.createElement("span", {
    className: "pill",
    "data-tip": plural(l.waiting, "selected field") + " at this location still has no posted yield."
  }, " +", l.waiting, " open") : null), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(l.acres)), /*#__PURE__*/React.createElement("td", null, l.res.short ? /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "—") : /*#__PURE__*/React.createElement("span", {
    className: "spread",
    "data-tip": "Fields at " + l.g.plant + " range " + fmt(l.res.low) + " to " + fmt(l.res.high) + " bu/ac; the final LCCE of " + fmt(l.res.lcce) + " is the average of the " + l.res.kept.length + " fields left after discarding that high and low."
  }, /*#__PURE__*/React.createElement("span", {
    className: "spread-track"
  }), /*#__PURE__*/React.createElement("span", {
    className: "spread-fill",
    style: {
      left: spreadPos(l.res.low) + "%",
      width: Math.max(2, spreadPos(l.res.high) - spreadPos(l.res.low)) + "%"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "spread-dot",
    style: {
      left: spreadPos(l.res.lcce) + "%"
    }
  }))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(l.res.high)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(l.res.low)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, l.res.short ? /*#__PURE__*/React.createElement("span", {
    className: "badge inv",
    "data-tip": lcceShortNote(l.res)
  }, "Needs ", l.res.needed, " more") : /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--bayer-green-d)"
    }
  }, fmt(l.res.lcce))))), d.locations.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No plants defined. Create one on the Plant screen."))) : null), d.locations.length > 1 ? /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "2"
  }, "Program total — ", plural(d.locations.length, "location")), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, totals.coops), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, totals.sel), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, totals.harv), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(totals.acres)), /*#__PURE__*/React.createElement("td", null), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(d.yHi)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(d.yLo)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--bayer-green-d)"
    }
  }, fmt(d.avgLcce))))) : null), /*#__PURE__*/React.createElement("p", {
    className: "notice"
  }, "* Final LCCE = unweighted average of a location's selected fields after discarding the single high and low yields. A location needs at least ", MIN_LCCE_FIELDS, " harvested fields before an LCCE can be produced. The program total column shows the highest and lowest field across all locations, and the average of the final LCCEs."))), /*#__PURE__*/React.createElement("div", {
    className: "dash-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Field yields, ranked", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Every qualifying field for the crop year, highest yield first. The single highest and lowest field at each location are tagged because they are discarded before that location's average."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, plural(d.fields.length, "qualifying field"), " · discarded high and low tagged")), /*#__PURE__*/React.createElement("button", {
    className: "btn sm sec",
    onClick: () => go("nominations"),
    "data-tip": "Open Nominations to edit any field's selection, validity, or recorded harvest."
  }, "All Fields")), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, d.fields.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No harvested, selected fields yet for Crop Year ", cropYear, ".") : /*#__PURE__*/React.createElement("div", {
    className: "ybars"
  }, d.fields.map(({
    n,
    plant,
    mark
  }) => /*#__PURE__*/React.createElement("div", {
    className: "ybar" + (mark ? " is-" + mark : ""),
    key: n.id
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ybar-t"
  }, mark === "high" ? /*#__PURE__*/React.createElement("span", {
    className: "badge hi",
    "data-tip": "Highest yield at this location — discarded before averaging."
  }, "High") : null, mark === "low" ? /*#__PURE__*/React.createElement("span", {
    className: "badge low",
    "data-tip": "Lowest yield at this location — discarded before averaging."
  }, "Low") : null, n.fieldDesc || "Nomination " + n.nom, /*#__PURE__*/React.createElement("small", null, plant, " · ", coopName(store, n.coop))), /*#__PURE__*/React.createElement("div", {
    className: "ybar-track"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: barPct(+n.buPerAcre) + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ybar-v"
  }, fmt(n.buPerAcre), /*#__PURE__*/React.createElement("small", null, "bu/ac"))))))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Grain quality & deliveries", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Totals across every scale ticket recorded for this crop year. Loads over 15.0% moisture are shrunk 1.4% per point before being converted to bushels at 56 lb."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "All scale tickets for Crop Year ", cropYear)), /*#__PURE__*/React.createElement("button", {
    className: "btn sm sec",
    onClick: () => go("tickets"),
    "data-tip": "Open Scale Tickets to add or correct a load's gross, tare, and moisture."
  }, "Scale Tickets")), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, d.grain.loads === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No scale tickets recorded yet for Crop Year ", cropYear, ".") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "stat-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Loads — scale tickets recorded across every field this crop year."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Loads"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.loads))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Bushels — moisture-adjusted weight divided by 56 lb per bushel."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Bushels"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.bushels))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Measured acres — the harvested acres these bushels came off, which is what each field's bu/acre is divided by."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Measured Acres"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.acres, 1))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Average moisture, weighted by net weight so heavier loads count for more. Anything over 15.0% is shrunk before conversion."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Avg Moisture"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.moisture, 1), /*#__PURE__*/React.createElement("small", null, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Average test weight across every load that recorded one."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Avg Test Wt"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.test, 1), /*#__PURE__*/React.createElement("small", null, "lb"))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Total shrink applied for moisture over 15.0%: 1.4% of net weight per point over."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Moisture Shrink"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.shrink, 2), /*#__PURE__*/React.createElement("small", null, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "mix"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mix-t"
  }, "Bushels by delivery point"), d.elevators.map(e => /*#__PURE__*/React.createElement("div", {
    className: "mix-row",
    key: e.name
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mix-nm"
  }, e.name, " ", /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, plural(e.loads, "load"))), /*#__PURE__*/React.createElement("div", {
    className: "mix-track"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: Math.max(2, shareOf(e.bu, d.grain.bushels)) + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mix-v"
  }, fmt(e.bu), /*#__PURE__*/React.createElement("small", null, "bu"))))))))), d.hybrids.length ? /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Hybrid performance", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Average yield of the harvested, selected fields planted to each hybrid. Averages over one or two fields are indicative only."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Harvested selected fields grouped by hybrid, best average first"))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Brand — the seed brand planted on the field."
  }, "Brand"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Designation — the specific hybrid planted."
  }, "Hybrid"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Fields — harvested, selected fields planted to this hybrid."
  }, "Fields"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Est. Acres — estimated acres across those fields."
  }, "Est. Acres"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Average yield across those fields, relative to the best-performing hybrid."
  }, "Average Yield"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Average bu/acre across those fields."
  }, "Avg bu/ac"))), /*#__PURE__*/React.createElement("tbody", null, d.hybrids.map(h => /*#__PURE__*/React.createElement("tr", {
    key: h.key
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, h.brand)), /*#__PURE__*/React.createElement("td", null, h.desig), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, h.fields), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(h.acres)), /*#__PURE__*/React.createElement("td", {
    style: {
      minWidth: 140
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mix-track",
    style: {
      display: "block",
      marginTop: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: Math.max(2, barPct(h.avg)) + "%",
      background: "linear-gradient(90deg,#a9d97a,#66b512)"
    }
  }))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("b", null, fmt(h.avg, 1))))))))) : null, shortcuts);
}

/* ================= Plant screen (production sites) ================= */
function Groups({
  store,
  cropYear
}) {
  const [plantDraft, setPlantDraft] = useState("");
  const [plant, setPlant] = useState("");
  const [edit, setEdit] = useState(null);
  // Nomination ids ticked in the open dialog. A field belongs to a single plant,
  // so ticking one here moves it out of whatever plant it was in before.
  const [members, setMembers] = useState([]);
  const groups = storePlants(store);
  const allNoms = store.state.nominations || [];
  const noms = allNoms.filter(n => n && n.cropYear === cropYear);
  const list = groups.filter(g => !plant || g.id === plant);
  const unassigned = noms.filter(n => !groups.some(g => g.id === n.group)).length;
  const growLocs = useMemo(() => {
    const set = new Set(GROW_LOCS);
    groups.forEach(g => {
      if (g.growLoc) set.add(g.growLoc);
    });
    allNoms.forEach(n => {
      if (n && n.growLoc) set.add(n.growLoc);
    });
    return Array.from(set);
  }, [store.state.groups, store.state.nominations]);

  // Counts are for the crop year selected in the header, matching every other screen.
  const statsFor = id => {
    const gnoms = noms.filter(n => n.group === id);
    return {
      fields: gnoms.length,
      coops: new Set(gnoms.map(n => n.coop).filter(Boolean)).size,
      selected: gnoms.filter(countsTowardLcce).length,
      res: lcceForGroup(gnoms)
    };
  };
  const nextId = String(groups.reduce((m, g) => Math.max(m, parseInt(g.id, 10) || 0), 0) + 1).padStart(4, "0");
  const blank = {
    id: "",
    plant: "",
    name: "",
    area: "",
    growLoc: "",
    comment: ""
  };
  const applyFilters = () => {
    setPlant(plantDraft);
  };
  const openCreate = () => {
    setEdit({
      ...blank,
      _new: true
    });
    setMembers([]);
  };
  const openEdit = g => {
    setEdit({
      ...g,
      plant: g.plant || "",
      name: g.name || "",
      area: g.area || "",
      growLoc: g.growLoc || "",
      comment: g.comment || ""
    });
    setMembers(noms.filter(n => n.group === g.id).map(n => n.id));
  };
  const toggleMember = id => setMembers(m => m.indexOf(id) === -1 ? [...m, id] : m.filter(x => x !== id));
  const save = () => {
    const g = edit;
    if (!g.plant || !g.name) return alert("Plant and Plant Name are required.");
    const code = g.plant.trim();
    const id = g._new ? nextId : g.id;
    // The code is the identifier users read on every other screen, so keep it unique.
    if (groups.some(x => x.id !== id && (x.plant || "").toLowerCase() === code.toLowerCase())) return alert("Plant " + code + " already exists. Give this plant a different code.");
    const record = {
      id,
      plant: code,
      name: g.name.trim(),
      area: (g.area || "").trim(),
      growLoc: g.growLoc || "",
      comment: g.comment || ""
    };
    const memberSet = new Set(members);
    store.set({
      groups: g._new ? [...groups, record] : groups.map(x => x.id === g.id ? record : x),
      nominations: allNoms.map(n => {
        if (!n || n.cropYear !== cropYear) return n;
        // Keep `plant` and the descriptive growLoc in step with the owning plant.
        if (memberSet.has(n.id)) return n.group === id ? n : {
          ...n,
          group: id,
          plant: id,
          growLoc: record.growLoc || n.growLoc
        };
        // Unticked: only clear fields this plant used to own; leave other plants alone.
        return n.group === id ? {
          ...n,
          group: "",
          plant: ""
        } : n;
      })
    });
    setEdit(null);
  };

  // Called from the row menu as well as the open dialog, so the target is explicit.
  const remove = target => {
    const p = target || edit;
    if (!p) return;
    const used = allNoms.filter(n => n && n.group === p.id).length;
    if (used) return alert("Plant " + p.plant + " still has " + used + " field(s) assigned (across all crop years). Move those fields to another plant first.");
    const coops = (store.state.cooperators || []).filter(c => c && plantId(store, c.plant) === p.id).length;
    if (coops) return alert("Plant " + p.plant + " still has " + coops + " cooperator(s) assigned. Move them to another plant first.");
    if (!window.confirm("Delete plant " + p.plant + " — " + p.name + "?")) return;
    store.set({
      groups: groups.filter(g => g.id !== p.id)
    });
    setEdit(null);
  };
  const doExport = () => exportCSV("plants.csv", [["Plant", "Plant Name", "Area", "Growing Location", "Cooperators", "Fields", "Selected Fields", "LCCE", "Comments"], ...list.map(g => {
    const s = statsFor(g.id);
    return [g.plant, g.name, g.area || "", g.growLoc || "", s.coops, s.fields, s.selected, s.res.short ? "Not calculated — " + lcceShortNote(s.res) : s.res.lcce, g.comment || ""];
  })]);
  return /*#__PURE__*/React.createElement("div", {
    className: "manage-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "manage-filters"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Plant:"), /*#__PURE__*/React.createElement("select", {
    value: plantDraft,
    onChange: e => setPlantDraft(e.target.value),
    "data-tip": "Jump to one specific plant, or choose All to see every plant."
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "All"), groups.map(g => /*#__PURE__*/React.createElement("option", {
    key: g.id,
    value: g.id
  }, g.plant, " — ", g.name)))), /*#__PURE__*/React.createElement("div", {
    className: "filter-actions"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-go",
    onClick: applyFilters,
    "data-tip": "Apply the Plant filter above to the table."
  }, "Go"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-export",
    onClick: doExport,
    "data-tip": "Download the plants currently shown as a CSV spreadsheet."
  }, "Export"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-create",
    onClick: openCreate,
    "data-tip": "Add a new plant. A form opens where you name it and pick which fields belong to it."
  }, "+ Create"))), /*#__PURE__*/React.createElement("div", {
    className: "manage-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("h2", null, "Plants (", list.length, ")", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "The production sites. Cooperators and their nominated fields belong to a plant, and each plant's selected fields are averaged together to produce its LCCE. Use the ⋮ menu on a row to edit it."
  })), /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "Counts and LCCE are for crop year ", cropYear)), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("table", {
    className: "fields-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "actions",
    "data-tip": "Actions — open the ⋮ menu to edit or delete this plant."
  }), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant — the production site code, used to identify the plant everywhere else in the app."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant Name — the name of the production site."
  }, "Plant Name"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Area — the geographic area this plant draws its fields from."
  }, "Area"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Growing Location — an optional GrowLoc label carried onto this plant's nomination rows."
  }, "Growing Location"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Cooperators — how many distinct growers have a field in this plant this crop year."
  }, "Cooperators"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Fields — how many nominated fields sit in this plant this crop year."
  }, "Fields"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Selected — valid, Bayer-selected fields in this plant, the ones that feed the LCCE."
  }, "Selected"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "LCCE — this plant's averaged bu/ac after discarding the high and low field. Needs at least 3 qualifying fields: Bayer-selected, valid, and carrying a posted yield."
  }, "LCCE"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Comments — free-text notes about this plant."
  }, "Comments"))), /*#__PURE__*/React.createElement("tbody", null, list.map(g => {
    const s = statsFor(g.id);
    return /*#__PURE__*/React.createElement("tr", {
      key: g.id,
      className: "clickable",
      onClick: () => openEdit(g)
    }, /*#__PURE__*/React.createElement("td", {
      className: "actions",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement(RowMenu, {
      label: "Actions for plant " + g.plant,
      items: [{
        label: "Edit plant",
        onClick: () => openEdit(g)
      }, {
        label: "Delete plant",
        danger: true,
        onClick: () => remove(g)
      }]
    })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, g.plant)), /*#__PURE__*/React.createElement("td", null, g.name), /*#__PURE__*/React.createElement("td", null, g.area || ""), /*#__PURE__*/React.createElement("td", null, g.growLoc || ""), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, s.coops), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, s.fields), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, s.selected), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, s.res.short ? /*#__PURE__*/React.createElement("span", {
      className: "badge inv",
      "data-tip": lcceShortNote(s.res)
    }, "Needs ", s.res.needed, " more") : /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--bayer-green-d)"
      }
    }, fmt(s.res.lcce))), /*#__PURE__*/React.createElement("td", {
      className: "desc cell-muted"
    }, g.comment || ""));
  }), list.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No plants found."))) : null)))), unassigned ? /*#__PURE__*/React.createElement("p", {
    className: "notice"
  }, unassigned, " field", unassigned === 1 ? "" : "s", " in crop year ", cropYear, " ", unassigned === 1 ? "is" : "are", " not assigned to any plant, so ", unassigned === 1 ? "it is" : "they are", " left out of every LCCE. Open a plant and tick them under Fields in this plant.") : null, edit ? /*#__PURE__*/React.createElement(Modal, {
    title: edit._new ? "New Plant" : "Change Plant " + edit.plant,
    onClose: () => setEdit(null),
    wide: true,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, !edit._new ? /*#__PURE__*/React.createElement("button", {
      className: "btn danger",
      style: {
        marginRight: "auto"
      },
      onClick: () => remove(edit),
      "data-tip": "Delete this plant. Only possible once no fields or cooperators are assigned to it."
    }, "Delete") : null, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: save,
      "data-tip": "Save this plant and the field assignments below. Plant and Plant Name are required."
    }, "Save"), /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: () => setEdit(null),
      "data-tip": "Close without saving. Any changes in this form are discarded."
    }, "Cancel"))
  }, /*#__PURE__*/React.createElement("h4", {
    className: "form-sec"
  }, "Identification"), /*#__PURE__*/React.createElement("div", {
    className: "grid2"
  }, /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement(ReqLabel, {
      text: "Plant:"
    }),
    hint: "The site code, e.g. 8H13. Shown wherever a field or grower names its plant."
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: edit.plant,
    onChange: v => setEdit({
      ...edit,
      plant: v
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement(ReqLabel, {
      text: "Plant Name:"
    })
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: edit.name,
    onChange: v => setEdit({
      ...edit,
      name: v
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Area:",
    hint: "The geographic area this plant draws its fields from."
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: edit.area,
    onChange: v => setEdit({
      ...edit,
      area: v
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Growing Location:",
    hint: "Optional GrowLoc label carried onto this plant's nomination rows."
  }, /*#__PURE__*/React.createElement("select", {
    value: edit.growLoc,
    onChange: e => setEdit({
      ...edit,
      growLoc: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select…"), growLocs.map(g => /*#__PURE__*/React.createElement("option", {
    key: g,
    value: g
  }, g))))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Comment:"), /*#__PURE__*/React.createElement("textarea", {
    value: edit.comment ?? "",
    onChange: e => setEdit({
      ...edit,
      comment: e.target.value
    }),
    style: {
      minHeight: 64
    }
  })), /*#__PURE__*/React.createElement("h4", {
    className: "form-sec",
    style: {
      marginTop: 18
    }
  }, "Fields in this plant — crop year ", cropYear, /*#__PURE__*/React.createElement(HelpDot, {
    tip: "Tick the nominated fields that belong to this plant. A field can only be in one plant, so ticking a field here moves it out of its current plant."
  })), noms.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No fields nominated for crop year ", cropYear, " yet. Add them on the Nominations screen, then come back to assign them.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "notice",
    style: {
      marginTop: 0
    }
  }, members.length, " field", members.length === 1 ? "" : "s", " · ", new Set(noms.filter(n => members.indexOf(n.id) !== -1).map(n => n.coop).filter(Boolean)).size, " cooperator(s) selected."), /*#__PURE__*/React.createElement("div", {
    className: "group-members"
  }, /*#__PURE__*/React.createElement("table", {
    className: "manage-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: 40
    },
    "data-tip": "Tick to put the field in this plant."
  }, "In"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Cooperator — the grower who farms the field."
  }, "Cooperator"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Field — the nominated field description."
  }, "Field"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Currently — the plant the field belongs to right now."
  }, "Currently"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Bu/Ac — the field's recorded yield, if it has been harvested."
  }, "Bu/Ac"))), /*#__PURE__*/React.createElement("tbody", null, noms.map(n => {
    const on = members.indexOf(n.id) !== -1;
    const here = n.group === edit.id && !edit._new;
    return /*#__PURE__*/React.createElement("tr", {
      key: n.id,
      className: on ? "selected" : "",
      onClick: () => toggleMember(n.id)
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: on,
      onChange: () => toggleMember(n.id),
      onClick: e => e.stopPropagation()
    })), /*#__PURE__*/React.createElement("td", null, n.coop, " — ", coopName(store, n.coop)), /*#__PURE__*/React.createElement("td", {
      className: "comment",
      style: {
        maxWidth: 280
      }
    }, n.fieldDesc), /*#__PURE__*/React.createElement("td", null, here ? /*#__PURE__*/React.createElement("span", {
      className: "tag"
    }, "This plant") : n.group ? plantLabel(store, n.group) : /*#__PURE__*/React.createElement("span", {
      className: "tag"
    }, "Unassigned")), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, n.buPerAcre > 0 ? fmt(n.buPerAcre) : "—"));
  })))))) : null);
}

/* ================= Cooperators ================= */
function Cooperators({
  store
}) {
  /* Each filter keeps a draft (what the dropdown shows) and an applied value
     (what the table uses). Picking a plant applies it right away rather than
     waiting for Go, which otherwise reads as the filter being ignored. */
  const [plantDraft, setPlantDraft] = useState("all");
  const [coopDraft, setCoopDraft] = useState("");
  const [plant, setPlant] = useState("all");
  const [coop, setCoop] = useState("");
  const [edit, setEdit] = useState(null);
  const plants = storePlants(store);
  const coopPlant = c => plantId(store, c.plant);
  const atPlant = store.state.cooperators.filter(c => plant === "all" || coopPlant(c) === plant);
  const list = atPlant.filter(c => !coop || c.code === coop);
  const blank = {
    code: "",
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    plant: plants[0] ? plants[0].id : "",
    country: "US",
    comment: ""
  };
  const nextCode = String(store.state.cooperators.length + 1).padStart(3, "0");
  const applyFilters = () => {
    setPlant(plantDraft);
    setCoop(coopDraft);
  };
  const changePlant = v => {
    setPlantDraft(v);
    setPlant(v);
    /* Keeping a cooperator number from another plant would leave the table
       empty, so drop it when it no longer belongs to the chosen plant. */
    const keeps = store.state.cooperators.some(c => c.code === coopDraft && (v === "all" || coopPlant(c) === v));
    if (coopDraft && !keeps) {
      setCoopDraft("");
      setCoop("");
    }
  };
  const changeCoop = v => {
    setCoopDraft(v);
    setCoop(v);
  };
  const save = () => {
    const c = edit;
    if (!c.name || !c.plant || !c.address || !c.city) return alert("Cooperator Name, Plant, Address and City are required.");
    let next;
    if (c._new) {
      const code = c.code || String(store.state.cooperators.length + 1).padStart(3, "0");
      next = [...store.state.cooperators, {
        ...c,
        code,
        _new: undefined
      }];
    } else {
      next = store.state.cooperators.map(x => x.code === c.code ? {
        ...c
      } : x);
    }
    store.set({
      cooperators: next
    });
    setEdit(null);
  };
  const doExport = () => exportCSV("cooperators.csv", [["Code", "Name", "Plant", "Address", "City", "State", "Zip", "Phone"], ...list.map(c => [c.code, c.name, plantCode(store, c.plant), c.address, c.city, c.state, c.zip, c.phone])]);
  return /*#__PURE__*/React.createElement("div", {
    className: "manage-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "manage-filters"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Plant:"), /*#__PURE__*/React.createElement("select", {
    value: plantDraft,
    onChange: e => changePlant(e.target.value),
    "data-tip": "Filter the list by plant. The table updates as soon as you pick one. Leave on All to see every cooperator."
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "All"), plants.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.plant, " — ", p.name)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Cooperator Number:"), /*#__PURE__*/React.createElement("select", {
    value: coopDraft,
    onChange: e => changeCoop(e.target.value),
    "data-tip": "Jump to one specific grower by their cooperator number, or choose All. Only growers at the selected plant are listed."
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "All"), atPlant.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.code,
    value: c.code
  }, c.code, " — ", c.name)))), /*#__PURE__*/React.createElement("div", {
    className: "filter-actions"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-go",
    onClick: applyFilters,
    "data-tip": "Apply the Plant and Cooperator filters above to the table."
  }, "Go"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-export",
    onClick: doExport,
    "data-tip": "Download the cooperators currently shown as a CSV spreadsheet."
  }, "Export"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-create",
    onClick: () => setEdit({
      ...blank,
      _new: true
    }),
    "data-tip": "Add a new cooperator. A form opens where you enter their name, address, and contact details."
  }, "+ Create"))), /*#__PURE__*/React.createElement("div", {
    className: "manage-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("h2", null, "Cooperators (", list.length, ")", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Every grower you contract with. Click any row to open it and edit the details."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("table", {
    className: "manage-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Cooperator ID — the unique number assigned to each grower."
  }, "Cooperator ID"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Cooperator Name — the grower or farm business name."
  }, "Cooperator Name"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant — the production site this grower contracts with."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Street — the mailing/physical street address."
  }, "Street"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "City — the town for the address."
  }, "City"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "State/Region — the U.S. state."
  }, "State/Region"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Postal Code — the ZIP code."
  }, "Postal Code"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Country/Region — the country for the address."
  }, "Country/Region"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Telephone — primary contact phone number."
  }, "Telephone"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Comments — free-text notes about this grower."
  }, "Comments"))), /*#__PURE__*/React.createElement("tbody", null, list.map(c => /*#__PURE__*/React.createElement("tr", {
    key: c.code,
    onClick: () => setEdit({
      ...c,
      plant: coopPlant(c),
      country: c.country || "US",
      comment: c.comment || ""
    })
  }, /*#__PURE__*/React.createElement("td", null, c.code), /*#__PURE__*/React.createElement("td", null, c.name), /*#__PURE__*/React.createElement("td", null, plantCode(store, c.plant)), /*#__PURE__*/React.createElement("td", null, c.address), /*#__PURE__*/React.createElement("td", null, c.city), /*#__PURE__*/React.createElement("td", null, stateName(c.state)), /*#__PURE__*/React.createElement("td", null, c.zip), /*#__PURE__*/React.createElement("td", null, countryName(c.country || "US")), /*#__PURE__*/React.createElement("td", null, c.phone), /*#__PURE__*/React.createElement("td", {
    className: "comment"
  }, c.comment || ""))), list.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No cooperators found."))) : null)))), edit ? /*#__PURE__*/React.createElement(Modal, {
    title: edit._new ? "New Cooperator" : "Change Cooperator " + edit.code,
    onClose: () => setEdit(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: save,
      "data-tip": "Save this cooperator. Name, Plant, Address, and City are required."
    }, "Save"), /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: () => setEdit(null),
      "data-tip": "Close without saving. Any changes in this form are discarded."
    }, "Cancel"))
  }, /*#__PURE__*/React.createElement("h4", {
    className: "form-sec"
  }, "Identification"), /*#__PURE__*/React.createElement("div", {
    className: "grid2"
  }, /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement(ReqLabel, {
      text: "Cooperator Name:"
    })
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: edit.name,
    onChange: v => setEdit({
      ...edit,
      name: v
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Cooperator Number:"
  }, /*#__PURE__*/React.createElement("input", {
    className: "locked",
    value: edit._new ? nextCode : edit.code,
    readOnly: true,
    disabled: true,
    tabIndex: -1
  })), /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement(ReqLabel, {
      text: "Plant:"
    }),
    hint: "The production site this grower's fields are nominated under."
  }, /*#__PURE__*/React.createElement("select", {
    value: edit.plant,
    onChange: e => setEdit({
      ...edit,
      plant: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select…"), plants.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.plant, " — ", p.name)))), /*#__PURE__*/React.createElement("div", null)), /*#__PURE__*/React.createElement("h4", {
    className: "form-sec",
    style: {
      marginTop: 18
    }
  }, "General Information"), /*#__PURE__*/React.createElement("div", {
    className: "grid2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement(ReqLabel, {
      text: "Address:"
    })
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: edit.address,
    onChange: v => setEdit({
      ...edit,
      address: v
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement(ReqLabel, {
      text: "City:"
    })
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: edit.city,
    onChange: v => setEdit({
      ...edit,
      city: v
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Country:"
  }, /*#__PURE__*/React.createElement("select", {
    value: edit.country,
    onChange: e => setEdit({
      ...edit,
      country: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select…"), COUNTRIES.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.code,
    value: c.code
  }, c.name)))), /*#__PURE__*/React.createElement(Field, {
    label: "State:"
  }, /*#__PURE__*/React.createElement("select", {
    value: edit.state,
    onChange: e => setEdit({
      ...edit,
      state: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select…"), US_STATES.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s)))), /*#__PURE__*/React.createElement(Field, {
    label: "Zip:"
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: edit.zip,
    onChange: v => setEdit({
      ...edit,
      zip: v
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Telephone Number:"
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: edit.phone,
    onChange: v => setEdit({
      ...edit,
      phone: v
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "field grow"
  }, /*#__PURE__*/React.createElement("label", null, "Comment:"), /*#__PURE__*/React.createElement("textarea", {
    value: edit.comment ?? "",
    onChange: e => setEdit({
      ...edit,
      comment: e.target.value
    })
  }))))) : null);
}

/* ================= Nominations / Selected LCCE Fields ================= */
function Nominations({
  store,
  cropYear,
  go,
  openWeights,
  openYield
}) {
  const [plantDraft, setPlantDraft] = useState("all");
  const [yearDraft, setYearDraft] = useState(String(cropYear));
  const [scenarioDraft, setScenarioDraft] = useState("");
  const [growLocDraft, setGrowLocDraft] = useState("all");
  const [coopDraft, setCoopDraft] = useState("");
  const [plant, setPlant] = useState("all");
  const [year, setYear] = useState(String(cropYear));
  const [scenario, setScenario] = useState("");
  const [growLoc, setGrowLoc] = useState("all");
  const [coop, setCoop] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editSnapshot, setEditSnapshot] = useState(null);
  const [draft, setDraft] = useState(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [filtersPinned, setFiltersPinned] = useState(true);
  // { baseId, pick } — open substitution prompt for an invalidated base field.
  const [backupPrompt, setBackupPrompt] = useState(null);
  const DRAFT_ID = "__draft__";
  const formMode = !!draft || !!editingId;
  const growLocs = useMemo(() => {
    const set = new Set(GROW_LOCS);
    store.state.nominations.forEach(n => {
      if (n.growLoc) set.add(n.growLoc);
    });
    return Array.from(set);
  }, [store.state.nominations]);
  const list = store.state.nominations.filter(n => plant === "all" || n.group === plant).filter(n => year === "all" || String(n.cropYear) === year).filter(n => !scenario || (n.scenario || "Base") === scenario).filter(n => growLoc === "all" || n.growLoc === growLoc).filter(n => !coop || n.coop === coop)
  // Back-ups always sit below the base fields, in their own pool.
  .map((n, i) => [n, i]).sort((a, b) => isBackupField(a[0]) - isBackupField(b[0]) || a[1] - b[1]).map(([n]) => n);
  const blank = () => {
    // Land the new field in the plant being filtered on, falling back to the one
    // that owns the filtered growing location, then to the first plant defined.
    const gs = storePlants(store);
    const g = plant !== "all" && gs.find(x => x.id === plant) || growLoc !== "all" && gs.find(x => x.growLoc && x.growLoc === growLoc) || gs[0];
    return {
      id: DRAFT_ID,
      plant: g ? g.id : "",
      contract: "",
      nom: "",
      coop: "",
      group: g ? g.id : "",
      growLoc: g && g.growLoc || (growLoc !== "all" ? growLoc : GROW_LOCS[0]),
      scenario: scenario || "Base",
      estAcres: "",
      measuredAcres: "",
      country: "US",
      state: "IA",
      township: "",
      section: "",
      fieldDesc: "",
      selected: false,
      pmSelect: false,
      invalid: false,
      invalidReason: "",
      backupActive: false,
      backupFor: "",
      dateHarvested: "",
      hybridBrand: "",
      hybridDesignation: "",
      buPerAcre: 0,
      cropYear: year === "all" ? cropYear : +year,
      status: "Draft"
    };
  };
  const applyFilters = () => {
    setPlant(plantDraft);
    setYear(yearDraft);
    setScenario(scenarioDraft);
    setGrowLoc(growLocDraft);
    setCoop(coopDraft);
    setSelectedId(null);
    setEditingId(null);
    setEditSnapshot(null);
    setDraft(null);
  };
  const patchNom = (id, patch) => {
    store.set({
      nominations: store.state.nominations.map(n => n.id === id ? {
        ...n,
        ...patch
      } : n)
    });
  };
  const patchRow = (n, patch) => {
    if (n.id === DRAFT_ID) setDraft(d => ({
      ...d,
      ...patch
    }));else patchNom(n.id, patch);
  };

  // One functional update so a base field and its stand-in can change together.
  const patchNoms = fn => store.set(s => ({
    nominations: s.nominations.map(fn)
  }));

  // Back-ups a base field could draw on: same location and crop year, harvested,
  // and not already standing in for another field.
  const backupsFor = base => store.state.nominations.filter(r => isBackupField(r) && r.group === base.group && r.cropYear === base.cropYear && !r.invalid && +r.buPerAcre > 0 && (!r.backupActive || r.backupFor === base.id));
  const standInFor = baseId => store.state.nominations.find(r => r.backupActive && r.backupFor === baseId) || null;

  /* Guard rail for the three-field minimum. Un-ticking Bayer Selected, flagging a
     field Invalid, or releasing a stand-in can take a location under the line and
     void its LCCE with nothing on screen to say so, so the crossing is confirmed
     first. Edits that stay above the minimum, or that were already below it, pass
     through untouched. */
  const qualifyingAt = (list, n) => lcceQualifiers(list.filter(r => r.group === n.group && r.cropYear === n.cropYear)).length;
  const confirmLcceDrop = (n, next) => {
    if (!n || !n.group) return true;
    const before = qualifyingAt(store.state.nominations, n);
    const after = qualifyingAt(next, n);
    if (after >= before || before < MIN_LCCE_FIELDS || after >= MIN_LCCE_FIELDS) return true;
    const p = findPlant(store, n.group);
    const where = p ? "Plant " + p.plant + (p.name ? " — " + p.name : "") : "This location";
    return window.confirm(where + " would drop to " + after + " qualifying field" + (after === 1 ? "" : "s") + ".\n\n" + "An LCCE needs at least " + MIN_LCCE_FIELDS + ", because the single highest and lowest yields are " + "discarded before averaging. This location will report no LCCE, and no Final Bushels, until " + "another field qualifies.\n\nContinue anyway?");
  };
  const onSelectedToggle = (n, checked) => {
    if (n.id === DRAFT_ID || checked) return patchRow(n, {
      selected: checked
    });
    const next = store.state.nominations.map(r => r.id === n.id ? {
      ...r,
      selected: false
    } : r);
    if (!confirmLcceDrop(n, next)) return;
    patchNom(n.id, {
      selected: false
    });
  };

  // Releasing a stand-in also clears Bayer Selected, so the checkbox always
  // matches whether the back-up is really in the LCCE average.
  const releaseBackupsOf = baseId => r => r.backupFor === baseId ? {
    ...r,
    backupActive: false,
    backupFor: "",
    selected: false
  } : r;
  const onInvalidToggle = (n, checked) => {
    if (n.id === DRAFT_ID) return patchRow(n, {
      invalid: checked
    });
    if (!checked) {
      // Valid again, so any stand-in goes back to the dormant back-up pool.
      patchNoms(r => r.id === n.id ? {
        ...r,
        invalid: false
      } : releaseBackupsOf(n.id)(r));
      return;
    }
    // An available stand-in can put the count straight back, so the warning is
    // saved for the case where nothing can replace this field.
    const subs = isBackupField(n) ? [] : backupsFor(n);
    const next = store.state.nominations.map(r => r.id === n.id ? {
      ...r,
      invalid: true
    } : r);
    if (!subs.length && !confirmLcceDrop(n, next)) return;
    patchRow(n, {
      invalid: true
    });
    if (subs.length) openBackupPrompt(n.id);
  };
  const openBackupPrompt = baseId => {
    const current = standInFor(baseId);
    setBackupPrompt({
      baseId,
      pick: current ? current.id : ""
    });
  };
  const applyBackupPrompt = () => {
    if (!backupPrompt) return;
    const {
      baseId,
      pick
    } = backupPrompt;
    const next = store.state.nominations.map(r => {
      if (r.id === pick) return {
        ...r,
        backupActive: true,
        backupFor: baseId,
        selected: true
      };
      return releaseBackupsOf(baseId)(r);
    });
    // Choosing no stand-in releases the current one, which can take the location
    // back under the minimum.
    const base = store.state.nominations.find(r => r.id === baseId);
    if (!confirmLcceDrop(base, next)) return;
    store.set({
      nominations: next
    });
    setBackupPrompt(null);
  };
  const fmtDate = d => {
    if (!d) return "";
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return d;
    return `${+m[2]}/${+m[3]}/${m[1].slice(2)}`;
  };

  // An unsaved draft row has no contract yet, so it falls back to plain navigation.
  const openYieldForm = () => {
    const row = store.state.nominations.find(n => n.id === (editingId || selectedId));
    if (openYield && row) openYield(row.contract);else if (go) go("yield");
  };
  const onCreate = () => {
    setEditingId(null);
    setEditSnapshot(null);
    setDraft(blank());
    setSelectedId(DRAFT_ID);
  };
  const onEdit = () => {
    if (!selectedId || selectedId === DRAFT_ID) return alert("Select a field row first.");
    const row = store.state.nominations.find(n => n.id === selectedId);
    if (!row) return;
    setDraft(null);
    setEditSnapshot({
      ...row
    });
    setEditingId(selectedId);
  };
  const onCancel = () => {
    if (draft) {
      setDraft(null);
      setSelectedId(null);
      return;
    }
    if (editingId && editSnapshot) {
      patchNom(editingId, editSnapshot);
      setEditingId(null);
      setEditSnapshot(null);
    }
  };
  const onSave = () => {
    if (draft) {
      if (!draft.coop) return alert("Cooperator is required.");
      if (!draft.measuredAcres || !draft.township || !draft.state || !draft.section || !draft.fieldDesc) {
        return alert("Measured Area, Township, State, Section, and Field Description are required.");
      }
      const contract = draft.contract || String(300000 + store.state.nominations.length + 1);
      const next = {
        ...draft,
        id: uid(),
        contract,
        nom: draft.nom || String(store.state.nominations.length + 1)
      };
      store.set({
        nominations: [...store.state.nominations, next]
      });
      setDraft(null);
      setSelectedId(next.id);
      return;
    }
    if (editingId) {
      setEditingId(null);
      setEditSnapshot(null);
    }
  };
  const doExport = () => exportCSV("selected_lcce_fields.csv", [["Cooperator Name", "Nomination ID", "Plant", "Growing Location", "Scenario", "Measured Area", "Township", "State", "Section", "Field Description", "Date Harvested", "Bayer Selected", "Invalid", "Invalidation Reason"], ...list.map(n => [coopName(store, n.coop), n.nom, plantCode(store, n.group), n.growLoc, n.scenario || "Base", n.measuredAcres, n.township, n.state, n.section, n.fieldDesc, n.dateHarvested, n.selected ? "Y" : "N", n.invalid ? "Y" : "N", n.invalidReason || ""])]);
  const renderCell = (n, key, opts = {}) => {
    const editing = n.id === DRAFT_ID || editingId === n.id;
    const val = n[key] ?? "";
    if (!editing) {
      if (key === "dateHarvested") return fmtDate(val);
      if (key === "measuredAcres") return val === "" || val === null || val === undefined ? "" : fmt(val, 0) + " - Acres";
      return val;
    }
    if (opts.type === "select") {
      return /*#__PURE__*/React.createElement("select", {
        value: val,
        onChange: e => patchRow(n, {
          [key]: e.target.value
        })
      }, opts.options.map(o => /*#__PURE__*/React.createElement("option", {
        key: o.value ?? o,
        value: o.value ?? o
      }, o.label ?? o)));
    }
    return /*#__PURE__*/React.createElement("input", {
      type: opts.type || "text",
      className: opts.wide ? "cell-wide" : undefined,
      value: val,
      onChange: e => patchRow(n, {
        [key]: e.target.value
      })
    });
  };

  // The Status cell has to justify itself: what the state means, what put the
  // field there, and what moves it on. Statuses only ever change through the
  // Weight / Yield Check / Status screens, so the row itself stays read-only.
  const statusTip = n => {
    if (n.id === DRAFT_ID) return "New field — nothing is saved yet. Save it and it starts out as Draft.";
    const loads = store.state.tickets.filter(t => t.contract === n.contract).length;
    const ticketCount = loads + " scale ticket" + (loads === 1 ? "" : "s");
    const posted = fmt(n.buPerAcre) + " bu/ac";
    const state = {
      Draft: "Draft — nominated, but no yield has been posted yet. " + (loads ? ticketCount + " entered so far." : "No scale tickets entered yet."),
      Submitted: "Submitted — a yield of " + posted + " was posted from " + ticketCount + ", but nobody has signed the report.",
      QC: "QC — the Yield Check report was signed at " + posted + " and is waiting on review.",
      Approved: "Approved — the Yield Check was reviewed and approved at " + posted + "."
    }[n.status] || "Status " + (n.status || "unknown") + " — not a recognised workflow state.";
    // An invalid field is out of the running, so it gets no next step to chase.
    const next = n.invalid ? "" : {
      Draft: " Post a yield from the Weight page to move it to Submitted.",
      Submitted: " Sign & Send to QC on the Yield Check page moves it on.",
      QC: " Approve it from the Yield Check or Status page to finish.",
      Approved: " Final unless someone uses Return to QC."
    }[n.status] || "";
    const standing = n.invalid ? " Marked Invalid" + (n.invalidReason ? " (" + n.invalidReason + ")" : "") + ", so it stays out of the LCCE average whatever its status." : isBackupField(n) ? n.backupActive ? " Back-up standing in for an invalid field, so it counts toward the LCCE average." : " Back-up held in reserve — out of the LCCE average until it is activated." : !n.selected ? " Not Bayer Selected, so it is out of the LCCE average and stays off the Weight page until it is ticked." : "";
    return state + next + standing;
  };
  const renderFieldRow = (n, rowNum) => {
    const editing = n.id === DRAFT_ID || editingId === n.id;
    const isDraft = n.id === DRAFT_ID;
    return /*#__PURE__*/React.createElement("tr", {
      key: n.id,
      className: selectedId === n.id ? "selected" : "",
      onClick: () => {
        if (formMode && !editing) return;
        setSelectedId(n.id);
        if (editingId && editingId !== n.id) {
          setEditingId(null);
          setEditSnapshot(null);
        }
      }
    }, /*#__PURE__*/React.createElement("td", {
      className: "sel",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "selField",
      checked: selectedId === n.id,
      onChange: () => {
        if (formMode && !editing) return;
        setSelectedId(n.id);
        if (editingId && editingId !== n.id) {
          setEditingId(null);
          setEditSnapshot(null);
        }
      }
    })), /*#__PURE__*/React.createElement("td", {
      className: "rownum",
      onClick: e => e.stopPropagation()
    }, n.invalid && !isDraft && !isBackupField(n) ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "sub-link",
      onClick: () => openBackupPrompt(n.id),
      "data-tip": "This field is invalid, so it gave up its number. Choose a back-up field to stand in for it in the LCCE average."
    }, standInFor(n.id) ? "Sub " + standInFor(n.id).nom : "Sub…") : rowNum ?? ""), /*#__PURE__*/React.createElement("td", {
      className: "statuscell",
      "data-tip": statusTip(n)
    }, /*#__PURE__*/React.createElement(StatusBadge, {
      status: isDraft ? "Draft" : n.status || "Draft"
    })), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, editing ? /*#__PURE__*/React.createElement("select", {
      value: n.coop || "",
      onChange: e => patchRow(n, {
        coop: e.target.value
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }), store.state.cooperators.map(c => /*#__PURE__*/React.createElement("option", {
      key: c.code,
      value: c.code
    }, c.name))) : coopName(store, n.coop)), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, renderCell(n, "nom")), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, editing ? /*#__PURE__*/React.createElement("select", {
      value: n.group || "",
      onChange: e => {
        const p = findPlant(store, e.target.value);
        patchRow(n, {
          group: e.target.value,
          plant: e.target.value,
          growLoc: p && p.growLoc || n.growLoc || ""
        });
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }), storePlants(store).map(p => /*#__PURE__*/React.createElement("option", {
      key: p.id,
      value: p.id
    }, p.plant, " — ", p.name))) : plantCode(store, n.group)), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, editing ? /*#__PURE__*/React.createElement("select", {
      value: n.scenario || "Base",
      onChange: e => patchRow(n, {
        scenario: e.target.value
      })
    }, SCENARIOS.map(s => /*#__PURE__*/React.createElement("option", {
      key: s,
      value: s
    }, s))) : /*#__PURE__*/React.createElement("span", {
      className: "scenario-cell"
    }, n.scenario || "Base", isBackupField(n) ? n.backupActive ? /*#__PURE__*/React.createElement("span", {
      className: "badge bkp-on",
      "data-tip": "Activated — this back-up is standing in for an invalid base field and counts toward the LCCE average."
    }, "In LCCE") : /*#__PURE__*/React.createElement("span", {
      className: "badge bkp",
      "data-tip": "Back-up field — held in reserve and left out of the LCCE average until an operator pulls it in to replace an invalid base field."
    }, "Back-up") : null)), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, renderCell(n, "measuredAcres", {
      type: "number"
    })), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, renderCell(n, "township")), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, renderCell(n, "state", {
      type: "select",
      options: US_STATES.map(s => ({
        value: s,
        label: s
      }))
    })), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, renderCell(n, "section")), /*#__PURE__*/React.createElement("td", {
      className: "desc",
      onClick: e => editing && e.stopPropagation()
    }, renderCell(n, "fieldDesc", {
      wide: true
    })), /*#__PURE__*/React.createElement("td", {
      onClick: e => editing && e.stopPropagation()
    }, editing ? /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: n.dateHarvested || "",
      onChange: e => patchRow(n, {
        dateHarvested: e.target.value
      })
    }) : fmtDate(n.dateHarvested)), /*#__PURE__*/React.createElement("td", {
      onClick: e => e.stopPropagation(),
      "data-tip": isBackupField(n) ? "Back-up field — this ticks itself only when the back-up is pulled in to replace an invalid base field, and clears when it is released." : undefined
    }, isBackupField(n) ? /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!n.backupActive,
      disabled: true,
      readOnly: true,
      "aria-label": "Bayer Selected (set by back-up activation)"
    }) : /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!n.selected,
      onChange: e => onSelectedToggle(n, e.target.checked)
    })), /*#__PURE__*/React.createElement("td", {
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!n.invalid,
      onChange: e => onInvalidToggle(n, e.target.checked)
    })), /*#__PURE__*/React.createElement("td", {
      onClick: e => e.stopPropagation()
    }, editing || n.invalid ? /*#__PURE__*/React.createElement("select", {
      value: n.invalidReason || "",
      onChange: e => patchRow(n, {
        invalidReason: e.target.value
      }),
      disabled: !n.invalid && !editing
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }), INVALID_REASONS.map(r => /*#__PURE__*/React.createElement("option", {
      key: r,
      value: r
    }, r))) : n.invalidReason || ""));
  };
  const displayCount = list.length + (draft ? 1 : 0);

  // Invalid fields keep their row but give up their number, so the numbering
  // stays a gapless count of the fields that still count toward LCCE.
  let counted = 0;
  const rowNumbers = list.map(n => n.invalid ? null : ++counted);
  const backupCount = list.filter(isBackupField).length;
  const activeBackupCount = list.filter(n => isBackupField(n) && n.backupActive).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "fields-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fields-page-hd"
  }, /*#__PURE__*/React.createElement("h2", null, "Selected LCCE Fields", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "The heart of the LCCE process: nominate fields, mark which are Bayer-selected, flag invalid ones, and record harvest data."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "fields-filters" + (filtersCollapsed && !filtersPinned ? " collapsed" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement(ReqLabel, {
    text: "Plant:"
  })), /*#__PURE__*/React.createElement("select", {
    value: plantDraft,
    onChange: e => setPlantDraft(e.target.value),
    "data-tip": "Required filter — the plant whose fields you want to work with."
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "All"), storePlants(store).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.plant, " — ", p.name)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement(ReqLabel, {
    text: "Crop Year:"
  })), /*#__PURE__*/React.createElement("select", {
    value: yearDraft,
    onChange: e => setYearDraft(e.target.value),
    "data-tip": "Required filter — the harvest year to load. Use 2026 for the sample data."
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "All"), CROP_YEARS.map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: String(y)
  }, y)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Scenario:"), /*#__PURE__*/React.createElement("select", {
    value: scenarioDraft,
    onChange: e => setScenarioDraft(e.target.value),
    "data-tip": "Optional — narrow to a planning scenario (Base or Alternate). Leave blank for all."
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }), SCENARIOS.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Growing Location:"), /*#__PURE__*/React.createElement("select", {
    value: growLocDraft,
    onChange: e => setGrowLocDraft(e.target.value),
    "data-tip": "Optional — narrow to one growing location label. The plant filter above is what decides which fields are averaged together."
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "All"), growLocs.map(g => /*#__PURE__*/React.createElement("option", {
    key: g,
    value: g
  }, g)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Cooperator:"), /*#__PURE__*/React.createElement("select", {
    value: coopDraft,
    onChange: e => setCoopDraft(e.target.value),
    "data-tip": "Optional — show only fields belonging to one grower."
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }), store.state.cooperators.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.code,
    value: c.code
  }, c.code, " — ", c.name)))), /*#__PURE__*/React.createElement("div", {
    className: "filter-go"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-go",
    onClick: applyFilters,
    "data-tip": "Apply the filters above and load the matching fields into the table."
  }, "Go"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-export",
    onClick: doExport,
    "data-tip": "Export the fields shown to a CSV spreadsheet."
  }, "Export"))), /*#__PURE__*/React.createElement("div", {
    className: "fields-divider"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": filtersCollapsed ? "Expand filters" : "Collapse filters",
    "data-tip": filtersPinned ? "Filters are pinned open. Unpin them first (pin button) to allow collapsing." : filtersCollapsed ? "Show the filter bar again." : "Hide the filter bar to make more room for the table.",
    onClick: () => {
      if (!filtersPinned) setFiltersCollapsed(v => !v);
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, filtersCollapsed && !filtersPinned ? /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }) : /*#__PURE__*/React.createElement("polyline", {
    points: "18 15 12 9 6 15"
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": filtersPinned ? "Unpin filters" : "Pin filters",
    "data-tip": filtersPinned ? "Filters are pinned open so they always stay visible. Click to unpin and allow collapsing." : "Pin the filter bar so it stays open.",
    onClick: () => setFiltersPinned(v => !v),
    style: filtersPinned ? {
      color: "#0070f2",
      borderColor: "#0070f2"
    } : undefined
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 17v5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 10.76V3h6v7.76l3 3.24H6l3-3.24z"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "fields-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("h2", null, "Selected Fields (", displayCount, ")", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Each row is a nominated field. Select a row with its radio button, then use Edit or Weights. Required columns are marked with *."
  })), /*#__PURE__*/React.createElement("div", {
    className: "hd-actions"
  }, formMode ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-save",
    onClick: onSave,
    "data-tip": "Save the new or edited field. Measured Area, Township, State, Section, and Field Description are required."
  }, "Save"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onCancel,
    "data-tip": "Discard changes and leave edit mode without saving."
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openYieldForm,
    "data-tip": "Open the Yield Check report to review and sign the calculated yield."
  }, "Yield Check Form")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onCreate,
    "data-tip": "Add a new field nomination as an editable row at the top of the table."
  }, "Create"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onEdit,
    disabled: !selectedId,
    "data-tip": "Edit the selected field row inline. Select a row first using its radio button."
  }, "Edit"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => openWeights ? openWeights(selectedId) : go && go("tickets"),
    disabled: !selectedId && !!openWeights,
    "data-tip": "Open the Weight / Scale Tickets page for the selected field to enter load weights and moisture."
  }, "Weights"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openYieldForm,
    "data-tip": "Open the Yield Check report to review and sign the calculated yield."
  }, "Yield Check Form"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "icon-btn",
    "aria-label": "Settings",
    "data-tip": "Table settings."
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.1.7.7 1.2 1.5 1.3H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("table", {
    className: "fields-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "sel",
    "data-tip": "Select a single field row here, then use Edit or Weights above."
  }), /*#__PURE__*/React.createElement("th", {
    className: "rownum",
    "data-tip": "Number — the field's place in the list. Invalid fields give up their number and everything below moves up. Back-up (Alternate) fields are numbered last."
  }, "Number"), /*#__PURE__*/React.createElement("th", {
    className: "statuscol",
    "data-tip": "Status — where this field sits in the workflow: Draft → Submitted → QC → Approved. Hover a badge to see what put the field in that state and what moves it on."
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Cooperator Name — the grower who farms this field."
  }, "Cooperator Name"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Nomination ID — the identifier for this field nomination."
  }, "Nomination ID"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant — the production site this field is nominated under and averaged within."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Scenario — Base or Alternate planning scenario."
  }, "Scenario"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Measured Area (required) — the field's measured acres, used to convert bushels into bu/acre yield."
  }, "Measured Area", /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Township (required) — the township location of the field."
  }, "Township", /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("th", {
    "data-tip": "State (required) — the U.S. state the field is in."
  }, "State", /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Section (required) — the section number within the township."
  }, "Section", /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Field Description (required) — a name or landmark so people can identify the field."
  }, "Field Description", /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Date Harvested — when the field was harvested. Fields not harvested by Nov 15 may be invalidated."
  }, "Date Harvested"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Bayer Selected — tick to include this field in the LCCE average. Back-up (Alternate) fields also need activating from an invalid base field before they count."
  }, "Bayer Selected"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Invalid — tick to exclude this field (e.g. weather damage). Excluded fields don't count toward LCCE."
  }, "Invalid"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Invalidation Reason — required when a field is marked Invalid; explains why it was excluded."
  }, "Invalidation Reason"))), /*#__PURE__*/React.createElement("tbody", null, draft ? renderFieldRow(draft) : null, list.map((n, i) => renderFieldRow(n, rowNumbers[i])), list.length === 0 && !draft ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No selected fields found."))) : null)), backupCount ? /*#__PURE__*/React.createElement("p", {
    className: "notice"
  }, backupCount, " Alternate field", backupCount === 1 ? "" : "s", " sit", backupCount === 1 ? "s" : "", " at the bottom as a back-up pool and ", backupCount === 1 ? "is" : "are", " left out of the LCCE average", activeBackupCount ? " (" + activeBackupCount + " pulled in to replace an invalid field)" : "", ". Marking a base field Invalid offers a back-up to stand in for it.") : null)), backupPrompt ? (() => {
    const base = store.state.nominations.find(n => n.id === backupPrompt.baseId);
    if (!base) return null;
    const options = backupsFor(base);
    return /*#__PURE__*/React.createElement(Modal, {
      title: "Replace invalid field with a back-up?",
      onClose: () => setBackupPrompt(null),
      wide: true,
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "btn sec",
        onClick: () => setBackupPrompt(null)
      }, "Not now"), /*#__PURE__*/React.createElement("button", {
        className: "btn",
        onClick: applyBackupPrompt
      }, backupPrompt.pick ? "Use this back-up" : "Leave back-ups out"))
    }, /*#__PURE__*/React.createElement("p", {
      className: "notice",
      style: {
        marginTop: 0
      }
    }, /*#__PURE__*/React.createElement("b", null, base.nom, " — ", base.fieldDesc), " (", coopName(store, base.coop), ") is now Invalid, so it no longer counts toward ", plantLabel(store, base.group), ". Pick a back-up field to take its place in the LCCE average, or leave the back-up pool untouched."), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null), /*#__PURE__*/React.createElement("th", {
      "data-tip": "Cooperator who farms the back-up field."
    }, "Cooperator"), /*#__PURE__*/React.createElement("th", {
      "data-tip": "Nomination ID of the back-up field."
    }, "Nomination"), /*#__PURE__*/React.createElement("th", {
      "data-tip": "Field description of the back-up."
    }, "Field Description"), /*#__PURE__*/React.createElement("th", {
      "data-tip": "Date the back-up field was harvested."
    }, "Harvested"), /*#__PURE__*/React.createElement("th", {
      className: "right",
      "data-tip": "Yield the back-up would contribute to the LCCE average."
    }, "Bu/Ac"))), /*#__PURE__*/React.createElement("tbody", null, options.map(r => /*#__PURE__*/React.createElement("tr", {
      key: r.id,
      onClick: () => setBackupPrompt(p => ({
        ...p,
        pick: r.id
      })),
      style: {
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "backupPick",
      checked: backupPrompt.pick === r.id,
      onChange: () => setBackupPrompt(p => ({
        ...p,
        pick: r.id
      }))
    })), /*#__PURE__*/React.createElement("td", null, coopName(store, r.coop)), /*#__PURE__*/React.createElement("td", null, r.nom), /*#__PURE__*/React.createElement("td", null, r.fieldDesc), /*#__PURE__*/React.createElement("td", null, fmtDate(r.dateHarvested)), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, /*#__PURE__*/React.createElement("b", null, fmt(r.buPerAcre))))), /*#__PURE__*/React.createElement("tr", {
      onClick: () => setBackupPrompt(p => ({
        ...p,
        pick: ""
      })),
      style: {
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "backupPick",
      checked: !backupPrompt.pick,
      onChange: () => setBackupPrompt(p => ({
        ...p,
        pick: ""
      }))
    })), /*#__PURE__*/React.createElement("td", {
      colSpan: "5"
    }, "None — leave this location one field short")))));
  })() : null);
}

/* ================= Weight / Scale Tickets ================= */
function parseNum(v) {
  if (v === "" || v === null || v === undefined) return "";
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? "" : n;
}
function sanitizeDecimal(v) {
  let s = String(v ?? "").replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  return s;
}
function MoistureInput({
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "pct-input"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "decimal",
    value: value === "" || value === null || value === undefined ? "" : String(value),
    onChange: e => onChange(sanitizeDecimal(e.target.value)),
    "aria-label": "Moisture percentage"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pct-suffix",
    "aria-hidden": "true"
  }, "%"));
}
function ScaleTickets({
  store,
  cropYear,
  go,
  nomId,
  setNomId
}) {
  // Back-ups are unticked until activated, but their loads still need entering,
  // so they stay available here.
  const noms = store.state.nominations.filter(n => n.cropYear === cropYear && !n.invalid && (n.selected || isBackupField(n)));
  const nom = nomId && store.state.nominations.find(n => n.id === nomId) || noms[0] || null;
  const contract = nom ? nom.contract : "";
  const tickets = store.state.tickets.filter(t => t.contract === contract);
  const blank = {
    ticket: "",
    moisture: "",
    gross: "",
    tare: "",
    test: "",
    elevator: ELEVATORS[0]
  };
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState({});
  const [partsCollapsed, setPartsCollapsed] = useState(false);
  const [partsPinned, setPartsPinned] = useState(true);
  const [simOpen, setSimOpen] = useState(false);
  useEffect(() => {
    if (nom && nom.id !== nomId && setNomId) setNomId(nom.id);
  }, [nom && nom.id]);
  useEffect(() => {
    setSelected({});
    setDraft(null);
    setEditing(false);
    setRows([]);
  }, [contract]);
  const displayTickets = editing ? rows : tickets;
  const formOpen = editing || !!draft;
  const toggleSel = id => setSelected(s => ({
    ...s,
    [id]: !s[id]
  }));
  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  const allSelected = displayTickets.length > 0 && displayTickets.every(t => selected[t.id]);
  const beginEdit = () => {
    setRows(tickets.map(t => ({
      ...t
    })));
    setEditing(true);
  };
  const onEdit = () => {
    if (!nom) return;
    beginEdit();
  };
  const nextTicketId = () => {
    const existing = [...(editing ? rows : tickets).map(t => String(t.ticket || "").trim()), draft ? String(draft.ticket || "").trim() : ""].filter(Boolean);
    let n = existing.length + 1;
    let id = "A" + n;
    while (existing.includes(id)) {
      n += 1;
      id = "A" + n;
    }
    return id;
  };
  const onCreate = () => {
    if (!contract) return alert("Select a field first.");
    if (!editing) beginEdit();
    setDraft({
      ...blank,
      ticket: nextTicketId()
    });
  };
  const patchRow = (id, patch) => {
    setRows(list => list.map(r => r.id === id ? {
      ...r,
      ...patch
    } : r));
  };
  const normalizeTicket = t => ({
    id: t.id,
    contract,
    ticket: String(t.ticket || "").trim(),
    moisture: parseNum(t.moisture),
    gross: parseNum(t.gross),
    tare: parseNum(t.tare),
    test: parseNum(t.test),
    elevator: t.elevator || ELEVATORS[0]
  });
  const onSave = () => {
    if (!contract) return alert("Select a field first.");
    const working = (editing ? rows : tickets).map(t => ({
      ...t
    }));
    if (draft) {
      if (!String(draft.ticket || "").trim()) {
        return alert("Enter a Scale Ticket # in the Scale Ticket column (for example A1), then Save.");
      }
      working.push({
        ...draft,
        id: uid()
      });
    }
    for (let i = 0; i < working.length; i++) {
      if (!String(working[i].ticket || "").trim()) {
        return alert("Enter a Scale Ticket # on line " + (i + 1) + " (Scale Ticket column), then Save.");
      }
    }
    const saved = working.map(t => normalizeTicket(t));
    store.set(s => ({
      tickets: [...s.tickets.filter(t => t.contract !== contract), ...saved]
    }));
    setDraft(null);
    setEditing(false);
    setRows([]);
    setSelected({});
  };
  const onCancel = () => {
    setDraft(null);
    setEditing(false);
    setRows([]);
    setSelected({});
  };
  const onDeleteSelected = () => {
    if (!selectedIds.length) return;
    if (!confirm("Delete " + selectedIds.length + " scale ticket(s)?")) return;
    const drop = new Set(selectedIds);
    if (editing) {
      setRows(list => list.filter(t => !drop.has(t.id)));
      if (draft && drop.has("__draft__")) setDraft(null);
    } else {
      store.set(s => ({
        tickets: s.tickets.filter(t => !drop.has(t.id))
      }));
    }
    setSelected({});
  };
  const onDeleteWeight = () => {
    if (!nom) return;
    if (!confirm("Delete all scale tickets for this field?")) return;
    store.set(s => ({
      tickets: s.tickets.filter(t => t.contract !== contract)
    }));
    setSelected({});
    setDraft(null);
    setEditing(false);
    setRows([]);
  };
  const totalNet = tickets.reduce((s, t) => s + netWeight(t.gross, t.tare), 0);
  const totalAdj = tickets.reduce((s, t) => s + adjustedWeight(t.gross, t.tare, t.moisture), 0);
  const totalBu = tickets.reduce((s, t) => s + ticketBushels(t), 0);
  const yieldPerAc = nom ? contractYield(tickets, nom.measuredAcres) : null;
  const postableYield = yieldPerAc !== null ? Math.round(yieldPerAc) : null;
  const alreadyPosted = !!nom && postableYield !== null && +nom.buPerAcre === postableYield;

  // Simulate Assembly: preview how the individual scale-ticket loads combine
  // into a delivery, grouped by destination elevator. Moisture is combined as a
  // net-weight-weighted average so the shrink reflects the pooled load.
  const buildAssembly = () => {
    const byElevator = {};
    tickets.forEach(t => {
      const key = t.elevator || "—";
      const net = netWeight(t.gross, t.tare);
      const g = byElevator[key] || (byElevator[key] = {
        elevator: key,
        loads: 0,
        net: 0,
        adj: 0,
        moistWeighted: 0
      });
      g.loads += 1;
      g.net += net;
      g.adj += adjustedWeight(t.gross, t.tare, t.moisture);
      g.moistWeighted += (+t.moisture || 0) * net;
    });
    return Object.values(byElevator).map(g => ({
      ...g,
      moisture: g.net > 0 ? g.moistWeighted / g.net : 0,
      bushels: g.adj / LBS_PER_BU
    })).sort((a, b) => b.bushels - a.bushels);
  };
  const assembly = simOpen ? buildAssembly() : [];
  const avgMoisture = totalNet > 0 ? tickets.reduce((s, t) => s + (+t.moisture || 0) * netWeight(t.gross, t.tare), 0) / totalNet : 0;
  const postYield = () => {
    if (!nom || yieldPerAc === null) return;
    const rounded = Math.round(yieldPerAc);
    store.set({
      nominations: store.state.nominations.map(n => n.id === nom.id ? {
        ...n,
        buPerAcre: rounded,
        status: n.status === "Draft" ? "Submitted" : n.status
      } : n)
    });
    alert("Posted yield of " + rounded + " bu/ac to nomination " + nom.nom + ".");
  };
  const doExport = () => {
    if (!nom || !tickets.length) return alert("There are no saved scale tickets to export for this field.");
    const rows = [["Scale Ticket", "Gross Weight (lbs)", "Tare Weight (lbs)", "Moisture %", "Net Weight (lbs)", "Moisture-Adjusted (lbs)", "Test Weight", "Bushels", "Elevator"], ...tickets.map(t => [t.ticket, t.gross, t.tare, t.moisture, Math.round(netWeight(t.gross, t.tare)), Math.round(adjustedWeight(t.gross, t.tare, t.moisture)), t.test, ticketBushels(t).toFixed(1), t.elevator]), [], ["Totals", "", "", "", Math.round(totalNet), Math.round(totalAdj), "", totalBu.toFixed(1), ""], ["Measured Acres", nom.measuredAcres], ["Yield (bu/ac)", yieldPerAc !== null ? yieldPerAc.toFixed(1) : ""]];
    exportCSV("scale_tickets_" + (contract || "field") + ".csv", rows);
  };
  const hybrid = nom ? [nom.hybridBrand, nom.hybridDesignation].filter(Boolean).join(" ") : "";
  const showParts = !partsCollapsed || partsPinned;
  return /*#__PURE__*/React.createElement("div", {
    className: "weight-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "weight-crumb"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go && go("nominations"),
    "data-tip": "Go back to Selected LCCE Fields (Nominations)."
  }, "Selected LCCE Fields"), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("span", {
    className: "here"
  }, "Weight")), /*#__PURE__*/React.createElement("div", {
    className: "weight-hd"
  }, /*#__PURE__*/React.createElement("h2", null, "Weight", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Enter every scale-ticket load for this field. The app adds up net weight, applies moisture shrink, and converts to bushels and bu/acre yield."
  })), /*#__PURE__*/React.createElement("div", {
    className: "weight-actions"
  }, formOpen ? null : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-outline",
    onClick: onDeleteWeight,
    disabled: !nom || !tickets.length,
    "data-tip": "Delete every scale ticket recorded for this field. This cannot be undone."
  }, "Delete"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-outline",
    onClick: () => setSimOpen(true),
    disabled: !nom || !tickets.length,
    "data-tip": "Simulate Assembly — preview how this field's loads combine into a pooled delivery, grouped by elevator, with weighted moisture and projected yield."
  }, "Simulate Assembly")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-export",
    disabled: !nom || !tickets.length,
    "data-tip": "Download this field's scale tickets (weights, moisture, bushels) as a CSV spreadsheet.",
    onClick: doExport
  }, "Export"))), noms.length > 1 ? /*#__PURE__*/React.createElement("div", {
    className: "weight-contract"
  }, "Field:", /*#__PURE__*/React.createElement("select", {
    value: nom ? nom.id : "",
    onChange: e => setNomId && setNomId(e.target.value),
    "data-tip": "Switch which selected field's scale tickets you're viewing or editing."
  }, noms.map(n => /*#__PURE__*/React.createElement("option", {
    key: n.id,
    value: n.id
  }, "[", n.status || "Draft", "] ", n.nom, " — ", coopName(store, n.coop), " (", n.fieldDesc, ")")))) : null, nom ? /*#__PURE__*/React.createElement("div", {
    className: "weight-meta"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Crop Year — the harvest year these tickets belong to.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("b", null, "Crop Year:"), " ", /*#__PURE__*/React.createElement("span", null, nom.cropYear)), /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Plant — the production site this field is nominated under.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("b", null, "Plant:"), " ", /*#__PURE__*/React.createElement("span", null, plantLabel(store, nom.group))), /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Nomination — the field nomination these scale tickets are recorded against.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("b", null, "Nomination:"), " ", /*#__PURE__*/React.createElement("span", null, nom.nom))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Cooperator — the grower who farms this field.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("b", null, "Cooperator:"), " ", /*#__PURE__*/React.createElement("span", null, coopName(store, nom.coop))), /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Field Name — the description used to identify this field.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("b", null, "Field Name:"), " ", /*#__PURE__*/React.createElement("span", null, nom.fieldDesc || "—"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Hybrid — the corn hybrid planted in this field.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("b", null, "Hybrid:"), " ", /*#__PURE__*/React.createElement("span", null, nom.hybridDesignation || hybrid || "—")), /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Hybrid Description — the full brand and designation of the hybrid.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("b", null, "Hybrid Description:"), " ", /*#__PURE__*/React.createElement("span", null, hybrid || "—")))) : /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No selected LCCE field available for this crop year."), /*#__PURE__*/React.createElement("div", {
    className: "fields-divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "weight-parts"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("h2", null, "Product Parts", /*#__PURE__*/React.createElement(HelpDot, {
    tip: "Each row is one scale-ticket load delivered to an elevator. Click Create to add a load, fill in the weights and moisture, then Save."
  })), /*#__PURE__*/React.createElement("div", {
    className: "weight-parts-tools"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": partsCollapsed ? "Expand" : "Collapse",
    "data-tip": partsPinned ? "The table is pinned open. Unpin it first to allow collapsing." : partsCollapsed ? "Show the Product Parts table again." : "Collapse the Product Parts table to save space.",
    onClick: () => {
      if (!partsPinned) setPartsCollapsed(v => !v);
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, partsCollapsed && !partsPinned ? /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }) : /*#__PURE__*/React.createElement("polyline", {
    points: "18 15 12 9 6 15"
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": partsPinned ? "Unpin" : "Pin",
    "data-tip": partsPinned ? "The table is pinned open so it always stays visible. Click to unpin." : "Pin the Product Parts table so it stays open.",
    onClick: () => setPartsPinned(v => !v),
    style: partsPinned ? {
      color: "#0070f2",
      borderColor: "#0070f2"
    } : undefined
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 17v5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 10.76V3h6v7.76l3 3.24H6l3-3.24z"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "hd-actions"
  }, formOpen ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-save",
    onClick: onSave,
    "data-tip": "Save all rows in the table for this field. Each row needs a Scale Ticket number."
  }, "Save"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onCancel,
    "data-tip": "Discard your changes and leave edit mode without saving."
  }, "Cancel")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onCreate,
    disabled: !nom,
    "data-tip": "Add a new scale-ticket row as an editable line. The ticket number is pre-filled (A1, A2…) and can be changed."
  }, "Create"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onEdit,
    disabled: !nom || !tickets.length,
    "data-tip": "Edit the existing scale tickets for this field inline. Available once the field has at least one scale ticket."
  }, "Edit"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDeleteSelected,
    disabled: !selectedIds.length,
    "data-tip": "Delete the rows whose checkboxes are ticked. Select at least one row first."
  }, "Delete")))), showParts ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("table", {
    className: "weight-table"
  }, /*#__PURE__*/React.createElement("colgroup", null, /*#__PURE__*/React.createElement("col", {
    className: "col-sel"
  }), /*#__PURE__*/React.createElement("col", {
    className: "col-line"
  }), /*#__PURE__*/React.createElement("col", {
    className: "col-ticket"
  }), /*#__PURE__*/React.createElement("col", {
    className: "col-num"
  }), /*#__PURE__*/React.createElement("col", {
    className: "col-num"
  }), /*#__PURE__*/React.createElement("col", {
    className: "col-moist"
  }), /*#__PURE__*/React.createElement("col", {
    className: "col-num"
  }), /*#__PURE__*/React.createElement("col", {
    className: "col-num"
  }), /*#__PURE__*/React.createElement("col", {
    className: "col-elev"
  })), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "sel"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: allSelected,
    onChange: e => {
      if (e.target.checked) {
        const next = {};
        displayTickets.forEach(t => {
          next[t.id] = true;
        });
        setSelected(next);
      } else setSelected({});
    },
    "aria-label": "Select all"
  })), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Line — the sequential number of this load in the list."
  }, "Line"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Scale Ticket — the ticket number from the elevator for this load. Required on every row."
  }, "Scale Ticket"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Gross Weight — total weight of the truck plus grain when it arrived (lbs)."
  }, "Gross Weight"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Tare Weight — weight of the empty truck (lbs). Gross minus Tare gives net grain weight."
  }, "Tare Weight"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Moisture % — grain moisture. Above 15%, weight is shrunk 1.4% per point when converting to bushels."
  }, "Moisture %"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Net Weight — automatically calculated as Gross − Tare. This column is not editable."
  }, "Net Weight"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Test Weight — grain density in lbs per bushel; a grain-quality measure."
  }, "Test Weight"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Elevator Name — where this load was delivered."
  }, "Elevator Name"))), /*#__PURE__*/React.createElement("tbody", null, displayTickets.map((t, i) => /*#__PURE__*/React.createElement("tr", {
    key: t.id,
    className: selected[t.id] ? "selected" : ""
  }, /*#__PURE__*/React.createElement("td", {
    className: "sel"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!selected[t.id],
    onChange: () => toggleSel(t.id),
    "aria-label": "Select line " + (i + 1)
  })), /*#__PURE__*/React.createElement("td", {
    className: "line"
  }, i + 1), editing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: t.ticket,
    onChange: e => patchRow(t.id, {
      ticket: e.target.value
    }),
    placeholder: "Ticket #",
    "aria-label": "Scale Ticket number"
  })), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "decimal",
    value: t.gross,
    onChange: e => patchRow(t.id, {
      gross: sanitizeDecimal(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "decimal",
    value: t.tare,
    onChange: e => patchRow(t.id, {
      tare: sanitizeDecimal(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement(MoistureInput, {
    value: t.moisture,
    onChange: v => patchRow(t.id, {
      moisture: v
    })
  })), /*#__PURE__*/React.createElement("td", {
    className: "right net-calc",
    "data-tip": "Net Weight is calculated automatically as Gross − Tare and can't be typed in."
  }, fmt(netWeight(t.gross, t.tare))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "decimal",
    value: t.test,
    onChange: e => patchRow(t.id, {
      test: sanitizeDecimal(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("select", {
    value: t.elevator,
    onChange: e => patchRow(t.id, {
      elevator: e.target.value
    })
  }, ELEVATORS.map(el => /*#__PURE__*/React.createElement("option", {
    key: el
  }, el))))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", null, t.ticket), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(t.gross)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(t.tare)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, t.moisture === "" || t.moisture === null || t.moisture === undefined ? "—" : +t.moisture + "%"), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(netWeight(t.gross, t.tare))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(t.test, 1)), /*#__PURE__*/React.createElement("td", null, t.elevator)))), draft ? /*#__PURE__*/React.createElement("tr", {
    className: "draft-row"
  }, /*#__PURE__*/React.createElement("td", {
    className: "sel"
  }), /*#__PURE__*/React.createElement("td", {
    className: "line"
  }, displayTickets.length + 1), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("input", {
    type: "text",
    autoFocus: true,
    value: draft.ticket,
    onChange: e => setDraft({
      ...draft,
      ticket: e.target.value
    }),
    placeholder: "Ticket #",
    "aria-label": "Scale Ticket number"
  })), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "decimal",
    value: draft.gross,
    onChange: e => setDraft({
      ...draft,
      gross: sanitizeDecimal(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "decimal",
    value: draft.tare,
    onChange: e => setDraft({
      ...draft,
      tare: sanitizeDecimal(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement(MoistureInput, {
    value: draft.moisture,
    onChange: v => setDraft({
      ...draft,
      moisture: v
    })
  })), /*#__PURE__*/React.createElement("td", {
    className: "right net-calc",
    "data-tip": "Net Weight is calculated automatically as Gross − Tare and can't be typed in."
  }, fmt(netWeight(draft.gross, draft.tare))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "decimal",
    value: draft.test,
    onChange: e => setDraft({
      ...draft,
      test: sanitizeDecimal(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("select", {
    value: draft.elevator,
    onChange: e => setDraft({
      ...draft,
      elevator: e.target.value
    })
  }, ELEVATORS.map(el => /*#__PURE__*/React.createElement("option", {
    key: el
  }, el))))) : null, displayTickets.length === 0 && !draft ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "9"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No product parts yet. Click Create to add a scale ticket."))) : null)), formOpen ? /*#__PURE__*/React.createElement("div", {
    className: "weight-save-bar"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-outline",
    onClick: onCancel,
    "data-tip": "Discard your changes and exit edit mode.",
    "data-tip-pos": "top"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-edit",
    onClick: onSave,
    "data-tip": "Save every row for this field. Each row must have a Scale Ticket number.",
    "data-tip-pos": "top"
  }, "Save")) : null)) : null), nom && tickets.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "panel weight-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("h2", null, "Contract Summary", /*#__PURE__*/React.createElement(HelpDot, {
    tip: "Live totals across all scale tickets for this field, ending in the calculated yield (bu/acre)."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "summary-split"
  }, /*#__PURE__*/React.createElement("div", {
    className: "calcbox"
  }, /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "Sum of Net Weight (Gross − Tare) across every load, in pounds."
  }, /*#__PURE__*/React.createElement("span", null, "Total Net Weight"), /*#__PURE__*/React.createElement("b", null, fmt(totalNet), " lbs")), /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "Net weight after moisture shrink: 1.4% is removed per point of moisture above 15%."
  }, /*#__PURE__*/React.createElement("span", null, "Total Moisture-Adjusted Weight"), /*#__PURE__*/React.createElement("b", null, fmt(totalAdj), " lbs")), /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "Adjusted weight converted to bushels at 56 lbs per bushel."
  }, /*#__PURE__*/React.createElement("span", null, "Total Bushels (÷ 56 lbs)"), /*#__PURE__*/React.createElement("b", null, fmt(totalBu, 1), " bu")), /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "The field's measured acres, taken from its nomination."
  }, /*#__PURE__*/React.createElement("span", null, "Measured Acres"), /*#__PURE__*/React.createElement("b", null, fmt(nom.measuredAcres))), /*#__PURE__*/React.createElement("div", {
    className: "r total",
    "data-tip": "Total bushels divided by measured acres — the field's yield in bu/acre."
  }, /*#__PURE__*/React.createElement("span", null, "Yield"), /*#__PURE__*/React.createElement("b", null, yieldPerAc !== null ? fmt(yieldPerAc, 1) : "—", " bu/ac"))), /*#__PURE__*/React.createElement("div", {
    className: "post-cta" + (alreadyPosted ? " done" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "post-cta-step"
  }, alreadyPosted ? "Posted" : "Final step — required"), /*#__PURE__*/React.createElement("h3", {
    className: "post-cta-title"
  }, alreadyPosted ? "This yield is on the nomination" : "Post the yield to the nomination"), alreadyPosted ? /*#__PURE__*/React.createElement("p", {
    className: "post-cta-copy"
  }, "Nomination ", nom.nom, " is recorded at ", /*#__PURE__*/React.createElement("b", null, fmt(nom.buPerAcre), " bu/ac"), " and now sits at ", /*#__PURE__*/React.createElement("span", {
    className: "badge sub"
  }, nom.status), ". Post again to overwrite it with the totals above.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "post-cta-copy"
  }, "Writes ", /*#__PURE__*/React.createElement("b", null, postableYield !== null ? postableYield : "—", " bu/ac"), " onto nomination ", nom.nom, ". These scale tickets don't count toward the location LCCE until you post them."), nom.status === "Draft" ? /*#__PURE__*/React.createElement("p", {
    className: "post-cta-change"
  }, "Status changes ", /*#__PURE__*/React.createElement("span", {
    className: "badge draft"
  }, "Draft"), /*#__PURE__*/React.createElement("span", {
    className: "post-cta-arrow",
    "aria-hidden": "true"
  }, "→"), /*#__PURE__*/React.createElement("span", {
    className: "badge sub"
  }, "Submitted")) : null), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn btn-post",
    onClick: postYield,
    disabled: postableYield === null,
    "data-tip": "Write this calculated yield back to the field's nomination so it counts toward the location LCCE.",
    "data-tip-pos": "top"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "17",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15"
  })), /*#__PURE__*/React.createElement("span", null, alreadyPosted ? "Post again" : "Post", " ", postableYield !== null ? postableYield : "", " bu/ac to Nomination")))), /*#__PURE__*/React.createElement("p", {
    className: "notice"
  }, "Moisture shrink: shelled corn weight reduced 1.4% for each point of moisture over 15.0%."))) : null, simOpen && nom ? /*#__PURE__*/React.createElement(Modal, {
    title: "Simulate Assembly — " + nom.nom + (nom.fieldDesc ? " (" + nom.fieldDesc + ")" : ""),
    onClose: () => setSimOpen(false),
    wide: true,
    footer: /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => setSimOpen(false)
    }, "Close")
  }, /*#__PURE__*/React.createElement("p", {
    className: "notice",
    style: {
      marginTop: 0
    }
  }, "Preview of how this field's ", tickets.length, " scale-ticket load", tickets.length === 1 ? "" : "s", " would combine into a pooled delivery. Loads are grouped by destination elevator; moisture is a net-weight-weighted average and shrink is applied to the pooled weight. Nothing is saved."), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Destination elevator the pooled loads would be delivered to."
  }, "Elevator"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Number of scale-ticket loads going to this elevator."
  }, "Loads"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Combined net weight (Gross − Tare) of the pooled loads."
  }, "Net (lbs)"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Net-weight-weighted average moisture of the pooled loads."
  }, "Avg Moisture %"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Pooled net weight after moisture shrink above 15%."
  }, "Adjusted (lbs)"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Adjusted weight converted to bushels at 56 lbs per bushel."
  }, "Bushels"))), /*#__PURE__*/React.createElement("tbody", null, assembly.map(g => /*#__PURE__*/React.createElement("tr", {
    key: g.elevator
  }, /*#__PURE__*/React.createElement("td", null, g.elevator), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, g.loads), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(g.net)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(g.moisture, 1)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(g.adj)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(g.bushels, 1)))))), /*#__PURE__*/React.createElement("div", {
    className: "calcbox",
    style: {
      maxWidth: 460,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "Total scale-ticket loads assembled for this field."
  }, /*#__PURE__*/React.createElement("span", null, "Total Loads"), /*#__PURE__*/React.createElement("b", null, tickets.length)), /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "Sum of net weight across every pooled load, in pounds."
  }, /*#__PURE__*/React.createElement("span", null, "Total Net Weight"), /*#__PURE__*/React.createElement("b", null, fmt(totalNet), " lbs")), /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "Net-weight-weighted average moisture across all loads."
  }, /*#__PURE__*/React.createElement("span", null, "Pooled Avg Moisture"), /*#__PURE__*/React.createElement("b", null, fmt(avgMoisture, 1), "%")), /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "Pooled net weight after moisture shrink of 1.4% per point over 15%."
  }, /*#__PURE__*/React.createElement("span", null, "Total Moisture-Adjusted Weight"), /*#__PURE__*/React.createElement("b", null, fmt(totalAdj), " lbs")), /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "Adjusted weight converted to bushels at 56 lbs per bushel."
  }, /*#__PURE__*/React.createElement("span", null, "Total Bushels (÷ 56 lbs)"), /*#__PURE__*/React.createElement("b", null, fmt(totalBu, 1), " bu")), /*#__PURE__*/React.createElement("div", {
    className: "r",
    "data-tip": "The field's measured acres, taken from its nomination."
  }, /*#__PURE__*/React.createElement("span", null, "Measured Acres"), /*#__PURE__*/React.createElement("b", null, fmt(nom.measuredAcres))), /*#__PURE__*/React.createElement("div", {
    className: "r total",
    "data-tip": "Projected yield: total pooled bushels ÷ measured acres."
  }, /*#__PURE__*/React.createElement("span", null, "Projected Yield"), /*#__PURE__*/React.createElement("b", null, yieldPerAc !== null ? fmt(yieldPerAc, 1) : "—", " bu/ac")))) : null);
}
const inp = {
  padding: "6px 8px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  width: "100%",
  fontSize: 13
};
const inpR = {
  ...inp,
  textAlign: "right"
};

/* A split-free dropdown button: the trigger opens a small menu of report
   actions. Closes on outside click, Escape, or after an item is chosen. */
function ExportMenu({
  items
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  return /*#__PURE__*/React.createElement("div", {
    className: "export-menu" + (open ? " open" : ""),
    ref: wrapRef
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-export",
    onClick: () => setOpen(v => !v),
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "data-tip": "Export or print this field's yield check report.",
    "data-tip-pos": "bottom"
  }, "Export", /*#__PURE__*/React.createElement("span", {
    className: "caret"
  }, "▼")), open ? /*#__PURE__*/React.createElement("div", {
    className: "menu",
    role: "menu"
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.label,
    role: "menuitem",
    onClick: () => {
      setOpen(false);
      it.onClick();
    }
  }, it.label))) : null);
}

/* ================= Yield Check Information ================= */
function YieldCheck({
  store,
  cropYear,
  yieldContract,
  setYieldContract
}) {
  // Draft and Submitted fields are usually not Bayer-selected yet, but the Status
  // list and the nomination rows link straight here, so every valid field for the
  // year has to stay reachable from the picker.
  const noms = store.state.nominations.filter(n => n.cropYear === cropYear && !n.invalid);
  const [contract, setContract] = useState("");
  // When navigated here for a specific field (e.g. from QC / Approved), adopt
  // that contract as the selection, then clear the one-shot request.
  useEffect(() => {
    if (yieldContract) {
      setContract(yieldContract);
      if (setYieldContract) setYieldContract(null);
    }
  }, [yieldContract]);
  // Derive a valid selection each render so changing crop year never leaves the
  // page pointed at a field from another year (or a now-invalid contract).
  const effectiveContract = noms.some(n => n.contract === contract) ? contract : noms[0] ? noms[0].contract : "";
  const nom = noms.find(n => n.contract === effectiveContract) || null;
  const tickets = store.state.tickets.filter(t => t.contract === effectiveContract);
  const computed = nom ? contractYield(tickets, nom.measuredAcres) : null;
  const shown = computed !== null ? computed : nom ? nom.buPerAcre : null;
  const sign = () => {
    if (!nom) return;
    store.set({
      nominations: store.state.nominations.map(n => n.id === nom.id ? {
        ...n,
        status: "QC",
        signed: true
      } : n)
    });
    alert("Yield Check Information Report signed and moved to QC for " + coopName(store, nom.coop) + ".");
  };
  const returnToQC = () => {
    if (!nom) return;
    if (!window.confirm("Move this Approved field back to QC for review?")) return;
    store.set({
      nominations: store.state.nominations.map(n => n.id === nom.id ? {
        ...n,
        status: "QC"
      } : n)
    });
    alert("Approval reverted — " + coopName(store, nom.coop) + "'s field is back in QC.");
  };
  const approve = () => {
    if (!nom) return;
    store.set({
      nominations: store.state.nominations.map(n => n.id === nom.id ? {
        ...n,
        status: "Approved",
        signed: true
      } : n)
    });
    alert("Yield Check approved for " + coopName(store, nom.coop) + ".");
  };
  const doExport = () => {
    if (!nom) return;
    const rows = [["Yield Check Information Report", "", "", "", "", ""], ["Crop Year", cropYear, "", "", "", ""], ["Plant", plantLabel(store, nom.group), "", "", "", ""], [], ["Cooperator", nom.coop + " — " + coopName(store, nom.coop), "", "", "", ""], ["Contract #", nom.contract, "", "", "", ""], ["Nomination #", nom.nom, "", "", "", ""], ["Field", nom.fieldDesc, "", "", "", ""], ["Measured Acres", nom.measuredAcres, "", "", "", ""], ["Date Harvested", nom.dateHarvested || "", "", "", "", ""], ["Hybrid", [nom.hybridBrand, nom.hybridDesignation].filter(Boolean).join(" "), "", "", "", ""], ["Growing Location", nom.growLoc || "", "", "", "", ""], ["Status", nom.status, "", "", "", ""], [], ["Scale Ticket #", "Moisture %", "Net (lbs)", "Adj (lbs)", "Bushels", "Elevator"], ...tickets.map(t => [t.ticket, fmt(t.moisture, 1), Math.round(netWeight(t.gross, t.tare)), Math.round(adjustedWeight(t.gross, t.tare, t.moisture)), ticketBushels(t).toFixed(1), t.elevator]), [], ["Bu / Acre Yield", shown !== null ? Number(shown).toFixed(computed !== null ? 1 : 0) : "", "", "", "", ""]];
    exportCSV("yield_check_" + (effectiveContract || "field") + ".csv", rows);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "panel no-print menu-host"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Yield Check Information", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "The official yield report for one field. Review the calculated bu/acre, then sign it to move the field into QC."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "row-actions"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--muted)"
    }
  }, "Contract Number - Field"), /*#__PURE__*/React.createElement("select", {
    value: effectiveContract,
    onChange: e => setContract(e.target.value),
    disabled: noms.length === 0,
    style: {
      padding: "8px 10px",
      border: "1px solid var(--line)",
      borderRadius: 8
    },
    "data-tip": "Choose which field's yield check report to view.",
    "data-tip-pos": "bottom"
  }, noms.length === 0 ? /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "No fields this crop year") : noms.map(n => /*#__PURE__*/React.createElement("option", {
    key: n.id,
    value: n.contract
  }, n.contract, " — ", coopName(store, n.coop), n.fieldDesc ? " (" + n.fieldDesc + ")" : "", " · ", n.status))), nom && nom.status === "Approved" ? /*#__PURE__*/React.createElement(ExportMenu, {
    items: [{
      label: "Export CSV",
      onClick: doExport
    }, {
      label: "Print Report",
      onClick: () => window.print()
    }]
  }) : null))), nom ? /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("h2", null, "Yield Check Information Report"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "Crop Year ", cropYear, " · Plant ", plantCode(store, nom.group))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid2",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Cooperator"), " ", nom.coop, " — ", coopName(store, nom.coop)), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Contract #"), " ", nom.contract), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Nomination #"), " ", nom.nom), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Field"), " ", nom.fieldDesc)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Measured Acres"), " ", fmt(nom.measuredAcres)), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Date Harvested"), " ", nom.dateHarvested || "—"), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Hybrid"), " ", nom.hybridBrand, " ", nom.hybridDesignation), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Plant"), " ", plantLabel(store, nom.group)))), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Scale Ticket # — the elevator ticket for each load."
  }, "Scale Ticket #"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Moisture % — grain moisture recorded for the load."
  }, "Moisture %"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Net (lbs) — grain weight after subtracting the truck tare."
  }, "Net (lbs)"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Adj (lbs) — net weight after moisture shrink above 15%."
  }, "Adj (lbs)"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Bushels — adjusted weight ÷ 56 lbs."
  }, "Bushels"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Elevator — where the load was delivered."
  }, "Elevator"))), /*#__PURE__*/React.createElement("tbody", null, tickets.map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id
  }, /*#__PURE__*/React.createElement("td", null, t.ticket), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(t.moisture, 1)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(netWeight(t.gross, t.tare))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(adjustedWeight(t.gross, t.tare, t.moisture))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(ticketBushels(t), 1)), /*#__PURE__*/React.createElement("td", null, t.elevator))), tickets.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No scale tickets entered — showing stored yield."))) : null)), /*#__PURE__*/React.createElement("div", {
    className: "calcbox",
    style: {
      maxWidth: 420,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "r"
  }, /*#__PURE__*/React.createElement("span", null, "Measured Acres"), /*#__PURE__*/React.createElement("b", null, fmt(nom.measuredAcres))), /*#__PURE__*/React.createElement("div", {
    className: "r total"
  }, /*#__PURE__*/React.createElement("span", null, "Bu / Acre Yield"), /*#__PURE__*/React.createElement("b", null, fmt(shown, computed !== null ? 1 : 0)))), /*#__PURE__*/React.createElement("div", {
    className: "row-actions",
    style: {
      marginTop: 16
    }
  }, nom.status === "Approved" ? /*#__PURE__*/React.createElement("button", {
    className: "btn sec",
    onClick: returnToQC,
    "data-tip": "Revert this field's approval and move it back to QC for further review."
  }, "Return to QC") : nom.status === "QC" ? /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: approve,
    "data-tip": "Approve this yield check and mark the field Approved."
  }, "Approve") : /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: sign,
    "data-tip": "Sign the report and advance this field's status to QC for review."
  }, "Sign & Send to QC"), /*#__PURE__*/React.createElement(StatusBadge, {
    status: nom.status
  })), /*#__PURE__*/React.createElement("p", {
    className: "notice"
  }, "If moisture > 15.0%, shelled corn weight is reduced 1.4% for each point over 15.0%. Cooperator signs the Yield Check Information Report."))) : /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No contract selected.")));
}

/* ================= LCCE Location Report (final SAP settlement) ================= */
const SAP_UOM = "BU";
const sapDocDate = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const sapMaterial = n => n.hybridDesignation || "";
const sapMaterialDesc = n => [n.hybridBrand, n.hybridDesignation].filter(Boolean).join(" ");
const sapVendor = n => n.coop || "";
function fieldYieldTag(n, res) {
  if (n.invalid) return "Invalid";
  if (+n.buPerAcre > 0 && n.buPerAcre === res.high) return "HIGH";
  if (+n.buPerAcre > 0 && n.buPerAcre === res.low) return "LOW";
  if (isBackupField(n)) return "Back-up";
  return "";
}
function inLcceAverage(n, res) {
  return !res.short && countsTowardLcce(n) && +n.buPerAcre > 0 && n.buPerAcre !== res.high && n.buPerAcre !== res.low;
}
/* Production contracts SAP will settle: Bayer-selected, still valid. Discarded
   high/low fields stay on the contract — they just do not enter the average. */
const sapContracts = gnoms => gnoms.filter(n => n.selected && !n.invalid);
function sapReady(gnoms, res) {
  if (res.short) return {
    code: "blocked",
    label: "Blocked",
    note: lcceShortNote(res)
  };
  const pending = sapContracts(gnoms).filter(n => n.status !== "Approved");
  if (pending.length) {
    return {
      code: "provisional",
      label: "Provisional",
      note: pending.length + " contract" + (pending.length === 1 ? "" : "s") + " not yet Approved"
    };
  }
  return {
    code: "ready",
    label: "Ready for SAP",
    note: ""
  };
}
function sapNum(n, d) {
  if (n === null || n === undefined || n === "" || isNaN(n)) return "";
  return Number(n).toFixed(d);
}
function LcceReport({
  store,
  cropYear
}) {
  const [gyi, setGyi] = useState(1.0);
  const [premium, setPremium] = useState(0);
  const [locFilter, setLocFilter] = useState("all");
  const [contractsCollapsed, setContractsCollapsed] = useState(false);
  const noms = store.state.nominations.filter(n => n.cropYear === cropYear);
  const groups = storePlants(store).map(g => {
    // Dormant back-ups are held in reserve, so the report only shows the ones an
    // operator activated to replace an invalid field.
    const gnoms = noms.filter(n => n.group === g.id && n.selected && (!isBackupField(n) || n.backupActive)).sort((a, b) => b.buPerAcre - a.buPerAcre);
    const res = lcceForGroup(gnoms);
    const contracts = sapContracts(gnoms);
    const ready = sapReady(gnoms, res);
    const fb = res.short ? null : finalBushels(res.lcce, gyi, premium);
    const settleQty = fb === null ? null : contracts.reduce((s, n) => s + fb * (+n.measuredAcres || 0), 0);
    return {
      g,
      gnoms,
      res,
      contracts,
      ready,
      fb,
      settleQty
    };
  });
  // Guard: if a previously-selected location is no longer valid, fall back to All.
  const effectiveLoc = locFilter === "all" || groups.some(({
    g
  }) => g.id === locFilter) ? locFilter : "all";
  const shownGroups = effectiveLoc === "all" ? groups : groups.filter(({
    g
  }) => g.id === effectiveLoc);
  const readyCount = shownGroups.filter(x => x.ready.code === "ready").length;
  const provCount = shownGroups.filter(x => x.ready.code === "provisional").length;
  const blockedCount = shownGroups.filter(x => x.ready.code === "blocked").length;
  const contractCount = shownGroups.reduce((s, x) => s + x.contracts.length, 0);
  const settleTotal = shownGroups.reduce((s, x) => s + (x.settleQty || 0), 0);
  const exportSap = () => {
    if (!shownGroups.length) return;
    if (blockedCount && !window.confirm(blockedCount + " location" + (blockedCount === 1 ? "" : "s") + " have no LCCE and will export without Final Bushels. Continue?")) return;
    const docDate = sapDocDate();
    const gVal = +gyi || 0;
    const pVal = +premium || 0;
    const rows = [["SAP LCCE Settlement Export"], ["Document Date", docDate], ["Crop Year", cropYear], ["GYI", gVal], ["Premium (bu/ac)", pVal], ["Unit of Measure", SAP_UOM], ["Formula", "(40% × LCCE) + (60% × GYI × LCCE) + Premium"], ["Locations in file", shownGroups.length], ["Ready for SAP", readyCount], ["Provisional (unapproved contracts)", provCount], ["Blocked (no LCCE)", blockedCount], [], ["PLANT SETTLEMENT"], ["Crop Year", "Plant", "Plant Name", "Growing Location", "Area", "LCCE Bu/Ac", "GYI", "Premium Bu/Ac", "Base 40%", "Variable 60%×GYI", "Final Bushels Bu/Ac", "Settlement Qty Bu", "UoM", "Qualifying Fields", "Averaged Fields", "Contracts", "SAP Status", "Block Reason"]];
    shownGroups.forEach(({
      g,
      res,
      contracts,
      ready,
      fb,
      settleQty
    }) => {
      rows.push([cropYear, g.plant, g.name || "", g.growLoc || "", g.area || "", res.short ? "" : res.lcce, gVal, pVal, res.short ? "" : sapNum(0.4 * res.lcce, 1), res.short ? "" : sapNum(0.6 * gVal * res.lcce, 1), fb === null ? "" : sapNum(fb, 1), settleQty === null ? "" : sapNum(settleQty, 1), SAP_UOM, res.count, res.short ? 0 : res.count - 2, contracts.length, ready.label, ready.note]);
    });
    rows.push([]);
    rows.push(["CONTRACT SETTLEMENT"]);
    rows.push(["Crop Year", "Plant", "Plant Name", "Growing Location", "Vendor", "Vendor Name", "Contract", "Nomination", "Material", "Material Description", "Field", "Township", "Section", "State", "Measured Acres", "Field Yield Bu/Ac", "Location LCCE", "GYI", "Premium Bu/Ac", "Base 40%", "Variable 60%×GYI", "Final Bushels Bu/Ac", "Settlement Qty Bu", "UoM", "Status", "Harvest Date", "In LCCE Average", "High/Low"]);
    shownGroups.forEach(({
      g,
      res,
      contracts,
      fb
    }) => {
      contracts.forEach(n => {
        const qty = fb === null ? "" : sapNum(fb * (+n.measuredAcres || 0), 1);
        rows.push([cropYear, g.plant, g.name || "", n.growLoc || g.growLoc || "", sapVendor(n), coopName(store, n.coop), n.contract, n.nom, sapMaterial(n), sapMaterialDesc(n), n.fieldDesc || "", n.township || "", n.section || "", n.state || "", n.measuredAcres, n.invalid ? 0 : n.buPerAcre, res.short ? "" : res.lcce, gVal, pVal, res.short ? "" : sapNum(0.4 * res.lcce, 1), res.short ? "" : sapNum(0.6 * gVal * res.lcce, 1), fb === null ? "" : sapNum(fb, 1), qty, SAP_UOM, n.status || "", n.dateHarvested || "", inLcceAverage(n, res) ? "Y" : "N", fieldYieldTag(n, res)]);
      });
    });
    rows.push([]);
    rows.push(["FIELD AUDIT — Selected fields after discard high/low"]);
    rows.push(["Crop Year", "Plant", "Vendor", "Vendor Name", "Contract", "Nomination", "Field", "Material", "Measured Acres", "Yield Bu/Ac", "High/Low", "In LCCE Average", "Status", "Location LCCE"]);
    shownGroups.forEach(({
      g,
      gnoms,
      res
    }) => {
      gnoms.forEach(n => {
        rows.push([cropYear, g.plant, sapVendor(n), coopName(store, n.coop), n.contract, n.nom, n.fieldDesc || "", sapMaterialDesc(n), n.measuredAcres, n.invalid ? 0 : n.buPerAcre, fieldYieldTag(n, res), inLcceAverage(n, res) ? "Y" : "N", n.status || "", res.short ? "Not calculated — " + lcceShortNote(res) : res.lcce]);
      });
    });
    exportCSV("SAP_LCCE_settlement_" + cropYear + ".csv", rows);
  };
  const readyClass = code => code === "ready" ? "ok" : code === "provisional" ? "wait" : "no";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "final-hero no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "final-hero-top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "final-hero-title-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "final-kicker"
  }, "Final step"), /*#__PURE__*/React.createElement("h2", null, "Export the location settlement for SAP", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "This is the last screen in the workflow. It locks each location's LCCE, calculates Final Bushels, and builds the CSV SAP uses to settle production contracts."
  }))), /*#__PURE__*/React.createElement("p", null, "High and low field yields are discarded, the rest average into the Location Commercial Corn Equivalent, and Final Bushels is the contracted rate posted to each grower contract in SAP.")), /*#__PURE__*/React.createElement("div", {
    className: "final-hero-actions"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "lcce-loc-select"
  }, "Location"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("select", {
    id: "lcce-loc-select",
    value: effectiveLoc,
    onChange: e => setLocFilter(e.target.value),
    "data-tip": "Choose a plant to view its settlement, or All Locations to export every plant.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "All Locations (", groups.length, ")"), groups.map(({
    g
  }) => /*#__PURE__*/React.createElement("option", {
    key: g.id,
    value: g.id
  }, g.plant, " — ", g.name))))), /*#__PURE__*/React.createElement("button", {
    className: "btn sec",
    onClick: () => window.print(),
    "data-tip": "Print the settlement package (or save as PDF).",
    "data-tip-pos": "bottom"
  }, "Print"), /*#__PURE__*/React.createElement("button", {
    className: "btn-sap",
    onClick: exportSap,
    disabled: !shownGroups.length,
    "data-tip": "Download the SAP settlement file: plant totals, one row per production contract, and the field audit that supports the LCCE.",
    "data-tip-pos": "bottom"
  }, "Export for SAP")))), shownGroups.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No plants defined. Create one on the Plant screen, then assign fields to it."))) : /*#__PURE__*/React.createElement("div", {
    className: "sap-kpis"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sap-kpi ok"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Ready for SAP"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, readyCount, /*#__PURE__*/React.createElement("small", {
    style: {
      fontSize: 13,
      color: "var(--muted)",
      fontWeight: 600
    }
  }, " / ", shownGroups.length)), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Locations with an LCCE and every contract Approved")), /*#__PURE__*/React.createElement("div", {
    className: "sap-kpi" + (blockedCount ? " bad" : provCount ? " warn" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Needs attention"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, blockedCount + provCount), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, blockedCount ? blockedCount + " blocked" : "None blocked", provCount ? " · " + provCount + " provisional" : "")), /*#__PURE__*/React.createElement("div", {
    className: "sap-kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Contracts in package"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, contractCount), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Selected, valid production contracts for the crop year")), /*#__PURE__*/React.createElement("div", {
    className: "sap-kpi ok"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Settlement quantity"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, fmt(settleTotal, 1), /*#__PURE__*/React.createElement("small", {
    style: {
      fontSize: 13,
      color: "var(--muted)",
      fontWeight: 600
    }
  }, " ", SAP_UOM)), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "Final Bushels × measured acres, for every location that has an LCCE"))), shownGroups.length ? /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "SAP Settlement Package", /*#__PURE__*/React.createElement(HelpDot, {
    tip: "The rows SAP needs to post the contracted yield: plant, vendor, contract, material, LCCE, Final Bushels, and settlement quantity in bushels."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "One plant total, then one posting line per production contract · Crop Year ", cropYear, " · UoM ", SAP_UOM, " · Document date ", sapDocDate()))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("p", {
    className: "sap-note"
  }, "Download ", /*#__PURE__*/React.createElement("b", null, "Export for SAP"), " when the package looks right. The CSV carries plant settlement, contract settlement (vendor, contract, material, quantity), and the field audit. There is no live SAP connection — load the file in the settlement transaction."), /*#__PURE__*/React.createElement("p", {
    className: "lcce-formula"
  }, "Base + Variable + Premium = Final Bushels \xA0→\xA0 (40% × LCCE) + (60% × GYI × LCCE) + Premium"), /*#__PURE__*/React.createElement("div", {
    className: "grid3",
    style: {
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "GYI (Grower Yield Index)"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.01",
    value: gyi,
    onChange: e => setGyi(e.target.value),
    style: inp,
    "data-tip": "Grower Yield Index — a multiplier (typically near 1.0) applied to the variable 60% portion of the formula. It is written onto every SAP row."
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Rotation/Isolation Premium (bu/ac)"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: premium,
    onChange: e => setPremium(e.target.value),
    style: inp,
    "data-tip": "Extra bushels per acre added on top for rotation or isolation. Included on every SAP settlement row."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bd scroll-x",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "sap-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant (WERKS) — the SAP production site whose selected fields average into one LCCE."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant Name — the site description carried with the plant code."
  }, "Plant Name"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Growing Location — the GrowLoc label posted with the plant's nominations."
  }, "GrowLoc"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "LCCE — unweighted average bu/ac after discarding the single high and low field."
  }, "LCCE"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Base — the fixed 40% of LCCE."
  }, "Base 40%"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Variable — 60% of LCCE scaled by the Grower Yield Index."
  }, "Variable"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Premium — the rotation/isolation bushels per acre entered above."
  }, "Premium"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Final Bushels — the contracted bu/ac rate SAP posts: Base + Variable + Premium."
  }, "Final Bu/Ac"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Settlement Qty — Final Bushels × measured acres for every selected, valid contract at this plant."
  }, "Settlement Qty"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "UoM — unit of measure written to SAP. Always bushels."
  }, "UoM"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "SAP Status — Ready when the LCCE exists and every contract is Approved; Provisional if some are still in QC; Blocked if there is no LCCE."
  }, "SAP Status"))), /*#__PURE__*/React.createElement("tbody", null, shownGroups.map(({
    g,
    res,
    ready,
    fb,
    settleQty
  }) => res.short ? /*#__PURE__*/React.createElement("tr", {
    key: g.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, g.plant)), /*#__PURE__*/React.createElement("td", null, g.name), /*#__PURE__*/React.createElement("td", null, g.growLoc || "—"), /*#__PURE__*/React.createElement("td", {
    colSpan: "6",
    style: {
      color: "var(--muted)"
    },
    "data-tip": ready.note
  }, "Not calculated — needs ", res.needed, " more qualifying field", res.needed === 1 ? "" : "s"), /*#__PURE__*/React.createElement("td", null, SAP_UOM), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "ready " + readyClass(ready.code)
  }, ready.label))) : /*#__PURE__*/React.createElement("tr", {
    key: g.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, g.plant)), /*#__PURE__*/React.createElement("td", null, g.name), /*#__PURE__*/React.createElement("td", null, g.growLoc || "—"), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(res.lcce)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(0.4 * res.lcce, 1)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(0.6 * gyi * res.lcce, 1)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(+premium, 1)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("b", null, fmt(fb, 1))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("b", null, fmt(settleQty, 1))), /*#__PURE__*/React.createElement("td", null, SAP_UOM), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "ready " + readyClass(ready.code),
    "data-tip": ready.note || "Every contract at this plant is Approved and the LCCE is locked."
  }, ready.label))))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "8",
    style: {
      textAlign: "right"
    }
  }, "Package total"), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(settleTotal, 1)), /*#__PURE__*/React.createElement("td", null, SAP_UOM), /*#__PURE__*/React.createElement("td", null))))), /*#__PURE__*/React.createElement("div", {
    className: "sap-collapse"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sap-collapse-btn",
    "aria-expanded": !contractsCollapsed,
    onClick: () => setContractsCollapsed(v => !v),
    "data-tip": contractsCollapsed ? "Show the production contract fields. They are always included in Export for SAP." : "Hide the production contract fields to make more room. They are still included in Export for SAP.",
    "data-tip-pos": "bottom"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sap-collapse-chev",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, contractsCollapsed ? /*#__PURE__*/React.createElement("polyline", {
    points: "9 6 15 12 9 18"
  }) : /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "form-sec"
  }, "Production Contract Fields"), /*#__PURE__*/React.createElement("span", {
    className: "sap-collapse-count"
  }, contractCount)), /*#__PURE__*/React.createElement("div", {
    className: "sap-collapse-body" + (contractsCollapsed ? " is-hidden" : "")
  }, /*#__PURE__*/React.createElement("p", {
    className: "help",
    style: {
      marginTop: 0
    }
  }, "Each selected, valid field is a production contract. SAP posts the location's Final Bushels rate against the vendor, contract, and material, and settles Final Bushels × measured acres."), /*#__PURE__*/React.createElement("div", {
    className: "bd scroll-x",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "sap-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant (WERKS) — the SAP production site."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Vendor (LIFNR) — the cooperator number SAP uses for the grower."
  }, "Vendor"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Vendor Name — the grower's legal name."
  }, "Vendor Name"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Contract — the purchasing / production contract number."
  }, "Contract"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Nomination — the field nomination identifier on the contract."
  }, "Nom #"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Material (MATNR) — the hybrid designation planted on the field."
  }, "Material"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Field — the field description for the audit trail."
  }, "Field"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Measured Acres — the acres used to turn Final Bushels into a settlement quantity."
  }, "Acres"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Field Yield — this field's posted bu/ac. HIGH/LOW fields are discarded from the average only."
  }, "Yield"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Final Bushels — the location's contracted bu/ac rate."
  }, "Final Bu/Ac"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Settlement Qty — Final Bushels × measured acres, the quantity SAP posts."
  }, "Qty ", SAP_UOM), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Status — Draft, Submitted, QC, or Approved. Ready-for-SAP locations have every line Approved."
  }, "Status"))), /*#__PURE__*/React.createElement("tbody", null, shownGroups.flatMap(({
    g,
    contracts,
    fb
  }) => contracts.length === 0 ? [/*#__PURE__*/React.createElement("tr", {
    key: g.id + "-empty"
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, g.plant)), /*#__PURE__*/React.createElement("td", {
    colSpan: "11",
    style: {
      color: "var(--muted)"
    }
  }, "No selected, valid contracts at this plant."))] : contracts.map(n => /*#__PURE__*/React.createElement("tr", {
    key: n.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, g.plant)), /*#__PURE__*/React.createElement("td", null, sapVendor(n)), /*#__PURE__*/React.createElement("td", null, coopName(store, n.coop)), /*#__PURE__*/React.createElement("td", null, n.contract), /*#__PURE__*/React.createElement("td", null, n.nom), /*#__PURE__*/React.createElement("td", null, sapMaterial(n) || "—"), /*#__PURE__*/React.createElement("td", {
    className: "wrap"
  }, n.fieldDesc), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(n.measuredAcres)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, n.invalid ? 0 : fmt(n.buPerAcre)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fb === null ? "—" : fmt(fb, 1)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("b", null, fb === null ? "—" : fmt(fb * (+n.measuredAcres || 0), 1))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusBadge, {
    status: n.status
  })))))))))))) : null, shownGroups.map(({
    g,
    gnoms,
    res,
    ready
  }) => /*#__PURE__*/React.createElement("div", {
    className: "panel",
    key: g.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Location Commercial Corn Equivalents — Selected Fields"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Supporting audit for plant ", g.plant, g.name ? " — " + g.name : "")), /*#__PURE__*/React.createElement("span", {
    className: "ready " + readyClass(ready.code)
  }, ready.label)), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lcce-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Plant"), " ", g.plant), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Plant Name"), " ", g.name || "—"), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Growing Location"), " ", g.growLoc || "—"), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Area"), " ", g.area || "—"), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Crop Year"), " ", cropYear), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("b", null, "Location LCCE"), " ", res.short ? "Not calculated" : fmt(res.lcce) + " bu/ac")), /*#__PURE__*/React.createElement("div", {
    className: "bd scroll-x",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "sap-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Vendor — the cooperator number."
  }, "Vendor"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Vendor Name — the grower."
  }, "Vendor Name"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Contract — the production contract number."
  }, "Contract"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Nomination — the field nomination identifier."
  }, "Nom #"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Field Location — the field description."
  }, "Field"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Material — hybrid brand and designation."
  }, "Material"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Measured Acres — acres used in settlement quantity."
  }, "Acres"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Status — where the field sits in the workflow."
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "High/Low — the single highest and lowest yields are struck through and excluded from the average."
  }, "High/Low"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Bu. Per Acre Yield — the field's recorded yield. Struck-through rows are the discarded high/low."
  }, "Bu/Ac"))), /*#__PURE__*/React.createElement("tbody", null, gnoms.map(n => {
    const tag = n.invalid ? /*#__PURE__*/React.createElement("span", {
      className: "badge inv"
    }, "Invalid") : n.buPerAcre === res.high ? /*#__PURE__*/React.createElement("span", {
      className: "badge hi"
    }, "HIGH") : n.buPerAcre === res.low ? /*#__PURE__*/React.createElement("span", {
      className: "badge low"
    }, "LOW") : isBackupField(n) ? /*#__PURE__*/React.createElement("span", {
      className: "badge bkp-on"
    }, "Back-up") : null;
    const disc = !n.invalid && (n.buPerAcre === res.high || n.buPerAcre === res.low);
    return /*#__PURE__*/React.createElement("tr", {
      key: n.id,
      style: disc ? {
        opacity: .6
      } : null
    }, /*#__PURE__*/React.createElement("td", null, n.coop), /*#__PURE__*/React.createElement("td", null, coopName(store, n.coop)), /*#__PURE__*/React.createElement("td", null, n.contract), /*#__PURE__*/React.createElement("td", null, n.nom), /*#__PURE__*/React.createElement("td", {
      className: "wrap"
    }, n.fieldDesc), /*#__PURE__*/React.createElement("td", null, sapMaterialDesc(n) || "—"), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, fmt(n.measuredAcres)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusBadge, {
      status: n.status
    })), /*#__PURE__*/React.createElement("td", null, tag), /*#__PURE__*/React.createElement("td", {
      className: "right",
      style: disc ? {
        textDecoration: "line-through"
      } : {
        fontWeight: 700
      }
    }, n.invalid ? 0 : fmt(n.buPerAcre)));
  })), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "9",
    style: {
      textAlign: "right"
    }
  }, "Location Commercial Corn Equivalent*"), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, res.short ? /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 13,
      color: "var(--muted)"
    }
  }, "Not calculated") : /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 16,
      color: "var(--bayer-green-d)"
    }
  }, "Average ", fmt(res.lcce))))))), res.short ? /*#__PURE__*/React.createElement("div", {
    className: "flash bad"
  }, /*#__PURE__*/React.createElement("b", null, "No LCCE for this location."), " ", lcceShortNote(res), " ", res.count === 0 ? "No field here is Bayer-selected, valid, and carrying a posted yield yet." : "Only " + res.count + " field" + (res.count === 1 ? " qualifies" : "s qualify") + " so far — post their yields, or select and validate more fields.") : ready.code === "provisional" ? /*#__PURE__*/React.createElement("div", {
    className: "flash",
    style: {
      background: "var(--warn)",
      border: "1px solid #ecd58a",
      color: "#6b4d00"
    }
  }, /*#__PURE__*/React.createElement("b", null, "Provisional package."), " ", ready.note, ". Approve those fields on Approval Status before treating this as the final SAP posting.") : null, /*#__PURE__*/React.createElement("p", {
    className: "notice"
  }, "* Unweighted average of selected fields after discarding High/Low yields. ", res.count, " selected · ", res.short ? 0 : res.count - 2, " averaged.")))));
}

/* ================= Grower Portal (external-facing) ================= */
function GrowerPortal({
  store,
  cropYear
}) {
  // Guard against malformed / partially-saved persisted state: drop any
  // cooperator that lacks a code so iterating never throws and blanks the app.
  const cooperators = (store.state.cooperators || []).filter(c => c && c.code);
  const nominations = store.state.nominations || [];
  // Growers that actually have fields for the selected crop year.
  const coopsWithData = cooperators.filter(c => nominations.some(n => n.coop === c.code && n.cropYear === cropYear));
  // Fallback so the dropdown is never empty: if no grower has data this year,
  // still list every cooperator so a grower can be picked (they'll show "No fields").
  const options = coopsWithData.length ? coopsWithData : cooperators;
  const [code, setCode] = useState("");
  // Derive a valid selection every render (no effect needed) so switching crop
  // year or data can never leave the portal pointed at a missing grower.
  const effectiveCode = options.some(c => c.code === code) ? code : options[0] ? options[0].code : "";
  const grower = cooperators.find(c => c.code === effectiveCode) || null;
  const d = useMemo(() => {
    const plants = storePlants(store);
    const noms = (store.state.nominations || []).filter(n => n && n.coop === effectiveCode && n.cropYear === cropYear);
    const yearContracts = new Set(noms.map(n => n.contract));
    const tickets = (store.state.tickets || []).filter(t => t && yearContracts.has(t.contract));
    const counting = noms.filter(countsTowardLcce);
    const harvested = counting.filter(n => +n.buPerAcre > 0);
    const invalid = noms.filter(n => n.invalid);
    const backups = noms.filter(isBackupField);
    const backupsOn = backups.filter(n => n.backupActive);
    const active = noms.filter(n => !n.invalid);
    const byStatus = {};
    STATUSES.forEach(s => {
      byStatus[s] = active.filter(n => (n.status || "Draft") === s);
    });
    const plantIds = [];
    noms.forEach(n => {
      if (n.group && plantIds.indexOf(n.group) === -1) plantIds.push(n.group);
    });
    const allYear = (store.state.nominations || []).filter(n => n && n.cropYear === cropYear);
    const locations = plantIds.map(id => {
      const g = plants.find(p => p.id === id) || {
        id,
        plant: plantCode(store, id),
        name: "",
        area: ""
      };
      const gnoms = allYear.filter(n => n.group === id);
      const res = lcceForGroup(gnoms);
      const q = lcceQualifiers(gnoms).slice().sort((a, b) => +a.buPerAcre - +b.buPerAcre);
      const sel = gnoms.filter(countsTowardLcce);
      return {
        g,
        res,
        sel,
        lowId: res.short || !q.length ? null : q[0].id,
        highId: res.short || !q.length ? null : q[q.length - 1].id,
        waiting: sel.filter(n => !(+n.buPerAcre > 0)).length,
        mine: noms.filter(n => n.group === id)
      };
    });
    const markOf = n => {
      const loc = locations.find(l => l.g && l.g.id === n.group);
      if (!loc) return "";
      if (n.id === loc.highId) return "high";
      if (n.id === loc.lowId) return "low";
      return "";
    };
    const fields = harvested.map(n => {
      const loc = locations.find(l => l.g && l.g.id === n.group);
      return {
        n,
        plant: loc && loc.g ? loc.g.plant : plantCode(store, n.group),
        mark: markOf(n)
      };
    });
    fields.sort((a, b) => +b.n.buPerAcre - +a.n.buPerAcre);
    const yHi = fields.length ? +fields[0].n.buPerAcre : 0;
    const yLo = fields.length ? +fields[fields.length - 1].n.buPerAcre : 0;
    let net = 0,
      adj = 0,
      moistWt = 0,
      testSum = 0,
      testN = 0;
    const elevMap = new Map();
    tickets.forEach(t => {
      const nw = netWeight(t.gross, t.tare);
      net += nw;
      adj += nw * shrinkFactor(t.moisture);
      moistWt += nw * (+t.moisture || 0);
      if (+t.test > 0) {
        testSum += +t.test;
        testN++;
      }
      const key = t.elevator || "Unassigned";
      const e = elevMap.get(key) || {
        name: key,
        loads: 0,
        bu: 0
      };
      e.loads++;
      e.bu += ticketBushels(t);
      elevMap.set(key, e);
    });
    const grain = {
      loads: tickets.length,
      bushels: adj / LBS_PER_BU,
      shrink: net > 0 ? (1 - adj / net) * 100 : null,
      moisture: net > 0 ? moistWt / net : null,
      test: testN ? testSum / testN : null,
      acres: harvested.reduce((s, n) => s + (+n.measuredAcres || 0), 0)
    };
    const elevators = Array.from(elevMap.values()).sort((a, b) => b.bu - a.bu);
    const hyMap = new Map();
    harvested.forEach(n => {
      const key = (n.hybridBrand || "—") + " " + (n.hybridDesignation || "—");
      const h = hyMap.get(key) || {
        key,
        brand: n.hybridBrand || "—",
        desig: n.hybridDesignation || "—",
        fields: 0,
        acres: 0,
        sum: 0
      };
      h.fields++;
      h.acres += +n.estAcres || 0;
      h.sum += +n.buPerAcre || 0;
      hyMap.set(key, h);
    });
    const hybrids = Array.from(hyMap.values()).map(h => ({
      ...h,
      avg: h.sum / h.fields
    })).sort((a, b) => b.avg - a.avg);
    const pendingYield = counting.filter(n => !(+n.buPerAcre > 0));
    const inReview = byStatus.Submitted.length + byStatus.QC.length;
    const attn = [];
    if (pendingYield.length) attn.push({
      tone: "info",
      ic: pendingYield.length,
      t: plural(pendingYield.length, "field") + " still waiting on a posted yield",
      n: "Bayer records each load, then posts the calculated bu/acre once the field is complete."
    });
    if (inReview) attn.push({
      tone: "warn",
      ic: inReview,
      t: plural(inReview, "field") + " in Bayer review",
      n: byStatus.Submitted.length + " waiting on a signature · " + byStatus.QC.length + " in QC before approval."
    });
    if (invalid.length) attn.push({
      tone: "warn",
      ic: invalid.length,
      t: plural(invalid.length, "field") + " marked invalid and left out of the location LCCE",
      n: invalid.map(n => (n.fieldDesc || n.nom) + (n.invalidReason ? " — " + n.invalidReason : "")).join("; ")
    });
    if (backups.length) attn.push({
      tone: "info",
      ic: backups.length,
      t: plural(backups.length, "back-up field") + " held in reserve",
      n: backupsOn.length ? backupsOn.length + " of " + backups.length + " activated to stand in for an invalid field." : "Back-up (Alternate) fields stay out of the average until Bayer pulls one in."
    });
    return {
      noms,
      counting,
      harvested,
      invalid,
      backups,
      backupsOn,
      active,
      byStatus,
      locations,
      fields,
      yHi,
      yLo,
      grain,
      elevators,
      hybrids,
      attn,
      markOf,
      acres: counting.reduce((s, n) => s + (+n.estAcres || 0), 0)
    };
  }, [store.state, cropYear, effectiveCode]);
  const portalDate = v => {
    if (!v) return "—";
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return v;
    return +m[2] + "/" + +m[3] + "/" + m[1].slice(2);
  };
  const fieldPlace = n => {
    const bits = [n.township, n.section ? "Sec " + n.section : "", n.state].filter(Boolean);
    return bits.length ? bits.join(" · ") : "—";
  };
  const hybridLabel = n => [n.hybridBrand, n.hybridDesignation].filter(Boolean).join(" ") || "—";
  const standingOf = n => {
    if (n.invalid) return {
      cls: "inv",
      label: "Invalid",
      tip: "Invalid — this field is excluded from the location LCCE" + (n.invalidReason ? " (" + n.invalidReason + ")" : "") + "."
    };
    if (isBackupField(n) && n.backupActive) return {
      cls: "bkp-on",
      label: "In LCCE",
      tip: "Activated back-up — this Alternate field is standing in for an invalid base field and counts toward the location LCCE."
    };
    if (isBackupField(n)) return {
      cls: "bkp",
      label: "Back-up",
      tip: "Back-up field — held in reserve and left out of the location LCCE until Bayer activates it."
    };
    if (n.selected) return {
      cls: "bkp-on",
      label: "Selected",
      tip: "Bayer-selected — this field is nominated to feed the location LCCE once it has a posted yield."
    };
    return {
      cls: "draft",
      label: "Not selected",
      tip: "Not Bayer-selected — this field is recorded but does not feed the location LCCE."
    };
  };
  const pipeNote = {
    Draft: "Nominated, no yield posted yet",
    Submitted: "Yield posted, waiting on Bayer review",
    QC: "In quality check, waiting on approval",
    Approved: "Final — feeds the location LCCE"
  };
  const harvestPct = shareOf(d.harvested.length, d.counting.length);
  const locFinals = d.locations.map(l => l.res.lcce).filter(v => v);
  const locLcce = locFinals.length === 1 ? locFinals[0] : locFinals.length ? Math.round(locFinals.reduce((a, b) => a + b, 0) / locFinals.length) : null;
  const barPct = v => d.yHi > d.yLo ? 12 + (v - d.yLo) / (d.yHi - d.yLo) * 88 : 100;
  const growerAddr = grower ? [grower.address, [grower.city, grower.state, grower.zip].filter(Boolean).join(", ")].filter(Boolean).join(" · ") : "";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Grower Portal", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "A preview of the read-only page a cooperator sees: their own fields, harvest progress, grain delivered, and how those fields sit against the location LCCE. Nothing here can be edited."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, grower ? grower.name + " · Crop Year " + cropYear : "Pick a grower to preview their field results")), /*#__PURE__*/React.createElement("select", {
    value: effectiveCode,
    onChange: e => setCode(e.target.value),
    disabled: options.length === 0,
    style: {
      padding: "8px 10px",
      border: "1px solid var(--line)",
      borderRadius: 8
    },
    "data-tip": "Pick a grower to preview the portal exactly as they would see it.",
    "data-tip-pos": "bottom"
  }, options.length === 0 ? /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "No growers available") : options.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.code,
    value: c.code
  }, c.code, " — ", c.name)))), grower ? /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grower-id"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Cooperator — the grower this portal is showing, by number and legal name."
  }, /*#__PURE__*/React.createElement("b", null, "Cooperator"), /*#__PURE__*/React.createElement("span", null, grower.code, " — ", grower.name)), /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Plant — the production site this grower contracts with."
  }, /*#__PURE__*/React.createElement("b", null, "Plant"), /*#__PURE__*/React.createElement("span", null, plantLabel(store, grower.plant) || "—")), /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Address — the mailing or farm address on the cooperator record."
  }, /*#__PURE__*/React.createElement("b", null, "Address"), /*#__PURE__*/React.createElement("span", null, growerAddr || "—")), /*#__PURE__*/React.createElement("div", {
    className: "kv",
    "data-tip": "Telephone — the primary contact number on the cooperator record."
  }, /*#__PURE__*/React.createElement("b", null, "Telephone"), /*#__PURE__*/React.createElement("span", null, grower.phone || "—")))) : null), d.noms.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No fields for this grower in Crop Year ", cropYear, "."))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "dash-kpis kpis-5"
  }, /*#__PURE__*/React.createElement(Kpi, {
    tone: "blue",
    label: "Your Fields",
    value: d.noms.length,
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, d.counting.length), " selected for LCCE · ", /*#__PURE__*/React.createElement("b", null, fmt(d.acres)), " est. acres"),
    tip: "Your Fields — every nominated field for this grower in the selected crop year, and how many of them are Bayer-selected to feed the location LCCE."
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: "green",
    label: "Harvest Progress",
    value: harvestPct,
    unit: "%",
    bar: harvestPct,
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, d.harvested.length), " of ", d.counting.length, " selected fields have a posted yield"),
    tip: "Harvest Progress — how many of this grower's selected fields already have a yield posted."
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: "blue",
    label: "Grain Delivered",
    value: fmt(d.grain.bushels),
    unit: "bu",
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, plural(d.grain.loads, "load"), d.grain.moisture !== null ? /*#__PURE__*/React.createElement(React.Fragment, null, " · ", fmt(d.grain.moisture, 1), "% avg moisture") : null),
    tip: "Grain Delivered — moisture-adjusted bushels across every scale ticket recorded for this grower's fields."
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: d.byStatus.Approved.length === d.active.length && d.active.length ? "green" : "amber",
    label: "Approved",
    value: d.byStatus.Approved.length,
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, shareOf(d.byStatus.Approved.length, d.active.length), "%"), " of ", plural(d.active.length, "valid field")),
    tip: "Approved — fields that have cleared QC and approval, and the share of this grower's valid fields they represent."
  }), /*#__PURE__*/React.createElement(Kpi, {
    tone: locLcce ? "green" : "amber",
    label: "Location LCCE",
    value: fmt(locLcce),
    unit: "bu/ac",
    sub: d.locations.length === 1 ? /*#__PURE__*/React.createElement(React.Fragment, null, "Final at ", d.locations[0].g.plant, d.locations[0].res.short ? " · still short of fields" : "") : locFinals.length ? /*#__PURE__*/React.createElement(React.Fragment, null, "Average of ", locFinals.length, " of ", d.locations.length, " locations") : "No location has enough qualifying fields yet",
    tip: "Location LCCE — the averaged bu/ac at this grower's plant after discarding that location's single high and low field yields."
  })), /*#__PURE__*/React.createElement("div", {
    className: "dash-2 lead"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Field status", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Where this grower's fields sit in the workflow. A field moves Draft → Submitted → QC → Approved. Invalid fields leave the workflow and are counted separately."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, plural(d.active.length, "field"), " in the workflow", d.invalid.length ? " · " + d.invalid.length + " invalid excluded" : "", " · Crop Year ", cropYear))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pipe-bar",
    role: "img",
    "aria-label": "Workflow status split across " + d.active.length + " fields"
  }, PIPELINE.map(p => {
    const w = shareOf(d.byStatus[p.status].length, d.active.length);
    return w ? /*#__PURE__*/React.createElement("span", {
      key: p.status,
      className: p.cls,
      style: {
        width: w + "%"
      }
    }) : null;
  })), /*#__PURE__*/React.createElement("div", {
    className: "pipe-cap"
  }, "Share of this grower's valid fields by status"), PIPELINE.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.status,
    className: "pipe-row static"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pipe-dot " + p.cls
  }), /*#__PURE__*/React.createElement("span", {
    className: "pipe-nm"
  }, p.status, /*#__PURE__*/React.createElement("small", null, pipeNote[p.status])), /*#__PURE__*/React.createElement("span", {
    className: "pipe-ct"
  }, d.byStatus[p.status].length), /*#__PURE__*/React.createElement("span", {
    className: "pipe-pc"
  }, shareOf(d.byStatus[p.status].length, d.active.length), "%"))), /*#__PURE__*/React.createElement("div", {
    className: "pipe-foot"
  }, /*#__PURE__*/React.createElement("span", {
    "data-tip": "Invalid fields are excluded from every LCCE average and from the status counts above."
  }, "Invalid ", /*#__PURE__*/React.createElement("b", null, d.invalid.length)), /*#__PURE__*/React.createElement("span", {
    "data-tip": "Alternate fields are back-ups. They stay out of the average until one is activated to stand in for an invalid base field."
  }, "Back-ups ", /*#__PURE__*/React.createElement("b", null, d.backupsOn.length), " of ", d.backups.length, " active"), /*#__PURE__*/React.createElement("span", {
    "data-tip": "This grower's fields that count toward a location LCCE: selected, valid, and either a base field or an activated back-up."
  }, "Feeding LCCE ", /*#__PURE__*/React.createElement("b", null, d.counting.length))))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "What's happening", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "A read-only status of this grower's fields for the crop year — pending yields, review, and any invalid or back-up fields."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, d.attn.length ? plural(d.attn.length, "item") : "Nothing outstanding"))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, d.attn.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "attn-clear"
  }, /*#__PURE__*/React.createElement("span", {
    className: "attn-ic",
    "aria-hidden": "true"
  }, "✓"), /*#__PURE__*/React.createElement("div", {
    className: "attn-tx"
  }, /*#__PURE__*/React.createElement("div", {
    className: "attn-t"
  }, "Every field is harvested and approved"), /*#__PURE__*/React.createElement("div", {
    className: "attn-n"
  }, "Nothing is waiting on Bayer for Crop Year ", cropYear, "."))) : d.attn.map((a, i) => /*#__PURE__*/React.createElement("div", {
    className: "attn " + a.tone,
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "attn-ic",
    "aria-hidden": "true"
  }, a.ic), /*#__PURE__*/React.createElement("div", {
    className: "attn-tx"
  }, /*#__PURE__*/React.createElement("div", {
    className: "attn-t"
  }, a.t), /*#__PURE__*/React.createElement("div", {
    className: "attn-n"
  }, a.n))))))), /*#__PURE__*/React.createElement("div", {
    className: "dash-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Field yields, ranked", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "This grower's harvested, selected fields, highest yield first. High and Low tags mean that field is the discarded extreme at its location — not among this grower's fields alone."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, plural(d.fields.length, "harvested selected field")))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, d.fields.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No harvested, selected fields yet for Crop Year ", cropYear, ".") : /*#__PURE__*/React.createElement("div", {
    className: "ybars"
  }, d.fields.map(({
    n,
    plant,
    mark
  }) => /*#__PURE__*/React.createElement("div", {
    className: "ybar" + (mark ? " is-" + mark : ""),
    key: n.id
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ybar-t"
  }, mark === "high" ? /*#__PURE__*/React.createElement("span", {
    className: "badge hi",
    "data-tip": "Highest yield at this location — discarded before the location average."
  }, "High") : null, mark === "low" ? /*#__PURE__*/React.createElement("span", {
    className: "badge low",
    "data-tip": "Lowest yield at this location — discarded before the location average."
  }, "Low") : null, n.fieldDesc || "Nomination " + n.nom, /*#__PURE__*/React.createElement("small", null, plant, " · ", hybridLabel(n))), /*#__PURE__*/React.createElement("div", {
    className: "ybar-track"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: barPct(+n.buPerAcre) + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ybar-v"
  }, fmt(n.buPerAcre), /*#__PURE__*/React.createElement("small", null, "bu/ac"))))))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Grain quality & deliveries", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Totals across every scale ticket recorded for this grower's fields. Loads over 15.0% moisture are shrunk 1.4% per point before being converted to bushels at 56 lb."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Scale tickets for this grower · Crop Year ", cropYear))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, d.grain.loads === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No scale tickets recorded yet for this grower.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "stat-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Loads — scale tickets recorded across this grower's fields."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Loads"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.loads))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Bushels — moisture-adjusted weight divided by 56 lb per bushel."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Bushels"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.bushels))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Measured acres — the harvested acres these bushels came off, which is what each field's bu/acre is divided by."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Measured Acres"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.acres, 1))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Average moisture, weighted by net weight so heavier loads count for more. Anything over 15.0% is shrunk before conversion."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Avg Moisture"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.moisture, 1), /*#__PURE__*/React.createElement("small", null, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Average test weight across every load that recorded one."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Avg Test Wt"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.test, 1), /*#__PURE__*/React.createElement("small", null, "lb"))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    "data-tip": "Total shrink applied for moisture over 15.0%: 1.4% of net weight per point over."
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-k"
  }, "Moisture Shrink"), /*#__PURE__*/React.createElement("div", {
    className: "stat-v"
  }, fmt(d.grain.shrink, 2), /*#__PURE__*/React.createElement("small", null, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "mix"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mix-t"
  }, "Bushels by delivery point"), d.elevators.map(e => /*#__PURE__*/React.createElement("div", {
    className: "mix-row",
    key: e.name
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mix-nm"
  }, e.name, " ", /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, plural(e.loads, "load"))), /*#__PURE__*/React.createElement("div", {
    className: "mix-track"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: Math.max(2, shareOf(e.bu, d.grain.bushels)) + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mix-v"
  }, fmt(e.bu), /*#__PURE__*/React.createElement("small", null, "bu"))))))))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Location LCCE", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "How this grower's plant is averaging. The location LCCE uses every qualifying field at the plant — not only this grower's — after discarding the single high and low yields."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "The plant average this grower's selected fields feed into"))), /*#__PURE__*/React.createElement("div", {
    className: "bd scroll-x"
  }, /*#__PURE__*/React.createElement("table", {
    className: "loc-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant — the production site whose selected fields are averaged together."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant Name and the geographic description of the plant's growing area."
  }, "Plant Name / Area"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Your Fields — how many of this grower's fields sit at this plant."
  }, "Your Fields"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Selected — valid, Bayer-selected fields at this plant, including activated back-ups."
  }, "Selected"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Harvested — selected fields with a posted yield. Only these can be averaged."
  }, "Harvested"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "High — the single highest field yield at the location, which is discarded before averaging."
  }, "High (disc.)"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Low — the single lowest field yield at the location, which is discarded before averaging."
  }, "Low (disc.)"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Final LCCE — the averaged bu/ac after removing the high and low fields."
  }, "Final LCCE"))), /*#__PURE__*/React.createElement("tbody", null, d.locations.map(l => /*#__PURE__*/React.createElement("tr", {
    key: l.g.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, l.g.plant)), /*#__PURE__*/React.createElement("td", {
    className: "wrap"
  }, l.g.name, l.g.area ? /*#__PURE__*/React.createElement("span", {
    className: "loc-sub"
  }, l.g.area) : null), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, l.mine.length), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, l.sel.length), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, l.res.count, l.waiting ? /*#__PURE__*/React.createElement("span", {
    className: "pill",
    "data-tip": plural(l.waiting, "selected field") + " at this location still has no posted yield."
  }, " +", l.waiting, " open") : null), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(l.res.high)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(l.res.low)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, l.res.short ? /*#__PURE__*/React.createElement("span", {
    className: "badge inv",
    "data-tip": lcceShortNote(l.res)
  }, "Needs ", l.res.needed, " more") : /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--bayer-green-d)"
    }
  }, fmt(l.res.lcce))))))), /*#__PURE__*/React.createElement("p", {
    className: "notice"
  }, "* Final LCCE = unweighted average of a location's selected fields after discarding the single high and low yields. A location needs at least ", MIN_LCCE_FIELDS, " harvested fields before an LCCE can be produced."))), d.hybrids.length ? /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Hybrid performance", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Average yield of this grower's harvested, selected fields planted to each hybrid."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "This grower's harvested selected fields grouped by hybrid"))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Brand — the seed brand planted on the field."
  }, "Brand"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Designation — the specific hybrid planted."
  }, "Hybrid"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Fields — this grower's harvested, selected fields planted to this hybrid."
  }, "Fields"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Est. Acres — estimated acres across those fields."
  }, "Est. Acres"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Average yield across those fields, relative to this grower's best-performing hybrid."
  }, "Average Yield"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Average bu/acre across those fields."
  }, "Avg bu/ac"))), /*#__PURE__*/React.createElement("tbody", null, d.hybrids.map(h => /*#__PURE__*/React.createElement("tr", {
    key: h.key
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, h.brand)), /*#__PURE__*/React.createElement("td", null, h.desig), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, h.fields), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(h.acres)), /*#__PURE__*/React.createElement("td", {
    style: {
      minWidth: 140
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mix-track",
    style: {
      display: "block",
      marginTop: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: Math.max(2, barPct(h.avg)) + "%",
      background: "linear-gradient(90deg,#a9d97a,#66b512)"
    }
  }))), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("b", null, fmt(h.avg, 1))))))))) : null, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd-l"
  }, /*#__PURE__*/React.createElement("h2", null, "Your fields (", d.noms.length, ")", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Every nominated field for this grower this crop year. Yields stay Pending until they are posted; High and Low mean the field is the discarded extreme at its location."
  })), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Read-only detail — contract, location, hybrid, harvest, and posted yield")), /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "External-facing view — calculated values only")), /*#__PURE__*/React.createElement("div", {
    className: "bd scroll-x"
  }, /*#__PURE__*/React.createElement("table", {
    className: "fields-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Field — the grower's field description."
  }, "Field"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Contract # — the production contract this field is nominated under."
  }, "Contract #"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Nomination # — the field nomination identifier."
  }, "Nom #"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant — the production site this field is nominated under and averaged within."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Location — township, section, and state recorded for the field."
  }, "Location"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Hybrid — the seed brand and designation planted on the field."
  }, "Hybrid"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Date Harvested — when the field was harvested. Fields not harvested by Nov 15 may be invalidated."
  }, "Harvested"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Standing — whether the field is Bayer-selected, a back-up, or invalid."
  }, "Standing"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Status — where the field is in the workflow (Draft, Submitted, QC, Approved)."
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Est. Acres — the field's estimated acres."
  }, "Est. Ac"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Measured Ac — the harvested acres used to convert bushels into bu/acre yield."
  }, "Measured Ac"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Yield (bu/ac) — the posted yield, or Pending until it is written from the scale tickets. High/Low tags are the discarded extremes at the location."
  }, "Yield (bu/ac)"))), /*#__PURE__*/React.createElement("tbody", null, d.noms.map(n => {
    const mark = d.markOf(n);
    const standing = standingOf(n);
    return /*#__PURE__*/React.createElement("tr", {
      key: n.id
    }, /*#__PURE__*/React.createElement("td", {
      className: "desc"
    }, n.fieldDesc || "—"), /*#__PURE__*/React.createElement("td", null, n.contract || "—"), /*#__PURE__*/React.createElement("td", null, n.nom || "—"), /*#__PURE__*/React.createElement("td", null, plantCode(store, n.group)), /*#__PURE__*/React.createElement("td", {
      className: "wrap"
    }, fieldPlace(n)), /*#__PURE__*/React.createElement("td", null, hybridLabel(n)), /*#__PURE__*/React.createElement("td", null, portalDate(n.dateHarvested)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      className: "badge " + standing.cls,
      "data-tip": standing.tip
    }, standing.label)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusBadge, {
      status: n.status || "Draft"
    })), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, fmt(n.estAcres)), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, fmt(n.measuredAcres)), /*#__PURE__*/React.createElement("td", {
      className: "right"
    }, n.invalid ? "—" : +n.buPerAcre > 0 ? /*#__PURE__*/React.createElement("b", null, fmt(n.buPerAcre)) : "Pending", mark === "high" ? /*#__PURE__*/React.createElement("span", {
      className: "badge hi",
      style: {
        marginLeft: 8
      },
      "data-tip": "Highest yield at this location — discarded before averaging."
    }, "High") : null, mark === "low" ? /*#__PURE__*/React.createElement("span", {
      className: "badge low",
      style: {
        marginLeft: 8
      },
      "data-tip": "Lowest yield at this location — discarded before averaging."
    }, "Low") : null));
  }))), /*#__PURE__*/React.createElement("p", {
    className: "notice"
  }, "Values shown reflect posted yield checks after QC and approval. Contact your Bayer site with questions.")))));
}

/* ================= Status review list ================= */
function QcApproved({
  store,
  cropYear,
  go,
  openYield
}) {
  const [filter, setFilter] = useState("all"); // all | Draft | Submitted | QC | Approved
  const order = {
    Draft: 0,
    Submitted: 1,
    QC: 2,
    Approved: 3
  };
  const all = store.state.nominations.filter(n => n.cropYear === cropYear && !n.invalid && n.status);
  const rows = all.filter(n => filter === "all" ? true : n.status === filter).sort((a, b) => order[a.status] !== order[b.status] ? order[a.status] - order[b.status] : String(a.contract).localeCompare(String(b.contract)));
  const counts = STATUSES.reduce((m, s) => {
    m[s] = all.filter(n => n.status === s).length;
    return m;
  }, {});
  const setStatus = (id, status) => {
    store.set({
      nominations: store.state.nominations.map(n => n.id === id ? {
        ...n,
        status,
        signed: true
      } : n)
    });
  };
  const approve = n => setStatus(n.id, "Approved");
  const returnToQC = n => {
    if (window.confirm("Move this Approved field back to QC for review?")) setStatus(n.id, "QC");
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Field Status", /*#__PURE__*/React.createElement(HelpDot, {
    pos: "bottom",
    tip: "Every field for the selected crop year, grouped by workflow status (Draft, Submitted, QC, Approved). Approve QC fields or send Approved fields back to QC."
  })), /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, all.length, " fields · ", STATUSES.map(s => counts[s] + " " + s).join(" · "))), /*#__PURE__*/React.createElement("div", {
    className: "row-actions status-filters"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn sec sm" + (filter === "all" ? " active" : ""),
    onClick: () => setFilter("all"),
    "data-tip": "Show fields in every status.",
    "data-tip-pos": "bottom"
  }, "All (", all.length, ")"), STATUSES.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    className: "btn sec sm" + (filter === s ? " active" : ""),
    onClick: () => setFilter(s),
    "data-tip": "Show only " + s + " fields.",
    "data-tip-pos": "bottom"
  }, s, " (", counts[s], ")")))), /*#__PURE__*/React.createElement("div", {
    className: "bd",
    style: {
      padding: 0,
      overflowX: "auto"
    }
  }, rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty",
    style: {
      padding: 24
    }
  }, "No fields for this crop year.") : /*#__PURE__*/React.createElement("table", {
    className: "fields-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Cooperator — the grower for this field."
  }, "Cooperator"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Contract # — the field's contract identifier."
  }, "Contract #"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Nomination # — the field nomination identifier."
  }, "Nom #"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Field — the field description."
  }, "Field"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Plant — the production site this field is nominated under."
  }, "Plant"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Measured Ac — the field's measured acres."
  }, "Measured Ac"), /*#__PURE__*/React.createElement("th", {
    className: "right",
    "data-tip": "Bu / Acre Yield — the field's posted yield."
  }, "Bu / Ac Yield"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Status — where the field is in the workflow (Draft, Submitted, QC, Approved)."
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "Actions — approve a QC field or send an Approved field back to QC."
  }, "Actions"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(n => /*#__PURE__*/React.createElement("tr", {
    key: n.id
  }, /*#__PURE__*/React.createElement("td", null, n.coop, " — ", coopName(store, n.coop)), /*#__PURE__*/React.createElement("td", null, n.contract), /*#__PURE__*/React.createElement("td", null, n.nom), /*#__PURE__*/React.createElement("td", {
    className: "desc"
  }, n.fieldDesc), /*#__PURE__*/React.createElement("td", null, plantCode(store, n.group)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fmt(n.measuredAcres)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, /*#__PURE__*/React.createElement("b", null, n.buPerAcre ? fmt(n.buPerAcre) : "Pending")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusBadge, {
    status: n.status
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "row-actions"
  }, n.status === "QC" ? /*#__PURE__*/React.createElement("button", {
    className: "btn sm",
    onClick: () => approve(n),
    "data-tip": "Approve this yield check and mark the field Approved."
  }, "Approve") : n.status === "Approved" ? /*#__PURE__*/React.createElement("button", {
    className: "btn sec sm",
    onClick: () => returnToQC(n),
    "data-tip": "Move this Approved field back to QC for further review."
  }, "Return to QC") : null, openYield || go ? /*#__PURE__*/React.createElement("button", {
    className: "btn sec sm",
    onClick: () => openYield ? openYield(n.contract) : go("yield"),
    "data-tip": "Open the Yield Check report for this field."
  }, "Yield Check") : null)))))))));
}

/* ================= About / screen guide ================= */
function Help() {
  const [showWalk, setShowWalk] = useState(false);
  const rows = [["Plant", "Create and maintain the production sites, and choose which fields belong to each."], ["Cooperators", "Create, display, and change the growers you contract with."], ["Nominations", "Nominate fields, mark them Bayer-selected or invalid, and record harvest."], ["Scale Tickets", "Enter each load's gross, tare, and moisture for a selected field."], ["Yield Check", "Review the calculated yield for a field, then sign and send it to QC, or approve it."], ["Approval Status", "See every field grouped by workflow status; approve QC fields or send Approved fields back to QC."], ["LCCE Location", "Final step: discard high/low, average the rest, calculate final bushels, and export the SAP settlement file."], ["Grower Portal", "Preview the read-only results a cooperator sees for their own fields, yields, and location LCCE."]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("h2", null, "About", /*#__PURE__*/React.createElement(HelpDot, {
    tip: "What each screen in the app does, plus the formulas used throughout."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("p", {
    className: "help"
  }, "This tool digitizes the LCCE (Local Commercial Corn Equivalent) workflow for dryland contracts. Data can be entered, calculated, QC'd/approved, and exported. Here's what each screen is for."), /*#__PURE__*/React.createElement("table", {
    style: {
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    "data-tip": "Screen — the page in this app."
  }, "Screen"), /*#__PURE__*/React.createElement("th", {
    "data-tip": "What it does — the purpose of the screen."
  }, "What it does"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r[0]
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, r[0])), /*#__PURE__*/React.createElement("td", null, r[1]))))), /*#__PURE__*/React.createElement("p", {
    className: "notice",
    style: {
      marginTop: 14
    }
  }, "Calculations: Net = Gross − Tare · Moisture shrink 1.4%/pt > 15.0% · 56 lbs = 1 bu · LCCE = avg of selected fields after discarding high & low · Final Bu = (40%×LCCE)+(60%×GYI×LCCE)+Premium."))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bd"
  }, /*#__PURE__*/React.createElement("button", {
    className: "walk-toggle" + (showWalk ? " open" : ""),
    onClick: () => setShowWalk(v => !v),
    "aria-expanded": showWalk,
    "data-tip": "Click to open (or close) a complete step-by-step walkthrough of the app, from setting up a grower to exporting the final LCCE report."
  }, /*#__PURE__*/React.createElement("span", {
    className: "walk-ic",
    "aria-hidden": "true"
  }, "▶"), /*#__PURE__*/React.createElement("span", {
    className: "walk-tx"
  }, /*#__PURE__*/React.createElement("span", {
    className: "walk-tt"
  }, "How to use this app — full walkthrough"), /*#__PURE__*/React.createElement("span", {
    className: "walk-sub"
  }, showWalk ? "Click to collapse the guide." : "Click to expand a detailed, start-to-finish step-by-step guide.")), /*#__PURE__*/React.createElement("span", {
    className: "walk-chev",
    "aria-hidden": "true"
  }, "›")), showWalk ? /*#__PURE__*/React.createElement(Walkthrough, null) : null)));
}

/* Detailed start-to-finish guide, shown when the About walkthrough is expanded. */
function Walkthrough() {
  const steps = [{
    screen: "Getting started",
    title: "Get oriented",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "Before entering data, take a moment to learn the layout so everything below makes sense."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Left sidebar"), " — every screen lives here, grouped into ", /*#__PURE__*/React.createElement("i", null, "Overview"), ", ", /*#__PURE__*/React.createElement("i", null, "Data Entry"), ", ", /*#__PURE__*/React.createElement("i", null, "Reporting"), ", and ", /*#__PURE__*/React.createElement("i", null, "System"), ". Click a name to switch screens."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Crop Year"), " — the dropdown at the top right filters the whole app to one harvest year (default ", /*#__PURE__*/React.createElement("span", {
      className: "walk-code"
    }, "2026"), "). Set this first; every screen shows only that year's data."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Tooltips"), " — hover almost any button, column, or field to see a short explanation. Click a small ", /*#__PURE__*/React.createElement("b", null, "?"), " circle for help about a whole section."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Dashboard"), " — your home base. It shows the key numbers (Average LCCE, Selected Fields, Harvested, and Pending QC / Approval), an ", /*#__PURE__*/React.createElement("b", null, "LCCE by Location"), " table, and a row of ", /*#__PURE__*/React.createElement("b", null, "Workflow shortcuts"), " that jump straight to the next task.")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "Tip:"), " All work follows this status path: ", /*#__PURE__*/React.createElement("span", {
      className: "walk-code"
    }, "Draft → Submitted → QC → Approved"), ". Keep that flow in mind as you go."))
  }, {
    screen: "Plant",
    title: "Set up the plants (production sites)",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "A plant is a production site. Your cooperators and their nominated fields all belong to one, and each plant's selected fields are averaged into its own LCCE. The two sample plants are already set up — skip ahead if they cover you."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "Open ", /*#__PURE__*/React.createElement("b", null, "Plant"), " from the sidebar (under ", /*#__PURE__*/React.createElement("i", null, "Data Entry"), ", above Cooperators)."), /*#__PURE__*/React.createElement("li", null, "The table lists each plant with its ", /*#__PURE__*/React.createElement("b", null, "Plant Name"), ", ", /*#__PURE__*/React.createElement("b", null, "Area"), ", ", /*#__PURE__*/React.createElement("b", null, "Growing Location"), ", and — for the crop year selected at the top right — how many ", /*#__PURE__*/React.createElement("b", null, "Cooperators"), " and ", /*#__PURE__*/React.createElement("b", null, "Fields"), " it holds plus its current ", /*#__PURE__*/React.createElement("b", null, "LCCE"), "."), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "+ Create"), " to add a plant. Enter the ", /*#__PURE__*/React.createElement("b", null, "Plant"), " code (e.g. ", /*#__PURE__*/React.createElement("span", {
      className: "walk-code"
    }, "8H13"), ") and ", /*#__PURE__*/React.createElement("b", null, "Plant Name"), " (both required, marked ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#e11",
        fontWeight: 700
      }
    }, "*"), "). ", /*#__PURE__*/React.createElement("b", null, "Area"), " and ", /*#__PURE__*/React.createElement("b", null, "Growing Location"), " are optional description."), /*#__PURE__*/React.createElement("li", null, "Under ", /*#__PURE__*/React.createElement("b", null, "Fields in this plant"), ", tick the nominated fields that belong to the plant. A field can only be in one plant, so ticking it here moves it out of its old one."), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "Save"), ". To change a plant later, open the ", /*#__PURE__*/React.createElement("b", null, "⋮"), " menu at the start of its row and choose ", /*#__PURE__*/React.createElement("b", null, "Edit plant"), " (or just click the row). The same menu has ", /*#__PURE__*/React.createElement("b", null, "Delete plant"), ", which works once no fields or cooperators are assigned to it.")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "Why this matters:"), " The LCCE is calculated per plant, so a field that sits in no plant never reaches the location report. Plant codes must be unique, since they identify the plant on every other screen."))
  }, {
    screen: "Cooperators",
    title: "Set up the grower (Cooperator)",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "Start with the person you contract with. If the grower already exists, skip to Step 3."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "Open ", /*#__PURE__*/React.createElement("b", null, "Cooperators"), " from the sidebar (under ", /*#__PURE__*/React.createElement("i", null, "Data Entry"), ")."), /*#__PURE__*/React.createElement("li", null, "Use the ", /*#__PURE__*/React.createElement("b", null, "Plant"), " and ", /*#__PURE__*/React.createElement("b", null, "Cooperator Number"), " filters and click ", /*#__PURE__*/React.createElement("b", null, "Go"), " to search for an existing grower."), /*#__PURE__*/React.createElement("li", null, "To add a new grower, click ", /*#__PURE__*/React.createElement("b", null, "+ Create"), ". Fill in the required fields (marked with ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#e11",
        fontWeight: 700
      }
    }, "*"), "): ", /*#__PURE__*/React.createElement("b", null, "Name, Plant, Address, City"), ". The ", /*#__PURE__*/React.createElement("b", null, "Plant"), " is the production site this grower contracts with. Add any optional details."), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "Save"), ". To change a grower later, click their row to reopen the edit dialog."), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "Export"), " any time to download the grower list as a CSV.")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "Why this matters:"), " Every field you nominate is tied to a cooperator, so the grower must exist first."))
  }, {
    screen: "Nominations",
    title: "Nominate the fields",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "Tell the system which fields belong to this year's LCCE and which the grower actually planted."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "Open ", /*#__PURE__*/React.createElement("b", null, "Nominations"), " (labeled ", /*#__PURE__*/React.createElement("i", null, "Selected LCCE Fields"), " at the top)."), /*#__PURE__*/React.createElement("li", null, "Set the filters — ", /*#__PURE__*/React.createElement("b", null, "Plant, Crop Year, Scenario, Growing Location, Cooperator"), " — and click ", /*#__PURE__*/React.createElement("b", null, "Go"), ". Plant and Crop Year are the two that matter; the rest are optional."), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "Create"), " to add an editable field row, or select a row (radio button on the left) and click ", /*#__PURE__*/React.createElement("b", null, "Edit"), " to change one. Pick the ", /*#__PURE__*/React.createElement("b", null, "Cooperator"), " and fill the required columns (marked ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#e11",
        fontWeight: 700
      }
    }, "*"), "): ", /*#__PURE__*/React.createElement("b", null, "Measured Area, Township, State, Section,"), " and ", /*#__PURE__*/React.createElement("b", null, "Field Description"), ". Add the ", /*#__PURE__*/React.createElement("b", null, "Date Harvested"), " too."), /*#__PURE__*/React.createElement("li", null, "Mark each field:", /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Bayer Selected"), " — include this field in the LCCE calculation."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Invalid"), " — exclude the field (you must give a reason). Invalid fields never count toward LCCE."))), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "Save"), ". Once a field is Bayer Selected, select its row and click ", /*#__PURE__*/React.createElement("b", null, "Weights"), " to jump straight to Scale Tickets for it (or ", /*#__PURE__*/React.createElement("b", null, "Yield Check Form"), " to open its yield report).")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "Tip:"), " You need at least 3 valid selected fields per location for the LCCE math (Step 7) to work, because the highest and lowest are discarded."))
  }, {
    screen: "Scale Tickets",
    title: "Enter the scale tickets (weights)",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "Record every load hauled from the field so the app can calculate the yield."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "Open ", /*#__PURE__*/React.createElement("b", null, "Scale Tickets"), " (labeled ", /*#__PURE__*/React.createElement("i", null, "Weight"), "), or arrive here via the ", /*#__PURE__*/React.createElement("b", null, "Weights"), " button from Nominations."), /*#__PURE__*/React.createElement("li", null, "If more than one field is selected this crop year, pick the one you're weighing from the ", /*#__PURE__*/React.createElement("b", null, "Field"), " dropdown. Confirm the crop year, cooperator, and field details shown just below it."), /*#__PURE__*/React.createElement("li", null, "In the ", /*#__PURE__*/React.createElement("b", null, "Product Parts"), " table, click ", /*#__PURE__*/React.createElement("b", null, "Create"), " to add a load. The ", /*#__PURE__*/React.createElement("b", null, "Scale Ticket"), " number is pre-filled (A1, A2…) — change it if needed."), /*#__PURE__*/React.createElement("li", null, "Enter ", /*#__PURE__*/React.createElement("b", null, "Gross Weight"), ", ", /*#__PURE__*/React.createElement("b", null, "Tare Weight"), ", ", /*#__PURE__*/React.createElement("b", null, "Moisture %"), ", ", /*#__PURE__*/React.createElement("b", null, "Test Weight"), ", and the ", /*#__PURE__*/React.createElement("b", null, "Elevator"), ". ", /*#__PURE__*/React.createElement("b", null, "Net Weight"), " fills in automatically (Gross − Tare) and can't be typed in. Click ", /*#__PURE__*/React.createElement("b", null, "Create"), " again for each additional load."), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "Save"), " to store the loads. (Use ", /*#__PURE__*/React.createElement("b", null, "Edit"), " to change saved tickets, or tick a row's checkbox and ", /*#__PURE__*/React.createElement("b", null, "Delete"), " to remove it.)"), /*#__PURE__*/React.createElement("li", null, "In the ", /*#__PURE__*/React.createElement("b", null, "Contract Summary"), " panel, review Total Bushels and the ", /*#__PURE__*/React.createElement("b", null, "Yield (bu/ac)"), ", then click ", /*#__PURE__*/React.createElement("b", null, "Post … bu/ac to Nomination"), ". This writes the yield back to the field and moves a Draft field to ", /*#__PURE__*/React.createElement("b", null, "Submitted"), ".")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "How the numbers work:"), " moisture over 15.0% is shrunk by 1.4% per point, and 56 lbs = 1 bushel. Yield = total bushels ÷ measured acres."))
  }, {
    screen: "Yield Check",
    title: "Review, sign, and send to QC",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "Confirm the calculated yield for a field and move it forward in the workflow."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "Open ", /*#__PURE__*/React.createElement("b", null, "Yield Check"), " from the sidebar (or the ", /*#__PURE__*/React.createElement("b", null, "Yield Check Form"), " button on a Nomination row)."), /*#__PURE__*/React.createElement("li", null, "Choose the field from the ", /*#__PURE__*/React.createElement("b", null, "Contract Number - Field"), " dropdown at the top."), /*#__PURE__*/React.createElement("li", null, "Review the scale-ticket breakdown and the calculated ", /*#__PURE__*/React.createElement("b", null, "Bu / Acre Yield"), " on the ", /*#__PURE__*/React.createElement("i", null, "Yield Check Information Report"), ". Make sure it looks correct."), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "Sign & Send to QC"), ". The field's status becomes ", /*#__PURE__*/React.createElement("b", null, "QC"), ". A field already in QC shows only ", /*#__PURE__*/React.createElement("b", null, "Approve"), " here; an approved field shows only ", /*#__PURE__*/React.createElement("b", null, "Return to QC"), "."), /*#__PURE__*/React.createElement("li", null, "Once the field is ", /*#__PURE__*/React.createElement("b", null, "Approved"), ", an ", /*#__PURE__*/React.createElement("b", null, "Export"), " menu appears next to the contract dropdown with ", /*#__PURE__*/React.createElement("b", null, "Export CSV"), " and ", /*#__PURE__*/React.createElement("b", null, "Print Report"), " for a spreadsheet or a paper/PDF copy.")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "Tip:"), " If something looks wrong, go back to Scale Tickets, correct the loads, and re-post before signing."))
  }, {
    screen: "Approval Status",
    title: "Quality-check and approve",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "This is the review desk for every field, grouped by where it sits in the workflow."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "Open ", /*#__PURE__*/React.createElement("b", null, "Approval Status"), " (titled ", /*#__PURE__*/React.createElement("i", null, "Field Status"), ")."), /*#__PURE__*/React.createElement("li", null, "Use the ", /*#__PURE__*/React.createElement("b", null, "All / Draft / Submitted / QC / Approved"), " filter buttons (each shows a live count) to focus the list."), /*#__PURE__*/React.createElement("li", null, "For a field in ", /*#__PURE__*/React.createElement("b", null, "QC"), ", click ", /*#__PURE__*/React.createElement("b", null, "Approve"), " to finalize it (status becomes ", /*#__PURE__*/React.createElement("b", null, "Approved"), ")."), /*#__PURE__*/React.createElement("li", null, "If an approved field needs another look, click ", /*#__PURE__*/React.createElement("b", null, "Return to QC"), " to send it back."), /*#__PURE__*/React.createElement("li", null, "Click ", /*#__PURE__*/React.createElement("b", null, "Yield Check"), " on any row to open its full detail report.")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "Why this matters:"), " Only fields that are properly reviewed should feed into the location LCCE in the next step."))
  }, {
    screen: "LCCE Location",
    title: "Lock the location LCCE and export for SAP",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "This is the final step — it turns field yields into the official location LCCE, Final Bushels, and the SAP settlement file."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "Open ", /*#__PURE__*/React.createElement("b", null, "LCCE Location"), " (titled ", /*#__PURE__*/React.createElement("i", null, "LCCE Location Report"), "). The banner marks it as ", /*#__PURE__*/React.createElement("b", null, "Final step"), "."), /*#__PURE__*/React.createElement("li", null, "For each plant, the screen lists selected fields with vendor, contract, material, acres, and yield. Discarded ", /*#__PURE__*/React.createElement("b", null, "HIGH"), " and ", /*#__PURE__*/React.createElement("b", null, "LOW"), " fields are flagged and struck through."), /*#__PURE__*/React.createElement("li", null, "The app automatically ", /*#__PURE__*/React.createElement("b", null, "discards the single highest and single lowest"), " field and averages the rest — that average is the ", /*#__PURE__*/React.createElement("b", null, "Location Commercial Corn Equivalent"), ". (You need at least 3 fields for this to run.)"), /*#__PURE__*/React.createElement("li", null, "Enter the ", /*#__PURE__*/React.createElement("b", null, "GYI"), " (Grower Yield Index) and ", /*#__PURE__*/React.createElement("b", null, "Rotation/Isolation Premium"), ". Final Bushels updates live: ", /*#__PURE__*/React.createElement("span", {
      className: "walk-code"
    }, "(40% × LCCE) + (60% × GYI × LCCE) + Premium"), "."), /*#__PURE__*/React.createElement("li", null, "Review the ", /*#__PURE__*/React.createElement("b", null, "SAP Settlement Package"), ": plant totals plus one posting line per production contract (vendor, contract, material, Final Bushels, settlement quantity)."), /*#__PURE__*/React.createElement("li", null, "When the package is ", /*#__PURE__*/React.createElement("b", null, "Ready for SAP"), ", click ", /*#__PURE__*/React.createElement("b", null, "Export for SAP"), " to download the settlement CSV, or ", /*#__PURE__*/React.createElement("b", null, "Print"), " for a paper/PDF copy.")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "You're done!"), " The SAP file is the end deliverable — load it in the settlement transaction. Locations still in QC show as Provisional until every contract is Approved."))
  }, {
    screen: "Grower Portal",
    title: "Preview the grower's view (optional)",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "See exactly what the grower sees without changing anything."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "Open ", /*#__PURE__*/React.createElement("b", null, "Grower Portal"), " (under ", /*#__PURE__*/React.createElement("i", null, "Overview"), ")."), /*#__PURE__*/React.createElement("li", null, "Pick the grower's name from the list."), /*#__PURE__*/React.createElement("li", null, "Review the summary tiles, field status, ranked yields, grain deliveries, location LCCE, and the field table — this is the external, look-only view you can share.")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "Tip:"), " Nothing here can be edited, so it's safe to show a grower directly."))
  }, {
    screen: "System",
    title: "Save and export",
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, "A few housekeeping actions to finish up."), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Your data saves automatically"), " in this browser as you work — there is no separate save button for the whole app."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Export"), " to CSV is available on Plant, Cooperators, Nominations, and Scale Tickets. The LCCE Location screen is the final step: use ", /*#__PURE__*/React.createElement("b", null, "Export for SAP"), " there to download the settlement file.")), /*#__PURE__*/React.createElement("div", {
      className: "walk-tip"
    }, /*#__PURE__*/React.createElement("b", null, "That's the full loop:"), " Cooperator → Nominate fields → Scale tickets → Yield check → QC/Approve → LCCE location report."))
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "walk-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "walk-intro"
  }, "Follow these steps in order to take a contract all the way from a brand-new grower to a finished, approved LCCE location report. Each step names the ", /*#__PURE__*/React.createElement("b", null, "screen"), " to open in the sidebar and exactly what to do there."), steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "walk-step",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "walk-num"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "walk-c"
  }, /*#__PURE__*/React.createElement("h4", null, s.title, /*#__PURE__*/React.createElement("span", {
    className: "walk-scr"
  }, s.screen)), s.body))));
}

/* ================= App shell ================= */
/* Shown only while the first read of the server document is in flight, and in
   place of the app if that read fails — rendering the screens against no data
   at all would just be a blank page with no explanation. */
function Boot({
  error,
  onRetry
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 520,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 8px",
      fontSize: 18
    }
  }, "LCCE Manager"), error ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Flash, {
    msg: {
      ok: false,
      text: "Your data could not be loaded — " + error + ". The app has not started, so nothing has been changed or lost."
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "row-actions",
    style: {
      justifyContent: "center",
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onRetry
  }, "Try again"))) : /*#__PURE__*/React.createElement("div", {
    className: "help"
  }, "Loading your data…")));
}
function App() {
  // Served mode starts empty and fills in from the server; file:// mode reads
  // localStorage synchronously exactly as it always has.
  const [state, setState] = useState(SERVED ? null : loadState);
  const [bootError, setBootError] = useState(null);
  const [flash, setFlash] = useState(null);
  const [view, setView] = useState("dashboard");
  const [cropYear, setCropYear] = useState(2026);
  const [ticketNomId, setTicketNomId] = useState(null);
  const [yieldContract, setYieldContract] = useState(null);
  const [showCombine, setShowCombine] = useState(false);
  const brandClicks = useRef({
    count: 0,
    last: 0
  });
  /* Everything the save path needs that must not trigger a render:
     version   – what the server said it held after our last accepted write
     ready     – the first load has landed, so edits are the user's, not ours
     skipNext  – the very next state change is the server's own copy arriving
     pending   – the newest state not yet acknowledged by the server
     stopped   – a conflict was hit; stop writing rather than overwrite */
  const persist = useRef({
    version: 0,
    ready: !SERVED,
    skipNext: false,
    pending: null,
    timer: null,
    sending: false,
    again: false,
    stopped: false
  });
  useEffect(() => {
    if (!SERVED) return;
    let live = true;
    bootRemoteState().then(result => {
      if (!live) return;
      const p = persist.current;
      p.version = result.version;
      p.ready = true;
      p.skipNext = true; // the state about to be set IS the server's, so don't write it back
      setState(result.state);
      if (result.adopted) {
        setFlash({
          ok: true,
          text: "Your existing data has been moved into this computer's LCCE database and is now the copy of record. The copy in this browser has been left alone as a fallback."
        });
      }
    }, err => {
      if (live) setBootError(err.message || String(err));
    });
    return () => {
      live = false;
    };
  }, []);
  const flushNow = useCallback(async () => {
    const p = persist.current;
    if (p.stopped) return;
    if (p.sending) {
      p.again = true;
      return;
    } // coalesce: one write in flight at a time
    if (p.pending === null) return;
    const payload = p.pending;
    p.sending = true;
    try {
      const saved = await apiWrite(p.version, payload);
      p.version = saved.version;
      if (p.pending === payload) p.pending = null;
      setFlash(f => f && f.fromSave ? null : f);
    } catch (err) {
      if (err.conflict) {
        p.stopped = true;
        setFlash({
          fromSave: true,
          ok: false,
          conflict: true,
          text: "Another tab or window has changed this data since this page loaded, so your latest change was not saved. Reload to pick up that copy if you need what is on this screen."
        });
      } else {
        // Keep `pending`: the next edit reschedules, and unload still tries.
        setFlash({
          fromSave: true,
          ok: false,
          text: "Your latest change could not be saved (" + err.message + "). It is still on screen and will be sent again with your next edit."
        });
      }
    } finally {
      p.sending = false;
      if (!p.stopped && p.again) {
        p.again = false;
        flushNow();
      }
    }
  }, []);
  useEffect(() => {
    if (!SERVED) {
      saveState(state);
      return;
    }
    const p = persist.current;
    if (!p.ready || state === null) return;
    if (p.skipNext) {
      p.skipNext = false;
      return;
    }
    p.pending = state;
    if (p.timer) clearTimeout(p.timer);
    p.timer = setTimeout(() => {
      p.timer = null;
      flushNow();
    }, SAVE_DEBOUNCE_MS);
  }, [state, flushNow]);

  // A debounce means the last few hundred milliseconds of typing are still only
  // in memory when a tab is closed, so force them out on the way past.
  useEffect(() => {
    if (!SERVED) return;
    const flush = () => {
      const p = persist.current;
      if (p.stopped || p.pending === null) return;
      if (p.timer) {
        clearTimeout(p.timer);
        p.timer = null;
      }
      const saved = apiWriteSync(p.version, p.pending);
      if (saved && saved.version) {
        p.version = saved.version;
        p.pending = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Good news doesn't need dismissing; a failure stays until it is dealt with.
  useEffect(() => {
    if (!flash || !flash.ok) return;
    const id = setTimeout(() => setFlash(null), 9000);
    return () => clearTimeout(id);
  }, [flash]);

  // Easter egg: click the "LCCE Manager" title 4 times in a row to send a
  // combine through the corn — a big centered popup that plays for 5 seconds.
  const onBrandClick = () => {
    const now = Date.now();
    const c = brandClicks.current;
    c.count = now - c.last > 1200 ? 1 : c.count + 1;
    c.last = now;
    if (c.count >= 4) {
      c.count = 0;
      setShowCombine(true);
    }
  };
  useEffect(() => {
    if (!showCombine) return;
    const id = setTimeout(() => setShowCombine(false), 5000);
    return () => clearTimeout(id);
  }, [showCombine]);

  // Every hook above runs on every render; the gate has to sit below them all.
  // Once state has arrived the tree below is exactly what it always was.
  if (state === null) return /*#__PURE__*/React.createElement(Boot, {
    error: bootError,
    onRetry: () => location.reload()
  });
  const store = {
    state,
    set: patch => setState(s => {
      const next = typeof patch === "function" ? patch(s) : patch;
      return {
        ...s,
        ...next
      };
    })
  };
  const openWeights = id => {
    setTicketNomId(id || null);
    setView("tickets");
  };
  const openYield = contract => {
    setYieldContract(contract || null);
    setView("yield");
  };
  const NAV = [{
    grp: "Overview",
    items: [["dashboard", "Dashboard"], ["grower", "Grower Portal"]]
  }, {
    grp: "Data Entry",
    items: [["groups", "Plant"], ["cooperators", "Cooperators"], ["nominations", "Nominations"], ["tickets", "Scale Tickets"]]
  }, {
    grp: "Reporting",
    items: [["yield", "Yield Check"], ["review", "Approval Status"], ["lcce", "LCCE Report & Export"]]
  }, {
    grp: "System",
    items: [["help", "About"]]
  }];
  const NAV_TIPS = {
    dashboard: "Dashboard — program overview for the selected crop year: key totals and the LCCE result per location.",
    grower: "Grower Portal — the read-only view a cooperator sees: their fields, harvest progress, grain delivered, and how those fields sit against the location LCCE.",
    groups: "Plant — create and maintain the production sites, and choose which fields belong to each one. Cooperators and their nominations all sit under a plant.",
    cooperators: "Cooperators — create and maintain grower records: name, address, and contact details.",
    nominations: "Nominations / Selected LCCE Fields — nominate fields, mark Bayer-selected or invalid, and record harvest.",
    tickets: "Scale Tickets / Weight — enter each load's gross, tare, and moisture; the app computes net weight and bushels.",
    yield: "Yield Check — review the calculated bu/acre for a field, then sign and send it to QC.",
    review: "Approval Status — a list of every field grouped by workflow status; approve QC fields or send Approved fields back to QC.",
    lcce: "LCCE Report & Export — the final step. Discard high/low, calculate final bushels, and export the SAP settlement file.",
    help: "About — what each screen does, plus the formulas used throughout."
  };
  const titles = {
    dashboard: ["Dashboard", "LCCE program overview"],
    grower: ["Grower Portal", "Read-only field results a cooperator sees"],
    groups: ["Manage Plants", "Create, display & change plants"],
    cooperators: ["Manage Cooperators", "Create, display & change growers"],
    nominations: ["Selected LCCE Fields", "Nominate, draw, invalidate & record harvest"],
    tickets: ["Weight", "Scale tickets & moisture"],
    yield: ["Yield Check", "Verify & sign yield report"],
    review: ["Status", "Review fields by workflow status"],
    lcce: ["LCCE Location Report", "Final step — review, lock, and export for SAP"],
    help: ["About", "Screen guide & formulas"]
  };
  const [t, sub] = titles[view] || ["", ""];
  let body = null;
  if (view === "dashboard") body = /*#__PURE__*/React.createElement(Dashboard, {
    store: store,
    cropYear: cropYear,
    go: setView
  });else if (view === "groups") body = /*#__PURE__*/React.createElement(Groups, {
    store: store,
    cropYear: cropYear
  });else if (view === "cooperators") body = /*#__PURE__*/React.createElement(Cooperators, {
    store: store
  });else if (view === "nominations") body = /*#__PURE__*/React.createElement(Nominations, {
    store: store,
    cropYear: cropYear,
    go: setView,
    openWeights: openWeights,
    openYield: openYield
  });else if (view === "tickets") body = /*#__PURE__*/React.createElement(ScaleTickets, {
    store: store,
    cropYear: cropYear,
    go: setView,
    nomId: ticketNomId,
    setNomId: setTicketNomId
  });else if (view === "yield") body = /*#__PURE__*/React.createElement(YieldCheck, {
    store: store,
    cropYear: cropYear,
    yieldContract: yieldContract,
    setYieldContract: setYieldContract
  });else if (view === "review") body = /*#__PURE__*/React.createElement(QcApproved, {
    store: store,
    cropYear: cropYear,
    go: setView,
    openYield: openYield
  });else if (view === "lcce") body = /*#__PURE__*/React.createElement(LcceReport, {
    store: store,
    cropYear: cropYear
  });else if (view === "grower") body = /*#__PURE__*/React.createElement(GrowerPortal, {
    store: store,
    cropYear: cropYear
  });else if (view === "help") body = /*#__PURE__*/React.createElement(Help, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(GuideTooltips, null), flash ? /*#__PURE__*/React.createElement("div", {
    className: "no-print",
    style: {
      position: "fixed",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 200,
      width: "min(760px, calc(100% - 32px))",
      borderRadius: 8,
      boxShadow: "0 10px 30px rgba(0,0,0,.18)"
    }
  }, /*#__PURE__*/React.createElement(Flash, {
    msg: flash,
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row-actions",
    style: {
      marginTop: 10
    }
  }, flash.conflict ? /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => location.reload()
  }, "Reload this page") : null, /*#__PURE__*/React.createElement("button", {
    className: "btn sec",
    onClick: () => setFlash(null)
  }, "Dismiss")))) : null, showCombine && /*#__PURE__*/React.createElement("div", {
    className: "combine-egg no-print",
    onClick: () => setShowCombine(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "combine-scene"
  }, /*#__PURE__*/React.createElement("div", {
    className: "corn-field"
  }, [86, 74, 62, 50, 38, 26, 14, 6].map(x => /*#__PURE__*/React.createElement("span", {
    key: x,
    className: "cornstalk",
    style: {
      left: x + "%",
      animationDelay: Math.max(0, (95 - x) / 30).toFixed(2) + "s"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 40 120",
    preserveAspectRatio: "xMidYMax meet",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 120 L20 14",
    stroke: "#3f8f1f",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "10",
    cy: "42",
    rx: "10",
    ry: "5",
    fill: "#5cb82c",
    transform: "rotate(-18 10 42)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "30",
    cy: "54",
    rx: "10",
    ry: "5",
    fill: "#4aa522",
    transform: "rotate(18 30 54)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "9",
    cy: "68",
    rx: "9",
    ry: "4.5",
    fill: "#5cb82c",
    transform: "rotate(-16 9 68)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "31",
    cy: "82",
    rx: "9",
    ry: "4.5",
    fill: "#4aa522",
    transform: "rotate(16 31 82)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "20",
    cy: "12",
    rx: "4",
    ry: "8",
    fill: "#e2b13a"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "combine-ground"
  }), /*#__PURE__*/React.createElement("div", {
    className: "combine-rig"
  }, /*#__PURE__*/React.createElement("img", {
    className: "combine-egg-img",
    src: "assets/combine.gif",
    alt: "Combine harvesting corn"
  }), /*#__PURE__*/React.createElement("span", {
    className: "puff p1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "puff p2"
  }), /*#__PURE__*/React.createElement("span", {
    className: "puff p3"
  })))), /*#__PURE__*/React.createElement("aside", {
    className: "side no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "brand-logo",
    viewBox: "0 0 64 64",
    "aria-hidden": "true",
    focusable: "false"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "bayerRing",
    x1: "12%",
    y1: "8%",
    x2: "88%",
    y2: "92%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#8cc63f"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#00bcff"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "32",
    r: "29.25",
    fill: "none",
    stroke: "url(#bayerRing)",
    strokeWidth: "2.75"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#fff",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "10",
    fontWeight: "700",
    textAnchor: "middle",
    dominantBaseline: "central"
  }, /*#__PURE__*/React.createElement("text", {
    x: "13.5",
    y: "32.2"
  }, "B"), /*#__PURE__*/React.createElement("text", {
    x: "22.75",
    y: "32.2"
  }, "A"), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "32.2"
  }, "Y"), /*#__PURE__*/React.createElement("text", {
    x: "41.25",
    y: "32.2"
  }, "E"), /*#__PURE__*/React.createElement("text", {
    x: "50.5",
    y: "32.2"
  }, "R"), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "13.5"
  }, "B"), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "22.75"
  }, "A"), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "41.25"
  }, "E"), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "50.5"
  }, "R"))), /*#__PURE__*/React.createElement("div", {
    className: "brand-text"
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onBrandClick,
    "data-tip": "LCCE Manager digitizes Bayer's dryland Local Commercial Corn Equivalent workflow: cooperators, field nominations, scale tickets, yield checks, and the final location LCCE.",
    "data-tip-pos": "bottom"
  }, "LCCE Manager"), /*#__PURE__*/React.createElement("small", {
    className: "brand-sub"
  }, "(Local Commercial Corn Equivalent)"))), /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, NAV.map(sec => /*#__PURE__*/React.createElement("div", {
    key: sec.grp
  }, /*#__PURE__*/React.createElement("div", {
    className: "grp"
  }, sec.grp), sec.items.map(([id, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    className: view === id ? "active" : "",
    onClick: () => setView(id),
    "data-tip": NAV_TIPS[id],
    "data-tip-pos": "bottom"
  }, label)))))), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement("header", {
    className: "top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, t), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, sub)), /*#__PURE__*/React.createElement("div", {
    className: "cropsel"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pill",
    "data-tip": "Crop Year filter — sets the harvest year every screen reports on. The seeded sample data is for 2026.",
    "data-tip-pos": "bottom"
  }, "Crop Year"), /*#__PURE__*/React.createElement("select", {
    value: cropYear,
    onChange: e => setCropYear(+e.target.value),
    style: {
      padding: "8px 10px",
      border: "1px solid var(--line)",
      borderRadius: 8
    },
    "data-tip": "Switch the active crop year. Choose 2026 to see the sample fields and yields.",
    "data-tip-pos": "bottom"
  }, CROP_YEARS.map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y))))), /*#__PURE__*/React.createElement("div", {
    className: "content" + (view === "dashboard" || view === "grower" || view === "groups" || view === "cooperators" || view === "nominations" || view === "tickets" || view === "review" || view === "lcce" ? " wide" : "")
  }, body)));
}
const rootEl = document.getElementById("root");
try {
  if (typeof React === "undefined" || typeof ReactDOM === "undefined") {
    throw new Error("React failed to load. Make sure the 'vendor' folder sits next to index.html.");
  }
  ReactDOM.createRoot(rootEl).render(/*#__PURE__*/React.createElement(App, null));
} catch (err) {
  rootEl.innerHTML = '<div style="padding:40px;font-family:Segoe UI,Arial,sans-serif;color:#a3271b">' + '<h2>Unable to start LCCE Manager</h2><p>' + (err && err.message ? err.message : err) + '</p></div>';
}