let camera, controls, scene, renderer;
const layers = [];
const Mesh2Board = new WeakMap();
const Board2Mesh = new WeakMap();

class Board {
    constructor(ridx, cidx, layer, mat) {
        this.ridx = ridx;
        this.cidx = cidx;
        this.layer = layer;
        this.mat = mat;
    }
    pos() {
        return ({
            x: 60 * this.ridx,
            z: 60 * this.cidx,
            y: this.layer.y(),
        });
    }
}

class Layer {
    constructor(rows, cols, idx, color, prev, fun) {
        this.rows = rows;
        this.cols = cols;
        this.idx  = idx;
        this.color = color;
        this.prev = prev;
        this.fun = fun;

        this.children = [...Array(this.rows).keys()].flatMap(r =>
            [...Array(this.cols).keys()].map(c =>
                new Board(r, c, this, this.fun(r, c, this.prev))
            ));
    };

    y() {
        return -50 * (this.idx - layers.length/2);
    }
};

init();
animate();

const lines = new Set();
let texts = new Set();
let highlight = null;
function onMousemove(ev) {
    const elm = ev.currentTarget;
    const x = ev.clientX - elm.offsetLeft;
    const y = ev.clientY - elm.offsetTop;
    const w = elm.offsetWidth;
    const h = elm.offsetHeight;

    const mouse = new THREE.Vector2();
    mouse.x =  (x / w) * 2 - 1;
    mouse.y = -(y / h) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const inters = raycaster.intersectObjects(scene.children);

    lines.forEach(l => scene.remove(l));
    lines.forEach(l => [l.geometry, l.material].forEach(obj => obj.dispose()));
    lines.clear();

    const loader = new THREE.FontLoader();
    loader.load('font/helvetiker_regular.typeface.json', (font) => {
        const newTexts = new Set();

        for(const inter of inters) {
            const board = Mesh2Board.get(inter.object);
            if(!board) continue;

            if(highlight) highlight.opacity = 0.7;
            highlight = inter.object.material;
            highlight.opacity = 1;

            const spos = board.pos();
            const params = inter.object.geometry.parameters;
            //const size = [params.width, params.height, params.depth];
            const size = [params.width, params.depth];
            for (s in size) {
                const text = new THREE.Mesh(
                    new THREE.TextGeometry(size[s].toString(), {
                        font,
                        size: 5,
                        height: 1,
                    }),
                    new THREE.MeshBasicMaterial({color: 0xffffff}),
                );
                text.position.x = inter.object.position.x - 2;
                text.position.y = inter.object.position.y;
                text.position.z = inter.object.position.z;
                if (s == 0) // width
                    text.position.z -= params.depth/2 + 5;
                if (s == 1) // depth
                    text.position.x += params.width/2 + 4;
                text.rotation.x = Math.PI*3/2;
                scene.add(text);
                newTexts.add(text);
            }

            if(board.layer.prev) {
                // create lines

                const mat = new THREE.LineBasicMaterial({
                    color: 0x0000ff
                });
                for(const t of board.layer.prev.children) {
                    const tpos = t.pos();
                    const geo = new THREE.Geometry();
                    geo.vertices.push(
                        new THREE.Vector3(spos.x, spos.y, spos.z),
                        new THREE.Vector3(tpos.x, tpos.y, tpos.z),
                    );
                    const line = new THREE.Line(geo, mat);
                    lines.add(line)
                    scene.add(line);
                }
            }
            break;
        } 
        texts.forEach(l => scene.remove(l));
        texts.forEach(l => [l.geometry, l.material].forEach(obj => obj.dispose()));
        texts = newTexts;
    });
}

function init() {
    const canvas = document.getElementById('visualization');
    canvas.addEventListener('mousemove', onMousemove);

    scene = new THREE.Scene();
    // scene.background = new THREE.Color( 0x000058 );
    scene.background = new THREE.Color( 0x000000 );

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

    // GUI
    options = {
        'Load Texture': loadTexture,
    };

    gui = new dat.GUI();
    gui.add(options, 'Load Texture');
}

// Update Visualization given the current schedule
function updateVis(curSchedule) {
    let lines = curSchedule.split('\n');
    // [0] -> func name
    // [1] -> tile size [c, y, x]
    // [2] -> small tile size
    let funcs = [];
    for (let i = 0; i < lines.length; i++) {
        let curLine = lines[i];
        if (curLine.includes("produce")) {
            let space = curLine.split(" ");
            let fN = space[space.length-1].slice(0, -1);
            funcs.push([fN, [1, 0, 0], 0]);
        }
        if (curLine.includes("for")) {
            if (curLine.includes("in")) {
                let regexp = RegExp('\\[(.+), (.+)\\]');
                let m = curLine.match(regexp);
                let min = parseInt(m[1]);
                let max = parseInt(m[2]);
                funcs[funcs.length-1][2] = max - min + 1;
            } else {
                let space = curLine.split(" ");
                let vN = space[space.length-1].slice(0, -1);
                // default image size
                if (vN.includes('c'))
                    funcs[funcs.length-1][1][0] = 3;
                if (vN.includes('y'))
                    funcs[funcs.length-1][1][1] = 1024;
                if (vN.includes('x'))
                    funcs[funcs.length-1][1][2] = 1024;
            }
        }
    }
    console.log(funcs);

    const texture = new THREE.TextureLoader().load('risu.png');
    // Add layer
    {
        const [inputC, inputY, inputX] = [3, 64, 64];
        let [prevC, prevY, prevX] = [inputC, inputY, inputX];

        for(const i in funcs) {
            const [name, [c, y, x], s] = funcs[i];
            if(s === 0) {
                layers.push(new Layer(1, 1, i, 0xcccccc, layers[layers.length - 1] || null, () => texture));
            } else {
                layers.push(new Layer(prevX / s, prevY / s, i, 0xcccccc, layers[layers.length - 1] || null, () => texture));
            }
            [prevC, prevY, prevX] = [c, y, x];
        }
        layers.push(new Layer(1, 1, layers.length, 0xcccccc, layers[layers.length - 1] || null, () => texture));
    }

    // world

    layers.forEach( (layer, idx) => {
        console.log(layer.children[0].pos());
        layer.children.forEach((board) => {
            const geometry = new THREE.BoxGeometry(60/layer.rows, 10, 60/layer.cols);
            const material = new THREE.MeshPhongMaterial( {
                color: layer.color,
                bumpMap: board.mat,
                flatShading: true,
                transparent: true,
                opacity: 0.7,
            });
            const mesh = new THREE.Mesh(geometry, material);
            const pos = board.pos();
            mesh.position.x = pos.x;
            mesh.position.y = pos.y;
            mesh.position.z = pos.z;
            mesh.updateMatrix();
            mesh.matrixAutoUpdate = false;
            Mesh2Board.set(mesh, board);
            Board2Mesh.set(board, mesh);
            scene.add( mesh );
        });
    });

    render();
}

// Load schedule file from local file
function loadTexture() {
    let file = document.createElement('input');
    file.type = "file";
    file.click();

    file.onchange = function () {
        if(file.value) {
            let reader = new FileReader();
            reader.readAsDataURL(file.files[0]);
            reader.onload = function() {
                let result = reader.result;
                curSchedule = atob(result.split('base64,')[1]);
                updateVis(curSchedule);
            }
        }
    }
};

function animate() {
    requestAnimationFrame( animate );
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    render();
}

function render() {
    renderer.render( scene, camera );
}
