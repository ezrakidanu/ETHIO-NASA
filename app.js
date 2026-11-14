(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const Catalog = window.GameCatalog;
  const UI = window.GameUI;
  const Physics = window.GamePhysics;
  const EQUIPMENT = ['structure', 'motor', 'power', 'instrument'];
  const held = Object.create(null);
  const controls = { mainThrust: false, rcsForward: false, rcsBack: false, pitchUp: false, pitchDown: false, yawLeft: false, yawRight: false };
  let scene;
  let mode = 'home';
  let run = null;
  let activeMission = Catalog.getMission('highlands');
  let activeParts = currentParts();
  let lastFrame = performance.now();
  let flightLock = false;
  let dragPoint = null;

  function currentParts() {
    return Object.fromEntries(EQUIPMENT.map(category => [category, Catalog.currentPart(category)]));
  }

  function setControlsClear() {
    Object.keys(controls).forEach(key => { controls[key] = false; });
    Object.keys(held).forEach(key => { delete held[key]; });
    document.querySelectorAll('[data-hold].active').forEach(button => button.classList.remove('active'));
  }

  function refreshHangar() {
    const save = Catalog.getState();
    activeMission = Catalog.getMission($('missionSelect').value || 'highlands');
    activeParts = UI.renderHangar(save, activeMission, buyOrFit);
    scene.setScreen('hangar', activeParts);
  }

  function buyOrFit(category, partId) {
    const result = Catalog.buyOrEquip(category, partId);
    $('shopNotice').textContent = result.message;
    $('shopNotice').style.color = result.ok ? 'var(--lime)' : 'var(--danger)';
    refreshHangar();
  }

  function openHome() {
    mode = 'home';
    setControlsClear();
    UI.updateWallet(Catalog.getState());
    UI.showScreen('home');
    scene.setScreen('home', currentParts());
  }

  function openHangar() {
    mode = 'hangar';
    setControlsClear();
    UI.showScreen('hangar');
    $('shopNotice').textContent = 'Select a contract, inspect the cost, then buy or fit each component.';
    $('shopNotice').style.color = 'var(--muted)';
    refreshHangar();
  }

  function launchMission() {
    if (mode !== 'hangar') return;
    activeMission = Catalog.getMission($('missionSelect').value);
    activeParts = currentParts();
    if (!Catalog.chargeLaunch(activeMission.id)) {
      $('shopNotice').textContent = 'Not enough career funds for this operation. Buy no equipment until you have earned more.';
      $('shopNotice').style.color = 'var(--danger)';
      refreshHangar();
      return;
    }
    run = Physics.createFlight(activeParts, activeMission.id);
    flightLock = false;
    mode = 'flight';
    setControlsClear();
    UI.updateWallet(Catalog.getState());
    UI.showScreen('flight');
    scene.setFlight(run, activeParts);
    UI.toast(`LAUNCH AUTHORIZED · ${activeMission.title.toUpperCase()}`);
    lastFrame = performance.now();
  }

  function aimAlignment() {
    if (!run || run.phase !== 'orbit') return 0;
    const x = activeMission.target.eastM;
    const z = activeMission.target.northM;
    const earthR = Physics.EARTH_RADIUS_M;
    const targetY = -earthR + Math.sqrt(Math.max(1, earthR * earthR - x * x - z * z));
    const target = new THREE.Vector3(x, targetY, z);
    const directionToTarget = target.sub(run.position).normalize();
    const attitude = new THREE.Euler(run.pitch, run.roll, run.yaw, 'YXZ');
    const quaternion = new THREE.Quaternion().setFromEuler(attitude);
    const sensor = new THREE.Vector3(0, -1, 0).applyQuaternion(quaternion).normalize();
    return Math.max(-1, Math.min(1, sensor.dot(directionToTarget)));
  }

  function applyAttitude(dt) {
    const rotationRate = run.phase === 'ascent' ? 0.28 : 0.72;
    if (controls.pitchUp) run.pitch += rotationRate * dt;
    if (controls.pitchDown) run.pitch -= rotationRate * dt;
    if (controls.yawLeft) run.yaw += rotationRate * dt;
    if (controls.yawRight) run.yaw -= rotationRate * dt;
    run.pitch = Math.max(-1.35, Math.min(1.35, run.pitch));
    run.yaw = Math.max(-1.35, Math.min(1.35, run.yaw));
  }

  function formatReportMessage(success) {
    if (!success) return 'The flight ended before a science capture. Propellant was consumed only during commanded engine/RCS burns. Your owned hardware is still in the hangar; adjust your inputs or motor selection and try again.';
    const instrument = Catalog.currentPart('instrument');
    const match = instrument.id === activeMission.recommended;
    return `${activeMission.title} completed above the Earth. The ${instrument.name} ${match ? 'matched the contract instrument' : 'captured a valid scene; fitting the recommended contract sensor can earn an additional game-dollar bonus next flight'}. The vehicle stayed camera-tracked through ascent and orbital survey.`;
  }

  function settleFlight(success) {
    if (!run || flightLock) return;
    flightLock = true;
    setControlsClear();
    const instrumentMatch = Catalog.currentPart('instrument').id === activeMission.recommended;
    const payout = Catalog.settleMission(activeMission.id, { success, recommended: instrumentMatch, altitudeM: run.maxAltitude, science: success ? (instrumentMatch ? 1000 : 650) : 0 });
    const report = {
      success,
      payout: payout.reward,
      altitudeM: run.maxAltitude,
      speed: run.speed,
      science: success ? (instrumentMatch ? 1000 : 650) : 0,
      message: formatReportMessage(success)
    };
    mode = 'debrief';
    UI.updateWallet(Catalog.getState());
    UI.showScreen('debrief');
    UI.renderDebrief(report, activeMission);
    $('debriefHangar').onclick = openHangar;
    $('debriefHome').onclick = openHome;
    scene.setScreen('debrief', currentParts());
  }

  function insertOrbit() {
    if (!run || mode !== 'flight' || run.phase !== 'ascent') return;
    const insertion = Physics.deployToOrbit(run);
    if (!insertion.ok) {
      UI.toast(`ORBIT INSERTION NEEDS ${Math.round(insertion.required).toLocaleString('en-US')} KG RESERVE`);
      return;
    }
    setControlsClear();
    scene.deploySatellite(run);
    run.sensorAlignment = aimAlignment();
    UI.updateFlight(run, activeMission);
    UI.toast(`ORBIT INSERTED · ${(insertion.circularSpeed / 1000).toFixed(2)} KM/S · INSERTION BURN COMMANDED`);
  }

  function captureScience() {
    if (!run || run.phase !== 'orbit' || run.sensorAlignment < 0.995) return;
    settleFlight(true);
  }

  function abortFlight() {
    if (!run || mode !== 'flight') return;
    settleFlight(false);
  }

  function openFlightLog() {
    mode = 'log';
    UI.renderLog(Catalog.getState());
    UI.showScreen('log');
    scene.setScreen('log', currentParts());
    $('logBack').onclick = openHome;
  }

  function tick(timestamp) {
    const dt = Math.max(0, Math.min((timestamp - lastFrame) / 1000, 0.04));
    lastFrame = timestamp;
    if (mode === 'flight' && run && !flightLock) {
      applyAttitude(dt);
      const physicsControls = {
        mainThrust: controls.mainThrust,
        rcsForward: controls.rcsForward,
        rcsBack: controls.rcsBack
      };
      Physics.update(run, physicsControls, activeParts, dt);
      if (run.phase === 'orbit') run.sensorAlignment = aimAlignment();
      UI.updateFlight(run, activeMission);
      if (run.groundContact) settleFlight(false);
    }
    scene.update(run, dt, timestamp / 1000);
    requestAnimationFrame(tick);
  }

  function holdButton(button, key) {
    const start = event => {
      event.preventDefault();
      if (!['flight'].includes(mode) || flightLock) return;
      button.setPointerCapture?.(event.pointerId);
      controls[key] = true;
      button.classList.add('active');
    };
    const stop = event => {
      event.preventDefault();
      controls[key] = false;
      button.classList.remove('active');
    };
    button.addEventListener('pointerdown', start);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => button.addEventListener(name, stop));
  }

  function bindTouchControls() {
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('selectstart', event => {
      if (!event.target.closest('input,textarea,[contenteditable="true"]')) event.preventDefault();
    });
    document.querySelectorAll('[data-hold]').forEach(button => holdButton(button, button.dataset.hold));
    $('openHangar').addEventListener('click', openHangar);
    $('openLog').addEventListener('click', openFlightLog);
    $('hangarBack').addEventListener('click', openHome);
    $('missionSelect').addEventListener('change', refreshHangar);
    $('authorizeLaunch').addEventListener('click', launchMission);
    $('stageButton').addEventListener('click', insertOrbit);
    $('captureButton').addEventListener('click', captureScience);
    $('abortFlight').addEventListener('click', abortFlight);
    $('pauseFlight').addEventListener('click', () => {
      if (mode !== 'flight') return;
      setControlsClear();
      mode = 'pause';
      UI.showScreen('pause');
    });
    $('resumeFlight').addEventListener('click', () => {
      if (mode !== 'pause') return;
      mode = 'flight';
      UI.showScreen('flight');
      lastFrame = performance.now();
    });
    $('returnHangar').addEventListener('click', () => settleFlight(false));

    window.addEventListener('keydown', event => {
      if (mode !== 'flight' || event.repeat) return;
      const map = {
        Space: run?.phase === 'ascent' ? 'mainThrust' : 'rcsForward',
        KeyW: run?.phase === 'ascent' ? 'mainThrust' : 'rcsForward',
        KeyS: 'rcsBack', ArrowUp: 'pitchUp', ArrowDown: 'pitchDown', ArrowLeft: 'yawLeft', ArrowRight: 'yawRight'
      };
      const control = map[event.code];
      if (control) { event.preventDefault(); controls[control] = true; held[event.code] = control; }
      if (event.code === 'Escape') {
        setControlsClear();
        mode = 'pause';
        UI.showScreen('pause');
      }
      if (event.code === 'KeyF' && run?.phase === 'orbit') captureScience();
    });
    window.addEventListener('keyup', event => {
      const control = held[event.code];
      if (control) controls[control] = false;
      delete held[event.code];
    });
    window.addEventListener('blur', setControlsClear);
    $('scene').addEventListener('pointerdown', event => {
      if (mode !== 'flight') return;
      dragPoint = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      $('scene').setPointerCapture?.(event.pointerId);
    });
    $('scene').addEventListener('pointermove', event => {
      if (!dragPoint || mode !== 'flight' || !run) return;
      const dx = event.clientX - dragPoint.x;
      const dy = event.clientY - dragPoint.y;
      run.yaw -= dx * 0.0045;
      run.pitch += dy * 0.0045;
      run.yaw = Math.max(-1.35, Math.min(1.35, run.yaw));
      run.pitch = Math.max(-1.35, Math.min(1.35, run.pitch));
      dragPoint.x = event.clientX;
      dragPoint.y = event.clientY;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => $('scene').addEventListener(name, () => { dragPoint = null; }));
  }

  function boot() {
    if (!window.THREE || !window.GameScene || !window.GamePhysics) {
      document.body.innerHTML = '<main style="padding:32px;color:white;font:16px system-ui">ETHIO ORBIT could not load its bundled 3D engine. Close and relaunch the app or reinstall the complete offline package.</main>';
      return;
    }
    try {
      scene = new window.GameScene($('scene'));
      bindTouchControls();
      UI.updateWallet(Catalog.getState());
      UI.showScreen('home');
      scene.setScreen('home', currentParts());
      lastFrame = performance.now();
      requestAnimationFrame(tick);
    } catch (error) {
      console.error('ETHIO ORBIT startup failed', error);
      document.body.innerHTML = '<main style="padding:32px;color:white;font:16px system-ui">3D initialization failed on this device. Reinstall the app and check that WebGL is enabled.</main>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
