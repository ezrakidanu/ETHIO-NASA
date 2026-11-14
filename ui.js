(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const fmt = window.GameCatalog.money;
  const screens = ['homeScreen', 'hangarScreen', 'debriefScreen', 'logScreen'];

  function showScreen(name) {
    screens.forEach(id => $(id)?.classList.add('hidden'));
    $('pauseScreen').classList.add('hidden');
    $('flightUI').classList.add('hidden');
    $('topbar').classList.toggle('hidden', name === 'flight');
    if (name === 'flight') $('flightUI').classList.remove('hidden');
    else if (name === 'pause') {
      $('flightUI').classList.remove('hidden');
      $('pauseScreen').classList.remove('hidden');
    } else if (name === 'log') $('logScreen').classList.remove('hidden');
    else if (name === 'debrief') $('debriefScreen').classList.remove('hidden');
    else $(name === 'hangar' ? 'hangarScreen' : 'homeScreen').classList.remove('hidden');
  }

  function updateWallet(save) {
    const balance = fmt(save.funds);
    $('walletTop').textContent = balance;
    $('homeFunds').textContent = balance;
    $('flightCount').textContent = save.flights.toLocaleString('en-US');
    $('careerRecord').textContent = save.completed.length ? `${save.completed.length} CONTRACT${save.completed.length === 1 ? '' : 'S'} CLEARED` : 'READY';
  }

  function populateMissions(save) {
    const select = $('missionSelect');
    const existing = select.value;
    select.innerHTML = Object.values(window.GameCatalog.MISSIONS).map(mission => `<option value="${mission.id}">${mission.title} · reward ${fmt(mission.reward)}</option>`).join('');
    select.value = window.GameCatalog.MISSIONS[existing] ? existing : 'highlands';
  }

  function renderHangar(save, mission, onSelectPart) {
    updateWallet(save);
    populateMissions(save);
    $('missionSelect').value = mission.id;
    $('missionReward').textContent = `+${fmt(mission.reward)}`;
    $('payoutDisplay').textContent = `+${fmt(mission.reward)}`;
    $('launchCost').textContent = fmt(mission.launchCost);

    const partsGrid = $('partsGrid');
    const groups = Object.entries(window.GameCatalog.PARTS).map(([category, items]) => {
      const title = { structure: '01 · SATELLITE STRUCTURE', motor: '02 · LAUNCH MOTOR', power: '03 · POWER SYSTEM', instrument: '04 · SCIENCE INSTRUMENT' }[category];
      const selectedId = save.equipped[category];
      const rows = items.map(part => {
        const isOwned = window.GameCatalog.owned(category, part.id);
        const isEquipped = selectedId === part.id;
        const action = isEquipped ? 'EQUIPPED' : isOwned ? 'EQUIP' : `BUY · ${fmt(part.cost)}`;
        const buttonClass = isOwned ? 'btn secondary owned' : 'btn';
        const blocked = !isOwned && save.funds < part.cost;
        return `<article class="part ${isEquipped ? 'selected' : ''}">
          <div class="part-top"><div><label>${part.maker}</label><h3>${part.name}</h3></div><div class="price">${part.cost ? fmt(part.cost) : 'STARTER'}</div></div>
          <p>${part.detail}</p><button class="${buttonClass}" data-part-category="${category}" data-part-id="${part.id}" ${isEquipped || blocked ? 'disabled' : ''}>${isEquipped ? 'FITTED' : blocked ? 'FUNDS NEEDED' : action}</button>
        </article>`;
      }).join('');
      return `<div class="part-group"><div class="group-title">${title}</div><div class="parts">${rows}</div></div>`;
    }).join('');
    partsGrid.innerHTML = groups;
    partsGrid.querySelectorAll('[data-part-id]').forEach(button => button.addEventListener('click', () => onSelectPart(button.dataset.partCategory, button.dataset.partId)));

    const selected = Object.fromEntries(Object.keys(window.GameCatalog.PARTS).map(key => [key, window.GameCatalog.currentPart(key)]));
    const payloadKg = selected.structure.massKg + selected.power.massKg + selected.instrument.massKg + 1200;
    const grossKg = selected.motor.dryKg + selected.motor.fuelKg + payloadKg;
    const manifest = [
      ['SATELLITE BUS', selected.structure.name],
      ['LAUNCH MOTOR', selected.motor.name],
      ['SOLAR ARRAY', selected.power.name],
      ['SCIENCE PAYLOAD', selected.instrument.name],
      ['LIFTOFF MASS', `${(grossKg / 1000).toFixed(0)} tonnes`],
      ['ENGINE THRUST', `${(selected.motor.thrustN / 1_000_000).toFixed(1)} MN`],
      ['FUEL RESERVE', `${Math.round(selected.motor.fuelKg / 1000).toLocaleString('en-US')} t · user-triggered only`]
    ];
    $('manifest').innerHTML = manifest.map(([label, value]) => `<div class="summary-row"><span>${label}</span><b>${value}</b></div>`).join('') + `<div class="legal-note">All hardware prices and performance labels are fictional game values, not vendor quotes.</div>`;
    const start = $('authorizeLaunch');
    const affordable = save.funds >= mission.launchCost;
    start.disabled = !affordable;
    start.textContent = affordable ? `AUTHORIZE LAUNCH · ${fmt(mission.launchCost)}` : `NEED ${fmt(mission.launchCost - save.funds)} MORE`;
    return { ...selected };
  }

  function updateFlight(run, mission) {
    const altKm = Math.max(0, run.altitude / 1000);
    $('altitude').textContent = `${altKm.toFixed(1)} km`;
    $('velocity').textContent = run.speed >= 1000 ? `${(run.speed / 1000).toFixed(2)} km/s` : `${Math.round(run.speed).toLocaleString('en-US')} m/s`;
    $('fuel').textContent = `${Math.round(100 * run.fuel / run.initialFuel)}%`;
    $('missionTitle').textContent = mission.title.toUpperCase();
    $('missionObjective').textContent = run.phase === 'ascent'
      ? `Manual powered ascent · reach 100 km. Motor propellant remaining: ${Math.round(run.fuel).toLocaleString('en-US')} kg.`
      : 'Orient the underside science sensor toward the highlighted survey region, then capture the scene.';
    $('flightStatus').innerHTML = run.phase === 'ascent' ? 'POWERED ASCENT<span>MAIN ENGINE RESPONDS ONLY WHILE HELD</span>' : 'ORBITAL SURVEY<span>REACTION-WHEEL ATTITUDE · OPTIONAL RCS</span>';
    $('thrustButton').classList.toggle('hidden', run.phase !== 'ascent');
    $('rcsRow').classList.toggle('hidden', run.phase !== 'orbit');
    $('alignWrap').classList.toggle('hidden', run.phase !== 'orbit');
    $('sensorReticle').classList.toggle('hidden', run.phase !== 'orbit');
    const alignment = Math.max(0, Math.min(1, run.sensorAlignment));
    $('alignmentText').textContent = `SENSOR ALIGNMENT · ${Math.round(alignment * 100)}%`;
    $('alignmentBar').style.width = `${alignment * 100}%`;
    $('alignmentBar').style.background = alignment >= 0.995 ? 'var(--lime)' : 'linear-gradient(90deg,var(--cyan),var(--lime))';
    const stage = $('stageButton');
    const stageReady = run.phase === 'ascent' && run.altitude >= 100_000;
    stage.classList.toggle('hidden', !stageReady);
    stage.disabled = stageReady && run.fuel < run.initialFuel * 0.06;
    stage.textContent = stageReady ? `DEPLOY + INSERT ORBIT · ${Math.round(run.initialFuel * 0.06).toLocaleString('en-US')} KG` : 'DEPLOY SATELLITE';
    const capture = $('captureButton');
    capture.classList.toggle('hidden', run.phase !== 'orbit');
    capture.disabled = run.phase !== 'orbit' || alignment < 0.995;
    capture.textContent = alignment >= 0.995 ? 'CAPTURE SCIENCE SCENE' : `ALIGN SENSOR · ${Math.round(alignment * 100)}%`;
  }

  function renderDebrief(report, mission) {
    const success = report.success;
    const reward = report.payout || 0;
    $('debriefScreen').innerHTML = `<div class="eyebrow">MISSION DEBRIEF · ${success ? 'CONTRACT COMPLETE' : 'FLIGHT ENDED'}</div>
      <h2>${success ? 'SCIENCE ACQUIRED.<br><span>ORBIT SECURED.</span>' : 'FLIGHT TERMINATED.<br><span>REDESIGN AND RETRY.</span>'}</h2>
      <p class="lead">${report.message}</p>
      <div class="hero-facts">
        <div class="fact"><label>MAX ALTITUDE</label><b>${(report.altitudeM / 1000).toFixed(1)} km</b></div>
        <div class="fact"><label>SCIENCE VALUE</label><b>${report.science} DATA</b></div>
        <div class="fact"><label>VEHICLE SPEED</label><b>${report.speed >= 1000 ? (report.speed / 1000).toFixed(2) + ' km/s' : Math.round(report.speed) + ' m/s'}</b></div>
      </div>
      <div class="payout">${success ? `CONTRACT PAYMENT ${fmt(reward)}` : 'NO CONTRACT PAYOUT'}</div>
      <p class="small">${success ? 'Funds were credited after capture. The satellite, structure, motor and solar hardware remain in your inventory.' : 'Hardware remains in your inventory. The explicitly authorized launch operation was already paid; no new charges were taken in flight.'}</p>
      <div class="actions"><button id="debriefHangar" class="btn">RETURN TO HANGAR</button><button id="debriefHome" class="btn secondary">CAREER HOME</button></div>
      <div class="legal-note">Educational game dynamics only. Dollar values, performance labels and component names are fictional game values.</div>`;
  }

  function renderLog(save) {
    const last = save.lastReport;
    $('logScreen').innerHTML = `<div class="screenhead"><div><div class="eyebrow">CAREER ARCHIVE · LOCAL SAVE</div><h2>FLIGHT LOG</h2></div><button id="logBack" class="btn secondary">← CAREER</button></div>
      <p class="lead">Flights authorized: ${save.flights.toLocaleString('en-US')} · contracts cleared: ${save.completed.length} · current funds: <b class="money">${fmt(save.funds)}</b></p>
      <div class="loglist">${last ? `<div class="logrow">Most recent · ${window.GameCatalog.getMission(last.missionId).title} · ${last.success ? 'CONTRACT CLEARED' : 'FLIGHT ENDED'} · peak ${(last.altitudeM / 1000).toFixed(1)} km · ${last.payout ? '+' + fmt(last.payout) : 'no reward'}</div>` : '<div class="logrow">No flights completed yet. Visit the hangar to configure the first mission.</div>'}
      ${Object.values(window.GameCatalog.MISSIONS).map(m => `<div class="logrow">${m.title} · ${save.completed.includes(m.id) ? 'CLEARED' : 'NOT CLEARED'} · contract ${fmt(m.reward)}</div>`).join('')}</div>
      <p class="small">Career saves on this device. Purchased hardware is persistent; no online account is required.</p>`;
  }

  function toast(text) {
    const box = $('flightToast');
    box.textContent = text;
    box.classList.add('visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => box.classList.remove('visible'), 2100);
  }

  window.GameUI = { showScreen, updateWallet, renderHangar, updateFlight, renderDebrief, renderLog, toast, money: fmt };
})();
