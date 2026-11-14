(function () {
  'use strict';

  const T = window.THREE;
  const SCALE = window.GamePhysics.WORLD_PER_METER;
  const EARTH_M = window.GamePhysics.EARTH_RADIUS_M;
  const EARTH_R = EARTH_M * SCALE;
  const V3 = T.Vector3;
  const mats = {};

  function material(name, color, roughness = 0.55, metalness = 0.12, extra = {}) {
    mats[name] ||= new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    return mats[name];
  }

  function box(parent, dimensions, position, mat, name = '') {
    const mesh = new T.Mesh(new T.BoxGeometry(...dimensions), mat);
    mesh.position.set(...position);
    if (name) mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cylinder(parent, radiusTop, radiusBottom, height, position, mat, segments = 12) {
    const mesh = new T.Mesh(new T.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function bar(parent, start, end, radius, mat, sides = 6) {
    const a = new V3(...start);
    const b = new V3(...end);
    const delta = new V3().subVectors(b, a);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, delta.length(), sides), mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new V3(0, 1, 0), delta.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function makeMapTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const c = canvas.getContext('2d');
    const sea = c.createLinearGradient(0, 0, 0, 512);
    sea.addColorStop(0, '#0a2943');
    sea.addColorStop(0.5, '#155170');
    sea.addColorStop(1, '#0c324b');
    c.fillStyle = sea;
    c.fillRect(0, 0, 1024, 512);
    c.globalAlpha = 0.22;
    for (let i = 0; i < 90; i++) {
      c.strokeStyle = i % 2 ? '#7dc3cb' : '#13506c';
      c.beginPath();
      c.ellipse((i * 157) % 1024, (i * 73) % 512, 90 + (i % 6) * 17, 9 + (i % 3) * 4, (i % 8) / 5, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    const shapes = [
      [[-168,70],[-142,73],[-126,57],[-118,49],[-108,31],[-96,19],[-83,10],[-80,-4],[-91,-17],[-104,-7],[-116,1],[-125,19],[-143,29],[-154,48]],
      [[-81,12],[-69,9],[-50,-4],[-41,-20],[-49,-34],[-58,-53],[-70,-56],[-77,-35],[-78,-13]],
      [[-18,36],[-5,37],[12,34],[28,31],[35,23],[48,13],[43,2],[36,-8],[29,-19],[19,-35],[6,-34],[-6,-23],[-15,-2],[-18,17]],
      [[-10,36],[6,44],[30,48],[51,54],[68,60],[95,69],[124,57],[144,47],[160,61],[178,67],[166,31],[144,17],[120,11],[109,-1],[91,7],[75,8],[60,23],[47,28],[35,35],[27,41],[15,38]],
      [[42,30],[49,28],[51,14],[44,6],[38,11]],
      [[112,-11],[130,-10],[152,-18],[155,-30],[139,-40],[121,-35],[114,-24]],
      [[-52,82],[-28,78],[-23,65],[-40,58],[-59,65],[-69,76]],
      [[45,-13],[50,-13],[50,-25],[45,-24]],
      [[-180,-70],[-120,-73],[-60,-71],[0,-75],[65,-72],[125,-74],[180,-71],[180,-90],[-180,-90]]
    ];
    function xy(lon, lat) { return [(lon + 180) / 360 * 1024, (90 - lat) / 180 * 512]; }
    for (const polygon of shapes) {
      const points = polygon.map(p => xy(p[0], p[1]));
      c.beginPath();
      c.moveTo(...points[0]);
      points.slice(1).forEach(p => c.lineTo(...p));
      c.closePath();
      c.fillStyle = '#667d54';
      c.fill();
      c.strokeStyle = '#a0bd92';
      c.lineWidth = 2;
      c.stroke();
    }
    const [ethiopiaX, ethiopiaY] = xy(39, 9);
    c.fillStyle = '#d5e891';
    c.globalAlpha = 0.8;
    c.fillRect(ethiopiaX - 3, ethiopiaY - 2, 7, 5);
    c.globalAlpha = 1;
    const texture = new T.CanvasTexture(canvas);
    if (T.SRGBColorSpace) texture.colorSpace = T.SRGBColorSpace;
    else texture.encoding = T.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
  }

  function makeSolarPanel(parent, x, side, span) {
    const group = new T.Group();
    group.position.set(x, 0, 0);
    parent.add(group);
    const width = 1.35 * span;
    const height = 1.15;
    box(group, [width, 0.055, height], [side * width * 0.52, 0, 0], material('panelFrame', '#93a6b2', 0.4, 0.62));
    const cellMat = material('panelCells', '#14476c', 0.28, 0.43, { emissive: '#07203b', emissiveIntensity: 0.15 });
    const columns = span > 2 ? 5 : 4;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < columns; col++) {
        const cell = box(group, [width / columns - 0.035, 0.018, height / 4 - 0.035], [side * width * 0.52 + side * (col - (columns - 1) / 2) * width / columns, 0.04, (row - 1.5) * height / 4], cellMat);
        cell.castShadow = false;
      }
    }
    bar(group, [0, 0, 0], [side * (width + 0.13), 0, 0], 0.045, material('panelBoom', '#c0c6c3', 0.45, 0.65), 8);
  }

  function makeEthiopianFlagMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#078930'; ctx.fillRect(0, 0, 360, 80);
    ctx.fillStyle = '#fedd00'; ctx.fillRect(0, 80, 360, 80);
    ctx.fillStyle = '#da121a'; ctx.fillRect(0, 160, 360, 80);
    ctx.fillStyle = '#0f47af'; ctx.beginPath(); ctx.arc(180, 120, 39, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fedd00'; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 ? 15 : 32;
      const x = 180 + Math.cos(a) * r, y = 120 + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    const texture = new T.CanvasTexture(canvas);
    if (T.SRGBColorSpace) texture.colorSpace = T.SRGBColorSpace;
    else texture.encoding = T.sRGBEncoding;
    return new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide });
  }

  function buildSatellite(parts) {
    const group = new T.Group();
    group.name = 'SATELLITE / ORIGINAL PROCEDURAL MODEL';
    const structure = parts?.structure || window.GameCatalog.PARTS.structure[0];
    const power = parts?.power || window.GameCatalog.PARTS.power[0];
    const instrument = parts?.instrument || window.GameCatalog.PARTS.instrument[0];
    const bodyMat = material(`body-${structure.id}`, structure.material, 0.35, 0.6);
    const foil = material('goldFoil', '#b98945', 0.43, 0.55);
    const dark = material('busDark', '#233443', 0.45, 0.48);
    const lens = material('optics', '#65e4ef', 0.16, 0.72, { emissive: '#0f5671', emissiveIntensity: 0.4, transparent: true, opacity: 0.9 });
    box(group, [0.78, 0.72, 0.92], [0, 0, 0], bodyMat, 'satellite bus');
    const flag = new T.Mesh(new T.PlaneGeometry(0.34, 0.23), makeEthiopianFlagMaterial());
    flag.position.set(0.12, 0.07, 0.466);
    group.add(flag);
    box(group, [0.80, 0.12, 0.91], [0, -0.3, 0], foil);
    box(group, [0.82, 0.13, 0.93], [0, 0.30, 0], foil);
    box(group, [0.66, 0.32, 0.12], [0, 0, -0.5], dark);
    for (const side of [-1, 1]) makeSolarPanel(group, side * 0.55, side, power.span);
    const instrumentTube = cylinder(group, 0.17, 0.22, 0.37, [0, -0.48, 0.16], dark, 12);
    instrumentTube.rotation.x = Math.PI / 2;
    const lensMesh = cylinder(group, 0.18, 0.18, 0.05, [0, -0.48, 0.36], lens, 24);
    lensMesh.rotation.x = Math.PI / 2;
    const antenna = new T.Group();
    antenna.position.set(0.32, 0.48, 0.43);
    group.add(antenna);
    bar(antenna, [0, 0, 0], [0.46, 0.78, 0], 0.028, material('antennaSteel', '#d8dedf', 0.35, 0.67), 8);
    const dish = new T.Mesh(new T.SphereGeometry(0.31, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), material('dish', '#c9d4dc', 0.26, 0.7, { side: T.DoubleSide }));
    dish.position.set(0.46, 0.74, 0);
    dish.rotation.x = Math.PI / 2;
    antenna.add(dish);
    const feed = cylinder(antenna, 0.026, 0.026, 0.25, [0.46, 0.6, 0], lens, 8);
    feed.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      bar(group, [side * 0.38, 0.28, -0.22], [side * 1.4, 0.28, -0.22], 0.025, foil, 6);
      cylinder(group, 0.08, 0.08, 0.17, [side * 0.4, 0.03, 0.53], material('rcsMetal', '#738896', 0.3, 0.78), 10).rotation.x = Math.PI / 2;
    }
    group.userData.sensorDirection = new V3(0, -1, 0);
    group.userData.partId = structure.id + '/' + power.id + '/' + instrument.id;
    return group;
  }

  function buildRocket(parts) {
    const motor = parts?.motor || window.GameCatalog.PARTS.motor[0];
    const rocket = new T.Group();
    rocket.name = `LAUNCH STACK ${motor.id}`;
    const metal = material('rocketWhite', '#dce5e8', 0.3, 0.37);
    const dark = material('rocketDark', '#374b5c', 0.34, 0.55);
    const green = material('ethiopiaGreen', '#18945f', 0.43, 0.12);
    const yellow = material('ethiopiaYellow', '#f1d53e', 0.42, 0.12);
    const red = material('ethiopiaRed', '#db5549', 0.42, 0.12);
    const core = cylinder(rocket, 0.27, 0.37, 4.8, [0, -0.05, 0], metal, 20);
    cylinder(rocket, 0.01, 0.28, 0.9, [0, 2.82, 0], metal, 20);
    cylinder(rocket, 0.36, 0.35, 1.15, [0, -1.22, 0], dark, 20);
    for (const [idx, color] of [[0, green], [1, yellow], [2, red]]) {
      box(rocket, [0.025, 0.42, 0.005], [-0.281, 1.05 - idx * 0.13, 0.15], color);
    }
    box(rocket, [0.14, 0.52, 0.035], [0.0, 0.05, 0.373], material('launchLogo', '#184f79', 0.35, 0.5));
    const boosters = motor.id === 'nile-h3' ? [-0.72, -0.24, 0.24, 0.72] : [-0.5, 0.5];
    for (const x of boosters) {
      cylinder(rocket, 0.15, 0.22, 3.5, [x, -0.14, 0], metal, 14);
      cylinder(rocket, 0.19, 0.19, 0.55, [x, -1.9, 0], dark, 14);
      for (const side of [-1, 1]) box(rocket, [0.3, 0.12, 0.055], [x + side * 0.11, -1.56, 0], dark);
    }
    const engineFlames = new T.Group();
    for (const x of boosters) {
      const cone = new T.Mesh(new T.ConeGeometry(0.17, 1.35, 10), new T.MeshBasicMaterial({ color: '#ff8e38', transparent: true, opacity: 0.82, depthWrite: false }));
      cone.rotation.z = Math.PI;
      cone.position.set(x, -2.55, 0);
      engineFlames.add(cone);
      const coreFlame = new T.Mesh(new T.ConeGeometry(0.085, 0.93, 8), new T.MeshBasicMaterial({ color: '#fff1ad', transparent: true, opacity: 0.91, depthWrite: false }));
      coreFlame.rotation.z = Math.PI;
      coreFlame.position.set(x, -2.28, 0);
      engineFlames.add(coreFlame);
    }
    engineFlames.visible = false;
    rocket.add(engineFlames);
    rocket.userData.flames = engineFlames;
    rocket.userData.body = core;
    return rocket;
  }

  function createEarthTexture() {
    const map = makeMapTexture();
    const geometry = new T.SphereGeometry(EARTH_R, 128, 88);
    const earth = new T.Mesh(geometry, new T.MeshBasicMaterial({ map }));
    earth.position.set(0, -EARTH_R, 0);
    const ethiopia = new V3(Math.cos(9 * Math.PI / 180) * Math.sin(39 * Math.PI / 180), Math.sin(9 * Math.PI / 180), Math.cos(9 * Math.PI / 180) * Math.cos(39 * Math.PI / 180)).normalize();
    earth.quaternion.setFromUnitVectors(ethiopia, new V3(0, 1, 0));
    earth.receiveShadow = true;
    return earth;
  }

  function makeTerrainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#344b35';
    ctx.fillRect(0, 0, 512, 512);
    const smoothstep = t => t * t * (3 - 2 * t);
    const lattice = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
      return (n - Math.floor(n)) * 2 - 1;
    };
    const noise = (x, y, cell) => {
      const gx = x / cell, gy = y / cell;
      const ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = smoothstep(gx - ix), fy = smoothstep(gy - iy);
      const a = lattice(ix, iy) * (1 - fx) + lattice(ix + 1, iy) * fx;
      const b = lattice(ix, iy + 1) * (1 - fx) + lattice(ix + 1, iy + 1) * fx;
      return a * (1 - fy) + b * fy;
    };
    const pixels = ctx.createImageData(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const height = noise(x, y, 150) * 0.55 + noise(x, y, 55) * 0.27 + noise(x, y, 18) * 0.13 + noise(x, y, 5) * 0.05;
      const fine = lattice(x, y) * 1.8;
      const v = height * 22 + fine;
      pixels.data[i] = 44 + v * 0.8;
      pixels.data[i + 1] = 73 + v;
      pixels.data[i + 2] = 37 + v * 0.55;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const palette = ['#344f32', '#52683b', '#795d3d', '#3d5834', '#826343', '#5c6a3d'];
    for (let i = 0; i < 72; i++) {
      const x = (i * 197 + 43) % 512;
      const y = (i * 313 + 71) % 512;
      const rx = 18 + (i * 37) % 76;
      const ry = 9 + (i * 23) % 39;
      ctx.fillStyle = palette[i % palette.length];
      ctx.globalAlpha = 0.12 + (i % 4) * 0.035;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, (i % 11) * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.11;
    ctx.strokeStyle = '#c7a06c';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 15; i++) {
      const x = (i * 173 + 17) % 512;
      const y = (i * 251 + 83) % 512;
      ctx.beginPath();
      ctx.moveTo(x - 38, y + 18);
      ctx.bezierCurveTo(x - 12, y - 14, x + 19, y + 35, x + 48, y - 9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const texture = new T.CanvasTexture(canvas);
    texture.wrapS = T.RepeatWrapping;
    texture.wrapT = T.RepeatWrapping;
    if (T.SRGBColorSpace) texture.colorSpace = T.SRGBColorSpace;
    else texture.encoding = T.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
  }

  function curvedGround() {
    const width = 11_000;
    const steps = 90;
    const positions = [];
    const uvs = [];
    const indices = [];
    const R = EARTH_R;
    for (let iz = 0; iz <= steps; iz++) {
      const z = (iz / steps - 0.5) * width;
      for (let ix = 0; ix <= steps; ix++) {
        const x = (ix / steps - 0.5) * width;
        const y = -R + Math.sqrt(Math.max(0, R * R - x * x - z * z));
        const d = Math.sqrt(x * x + z * z);
        const fade = Math.min(1, Math.max(0, (d - 4) / 30));
        const hills = fade * (7 * Math.sin(x * 0.006 + z * 0.002) * Math.cos(z * 0.005 - x * 0.001) + 5 * Math.sin(z * 0.011 + x * 0.003));
        positions.push(x, y + hills, z);
        uvs.push(ix / steps * 34, iz / steps * 34);
        if (ix < steps && iz < steps) {
          const a = iz * (steps + 1) + ix;
          const b = a + steps + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const ground = new T.Mesh(geometry, new T.MeshBasicMaterial({ map: makeTerrainTexture(), side: T.DoubleSide, toneMapped: false }));
    ground.position.y = 0.035;
    ground.receiveShadow = true;
    return ground;
  }

  function buildLaunchSite(group) {
    const green = material('highlandGrass', '#3b583d', 0.98, 0.0);
    const soil = material('redHighlandSoil', '#765746', 0.94, 0.0);
    const concrete = material('launchConcrete', '#505f6d', 0.84, 0.08);
    const road = material('launchRoad', '#29343d', 0.94, 0.0);
    const line = material('roadMarking', '#d8d2ba', 0.75, 0.0);
    const building = material('stationBuilding', '#9baeb9', 0.64, 0.14);
    const towerMetal = material('towerMetal', '#d4d9d4', 0.44, 0.42);
    const towerDark = material('towerCross', '#8b9aa1', 0.53, 0.35);
    const warning = material('towerWarning', '#d59a55', 0.48, 0.24);
    const pad = box(group, [9.4, 0.18, 9.4], [0, 0.05, 0], concrete, 'launch pad');
    box(group, [5.2, 0.04, 5.8], [0, 0.17, 0], material('flameTrench', '#24323a', 0.91, 0.12));
    for (let z = -1.9; z <= 1.91; z += 1.27) box(group, [4.7, 0.012, 0.028], [0, 0.197, z], line);
    box(group, [34, 0.075, 5.5], [1, -0.04, -13], road);
    box(group, [0.05, 0.016, 30], [0.5, 0.004, -13], line);
    box(group, [4.6, 0.1, 18], [-10, -0.06, -10], concrete);
    for (let i = 0; i < 6; i++) box(group, [4.9, 0.016, 0.15], [-10, 0.0, -18 + i * 2.7], line);

    const towerX = -6.4;
    const towerH = 5.2;
    const towerW = 0.72;
    for (const x of [-towerW / 2, towerW / 2]) {
      for (const z of [-towerW / 2, towerW / 2]) bar(group, [towerX + x, 0.18, z], [towerX + x * 0.82, towerH, z], 0.042, towerMetal, 8);
    }
    for (let y = 0.7; y < towerH; y += 0.72) {
      for (const x of [-1, 1]) bar(group, [towerX + x * towerW / 2, y, -towerW / 2], [towerX + x * towerW / 2, y, towerW / 2], 0.027, towerMetal, 6);
      for (const z of [-1, 1]) bar(group, [towerX - towerW / 2, y, z * towerW / 2], [towerX + towerW / 2, y, z * towerW / 2], 0.028, towerDark, 6);
      if (Math.round(y * 10) % 2 === 0) {
        bar(group, [towerX - towerW / 2, y, -towerW / 2], [towerX + towerW / 2, y + 0.72, towerW / 2], 0.023, warning, 6);
        bar(group, [towerX + towerW / 2, y, -towerW / 2], [towerX - towerW / 2, y + 0.72, towerW / 2], 0.023, warning, 6);
      }
    }
    bar(group, [towerX + 0.62, 3.65, 0.28], [towerX + 0.62, 4.9, 0.28], 0.045, towerMetal, 8);
    const stationFlag = new T.Mesh(new T.PlaneGeometry(1.55, 1.03), makeEthiopianFlagMaterial());
    stationFlag.position.set(towerX + 1.42, 4.6, 0.3);
    group.add(stationFlag);
    for (const y of [0.5, 1.6, 2.7, 3.8, 4.9]) box(group, [1.05, 0.065, 1.0], [towerX, y, 0], towerMetal);
    const serviceArms = [1.5, 2.9, 4.3];
    for (const y of serviceArms) {
      bar(group, [towerX + 0.35, y, 0], [-0.36, y, 0], 0.075, warning, 8);
      bar(group, [-0.36, y, 0], [-0.36, y + 0.24, 0], 0.043, towerMetal, 8);
    }
    box(group, [4.8, 1.2, 3.1], [11, 0.6, -3.7], building);
    box(group, [5.2, 0.18, 3.4], [11, 1.27, -3.7], material('roof', '#455c68', 0.58, 0.2));
    for (let x = 9.5; x <= 12.5; x += 1.2) box(group, [0.42, 0.42, 0.03], [x, 0.64, -2.11], material('window', '#22516a', 0.18, 0.35, { emissive: '#183b4e', emissiveIntensity: 0.12 }));
    for (const [x, z, w, h, d] of [[14, -10, 2.2, 2.4, 3], [-15, -8, 2.6, 1.3, 3.2], [17, 5, 1.8, 1.1, 2.2]]) {
      box(group, [w, h, d], [x, h / 2, z], x > 0 ? building : soil);
      box(group, [w * 1.05, 0.15, d * 1.05], [x, h + 0.075, z], towerDark);
    }
    const grass = new T.Mesh(new T.SphereGeometry(1, 9, 6), green);
    for (let i = 0; i < 110; i++) {
      const x = ((i * 173) % 2400) / 100 - 12;
      const z = ((i * 281) % 3800) / 100 - 22;
      if (Math.abs(x) < 8 && z < 8 && z > -19) continue;
      const bush = grass.clone();
      const radius = 0.12 + (i % 5) * 0.055;
      bush.scale.set(radius * 1.4, radius * 0.45, radius);
      bush.position.set(x, -radius * 0.1, z);
      bush.castShadow = false;
      bush.receiveShadow = true;
      group.add(bush);
    }
  }

  function pointOnSurface(xMeters, zMeters) {
    const x = xMeters * SCALE;
    const z = zMeters * SCALE;
    return new V3(x, -EARTH_R + Math.sqrt(Math.max(1, EARTH_R * EARTH_R - x * x - z * z)), z);
  }

  function createTarget(mission) {
    const target = new T.Group();
    const east = mission.target.eastM;
    const north = mission.target.northM;
    const p = pointOnSurface(east, north);
    target.position.copy(p);
    const surface = new T.Group();
    surface.rotation.x = -Math.PI / 2;
    target.add(surface);
    const width = 6000 * SCALE;
    const height = 4000 * SCALE;
    const ground = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ color: '#91b66d', transparent: true, opacity: 0.48, depthWrite: false, side: T.DoubleSide }));
    surface.add(ground);
    const edge = material('targetEdge', '#dceda4', 0.35, 0.12, { emissive: '#405527', emissiveIntensity: 0.45 });
    for (const z of [-height / 2, height / 2]) box(surface, [width, 0.3 * SCALE, 5 * SCALE], [0, 0.4 * SCALE, z], edge);
    for (const x of [-width / 2, width / 2]) box(surface, [5 * SCALE, 0.3 * SCALE, height], [x, 0.4 * SCALE, 0], edge);
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512; labelCanvas.height = 96;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#071624dc'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#ddf39a'; ctx.font = 'bold 38px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(mission.site, 256, 61);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(labelCanvas), transparent: true, depthWrite: false, opacity: 0.92 }));
    sprite.position.set(0, 25, 0);
    sprite.scale.set(650, 122, 1);
    target.add(sprite);
    return target;
  }

  class GameScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      if ('outputColorSpace' in this.renderer) this.renderer.outputColorSpace = T.SRGBColorSpace;
      else this.renderer.outputEncoding = T.sRGBEncoding;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(47, window.innerWidth / window.innerHeight, 0.08, 250000);
      this.camera.position.set(0, 7, 18);
      this.camera.lookAt(0, 0, 0);
      this.mode = 'home';
      this.flightRun = null;
      this.parts = null;
      this.menuClock = 0;
      this.preview = null;
      this.craft = null;
      this.earth = null;
      this.target = null;
      this.flightBackdrop = null;
      this.earthCentre = new V3(0, -EARTH_R, 0);
      this.scene.background = new T.Color('#050d1c');
      this.fog = new T.Fog('#6d9fc0', 1600, 28000);
      this.scene.fog = this.fog;
      this.ambient = new T.HemisphereLight('#d7e6ff', '#465044', 0.52);
      this.scene.add(this.ambient);
      this.sun = new T.DirectionalLight('#fff0d1', 1.0);
      this.sun.position.set(-70, 160, 95);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      this.sun.shadow.camera.left = -40; this.sun.shadow.camera.right = 40;
      this.sun.shadow.camera.top = 40; this.sun.shadow.camera.bottom = -40;
      this.scene.add(this.sun);
      this.createMenuWorld();
      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
    }

    createMenuWorld() {
      this.menuEarth = new T.Mesh(new T.SphereGeometry(42, 64, 40), new T.MeshBasicMaterial({ map: makeMapTexture() }));
      this.menuEarth.position.set(2, -48, -6);
      this.menuEarth.rotation.set(0.1, 0.9, 0.04);
      this.scene.add(this.menuEarth);
      this.menuClouds = new T.Mesh(new T.SphereGeometry(42.35, 48, 30), new T.MeshBasicMaterial({ color: '#dceefa', transparent: true, opacity: 0.025, side: T.BackSide }));
      this.menuClouds.position.copy(this.menuEarth.position);
      this.scene.add(this.menuClouds);
      this.starField = this.makeStars(1400, 2800);
      this.scene.add(this.starField);
      this.preview = new T.Group();
      this.preview.position.set(9.2, 0.2, -1.5);
      this.scene.add(this.preview);
      this.previewRocket = buildRocket(null);
      this.previewSatellite = buildSatellite(null);
      this.preview.add(this.previewRocket);
      this.previewRocket.visible = false;
      this.previewSatellite.position.y = 0;
      this.preview.add(this.previewSatellite);
      this.preview.scale.setScalar(1.1);
      this.menuTarget = new V3(0, 0, 0);
    }

    makeStars(count, radius) {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const u = Math.random() * 2 - 1;
        const angle = Math.random() * Math.PI * 2;
        const distance = radius * (0.35 + Math.random() * 0.65);
        const radiusPlane = Math.sqrt(1 - u * u);
        positions[i * 3] = Math.cos(angle) * radiusPlane * distance;
        positions[i * 3 + 1] = u * distance;
        positions[i * 3 + 2] = Math.sin(angle) * radiusPlane * distance;
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      const mat = new T.PointsMaterial({ color: '#f2f6ff', size: 5, sizeAttenuation: true, transparent: true, opacity: 0.82 });
      return new T.Points(geometry, mat);
    }

    resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    updatePreview(parts) {
      if (!this.preview) return;
      if (this.previewRocket) this.preview.remove(this.previewRocket);
      if (this.previewSatellite) this.preview.remove(this.previewSatellite);
      this.previewRocket = buildRocket(parts);
      this.previewSatellite = buildSatellite(parts);
      this.previewRocket.visible = false;
      this.previewSatellite.position.y = 0;
      this.preview.add(this.previewRocket, this.previewSatellite);
    }

    setScreen(screen, parts) {
      this.mode = screen;
      if (parts) this.updatePreview(parts);
      const menu = ['home', 'hangar', 'log', 'debrief'].includes(screen);
    this.preview.visible = menu;
      if (this.previewRocket) this.previewRocket.visible = false;
      if (this.previewSatellite) this.previewSatellite.position.y = 0;
      if (this.craft) this.craft.visible = !menu;
      if (this.earth) this.earth.visible = !menu;
      if (this.ground) this.ground.visible = !menu;
      if (this.station) this.station.visible = !menu;
      if (this.target) this.target.visible = !menu;
      this.menuEarth.visible = menu;
      this.menuClouds.visible = menu;
      this.menuFloorVisible(menu);
      this.starField.visible = true;
      if (screen === 'home') {
        this.camera.position.set(5.4, 5.5, 17);
        this.camera.lookAt(0, -0.6, 0);
      } else if (screen === 'hangar') {
        this.camera.position.set(6.5, 4, 14);
        this.camera.lookAt(0, 0.2, 0);
      } else if (menu) {
        this.camera.position.set(0, 4, 17);
        this.camera.lookAt(0, 0, 0);
      }
      if (screen === 'flight' && !this.craft) this.initializeFlight(this.flightRun, this.parts);
      if (menu) { this.scene.fog = null; this.scene.background = new T.Color('#030712'); }
      else this.renderSky(0);
    }

    menuFloorVisible(visible) {
      this.scene.children.forEach(object => {
        if (object.name === 'hangarFloor') object.visible = visible;
        if (object.name === 'hangarGrid') object.visible = visible;
      });
    }

    initializeFlight(run, parts) {
      if (!run) return;
      if (this.craft) this.scene.remove(this.craft);
      if (this.earth) this.scene.remove(this.earth);
      if (this.ground) this.scene.remove(this.ground);
      if (this.station) this.scene.remove(this.station);
      if (this.target) this.scene.remove(this.target);
      this.flightRun = run;
      this.parts = parts;
      this.earth = createEarthTexture();
      this.scene.add(this.earth);
      this.ground = curvedGround();
      this.scene.add(this.ground);
      this.station = new T.Group();
      this.station.name = 'ETHIOPIAN HIGHLAND LAUNCH COMPLEX';
      buildLaunchSite(this.station);
      this.station.scale.setScalar(0.3);
      this.station.position.y = 0.035;
      this.scene.add(this.station);
      this.target = createTarget(window.GameCatalog.getMission(run.missionId));
      this.scene.add(this.target);
      this.craft = new T.Group();
      this.craft.name = 'CAMERA-TRACKED PLAYER VEHICLE';
      this.craftRocket = buildRocket(parts);
      this.craftRocket.scale.setScalar(14 * SCALE);
      this.craftSatellite = buildSatellite(parts);
      this.craftSatellite.scale.setScalar(18 * SCALE);
      this.craftSatellite.position.y = 3.1 * 14 * SCALE;
      this.craft.add(this.craftRocket, this.craftSatellite);
      this.scene.add(this.craft);
      this.craft.position.set(run.position.x * SCALE, run.position.y * SCALE, run.position.z * SCALE);
      this.craftSatellite.visible = false;
      this.craftRocket.visible = true;
      this.orbitMode = false;
      this.preview.visible = false;
      this.menuEarth.visible = false;
      this.menuClouds.visible = false;
      this.menuFloorVisible(false);
      this.sun.intensity = 1.0;
      this.camera.far = 250000;
      this.camera.updateProjectionMatrix();
    }

    setFlight(run, parts) {
      this.flightRun = run;
      this.parts = parts;
      this.initializeFlight(run, parts);
      this.mode = 'flight';
    }

    deploySatellite(run) {
      if (!this.craft) return;
      this.craftRocket.visible = false;
      this.craft.remove(this.craftRocket);
      this.craftSatellite.visible = true;
      this.craftSatellite.position.y = 0;
      this.craft.rotation.set(0, 0, 0);
      this.orbitMode = true;
      this.camera.position.set(this.craft.position.x, this.craft.position.y + 1.3, this.craft.position.z + 5);
      this.camera.lookAt(this.craft.position);
    }

    renderSky(altitude) {
      const p = Math.min(1, Math.max(0, altitude / 115000));
      const smooth = p * p * (3 - 2 * p);
      const day = new T.Color('#5b98c4');
      const night = new T.Color('#020611');
      const color = day.lerp(night, smooth);
      this.scene.background = color;
      if (this.fog) {
        this.fog.color.copy(color);
        this.fog.near = 1600 + smooth * 16000;
        this.fog.far = 18000 + smooth * 90000;
      }
      this.ambient.intensity = 0.52 - smooth * 0.20;
      this.sun.intensity = 1.0 - smooth * 0.48;
      if (this.starField) this.starField.material.opacity = 0.08 + smooth * 0.78;
    }

    update(run, dt, elapsed) {
      this.flightRun = run;
      this.menuClock += dt;
      if (this.mode === 'flight' && run && this.craft) {
        this.craft.position.set(run.position.x * SCALE, run.position.y * SCALE, run.position.z * SCALE);
        this.craft.rotation.set(run.pitch, run.roll, run.yaw, 'YXZ');
        this.craftSatellite.visible = run.phase === 'orbit';
        this.craftRocket.visible = run.phase === 'ascent';
        this.target.visible = run.phase === 'orbit';
        if (this.craftRocket.userData.flames) this.craftRocket.userData.flames.visible = run.phase === 'ascent' && run.lastFuelCommand && run.fuel > 0;
        if (run.phase === 'ascent') {
          const altitude = Math.max(0, run.altitude);
          const dist = 5.5 + Math.min(8, altitude / 12500);
          const up = new V3(0, 1.3 + Math.min(3, altitude / 30000), dist).applyQuaternion(this.craft.quaternion);
          const desired = this.craft.position.clone().add(up);
          this.camera.position.copy(desired);
          this.camera.up.set(0, 1, 0);
          this.camera.lookAt(this.craft.position.clone().add(new V3(0, 0.25, 0)));
        } else {
          const offset = new V3(0, 1.3, 5).applyQuaternion(this.craft.quaternion);
          const desired = this.craft.position.clone().add(offset);
          this.camera.position.copy(desired);
          this.camera.up.set(0, 1, 0);
          this.camera.lookAt(this.craft.position);
          if (this.earth) this.earth.rotation.y += dt * 0.000004;
        }
        this.renderSky(run.altitude);
      } else if (this.preview && this.preview.visible) {
        this.preview.rotation.y += dt * (this.mode === 'home' ? 0.075 : 0.12);
        this.preview.rotation.x = Math.sin(this.menuClock * 0.38) * 0.055;
        if (this.menuEarth) this.menuEarth.rotation.y += dt * 0.003;
        if (this.menuClouds) this.menuClouds.rotation.y += dt * 0.0034;
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.GameScene = GameScene;
})();
