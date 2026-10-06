/* ===================================================================
   Parabolic Road Transition CAD Simulation - Core 3D Engine
   Developed by Altamas
   =================================================================== */

// Global Engine Variables
let scene, camera, renderer, controls;
let roadMesh;

// Initialize Simulation Environment
function initEngine() {
    const container = document.getElementById('viewport-container');
    if (!container) return;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.002);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 3000);
    camera.position.set(0, 140, 240);

    // 3. WebGL Renderer Setup
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: "high-performance",
        precision: "highp"
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls Setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Prevent going below ground grid
    controls.minDistance = 10;
    controls.maxDistance = 1000;

    // 5. Lighting System Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(200, 400, 200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Secondary fill light for depth
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
    fillLight.position.set(-200, 100, -200);
    scene.add(fillLight);

    // 6. Professional CAD Engineering Grid Helper
    const gridHelper = new THREE.GridHelper(1000, 100, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.08;
    scene.add(gridHelper);

    // 7. Build Initial Road Mesh
    generateParabolicRoad();

    // 8. Event Listeners Configuration
    window.addEventListener('resize', onWindowResize, false);
    
    const updateBtn = document.getElementById('btnUpdateModel');
    if (updateBtn) updateBtn.addEventListener('click', generateParabolicRoad);

    const resetViewBtn = document.getElementById('btnResetView');
    if (resetViewBtn) resetViewBtn.addEventListener('click', resetCameraPosition);

    const topViewBtn = document.getElementById('btnTopView');
    if (topViewBtn) topViewBtn.addEventListener('click', setTopViewMode);

    const driverViewBtn = document.getElementById('btnDriverView');
    if (driverViewBtn) driverViewBtn.addEventListener('click', setDriverViewMode);

    // Start Animation Loop
    animateEngine();
}

// Procedural Parabolic Road Generation Function
function generateParabolicRoad() {
    if (roadMesh) {
        scene.remove(roadMesh);
        roadMesh.geometry.dispose();
        roadMesh.material.dispose();
    }

    // Fetch input values from UI
    const W1 = parseFloat(document.getElementById('paramW1').value) || 14;
    const W2 = parseFloat(document.getElementById('paramW2').value) || 7;
    const L = parseFloat(document.getElementById('paramL').value) || 140;
    const xVal = parseFloat(document.getElementById('paramX').value) || 60;

    // Mathematical Parabolic Calculation: W(x) = W2 + (W1 - W2) * [1 - (x / L)^2]
    const ratio = xVal / L;
    const Wx = W2 + (W1 - W2) * (1 - Math.pow(ratio, 2));

    // Update real-time metrics display
    const metricsOutput = document.getElementById('metricsOutput');
    if (metricsOutput) {
        metricsOutput.innerHTML = `
            <div>Distance Evaluation: <strong>x = ${xVal} m</strong></div>
            <div>Computed Width: <strong>W(x) = ${Wx.toFixed(4)} m</strong></div>
            <div style="color: #38bdf8; margin-top: 4px;">Matrix State: Active & Synchronized ✓</div>
        `;
    }

    // Generate Shape Geometry using ExtrudeGeometry for 3D depth
    const shape = new THREE.Shape();
    const segments = 80; // High resolution smoothness

    shape.moveTo(-W1 / 2, 0);

    // Left transitional boundary curve
    for (let i = 0; i <= segments; i++) {
        const xCoord = (i / segments) * L;
        const currentWidth = W2 + (W1 - W2) * (1 - Math.pow(xCoord / L, 2));
        shape.lineTo(-currentWidth / 2, xCoord);
    }

    // Right transitional boundary curve (reverse direction)
    for (let i = segments; i >= 0; i--) {
        const xCoord = (i / segments) * L;
        const currentWidth = W2 + (W1 - W2) * (1 - Math.pow(xCoord / L, 2));
        shape.lineTo(currentWidth / 2, xCoord);
    }

    shape.closePath();

    const extrudeSettings = {
        depth: 0.45,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.06,
        bevelThickness: 0.06
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(Math.PI / 2); // Orient horizontally along X-Z plane

    const material = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.25,
        metalness: 0.3,
        side: THREE.DoubleSide
    });

    roadMesh = new THREE.Mesh(geometry, material);
    roadMesh.castShadow = true;
    roadMesh.receiveShadow = true;
    roadMesh.position.set(0, 0, -L / 2); // Center alignment
    
    scene.add(roadMesh);
}

// Camera Preset Functions
function resetCameraPosition() {
    camera.position.set(0, 140, 240);
    controls.target.set(0, 0, 0);
    controls.update();
}

function setTopViewMode() {
    camera.position.set(0, 320, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

function setDriverViewMode() {
    camera.position.set(0, 2.8, -90);
    controls.target.set(0, 2, 30);
    controls.update();
}

// Window Resize Handling
function onWindowResize() {
    const container = document.getElementById('viewport-container');
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Main Render & Animation Loop
function animateEngine() {
    requestAnimationFrame(animateEngine);
    controls.update();
    renderer.render(scene, camera);
}

// Trigger initialization on window load
window.addEventListener('DOMContentLoaded', initEngine);
      
