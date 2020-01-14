let camera, controls, scene, renderer;

init();
animate();

function onMousemove(ev) {
}

function init() {
    const canvas = document.getElementById('visualization');
    canvas.addEventListener('mousemove', onMousemove);

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xA9A9A9 );

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas,
    });
    const {width, height} = canvas.parentNode.getBoundingClientRect();
    renderer.setSize(width, height);

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight);
    camera.position.set( 400, 0, 0 );

    // controls

    controls = new THREE.OrbitControls( camera, renderer.domElement );

    // lights

    {
        const light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( 1, 1, 1 );
        scene.add( light );
    }

    {
        const light = new THREE.DirectionalLight( 0x002288 );
        light.position.set( - 1, - 1, - 1 );
        scene.add( light );
    }

    {
        const light = new THREE.AmbientLight( 0x222222 );
        scene.add( light );
    }
}

const imageWidth = 2560;
const imageHeight = 1600;

// Update Visualization given the current schedule
function updateVis(schedule) {
    // Reset!
    init();

    let prevWidth = imageWidth;
    let prevHeight = imageHeight;
    // [y, x]
    let funcs = [];
    for (let i = 0; i < schedule.length; i++) {
        let block = schedule[i];
        for (line in block) {
            if (!line.includes("for")) continue;
        }

        // includes "for"
        for (line of block) {
            if (line.includes("tileable")) {
            } else if (line.includes("innermost")) {
            } else if (line.includes("vectorized")) {
            } else if (line.includes("for")) {
                const l = line.replace('&nbsp;', ' ');
                let regexp = /for[ ]+(.)\.(.)[ ]+in[ ]+0\.\.([0-9]+)/;
                let m = l.match(regexp);
                const fname = m[1];
                const xory = m[2];
                const min = 0;
                const max = m[3];

                const range = max - min + 1;
                let curWidth;
                let curHeight;
                if (xory == 'y') {
                    curHeight = prevHeight / range;
                    prevHeight = curHeight;
                    funcs.push([curHeight, 0]);
                } else if (xory == 'x') {
                    curWidth = prevWidth / range;
                    prevWidth = curWidth;
                    funcs[funcs.length - 1][1] = curWidth;
                }
            }
        }
    }

    // world
    for (i in funcs) {
        const c = 50;
        const size_y = Math.log(funcs[i][0])*c;
        const size_x = Math.log(funcs[i][1])*c;
        const geometry = new THREE.BoxGeometry(size_x, 10, size_y);
        const material = new THREE.MeshPhongMaterial( {
            color: 0x000000,
            flatShading: true,
            transparent: true,
            opacity: 0.7,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = 0;
        mesh.position.y = -100 * (i - (funcs.length-1)/2);
        mesh.position.z = 0;
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        scene.add( mesh );
    }
    for(let i=0; i<funcs.length+1; i++) {
        const dir = new THREE.Vector3(0, -1, 0);
        const len = 50;
        const origin = new THREE.Vector3(0, -100 * (i - (funcs.length-1)/2 - 1/2) + len/2, 0);
        const arrow = new THREE.ArrowHelper(dir, origin, len, 0x00FFFF, 0.2 * len, 0.5 * len);
        scene.add(arrow);
    }

    render();
}

function animate() {
    requestAnimationFrame( animate );
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    render();
}

function render() {
    renderer.render( scene, camera );
}
