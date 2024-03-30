
import * as THREE from 'three';
import { OrbitControls } from 'three/controls/OrbitControls.js';
import { GUI } from 'three/libs/lil-gui.module.min.js'
import Stats from 'three/libs/stats.module'
import { Character } from './character.js';
import { Block } from './block.js'

let physicsWorld
let scene, renderer, camera, stats, controls
let character, clock, transformAux1

const margin = 0.05;

let settings;

// tham số để thể hiện tưng hành động theo  các bước (gióng slow motion)
let singleStepMode = false;
let sizeOfNextStep = 0;
let cannonDebugRenderer

init();
function init() {
    initGraphis()

    // create  ground
    // const pos = new THREE.Vector3();
    // const quat = new THREE.Quaternion();
    // pos.set(0, - 0.5, 0);
    // quat.set(0, 0, 0, 1);
    const ground = createParalellepiped();

    // Tạo một mảng lưu trữ các cube
    var cubes = [];

    // Số lượng cube trên mỗi hàng và cột
    var numCubesX = 40;
    var numCubesZ = 40;

    // Kích thước của mỗi cube
    var cubeSize = WIDTH;
    var loadTexture = new THREE.TextureLoader()
    var texd = loadTexture.load('publish/image/grid.png')
    // Tạo các cube và xếp chúng thành một mặt phẳng
    for (var i = 0; i < numCubesX; i++) {
        for (var j = 0; j < numCubesZ; j++) {
            var geometry = new THREE.BoxGeometry(cubeSize, 1, cubeSize);
            var material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                map: texd
            });

            var cube = new THREE.Mesh(geometry, material);

            // Đặt vị trí của mỗi cube
            cube.position.x = i * cubeSize + 0.01;
            cube.position.y = -1
            cube.position.z = j * cubeSize + 0.01;

            // Thêm cube vào scene và mảng cubes
            scene.add(cube);
            cubes.push(cube);
        }
    }
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    physicsWorld.addBody(groundBody);

    // Đặt vị trí của mặt đất
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Đặt mặt đất nằm ngang
    groundBody.position.set(0, 0, 0);


    // crate map
    const maplevel = new MapLevel()
    // create model
    // const ducrate = setCrossFadeDuration(0.2)
    character = new Character(scene, camera, 'Idle', 0.6)


    maplevel.load(1).then(structure => {
        structure

        console.log(structure);
    })
    var cube = new Block(scene, new THREE.Vector2(0, 0))

    scene.add(cube.cube)


    animate();
}
function initGraphis() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0); // thiết lập background
    // scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);   //thiết lập sương mù
    //init camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000)
    camera.position.set(1, 2, - 3)
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();

    //init renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg')
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.render(scene, camera)
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // init controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    //init stats
    stats = Stats()
    document.body.appendChild(stats.dom)
    // create Directional light
    const dirLight = new THREE.PointLight(0xffffff, 10000);
    dirLight.position.set(- 3, 100, - 20);
    dirLight.castShadow = true;
    // dirLight.shadow.camera.top = 2;
    // dirLight.shadow.camera.bottom = - 2;
    // dirLight.shadow.camera.left = - 2;
    // dirLight.shadow.camera.right = 2;
    // dirLight.shadow.camera.near = 0.1;
    // dirLight.shadow.camera.far = 40;
    scene.add(dirLight);
    // Lấy thời gian
    clock = new THREE.Clock();
    // thiết lập thế giới vật lý 
    physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, -9.82, 0); // Thiết lập trọng lực
}


function createParalellepiped() {

}


//
// tạo bảng điều khuyển
function createPanel() {

    const panel = new GUI({ width: 310 });

    const folder1 = panel.addFolder('Visibility');
    const folder2 = panel.addFolder('Activation/Deactivation');
    const folder3 = panel.addFolder('Pausing/Stepping');
    const folder4 = panel.addFolder('Crossfading');
    const folder5 = panel.addFolder('General Speed');

    settings = {
        'show model': true,
        'show skeleton': false,
        'deactivate all': deactivateAllActions,
        'activate all': activateAllActions,
        'pause/continue': pauseContinue,
        'make single step': toSingleStepMode,
        'modify step size': 0.05,
        'use default duration': true,
        'set custom duration': 3.5,
        'modify time scale': 1.0
    };
    folder1.add(settings, 'show model').onChange(showModel);
    folder1.add(settings, 'show skeleton').onChange(showSkeleton);
    folder2.add(settings, 'deactivate all');
    folder2.add(settings, 'activate all');
    folder3.add(settings, 'pause/continue');
    folder3.add(settings, 'make single step');
    folder3.add(settings, 'modify step size', 0.01, 0.1, 0.001);
    folder4.add(settings, 'use default duration');
    folder4.add(settings, 'set custom duration', 0, 10, 0.01);
    folder5.add(settings, 'modify time scale', 0.0, 1.5, 0.01).onChange(modifyTimeScale);

    folder1.open();
    folder2.open();
    folder3.open();
    folder4.open();
    folder5.open();


}



function animate() {

    // Render loop

    requestAnimationFrame(animate);

    // Lấy thời gian đã trôi qua kể từ khung cuối cùng, được sử dụng để cập nhật bộ trộn (nếu không ở chế độ một bước)
    let mixerUpdateDelta = clock.getDelta();

    // Nếu ở chế độ một bước, thực hiện một bước và không làm gì cả (cho đến khi người dùng nhấp lại)

    if (singleStepMode) {
        mixerUpdateDelta = sizeOfNextStep;
        sizeOfNextStep = 0;

    }

    if (character && character.mixer) {
        character.update(mixerUpdateDelta);
    }

    stats.update();

    renderer.render(scene, camera);

}





