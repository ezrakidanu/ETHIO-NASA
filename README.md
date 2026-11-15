# ETHIO-NASA

A single-player, browser-playable 3D satellite flight game set at a fictional Ethiopian highland launch complex. Build a satellite, pilot a rocket through ascent, explicitly insert into orbit, and align the science instrument with a survey area. The static browser build and Android APK use the same game source; browser keyboard/mouse input supplements the existing touch controls.

## Judge Quick-Access Links

- **[Play ETHIO-NASA in your browser](https://ezrakidanu.github.io/ETHIO-NASA/)** — GitHub Pages deployment.
- **[Download the Android APK](https://github.com/ezrakidanu/ETHIO-NASA/blob/main/ethio-nasa-playable%20%282%29.apk?raw=true)** — APK retained in this repository.
- **30-second gameplay demo:** `[INSERT_YOUTUBE_DEMO_LINK]`

## Judge Quick-Start & Controls

1. Choose **Enter the Hangar** and select **Highland Imaging Survey** or **Space Weather Watch**. Review the manifest, hardware prices, and operation fee.
2. Buy or equip the satellite bus, launch motor, power system, and science instrument. A recommended instrument earns a **$2,000,000 game-dollar bonus** after a successful capture. Launch-operation costs are charged only when you authorize launch.
3. During ascent, hold **HOLD THRUST**, or hold **Space/W** on a keyboard. Steer with the on-screen arrows or keyboard arrows; drag the 3D flight scene with a mouse or touch to change attitude. At **100 km**, choose **Deploy + Insert Orbit**, then align the instrument over the highlighted survey area and capture the science scene. In orbit, **Space/W** and **S** command RCS forward/back. **Escape** pauses and **F** attempts a science capture.

Career funds and equipment are saved locally in the browser on that device. No account is required. The app’s scripts and Three.js library are bundled locally. Open the hosted page once while online, or serve/download the same static files locally; browser privacy settings or storage cleanup may clear the local career save. WebGL is required.

## NASA mission context and data sources

The game uses two fictional contract profiles as educational mission concepts, not as recreations of NASA flight plans or telemetry:

- **Highland Imaging Survey** represents an Earth-observation pass-window concept over the Ethiopian Highlands. Its broad inspiration is NASA Landsat and Terra remote sensing. The game uses a fictional survey target and does not import NASA imagery, ephemerides, or actual pass-window data. NASA describes Landsat 8 in a 705 km near-polar, sun-synchronous orbit and Terra in a 705 km sun-synchronous orbit; those real spacecraft parameters are context, not the game’s simulated trajectory. [Landsat 8](https://science.nasa.gov/mission/landsat-8/) · [Terra](https://terra.nasa.gov/about)
- **Space Weather Watch** is a fictional near-Earth magnetic-survey objective inspired by NASA heliophysics missions, including the Solar Dynamics Observatory (SDO) and Parker Solar Probe. It does not use NASA telemetry or reproduce their flight paths. Parker Solar Probe follows a solar orbit, rather than an Earth-observation orbit. [SDO](https://science.nasa.gov/mission/sdo/) · [Parker Solar Probe](https://science.nasa.gov/mission/parker-solar-probe/)

Earth reference context includes JPL’s published planetary physical parameters. The current game code uses a conventional Earth gravitational parameter, an average Earth-radius value, and a simplified exponential atmosphere. These are simulation inputs, not imported live NASA data. [JPL Planetary Physical Parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html)

## Technical architecture and limitations

ETHIO-NASA is a static HTML/CSS/JavaScript browser game rendered with bundled Three.js and WebGL. `catalog.js` defines the contracts, parts, purchases, rewards, and local career save. `physics.js` updates the game flight state. `scene.js` builds the procedural Earth, launch complex, rocket, satellite, and camera. `ui.js` and `app.js` implement the interface, mission flow, keyboard and pointer input, and touch controls. GitHub Pages serves the same root-level files used in the supplied Capacitor APK; the Pages workflow stages only those game assets and leaves the APK in the repository.

The current `physics.js` is a gameplay approximation using central inverse-square gravity, a game-scale atmosphere with an 8,500 m exponential scale height, and a simple time-step update. It does **not** implement a 120 Hz RK4 propagator, J2 perturbations, or Keplerian trajectory predictions. Orbit insertion is an assisted gameplay action. The simulation is educational and is not validated flight dynamics or suitable for mission planning. Part performance, costs, operation fees, and rewards are fictional game values.

## Run locally

Serve this directory from a local HTTP server (for example, `python3 -m http.server 8000`) and open `http://localhost:8000/`. The app is a static site; there is no Node, Gradle, or backend requirement for browser play. The Android package is `ethio-nasa-playable (2).apk` and remains available in the repository.

## Credits and challenge context

The ten-second opening splash credits **MG Studio** and developer **Ezra Kidanu**. The game includes Ethiopian flags on the launch station and satellite. Three.js is distributed under the MIT License; see [`THREE-LICENSE.txt`](THREE-LICENSE.txt).

ETHIO-NASA is an independent educational game created for the NASA Space Apps Challenge. It is not endorsed by NASA and makes no award guarantee. [Challenge description](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)
