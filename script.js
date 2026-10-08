```
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const container = document.getElementById("canvas-container");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    10000
);

camera.position.set(250, 180, 250);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(
    container.clientWidth,
    container.clientHeight
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);

/* =========================================================
   CONTROLS
========================================================= */

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 10;
controls.maxDistance = 5000;

/* =========================================================
   LIGHTING
========================================================= */

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    1.5
);

scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    2
);

directionalLight.position.set(
    300,
    500,
    300
);

directionalLight.castShadow = true;

scene.add(directionalLight);

/* =========================================================
   GROUND
========================================================= */

const groundGeometry = new THREE.PlaneGeometry(
    3000,
    3000
);

const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f7942,
    roughness: 1
});

const ground = new THREE.Mesh(
    groundGeometry,
    groundMaterial
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.25;
ground.receiveShadow = true;

scene.add(ground);

/* =========================================================
   GRID
========================================================= */

const grid = new THREE.GridHelper(
    2000,
    100,
    0x555555,
    0x777777
);

grid.position.y = -0.2;

scene.add(grid);

/* =========================================================
   ROAD GROUP
========================================================= */

let roadGroup = null;

/* =========================================================
   INPUT
========================================================= */

function getNumber(id) {
    return Number(
        document.getElementById(id).value
    );
}

/* =========================================================
   WIDTH CALCULATION
========================================================= */

function calculateWidth(
    chainage,
    transitionLength,
    startWidth,
    finalWidth
) {

    if (chainage <= transitionLength) {

        const t =
            chainage / transitionLength;

        return startWidth +
            (finalWidth - startWidth) * t;
    }

    return finalWidth;
}

/* =========================================================
   AUTOMATIC STATION GENERATION
   USER DOES NOT ENTER COORDINATES
   INTERVAL = 20 METERS
========================================================= */

function generateStations(
    totalLength,
    transitionLength
) {

    const interval = 20;

    const stations = [];

    /*
     * Every 20 meters
     */

    for (
        let chainage = 0;
        chainage <= totalLength;
        chainage += interval
    ) {

        stations.push(
            Number(chainage.toFixed(3))
        );
    }

    /*
     * Automatically add transition endpoint
     *
     * Example:
     * 0,20,40,60,80,100,120,140
     */

    if (
        transitionLength <= totalLength &&
        !stations.includes(transitionLength)
    ) {

        stations.push(
            Number(
                transitionLength.toFixed(3)
            )
        );
    }

    /*
     * Automatically add total road endpoint
     */

    if (
        !stations.includes(totalLength)
    ) {

        stations.push(
            Number(
                totalLength.toFixed(3)
            )
        );
    }

    /*
     * Sort
     */

    stations.sort(
        (a, b) => a - b
    );

    /*
     * Remove duplicates
     */

    return [
        ...new Set(stations)
    ];
}

/* =========================================================
   SMOOTH TRANSITION FUNCTION
========================================================= */

function smoothStep(t) {

    t = Math.max(
        0,
        Math.min(1, t)
    );

    return t * t * (3 - 2 * t);
}

/* =========================================================
   SMOOTH WIDTH
========================================================= */

function calculateSmoothWidth(
    chainage,
    transitionLength,
    startWidth,
    finalWidth
) {

    if (chainage <= 0) {
        return startWidth;
    }

    if (chainage >= transitionLength) {
        return finalWidth;
    }

    const t =
        chainage / transitionLength;

    const smoothT =
        smoothStep(t);

    return startWidth +
        (finalWidth - startWidth) *
        smoothT;
}

/* =========================================================
   LANE COUNT
========================================================= */

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
        chainage / transitionLength;

    return startLanes +
        (finalLanes - startLanes) * t;
}

/* =========================================================
   AUTOMATIC ROAD COORDINATES
========================================================= */

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
                calculateSmoothWidth(
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
             * Z = lateral road position
             *
             * Centerline = Z 0
             */

            return {

                chainage: chainage,

                width: width,

                lanes: lanes,

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

/* =========================================================
   ROAD SURFACE
========================================================= */

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

        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;

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

    geometry.setIndex(indices);

    geometry.computeVertexNormals();

    const material =
        new THREE.MeshStandardMaterial({

            color: 0x303030,

            roughness: 0.9,

            metalness: 0,

            side: THREE.DoubleSide

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

/* =========================================================
   ROAD EDGE LINES
========================================================= */

function createRoadEdges(
    coordinates
) {

    const group =
        new THREE.Group();

    const leftPoints =
        coordinates.map(
            point => {

                return new THREE.Vector3(
                    point.left.x,
                    point.left.y + 0.04,
                    point.left.z
                );

            }
        );

    const rightPoints =
        coordinates.map(
            point => {

                return new THREE.Vector3(
                    point.right.x,
                    point.right.y + 0.04,
                    point.right.z
                );

            }
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

    group.add(
        new THREE.Line(
            leftGeometry,
            material
        )
    );

    group.add(
        new THREE.Line(
            rightGeometry,
            material
        )
    );

    return group;
}

/* =========================================================
   CENTER LINE
========================================================= */

function createCenterLine(
    coordinates
) {

    const points =
        coordinates.map(
            point => {

                return new THREE.Vector3(
                    point.center.x,
                    0.05,
                    point.center.z
                );

            }
        );

    const geometry =
        new THREE.BufferGeometry()
            .setFromPoints(points);

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

/* =========================================================
   LANE BOUNDARIES
========================================================= */

function createLaneBoundaries(
    coordinates,
    startLanes,
    finalLanes,
    transitionLength
) {

    const group =
        new THREE.Group();

    /*
     * For a lane reduction such as:
     *
     * 4 lanes -> 2 lanes
     *
     * progressively remove the outer
     * lane boundaries.
     */

    const maximumBoundaries =
        Math.max(
            startLanes,
            finalLanes
        ) - 1;

    for (
        let boundaryIndex = 1;
        boundaryIndex <= maximumBoundaries;
        boundaryIndex++
    ) {

        const points = [];

        coordinates.forEach(
            point => {

                let laneCount;

                if (
                    point.chainage >=
                    transitionLength
                ) {

                    laneCount =
                        finalLanes;

                } else {

                    laneCount =
                        calculateLaneCount(
                            point.chainage,
                            transitionLength,
                            startLanes,
                            finalLanes
                        );

                }

                /*
                 * Boundary no longer exists.
                 */

                if (
                    boundaryIndex >= laneCount
                ) {

                    return;
                }

                /*
                 * Position boundary
                 * proportionally across road.
                 */

                const ratio =
                    boundaryIndex /
                    laneCount;

                const z =
                    point.width / 2 -
                    point.width * ratio;

                points.push(
                    new THREE.Vector3(
                        point.chainage,
                        0.07,
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

            group.add(line);
        }
    }

    return group;
}

/* =========================================================
   STATION MARKERS
========================================================= */

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
                    0.7,
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
                0.12,
                point.center.z
            );

            group.add(marker);

        }
    );

    return group;
}

/* =========================================================
   CHAINAGE LABELS
========================================================= */

function createStationLabels(
    coordinates
) {

    const group =
        new THREE.Group();

    coordinates.forEach(
        point => {

            const canvas =
                document.createElement(
                    "canvas"
                );

            canvas.width = 256;
            canvas.height = 64;

            const ctx =
                canvas.getContext("2d");

            ctx.fillStyle =
                "rgba(0,0,0,0.75)";

            ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            ctx.fillStyle =
                "white";

            ctx.font =
                "bold 28px Arial";

            ctx.textAlign =
                "center";

            ctx.fillText(
                `${point.chainage} m`,
                128,
                42
            );

            const texture =
                new THREE.CanvasTexture(
                    canvas
                );

            const material =
                new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true
                });

            const sprite =
                new THREE.Sprite(
                    material
                );

            sprite.scale.set(
                18,
                4.5,
                1
            );

            sprite.position.set(
                point.chainage,
                5,
                0
            );

            group.add(sprite);

        }
    );

    return group;
}

/* =========================================================
   UPDATE TABLE
========================================================= */

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

            table.appendChild(row);

        }
    );
}

/* =========================================================
   GENERATE ROAD
========================================================= */

function generateRoad() {

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

    const startLanes =
        getNumber("startLanes");

    const finalLanes =
        getNumber("finalLanes");

    const totalLength =
        getNumber("totalLength");

    const transitionLength =
        getNumber("transitionLength");

    const startWidth =
        getNumber("startWidth");

    const finalWidth =
        getNumber("finalWidth");

    /* =========================================
       VALIDATION
    ========================================== */

    if (
        !Number.isFinite(startLanes) ||
        !Number.isFinite(finalLanes) ||
        !Number.isFinite(totalLength) ||
        !Number.isFinite(transitionLength) ||
        !Number.isFinite(startWidth) ||
        !Number.isFinite(finalWidth)
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
     * =========================================
     * AUTOMATIC STATIONS
     * =========================================
     */

    const stations =
        generateStations(
            totalLength,
            transitionLength
        );

    /*
     * =========================================
     * AUTOMATIC COORDINATES
     * =========================================
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
     * =========================================
     * ROAD SURFACE
     * =========================================
     */

    const roadMesh =
        createRoadMesh(
            coordinates
        );

    roadGroup.add(
        roadMesh
    );

    /*
     * =========================================
     * EDGES
     * =========================================
     */

    roadGroup.add(
        createRoadEdges(
            coordinates
        )
    );

    /*
     * =========================================
     * LANE MARKINGS
     * =========================================
     */

    roadGroup.add(
        createLaneBoundaries(

            coordinates,

            startLanes,

            finalLanes,

            transitionLength

        )
    );

    /*
     * =========================================
     * CENTER LINE
     * =========================================
     */

    roadGroup.add(
        createCenterLine(
            coordinates
        )
    );

    /*
     * =========================================
     * STATION MARKERS
     * =========================================
     */

    roadGroup.add(
        createStationMarkers(
            coordinates
        )
    );

    /*
     * =========================================
     * STATION LABELS
     * =========================================
     */

    roadGroup.add(
        createStationLabels(
            coordinates
        )
    );

    /*
     * =========================================
     * ADD TO SCENE
     * =========================================
     */

    scene.add(
        roadGroup
    );

    /*
     * =========================================
     * TABLE
     * =========================================
     */

    updateCoordinateTable(
        coordinates
    );

    /*
     * =========================================
     * INFO
     * =========================================
     */

    const modelInfo =
        document.getElementById(
            "modelInfo"
        );

    if (modelInfo) {

        modelInfo.innerHTML = `

            Total Length:
            ${totalLength} m<br>

            Transition:
            ${transitionLength} m<br>

            Starting Width:
            ${startWidth} m<br>

            Final Width:
            ${finalWidth} m<br>

            Lanes:
            ${startLanes} → ${finalLanes}<br>

            Stations:
            ${coordinates.length}<br>

            Automatic Interval:
            20 m

        `;
    }

    /*
     * =========================================
     * CAMERA
     * =========================================
     */

    const cameraHeight =
        Math.max(
            80,
            totalLength * 0.20
        );

    camera.position.set(
        totalLength * 0.45,
        cameraHeight,
        totalLength * 0.35
    );

    controls.target.set(
        totalLength / 2,
        0,
        0
    );

    controls.update();
}

/* =========================================================
   BUTTON
========================================================= */

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

/* =========================================================
   RESIZE
========================================================= */

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

/* =========================================================
   ANIMATION LOOP
========================================================= */

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

/* =========================================================
   INITIAL MODEL
========================================================= */

generateRoad();
