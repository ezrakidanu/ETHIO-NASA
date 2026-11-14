(function () {
  'use strict';

  const STORAGE_KEY = 'ethio-orbit-career-v2';
  const STARTING_FUNDS = 250_000_000;

  const PARTS = {
    structure: [
      { id: 'ella-a1', name: 'ELLA-A1 Aluminium Bus', maker: 'MG FLIGHT SYSTEMS', detail: 'Compact alloy frame · 1.6 t · starter platform', cost: 0, massKg: 1600, material: '#b7c5d2', ownedByDefault: true },
      { id: 'awash-t2', name: 'AWASH-T2 Titanium Bus', maker: 'AWASH ORBITAL', detail: 'Reinforced titanium · 2.2 t · higher thermal margin', cost: 22_000_000, massKg: 2200, material: '#b59c74' },
      { id: 'abay-c3', name: 'ABAY-C3 Composite Bus', maker: 'ABAY ADVANCED', detail: 'Carbon-composite frame · 1.25 t · low payload mass', cost: 39_000_000, massKg: 1250, material: '#263949' },
      { id: 'simien-r4', name: 'SIMIEN-R4 Rugged Bus', maker: 'SIMIEN AEROSPACE', detail: 'Radiation-shielded structure · 3.1 t · high durability', cost: 54_000_000, massKg: 3100, material: '#8b9eaa' }
    ],
    motor: [
      { id: 'tana-l1', name: 'TANA-L1 Launch Motor', maker: 'MG FLIGHT SYSTEMS', detail: '14 MN · high-thrust launch stage · 780 t propellant', cost: 0, dryKg: 45_000, fuelKg: 780_000, thrustN: 14_000_000, isp: 310, ownedByDefault: true },
      { id: 'awash-r2', name: 'AWASH-R2 Methalox Core', maker: 'AWASH ORBITAL', detail: '18.5 MN · efficient upper-stage profile · 900 t propellant', cost: 38_000_000, dryKg: 52_000, fuelKg: 900_000, thrustN: 18_500_000, isp: 325 },
      { id: 'nile-h3', name: 'NILE-H3 Heavy Motor', maker: 'NILE LAUNCH WORKS', detail: '30 MN · heavy-lift stage · 1,500 t propellant', cost: 74_000_000, dryKg: 88_000, fuelKg: 1_500_000, thrustN: 30_000_000, isp: 320 },
      { id: 'teff-v3', name: 'TEFF-V3 High-Isp Motor', maker: 'TEFF PROPULSION', detail: '15 MN · extended burn · 850 t propellant', cost: 55_000_000, dryKg: 39_000, fuelKg: 850_000, thrustN: 15_000_000, isp: 350 }
    ],
    power: [
      { id: 'sol-6', name: 'SOL-6 Solar Wings', maker: 'SOLARIS LAB', detail: 'Twin rigid panels · 6 kW bus output', cost: 0, massKg: 360, watts: 6000, span: 1.5, ownedByDefault: true },
      { id: 'abay-12', name: 'ABAY-12 Deployable Array', maker: 'ABAY ADVANCED', detail: 'Articulated cells · 12 kW bus output', cost: 12_000_000, massKg: 620, watts: 12000, span: 2.1 },
      { id: 'orbit-20', name: 'ORBIT-20 Mega-Array', maker: 'ORBITAL ENERGY', detail: 'Extended wing system · 20 kW bus output', cost: 28_000_000, massKg: 980, watts: 20000, span: 2.8 }
    ],
    instrument: [
      { id: 'vis-1', name: 'VIS-1 Multispectral Imager', maker: 'HIGHLAND OPTICS', detail: 'Visible/NIR camera · 1.2 kW · Earth observation', cost: 0, massKg: 240, watts: 1200, sensor: 'image', ownedByDefault: true },
      { id: 'spek-2', name: 'SPEK-2 Atmospheric Spectrometer', maker: 'NILE SCIENCE', detail: 'Atmospheric bands · 2.1 kW · climate survey', cost: 13_000_000, massKg: 330, watts: 2100, sensor: 'atmosphere' },
      { id: 'mag-1', name: 'MAG-1 Vector Magnetometer', maker: 'ETHIO SPACE LAB', detail: 'Magnetic-field survey · 0.8 kW · space weather', cost: 9_000_000, massKg: 180, watts: 800, sensor: 'magnetic' }
    ]
  };

  const MISSIONS = {
    highlands: { id: 'highlands', title: 'Highland Imaging Survey', site: 'ETHIOPIAN HIGHLANDS', objective: 'Reach orbit, point the instrument at the Ethiopian Highlands, and capture one image.', recommended: 'vis-1', launchCost: 2_000_000, reward: 28_000_000, target: { eastM: 32_000, northM: -18_000 } },
    atmosphere: { id: 'atmosphere', title: 'Atmosphere Profile', site: 'UPPER TROPOSPHERE', objective: 'Enter orbit and acquire a controlled line of sight on the atmosphere survey region.', recommended: 'spek-2', launchCost: 2_600_000, reward: 32_000_000, target: { eastM: -42_000, northM: 24_000 } },
    spaceweather: { id: 'spaceweather', title: 'Space Weather Watch', site: 'MAGNETIC EQUATOR', objective: 'Insert the satellite into orbit and aim the magnetometer toward the near-Earth survey zone.', recommended: 'mag-1', launchCost: 3_200_000, reward: 35_000_000, target: { eastM: 55_000, northM: 28_000 } }
  };

  function freshSave() {
    const owned = {};
    const equipped = {};
    for (const [category, rows] of Object.entries(PARTS)) {
      owned[category] = rows.filter(row => row.ownedByDefault).map(row => row.id);
      equipped[category] = owned[category][0];
    }
    return { version: 2, funds: STARTING_FUNDS, owned, equipped, completed: [], flights: 0, lastReport: null };
  }

  function loadSave() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || parsed.version !== 2 || !Number.isFinite(parsed.funds)) return freshSave();
      const clean = freshSave();
      clean.funds = Math.max(0, Math.floor(parsed.funds));
      clean.flights = Math.max(0, Math.floor(parsed.flights || 0));
      clean.completed = Array.isArray(parsed.completed) ? parsed.completed.filter(id => MISSIONS[id]) : [];
      clean.lastReport = parsed.lastReport && typeof parsed.lastReport === 'object' ? parsed.lastReport : null;
      for (const category of Object.keys(PARTS)) {
        const valid = new Set(PARTS[category].map(part => part.id));
        const savedOwned = Array.isArray(parsed.owned?.[category]) ? parsed.owned[category] : [];
        clean.owned[category] = [...new Set([...clean.owned[category], ...savedOwned.filter(id => valid.has(id))])];
        const selected = parsed.equipped?.[category];
        if (valid.has(selected) && clean.owned[category].includes(selected)) clean.equipped[category] = selected;
      }
      return clean;
    } catch (_) {
      return freshSave();
    }
  }

  let save = loadSave();
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (_) { /* browser storage may be disabled */ }
  }
  function money(amount) { return '$' + Math.max(0, Math.floor(amount)).toLocaleString('en-US'); }
  function byId(category, id) { return PARTS[category].find(part => part.id === id); }
  function currentPart(category) { return byId(category, save.equipped[category]); }
  function buyOrEquip(category, partId) {
    const part = byId(category, partId);
    if (!part) return { ok: false, message: 'Part not found.' };
    if (save.owned[category].includes(partId)) {
      save.equipped[category] = partId;
      persist();
      return { ok: true, purchased: false, message: `${part.name} fitted.` };
    }
    if (save.funds < part.cost) return { ok: false, message: `Insufficient funds. ${money(part.cost - save.funds)} more needed.` };
    save.funds -= part.cost;
    save.owned[category].push(partId);
    save.equipped[category] = partId;
    persist();
    return { ok: true, purchased: true, message: `${part.name} bought and fitted for ${money(part.cost)}.` };
  }
  function chargeLaunch(missionId) {
    const mission = MISSIONS[missionId];
    if (!mission || save.funds < mission.launchCost) return false;
    save.funds -= mission.launchCost;
    save.flights += 1;
    persist();
    return true;
  }
  function settleMission(missionId, report) {
    const mission = MISSIONS[missionId];
    if (!mission) return { reward: 0 };
    const payout = report.success ? mission.reward + (report.recommended ? 2_000_000 : 0) : 0;
    if (payout) save.funds += payout;
    if (report.success && !save.completed.includes(missionId)) save.completed.push(missionId);
    save.lastReport = { missionId, success: Boolean(report.success), payout, altitudeM: Math.max(0, Math.round(report.altitudeM || 0)), science: Math.max(0, Math.round(report.science || 0)), stamp: new Date().toISOString() };
    persist();
    return { reward: payout, firstCompletion: report.success && save.completed.filter(id => id === missionId).length === 1 };
  }
  function owned(category, id) { return save.owned[category].includes(id); }
  function getMission(id) { return MISSIONS[id] || MISSIONS.highlands; }
  function getState() { return save; }

  window.GameCatalog = { PARTS, MISSIONS, STARTING_FUNDS, money, byId, currentPart, buyOrEquip, chargeLaunch, settleMission, owned, getMission, getState, persist };
})();
