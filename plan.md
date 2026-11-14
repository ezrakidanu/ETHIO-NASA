# ETHIO NASA — 3D flight program

## Product goal
An offline-capable, mobile-friendly 3D satellite flight and mission-design game set at a fictional Ethiopian highland launch complex. Players build and finance their own orbital mission, pilot ascent, deliberately stage the satellite, and complete an Earth-observation contract. This independent educational game is not NASA-endorsed or flight-qualified.

## Player flow and identity
The opening screen is a ten-second splash with the satellite icon and **Made by MG Studio · Developer Ezra Kidanu** credit. The career home and flight HUD contain no creator credit. Visible/native app name is **ETHIO NASA**. The career home, hangar, gameplay, and centered mission debrief are separate screens. Career funds and owned parts persist locally; purchases and operation charges are explicit, and successful science contracts reward funds.

At the launch complex, a camera-followed 3D rocket accelerates above visible terrain at a consistent 1:50 position conversion. Gravity/drag affect velocity; fuel is used on commanded engine/RCS burns and the explicit orbit insertion action only. At the altitude gate, the carrier rocket object is removed from the vehicle; the satellite model alone continues in orbit. Satellite steering aligns the sensor with a modest Ethiopian survey target for science capture. No collectible-circle loop remains.

## Visual direction and interface
Use a restrained aerospace-operations style: natural green/olive/brown Ethiopian terrain, blue water, continuous altitude-dependent sky transition, layered procedural spacecraft, and clear measured telemetry. Keep stage/capture controls out of the camera's view of the vehicle. Keep component-shop cards constrained inside their own responsive grid, separated from the manifest at phone and landscape sizes. Apply multiscale noise to terrain color to avoid white-looking, repetitive ground. Render Ethiopian flags with a blue center emblem as on-device procedural textures on the station and satellite. End on a vertically and horizontally centered, viewport-bounded result card with the satellite-only scene visible behind it.

Remove the in-flight instruction banner for an unobstructed scene. Prevent accidental browser text selection and long-press copy/select/context menus on touch controls, while retaining button pointer capture, drag steering, touch/keyboard commands and scrolling for longer panels.

## Implementation and distribution
Keep the existing Capacitor Android wrapper and standalone browser build. Vendor pinned Three.js locally with its MIT notice, so the game does not need network access. Keep the satellite icon for Android/browser use. Modules remain `src/app.js` (app lifecycle/controls), `src/scene.js` (3D world/models/flags/camera), `src/physics.js` (educational dynamics), `src/catalog.js` (game-dollar economy/save), `src/ui.js` (screens/HUD/debrief), plus `index.html`, `site.webmanifest`, `assets/`, and player instructions.

All prices and payouts are fictional game values. Orbital dynamics are simplified for play and learning, not aerospace guidance. Project context: the NASA Space Apps Challenge 2026 **Space Mission Design Game** prompt; independent entry; no claim of NASA endorsement or any award.
