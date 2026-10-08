```
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const container = document.getElementById("canvas-container");

if (!container) {
    throw new Error("canvas-container not found in index.html");
}

/* =====================================================
   SCENE
===================================================== */

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87ceeb);

/* =====================================================
   CAMERA
===================================================== */

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    10000
);

camera.position.set(
    250,
    180,
    250
);

/* =====================================================
   RENDERER
===================================================== */

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
    container.clientWidth,
    container.clientHeight
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

container.appendChild(
    renderer.domElement
);

/* =====================================================
   ORBIT CONTROLS
===================================================== */

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.dampingFactor = 0.08;

controls.minDistance = 10;

controls.maxDistance = 5000;

/* =====================================================
   LIGHTS
===================================================== */

const ambientLight =
    new THREE.AmbientLight(
        0xffffff,
        1.5
    );

scene.add(
    ambientLight
);

const sun =
    new THREE.DirectionalLight(
        0xffffff,
        2
    );

sun.position.set(
    300,
    500,
    300
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;

sun.shadow.mapSize.height = 2048;

scene.add(
    sun
);

/* =====================================================
   GROUND
===================================================== */

const groundGeometry =
    new THREE.PlaneGeometry(
        3000,
        3000
    );

const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x4f7942,
        roughness: 1
    });

const ground =
    new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );

ground.rotation.x =
    -Math.PI / 2;

ground.position.y =
    -0.25;

ground.receiveShadow = true;

scene.add(
    ground
);

/* =====================================================
   GRID
===================================================== */

const grid =
    new THREE.GridHelper(
        2000,
        100,
        0x555555,
        0x777777
    );

grid.position.y =
    -0.2;

scene.add(
    grid
);

/* =====================================================
   ROAD GROUP
===================================================== */

let roadGroup = null;

/* =====================================================
   GET INPUT
===================================================== */

function getNumber(id) {

    const element =
        document.getElementById(id);

    if (!element) {
        return NaN;
    }

    return Number(
        element.value
    );
}

/* =====================================================
   SMOOTH STEP
===================================================== */

function smoothStep(t) {

    t = Math.max(
        0,
        Math.min(1, t)
    );

    return (
        t *
        t *
        (3 - 2 * t)
    );
}

/* =====================================================
   AUTOMATIC ROAD WIDTH
===================================================== */

function calculateWidth(
    chainage,
    transitionLength,
    startWidth,
    finalWidth
) {

    if (
        chainage <= 0
    ) {

        return startWidth;
    }

    if (
        chainage >= transitionLength
    ) {

        return finalWidth;
    }

    const t =
        chainage /
        transitionLength;

    const smoothT =
        smoothStep(t);

    return (
        startWidth +
        (
            finalWidth -
            startWidth
        ) *
        smoothT
    );
}

/* =====================================================
   AUTOMATIC LANE COUNT
===================================================== */

function calculateLaneCount(
    chainage,
    transitionLength,
    startLanes,
    finalLanes
) {

    if (
        chainage >= transitionLength
    ) {

        return finalLanes;
    }

    const t =
        chainage /
        transitionLength;

    return (
        startLanes +
        (
            finalLanes -
            startLanes
        ) *
        t
    );
}

/* =====================================================
   AUTOMATIC 20 METER STATIONS
===================================================== */

function generateStations(
    totalLength,
    transitionLength
) {

    const interval = 20;

    const stations = [];

    /*
     * Automatically generate:
     *
     * 0
     * 20
     * 40
     * 60
     * ...
     */

    for (
        let x = 0;
        x <= totalLength;
        x += interval
    ) {

        stations.push(
            Number(
                x.toFixed(3)
            )
        );
    }

    /*
     * Add transition endpoint.
     *
     * Example:
     *
     * Transition = 140 m
     *
     * 0,20,40,60,80,100,120,140
     */

    if (
        !stations.includes(
            transitionLength
        )
    ) {

        stations.push(
            Number(
                transitionLength.toFixed(3)
            )
        );
    }

    /*
     * Add final road endpoint.
     */

    if (
        !stations.includes(
            totalLength
        )
    ) {

        stations.push(
            Number(
                totalLength.toFixed(3)
            )
        );
    }

    stations.sort(
        (a, b) => a - b
    );

    return [
        ...new Set(stations)
    ];
}

/* =====================================================
   AUTOMATIC COORDINATES
===================================================== */

function generateCoordinates(
    stations,
    transitionLength,
    startWidth,
    finalWidth,
    startLanes,
    finalLanes
) {

    return stations.map(
        chainage => {

            const width =
                calculateWidth(
                    chainage,
                    transitionLength,
                    startWidth,
                    finalWidth
                );

            const lanes =
                calculateLaneCount(
                    chainage,
                    transitionLength,
                    startLanes,
                    finalLanes
                );

            const halfWidth =
                width / 2;

            /*
             * Coordinate system:
             *
             * X = chainage
             * Y = elevation
             * Z = road width
             *
             * Center = 0
             */

            return {

                chainage,

                width,

                lanes,

                left: {
                    x: chainage,
                    y: 0,
                    z: halfWidth
                },

                right: {
                    x: chainage,
                    y: 0,
                    z: -halfWidth
                },

                center: {
                    x: chainage,
                    y: 0,
                    z: 0
                }
            };
        }
    );
}

/* =====================================================
   ROAD SURFACE
===================================================== */

function createRoadMesh(
    coordinates
) {

    const vertices = [];

    const indices = [];

    coordinates.forEach(
        point => {

            vertices.push(
                point.left.x,
                point.left.y,
                point.left.z
            );

            vertices.push(
                point.right.x,
                point.right.y,
                point.right.z
            );
        }
    );

    for (
        let i = 0;
        i < coordinates.length - 1;
        i++
    ) {

        const a =
            i * 2;

        const b =
            a + 1;

        const c =
            a + 2;

        const d =
            a + 3;

        indices.push(
            a,
            b,
            c
        );

        indices.push(
            b,
            d,
            c
        );
    }

    const geometry =
        new THREE.BufferGeometry();

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
            vertices,
            3
        )
    );

    geometry.setIndex(
        indices
    );

    geometry.computeVertexNormals();

    const material =
        new THREE.MeshStandardMaterial({

            color: 0x303030,

            roughness: 0.9,

            metalness: 0,

            side:
                THREE.DoubleSide
        });

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.receiveShadow = true;

    mesh.castShadow = true;

    return mesh;
}

/* =====================================================
   ROAD EDGE
===================================================== */

function createRoadEdges(
    coordinates
) {

    const group =
        new THREE.Group();

    const leftPoints =
        coordinates.map(
            point =>
                new THREE.Vector3(
                    point.left.x,
                    point.left.y + 0.05,
                    point.left.z
                )
        );

    const rightPoints =
        coordinates.map(
            point =>
                new THREE.Vector3(
                    point.right.x,
                    point.right.y + 0.05,
                    point.right.z
                )
        );

    const material =
        new THREE.LineBasicMaterial({
            color: 0xffffff
        });

    const leftGeometry =
        new THREE.BufferGeometry()
            .setFromPoints(
                leftPoints
            );

    const rightGeometry =
        new THREE.BufferGeometry()
            .setFromPoints(
                rightPoints
            );

    const leftLine =
        new THREE.Line(
            leftGeometry,
            material
        );

    const rightLine =
        new THREE.Line(
            rightGeometry,
            material
        );

    group.add(
        leftLine
    );

    group.add(
        rightLine
    );

    return group;
}

/* =====================================================
   CENTER LINE
===================================================== */

function createCenterLine(
    coordinates
) {

    const points =
        coordinates.map(
            point =>
                new THREE.Vector3(
                    point.center.x,
                    0.08,
                    point.center.z
                )
        );

    const geometry =
        new THREE.BufferGeometry()
            .setFromPoints(
                points
            );

    const material =
        new THREE.LineDashedMaterial({

            color: 0xffff00,

            dashSize: 5,

            gapSize: 5
        });

    const line =
        new THREE.Line(
            geometry,
            material
        );

    line.computeLineDistances();

    return line;
}

/* =====================================================
   LANE MARKINGS
===================================================== */

function createLaneMarkings(
    coordinates,
    startLanes,
    finalLanes,
    transitionLength
) {

    const group =
        new THREE.Group();

    const maxLanes =
        Math.max(
            startLanes,
            finalLanes
        );

    /*
     * Draw internal lane boundaries.
     */

    for (
        let lane = 1;
        lane < maxLanes;
        lane++
    ) {

        const points = [];

        coordinates.forEach(
            point => {

                const lanes =
                    calculateLaneCount(
                        point.chainage,
                        transitionLength,
                        startLanes,
                        finalLanes
                    );

                /*
                 * Boundary disappears
                 * when lane count becomes
                 * smaller than this boundary.
                 */

                if (
                    lane >= lanes
                ) {

                    return;
                }

                /*
                 * Position boundary
                 * across the current width.
                 */

                const ratio =
                    lane /
                    lanes;

                const z =
                    point.width / 2 -
                    point.width * ratio;

                points.push(
                    new THREE.Vector3(
                        point.chainage,
                        0.09,
                        z
                    )
                );

            }
        );

        if (
            points.length >= 2
        ) {

            const geometry =
                new THREE.BufferGeometry()
                    .setFromPoints(
                        points
                    );

            const material =
                new THREE.LineDashedMaterial({

                    color: 0xffffff,

                    dashSize: 5,

                    gapSize: 5
                });

            const line =
                new THREE.Line(
                    geometry,
                    material
                );

            line.computeLineDistances();

            group.add(
                line
            );
        }
    }

    return group;
}

/* =====================================================
   STATION MARKERS
===================================================== */

function createStationMarkers(
    coordinates
) {

    const group =
        new THREE.Group();

    const material =
        new THREE.MeshBasicMaterial({
            color: 0xff0000
        });

    coordinates.forEach(
        point => {

            const geometry =
                new THREE.SphereGeometry(
                    0.6,
                    8,
                    8
                );

            const marker =
                new THREE.Mesh(
                    geometry,
                    material
                );

            marker.position.set(
                point.chainage,
                0.15,
                0
            );

            group.add(
                marker
            );
        }
    );

    return group;
}

/* =====================================================
   COORDINATE TABLE
===================================================== */

function updateCoordinateTable(
    coordinates
) {

    const table =
        document.getElementById(
            "coordinateTable"
        );

    if (!table) {
        return;
    }

    table.innerHTML = "";

    coordinates.forEach(
        point => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `
                <td>
                    ${point.chainage.toFixed(2)}
                </td>

                <td>
                    ${point.width.toFixed(2)}
                </td>

                <td>
                    ${point.lanes.toFixed(2)}
                </td>

                <td>
                    ${point.left.z.toFixed(2)}
                </td>

                <td>
                    ${point.right.z.toFixed(2)}
                </td>
            `;

            table.appendChild(
                row
            );
        }
    );
}

/* =====================================================
   GENERATE ROAD
===================================================== */

function generateRoad() {

    /*
     * Remove previous model.
     */

    if (roadGroup) {

        scene.remove(
            roadGroup
        );

        roadGroup.traverse(
            object => {

                if (
                    object.geometry
                ) {

                    object.geometry.dispose();
                }

                if (
                    object.material
                ) {

                    if (
                        Array.isArray(
                            object.material
                        )
                    ) {

                        object.material.forEach(
                            material =>
                                material.dispose()
                        );

                    } else {

                        object.material.dispose();
                    }
                }
            }
        );
    }

    roadGroup =
        new THREE.Group();

    /*
     * Read user inputs.
     */

    const startLanes =
        getNumber(
            "startLanes"
        );

    const finalLanes =
        getNumber(
            "finalLanes"
        );

    const totalLength =
        getNumber(
            "totalLength"
        );

    const transitionLength =
        getNumber(
            "transitionLength"
        );

    const startWidth =
        getNumber(
            "startWidth"
        );

    const finalWidth =
        getNumber(
            "finalWidth"
        );

    /*
     * Validation.
     */

    if (
        !Number.isFinite(
            startLanes
        ) ||
        !Number.isFinite(
            finalLanes
        ) ||
        !Number.isFinite(
            totalLength
        ) ||
        !Number.isFinite(
            transitionLength
        ) ||
        !Number.isFinite(
            startWidth
        ) ||
        !Number.isFinite(
            finalWidth
        )
    ) {

        alert(
            "Please enter valid values."
        );

        return;
    }

    if (
        startLanes < 1 ||
        finalLanes < 1
    ) {

        alert(
            "Lane count must be at least 1."
        );

        return;
    }

    if (
        totalLength <= 0
    ) {

        alert(
            "Total road length must be greater than 0."
        );

        return;
    }

    if (
        transitionLength <= 0 ||
        transitionLength > totalLength
    ) {

        alert(
            "Transition length must be greater than 0 and cannot exceed total road length."
        );

        return;
    }

    if (
        startWidth <= 0 ||
        finalWidth <= 0
    ) {

        alert(
            "Road width must be greater than 0."
        );

        return;
    }

    /*
     * Generate stations automatically.
     */

    const stations =
        generateStations(
            totalLength,
            transitionLength
        );

    /*
     * Generate coordinates automatically.
     */

    const coordinates =
        generateCoordinates(
            stations,
            transitionLength,
            startWidth,
            finalWidth,
            startLanes,
            finalLanes
        );

    /*
     * Road surface.
     */

    roadGroup.add(
        createRoadMesh(
            coordinates
        )
    );

    /*
     * Road edges.
     */

    roadGroup.add(
        createRoadEdges(
            coordinates
        )
    );

    /*
     * Lane markings.
     */

    roadGroup.add(
        createLaneMarkings(
            coordinates,
            startLanes,
            finalLanes,
            transitionLength
        )
    );

    /*
     * Center line.
     */

    roadGroup.add(
        createCenterLine(
            coordinates
        )
    );

    /*
     * Station markers.
     */

    roadGroup.add(
        createStationMarkers(
            coordinates
        )
    );

    /*
     * Add model.
     */

    scene.add(
        roadGroup
    );

    /*
     * Update table.
     */

    updateCoordinateTable(
        coordinates
    );

    /*
     * Update information panel.
     */

    const info =
        document.getElementById(
            "modelInfo"
        );

    if (info) {

        info.innerHTML = `
            Total Length:
            ${totalLength} m<br>

            Transition:
            ${transitionLength} m<br>

            Width:
            ${startWidth} → ${finalWidth} m<br>

            Lanes:
            ${startLanes} → ${finalLanes}<br>

            Stations:
            ${coordinates.length}<br>

            Automatic Interval:
            20 m
        `;
    }

    /*
     * Camera positioning.
     */

    camera.position.set(
        totalLength * 0.45,
        Math.max(
            100,
            totalLength * 0.22
        ),
        totalLength * 0.35
    );

    controls.target.set(
        totalLength / 2,
        0,
        0
    );

    controls.update();
}

/* =====================================================
   GENERATE BUTTON
===================================================== */

const generateButton =
    document.getElementById(
        "generateButton"
    );

if (generateButton) {

    generateButton.addEventListener(
        "click",
        generateRoad
    );
}

/* =====================================================
   WINDOW RESIZE
===================================================== */

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            container.clientWidth /
            container.clientHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            container.clientWidth,
            container.clientHeight
        );
    }
);

/* =====================================================
   ANIMATION LOOP
===================================================== */

function animate() {

    requestAnimationFrame(
        animate
    );

    controls.update();

    renderer.render(
        scene,
        camera
    );
}

animate();

/* =====================================================
   INITIAL GENERATION
===================================================== */

generateRoad();
```
