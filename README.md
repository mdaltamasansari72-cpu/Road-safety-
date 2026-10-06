# Mira–Bhayandar Parametric 3D Studio — Blender Style

This is a browser-based, Blender-style procedural visualization of the Mira–Bhayandar bridge concept.

## Main features
- PBR-style Three.js materials, ACES tone mapping and high-resolution shadows
- Procedural asphalt/concrete textures
- Continuous road/deck through the parabolic transition
- Underside deck, longitudinal girders, cross beams, pier caps and piers
- Barriers, railings, lane markings, transition arrows and street lights
- Procedural urban buildings, windows, rooftop tanks, trees and creek/water
- Vehicles and an interactive driver vehicle
- Orbit, Top, Engineering, Side, Under Bridge, Driver and Follow modes
- Touch and mouse interaction
- Responsive laptop/tablet/mobile layout
- Live parameter editing: geometry regenerates when values change
- Formula:
  W(x) = W2 + (W1 - W2) * (1 - (x/L)^2)

## Mira–Bhayandar preset
Total road length = 850 m
Starting width W1 = 14 m
Final width W2 = 7 m
Starting lanes = 4
Final lanes = 2
Transition length L = 140 m
Approach = 200 m

## Run
Open `index.html` in a modern browser with internet access. The prototype loads Three.js and Tailwind CSS from CDNs.

This is a visualization/demo model, not surveyed/as-built structural CAD.
