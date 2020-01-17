let camera, controls, scene, renderer, raycaster, canvas, font;
let mouse = new THREE.Vector2();
let meshAndFunc;
let intersected;
let cubes;

init();
animate();

function onMousemove(event) {
    event.preventDefault();
    mouse.x = ( (event.clientX - canvas.width) / (canvas.width) ) * 2 - 1;
	mouse.y = - ( event.clientY / canvas.height ) * 2 + 1;
};

function init() {
    intersected = [];
    meshAndFunc = [];
    cubes = [];
    canvas = document.getElementById('visualization');

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xFFFFFF );

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

    raycaster = new THREE.Raycaster();
    document.addEventListener('mousemove', onMousemove);

    const loader = new THREE.FontLoader();
    loader.load('fonts/helvetiker_regular.typeface.json', function (r) {
        font = r;
    });
}

const imageWidth = 2560;
const imageHeight = 1600;

// Update Visualization given the current schedule
function updateVis(schedule) {
    // Reset!
    init();

    let prevSize = [[imageHeight, imageWidth]];
    let funcs = [];
    let sizes = [];
    for (let i = 0; i < schedule.length; i++) {
        let block = schedule[i];
        for (line in block) {
            if (!line.includes("for")) continue;
        }

        let curHeight, curWidth;
        // includes "for"
        for (line of block) {
            if (line.includes("tileable")) {
            } else if (line.includes("innermost")) {
            } else if (line.includes("vectorized")) {
            } else if (line.includes("for")) {
                const nestcount = (line.match(/&nbsp;/g) || []).length / 4;
                const l = line.replace('&nbsp;', ' ');
                let regexp = /for[ ]+(.+)\.(.)[ ]+in[ ]+0\.\.([0-9]+)/;
                let m = l.match(regexp);
                const fname = m[1];
                const xory = m[2];
                const min = 0;
                const max = m[3];

                const range = max - min;
                if (xory == 'y') {
                    const prev = prevSize[nestcount - 1][0];
                    curHeight = (range == 0) ? prev : (prev / range);
                } else if (xory == 'x') {
                    const prev = prevSize[nestcount - 1][1];
                    curWidth = (range == 0) ? prev : (prev / range);

                    // First to reach this nest level
                    if (prevSize.length == nestcount) {
                        prevSize.push([curHeight, curWidth]);
                    } else if (prevSize.length > nestcount) {
                        // update!
                        prevSize[nestcount] = [curHeight, curWidth];
                    }
                    sizes.push([curHeight, curWidth]);
                    funcs.push({name: fname, index: i});
                }
            }
        }
    }

    for (;;) {
        let bool = true;
        for (i in sizes) {
        let sy = sizes[i][0];
        let sx = sizes[i][1];
            if (sy < 0 || sx < 0) {
                bool = false;
                for (j in sizes) {
                    sizes[j][0] *= 10;
                    sizes[j][1] *= 10;
                }
                break;
            };
        }
        if (bool) break;
    }

    // world
    for (i in sizes) {
        let sy = sizes[i][0];
        let sx = sizes[i][1];
        const c = 50;
        const size_y = Math.log(sy)*c;
        const size_x = Math.log(sx)*c;
        const geometry = new THREE.BoxGeometry(size_x, 10, size_y);
        const material = new THREE.MeshPhongMaterial( {
            color: globalcolortable[funcs[i].name],
            flatShading: true,
            transparent: true,
            opacity: 0.7,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const pos_y = -100 * (i - (sizes.length-1)/2);
        mesh.position.x = 0;
        mesh.position.y = pos_y;
        mesh.position.z = 0;
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        scene.add( mesh );
        cubes.push(mesh);
        meshAndFunc.push({mesh: mesh, fname: funcs[i].name, index: funcs[i].index});

        // Show text number
        let textGeo = new THREE.TextGeometry(funcs[i].index.toString(), {
            font: font,
            size: 20,
            height: 2
        });
        let textMaterial = new THREE.MeshBasicMaterial( {
            color : 0x000000
        });
        let textMesh = new THREE.Mesh(textGeo, textMaterial);
        textMesh.position.x = -10;
        textMesh.position.y = pos_y - 10;
        textMesh.position.z = -180;
        textMesh.lookAt(camera.position);

        scene.add(textMesh);
    }

    for(let i=0; i<sizes.length+1; i++) {
        const dir = new THREE.Vector3(0, -1, 0);
        const len = 50;
        const origin = new THREE.Vector3(0, -100 * (i - (sizes.length-1)/2 - 1/2) + len/2, 0);
        const arrow = new THREE.ArrowHelper(dir, origin, len, 0x00FFFF, 0.2 * len, 0.5 * len);
        scene.add(arrow);
    }

    render();
}

function updateHighlight() {
    raycaster.setFromCamera( mouse, camera );
    const intersects = raycaster.intersectObjects( cubes );

    for (iobj of intersected) {
        let flag = true;
        for (o of intersects)
            if (o.object == iobj.obj)
                flag = false;

        if (flag) {
            iobj.obj.material.color.setHex(iobj.visColor);
            iobj.button.style.backgroundColor = iobj.scheColor;
            intersected.splice(intersected.indexOf(iobj),1);
        }
    }

    for (o of intersects) {
        const obj = o.object;
        if (intersected.find(e => e.obj == obj) == undefined) {
            const prevColor = obj.material.color.getHex();
            obj.material.color.setHex( 0xff0000 );

            // Which func is this?
            const index = meshAndFunc.find(e => e.mesh ==  obj).index;
            const e = document.getElementById("schedule");
            const button = e.children[index].children[0]; //button
            const prevButtonColor = button.style.backgroundColor;
            button.style.backgroundColor = "#FF0000";

            let t = {obj: obj, visColor: prevColor, button: button, scheColor: prevButtonColor};
            intersected.push(t);
        }
    }
};

function animate() {
    updateHighlight();
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    requestAnimationFrame( animate );
    render();
}

function render() {
    renderer.render( scene, camera );
}
