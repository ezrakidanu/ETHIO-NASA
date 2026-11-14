# ETHIO NASA — Flight Program

A single-player, offline-capable 3D satellite flight game set at a fictional Ethiopian highland launch complex. Build a satellite in the hangar, pilot a rocket through ascent, explicitly insert into orbit, and align the science instrument with an Ethiopian survey area. The title/career screen is separate from hangar and live flight. A ten-second opening splash credits **MG Studio** and developer **Ezra Kidanu**; that credit is not repeated on the career home or in-flight HUD. Ethiopian flags appear on the launch station and satellite. The home/hangar/result scene previews the deployed satellite by itself, separate from the carrier rocket; the in-flight tip banner is removed to keep the scene clear. The hangar shop and vehicle manifest reflow independently at phone sizes, with sale cards kept separate from the manifest.

## Start playing

On Android, install `ethio-nasa-playable.apk` and open **ETHIO NASA**. The app keeps career data on that device; no login or network connection is needed. If Android reports a signature conflict with an older debug installation, remove the old installation and then install this refreshed APK. The editable source is a browser game with its local files beside `index.html`; it is not an Android Studio/Gradle project. Use a browser with WebGL enabled.

Choose **Enter the Hangar**, select a contract, and inspect the manifest, part models, specifications, prices and operation fee. New careers start with **$250,000,000 in fictional game dollars** and starter hardware. Buy or equip a bus structure/material, launch motor, power system and science instrument. A purchase deducts its price immediately; owned hardware remains in the inventory on every flight. Launch-operation costs are displayed in advance and charged only when the player presses **Authorize Launch**. A successful science capture credits the contract payment; fitting its recommended instrument adds a $2,000,000 bonus. Failed/aborted flights do not pay a contract reward. Funds and equipment persist in this browser/app installation.

## Controls and mission flow

During ascent, hold **HOLD THRUST** (touch) or **Space/W** (keyboard) to run the main engine. Letting go stops the engine and its propellant use. Use the on-screen arrow pad or keyboard arrows to pitch and yaw; dragging the flight view also changes attitude. The camera follows the rocket. Reach **100 km** to reveal **Deploy + Insert Orbit** in the mission panel; staging detaches the carrier rocket before the satellite flies on alone. That deliberate command separates the carrier and spends the displayed **6% reserve** to assist with circular-orbit insertion.

In orbit, steer the 3D satellite with the same arrows or drag. Hold **RCS FWD/BACK** on screen, or **Space/W/S** on keyboard, to command small translations. Orient the underside instrument toward the highlighted Ethiopian survey region. Capture becomes available when sensor alignment reaches **99.5%**. **Escape** or **Pause** stops flight controls; resume, or explicitly abort/return to the hangar. Hardware is not consumed. Propellant is consumed only during a held main-engine or RCS command, or during the clearly labeled orbit-insertion action. The game disables browser text-selection and long-press copy menus on its play surface.

## Simulation and challenge context

The renderer uses a consistent 1:50 display-world-to-metre position scale; velocity and altitude are calculated from the same flight state. Gravity and atmospheric drag affect flight but do not consume propellant. Orbit insertion is an intentional, assisted gameplay action rather than an automatic fuel loss. Component performance/prices, mission fees and rewards are **fictional game values**, not aerospace-vendor prices or flight guidance. Orbital dynamics are simplified for play and learning; this is not flight software or a validated real-world mission simulator.

The project is designed around the NASA Space Apps Challenge 2026 **Space Mission Design Game** prompt: design trade-offs, a playable simulation and a mission evaluation loop. It is an independent entry and is **not endorsed by NASA**; no national or global award is promised or guaranteed. The project uses original procedural 3D rocket, satellite and launch-site models and does not copy proprietary Spaceflight Simulator 2 assets.

Official challenge description: https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/

## Source files

- `index.html` — title, hangar, HUD and responsive layout.
- `site.webmanifest` — ETHIO NASA browser-install metadata using the satellite icon.
- `src/catalog.js` — local save, dollars, components, purchases and contract rewards.
- `src/physics.js` — metre/second flight state, gravity, thrust, drag and orbit insertion.
- `src/scene.js` — offline Three.js Earth, highland launch site, procedural vehicles and follow camera.
- `src/ui.js` / `src/app.js` — screens, controls, input, objectives and mission flow.
- `assets/three.min.js` and `assets/THREE-LICENSE.txt` — locally bundled Three.js runtime and MIT notice for offline play.
- `assets/satellite-icon.png` — satellite favicon/browser-install icon; the native Android launcher also uses the satellite icon.
