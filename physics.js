(function () {
  'use strict';

  const G0 = 9.80665;
  const EARTH_RADIUS_M = 6_371_000;
  const MU = 3.986004418e14;
  const WORLD_PER_METER = 1 / 50;

  function createFlight(parts, missionId) {
    const motor = parts.motor;
    const payloadMass = parts.structure.massKg + parts.power.massKg + parts.instrument.massKg + 1200;
    const totalMass = motor.dryKg + motor.fuelKg + payloadMass;
    return {
      missionId,
      phase: 'ascent',
      position: new THREE.Vector3(0, 50, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      pitch: 0,
      yaw: 0,
      roll: 0,
      fuel: motor.fuelKg,
      initialFuel: motor.fuelKg,
      fuelUsed: 0,
      dryMass: motor.dryKg + payloadMass,
      maxAltitude: 0,
      altitude: 0,
      speed: 0,
      elapsed: 0,
      timeSinceCapture: 0,
      rcsBurned: 0,
      captured: false,
      sensorAlignment: 0,
      lastFuelCommand: false,
      totalInitialMass: totalMass,
      groundContact: false
    };
  }

  function altitudeMeters(position) {
    const centreY = -EARTH_RADIUS_M;
    return Math.sqrt(position.x * position.x + (position.y - centreY) ** 2 + position.z * position.z) - EARTH_RADIUS_M;
  }

  function gravityAt(position) {
    const towardCentre = new THREE.Vector3(-position.x, -EARTH_RADIUS_M - position.y, -position.z);
    const radius = towardCentre.length();
    if (radius < 1) return new THREE.Vector3(0, -G0, 0);
    const g = MU / (radius * radius);
    return towardCentre.multiplyScalar(g / radius);
  }

  function update(run, controls, parts, dt) {
    run.elapsed += dt;
    const motor = parts.motor;
    const craftMass = run.dryMass + run.fuel;
    const gravity = gravityAt(run.position);
    const acceleration = gravity.clone();
    const orientation = new THREE.Euler(run.pitch, run.roll, run.yaw, 'YXZ');
    const quaternion = new THREE.Quaternion().setFromEuler(orientation);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
    const atmosphere = Math.exp(-Math.max(0, run.altitude) / 8_500);
    const main = run.phase === 'ascent' && controls.mainThrust && run.fuel > 0;
    const rcs = run.phase === 'orbit' && (controls.rcsForward || controls.rcsBack) && run.fuel > 0;
    run.lastFuelCommand = main || rcs;

    const onPad = run.phase === 'ascent' && run.altitude <= 53 && run.position.y <= 53 && Math.abs(run.position.x) < 15 && Math.abs(run.position.z) < 15;
    if (onPad && !main) {
      run.position.set(0, 50, 0);
      run.velocity.set(0, 0, 0);
      run.altitude = 50;
      run.speed = 0;
      run.groundContact = false;
      run.lastFuelCommand = false;
      return { main: false, rcs: false, gravity, orientation };
    }

    if (main) {
      const thrustAcceleration = motor.thrustN / Math.max(craftMass, 1);
      acceleration.addScaledVector(up, thrustAcceleration);
      const burnKgS = motor.thrustN / (motor.isp * G0);
      const burn = Math.min(run.fuel, burnKgS * dt);
      run.fuel -= burn;
      run.fuelUsed += burn;
    }

    if (rcs) {
      const axis = new THREE.Vector3(0, 0, controls.rcsForward ? -1 : 1).applyQuaternion(quaternion).normalize();
      acceleration.addScaledVector(axis, 0.8);
      const burn = Math.min(run.fuel, 0.65 * dt);
      run.fuel -= burn;
      run.fuelUsed += burn;
      run.rcsBurned += burn;
    }

    run.velocity.addScaledVector(acceleration, dt);
    const speed = run.velocity.length();
    if (run.phase === 'ascent' && run.altitude < 120_000 && speed > 0.01) {
      const density = 1.225 * atmosphere;
      const dragN = 0.5 * density * speed * speed * 10.5 * 0.38;
      const dragAcceleration = dragN / Math.max(craftMass, 1);
      run.velocity.addScaledVector(run.velocity.clone().normalize(), -Math.min(dragAcceleration * dt, speed));
    }
    run.position.addScaledVector(run.velocity, dt);
    run.altitude = altitudeMeters(run.position);
    run.maxAltitude = Math.max(run.maxAltitude, run.altitude);
    run.speed = run.velocity.length();
    if (run.altitude <= 0 && run.elapsed > 2 && run.phase === 'ascent' && run.velocity.y < 0) run.groundContact = true;
    return { main, rcs, gravity, orientation };
  }

  function deployToOrbit(run) {
    const required = run.initialFuel * 0.06;
    if (run.phase !== 'ascent' || run.altitude < 100_000 || run.fuel < required) return { ok: false, required };
    const centre = new THREE.Vector3(0, -EARTH_RADIUS_M, 0);
    const radial = run.position.clone().sub(centre).normalize();
    let tangent = new THREE.Vector3(1, 0, 0).addScaledVector(radial, -radial.x);
    if (tangent.lengthSq() < 1e-5) tangent.set(0, 0, 1);
    tangent.normalize();
    const radius = EARTH_RADIUS_M + run.altitude;
    const circularSpeed = Math.sqrt(MU / radius);
    run.velocity.copy(tangent.multiplyScalar(circularSpeed));
    const burn = required;
    run.fuel -= burn;
    run.fuelUsed += burn;
    run.phase = 'orbit';
    run.pitch = 0;
    run.yaw = 0;
    run.roll = 0;
    run.speed = run.velocity.length();
    return { ok: true, required, circularSpeed };
  }

  window.GamePhysics = { G0, EARTH_RADIUS_M, MU, WORLD_PER_METER, createFlight, update, deployToOrbit, altitudeMeters };
})();
