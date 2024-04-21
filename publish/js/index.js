
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import Stats from 'three/examples/jsm/libs/stats.module'

import { MapLevel } from './map.js';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';

import TWEEN from '@tweenjs/tween.js'

import CannonDebugger from 'cannon-es-debugger'
let cannonDebugger
let physicsWorld
let scene, renderer, camera, stats, controls, composer
let clock, maplevel, mixerUpdateDelta,
    buttonreset, isstop = false, sun, dirLight, groupChangeMap
let isPerspectivecamera = 1
let settings;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
const audioWin = new THREE.Audio(listener);
const audioLoss = new THREE.Audio(listener);
const audioGame = new THREE.Audio(listener);
// tham số để thể hiện tưng hành động theo  các bước (gióng slow motion)
var isAnimationEnd = false
let level = 1

function init() {
    initGraphis()
    initOBJ(level)
    animate();
}
init();
function initGraphis() {
    scene = new THREE.Scene();
    const loadTexture = new THREE.TextureLoader();
    const texturebackground = loadTexture.load('publish/image/background.jpg')
    scene.background = texturebackground

    //init camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000)
    camera.position.set(1, 2, - 3)
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
    // init audio
    camera.add(listener);
    audioLoader.load('publish/audio/TB7L64W-winning.mp3', function (buffer) {
        audioWin.setBuffer(buffer);
        audioWin.setVolume(0.7);


    });
    audioLoader.load('publish/audio/mixkit-8-bit-lose-2031.wav', function (buffer) {
        audioLoss.setBuffer(buffer);
        audioLoss.setVolume(0.7);

    });
    //init renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),
        alpha: true,
        precision: 'highp',
        colorManagement: true,
        antialias: true
    })

    // renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.render(scene, camera)
    renderer.physicallyCorrectLights = true

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // composer = new EffectComposer(renderer);

    // const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    // bloomPass.threshold = 0, 582
    // bloomPass.strength = 0.7
    // bloomPass.radius = 0
    // composer.addPass(bloomPass);

    // const renderPass = new RenderPass(scene, camera);
    // composer.addPass(renderPass);
    // const renderPixelatedPass = new RenderPixelatedPass(1, scene, camera)
    // renderPixelatedPass.normalEdgeStrength = 1
    // renderPixelatedPass.depthEdgeStrength = 1
    // composer.addPass(renderPixelatedPass)
    // const glitchPass = new GlitchPass();
    // composer.addPass(glitchPass);
    // const luminosityPass = new ShaderPass(LuminosityShader);
    // composer.addPass(luminosityPass);

    // init controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    //init stats
    stats = Stats()
    document.body.appendChild(stats.dom)

    // Lấy thời gian
    clock = new THREE.Clock();
    // thiết lập thế giới vật lý 
    physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, -9.8, 0); // Thiết lập trọng lực
    physicsWorld.broadphase = new CANNON.NaiveBroadphase();

    physicsWorld.defaultContactMaterial.contactEquationStiffness = 1e7;
    physicsWorld.defaultContactMaterial.contactEquationRelaxation = 5;

    window.addEventListener('resize', () => {
        // update display width and height
        var width = window.innerWidth
        var height = window.innerHeight
        // update camera aspect
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        // update renderer
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.render(scene, camera)

    });
    createPanel()

}

function initOBJ(level) {
    // thêm tọa độ
    const axisHelper = new THREE.AxesHelper(10);
    // scene.add(axisHelper);

    // create sun
    createSun()

    // crate map
    maplevel = new MapLevel(scene, camera, physicsWorld)
    maplevel.init(level)
    //đổi map
    createChangeMap(level)
    // load model reset
    createResetMap()
    cannonDebugger = new CannonDebugger(scene, physicsWorld, {
        // options...
    })
}

function createSun() {
    const loader = new THREE.TextureLoader()

    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({
        // color: 0xFF5622,
        emissive: 0xFF5622, // Ánh sáng phát ra từ mặt trời
        emissiveIntensity: 1, // Độ sáng của ánh sáng phát ra
        map: loader.load('./publish/image/texture_sun.jpg'),
        bumpMap: loader.load('./publish/image/bump_sun.avif'),
        roughnessMap: loader.load('./publish/image/bumpmap_sun.jpg'),
        bumpScale: 1,
        roughness: 1,
    });
    var maps = ['map', 'bumpMap', 'roughnessMap']
    maps.forEach(map => {
        var texture = material[map]
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(1.5, 1.5)
    })
    const phereSun = new THREE.Mesh(geometry, material);
    dirLight = new THREE.DirectionalLight(0xffffff, 2.4)

    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = - 500;
    dirLight.shadow.camera.left = - 500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 2000;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.name = 'light'
    sun = new THREE.Group()
    sun.add(phereSun)
    sun.add(dirLight)

    sun.position.set(- 60, 20, - 10)
    dirLight.position.copy(sun.position)

    scene.add(sun, dirLight);

}
function createText(text, color = 0xffffff) {
    const loader = new FontLoader();
    loader.load('node_modules/three/examples/fonts/droid/droid_sans_bold.typeface.json', function (font) {
        // Define text parameters
        const textParams = {
            font: font,
            size: 30,
            depth: 10,
            curveSegments: 4,
            bevelThickness: 2,
            bevelSize: 1.5,
            bevelEnabled: true

        };
        const loadTexture = new THREE.TextureLoader()
        let texturemap
        if (text == 'WIN')
            texturemap = loadTexture.load('publish/image/texture_win.jpg')
        else
            texturemap = loadTexture.load('publish/image/texture_lose.jpg')
        const geometryW = new TextGeometry(text, textParams);

        const material = new THREE.MeshPhysicalMaterial({
            reflectivity: 0.5,
            color: color,
            transparent: true,
            opacity: 0,
            map: texturemap,
            bumpMap: texturemap,
        });

        const TEX = new THREE.Mesh(geometryW, material);
        TEX.position.set(0, 130, 50);
        TEX.rotateX(-Math.PI / 4)
        const LightTex = new THREE.PointLight(0xffffff, 50000);
        LightTex.position.set(0, 210, 220);
        scene.add(TEX, LightTex);
        animateTextAppear(TEX)
    });
}
function createResetMap() {
    const loadreset = new FBXLoader()
    loadreset.load('publish/models/uploads_files_2691895_button.fbx', (model) => {
        model.scale.setScalar(0.09)
        model.rotation.x = Math.PI / 2

        var geometry = new THREE.BoxGeometry(18, 18, 1);
        var material = new THREE.MeshPhysicalMaterial({

            flatShading: true,
            color: 0xC71A0D,
            clearcoat: 1,
            iridescenceIOR: 1.7,
            // emissive: 0xc16c6c,
        });
        var solebutton = new THREE.Mesh(geometry, material,);
        solebutton.position.set(0, 0, -1)

        const LightTex = new THREE.PointLight(0xffffff, 2000);
        LightTex.position.set(-5, 15, -30);

        buttonreset = new THREE.Group();
        buttonreset.add(solebutton)
        buttonreset.add(model)
        buttonreset.position.set(0, 0, -20)
        buttonreset.rotation.x = -Math.PI / 2
        buttonreset.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
        buttonreset.scale.setScalar(0.7)
        const buttonlight = new THREE.DirectionalLight(0xffffff, 0.1);
        buttonlight.position.set(-10, 20, -30)
        scene.add(buttonreset, buttonlight)

    })
}
function createChangeMap(level) {
    const loadarrow = new FBXLoader()
    loadarrow.load('publish/models/3D RightArrow.fbx', (model) => {
        const loadTexture = new THREE.TextureLoader()
        const texturechangemap = loadTexture.load('publish/image/' + level + '.jpg')
        var geometry = new THREE.BoxGeometry(15, 15, 15, 10, 10, 10);
        var material = new THREE.MeshStandardMaterial({
            color: 0xCF8753,
            map: texturechangemap
        });
        var boxviusal = new THREE.Mesh(geometry, material,);
        boxviusal.position.set(50, 30, -40);
        var edges = new THREE.EdgesGeometry(geometry);
        var line = new THREE.LineSegments
            (edges, new THREE.LineDashedMaterial({
                color: 0x000000, linewidth: 10, fog: true
            }));
        boxviusal.add(line)
        boxviusal.name = "boxmap"

        var arrowrigh = model
        arrowrigh.scale.set(0.03, 0.06, 0.03)
        arrowrigh.rotation.x = Math.PI / 2
        arrowrigh.position.set(70, 35, -25)
        arrowrigh.children[0].name = "arrowrigh"

        var arrowleft = arrowrigh.clone()
        arrowleft.position.set(20, 35, -25)
        arrowleft.rotation.z = Math.PI
        arrowleft.children[0].name = "arrowleft"
        groupChangeMap = new THREE.Group()
        groupChangeMap.add(arrowrigh, arrowleft, boxviusal)
        scene.add(groupChangeMap)

    })

}
//
// tạo bảng điều khuyển
function createPanel() {

    const panel = new GUI({ width: 310 });

    const folder1 = panel.addFolder('Visibility');


    settings = {
        'Personal camera': true,
        'Skeleton': false

    };
    folder1.add(settings, 'Personal camera').onChange((Visibility) => {
        if (maplevel.iswin == false && maplevel.isloss == false)
            isPerspectivecamera = Visibility
    });
    folder1.add(settings, 'Skeleton').onChange((Visibility) => {
        maplevel.character.skeleton.visible = Visibility
    });

    folder1.open();

}

var latertime = Date.now();
function clearScene() {
    scene.clear()
    //reset parameters
    audioLoss.stop()
    audioWin.stop()
    isstop = false
    isPerspectivecamera = 1
    physicsWorld.gravity.set(0, -9.8, 0);
    initialY = 20
    initialAngle = Math.acos(initialY / 200);
    elapsedTime = 2 * Math.PI - (initialAngle * 60) / Math.PI
    var bodies = physicsWorld.bodies;
    for (var i = bodies.length - 1; i >= 0; i--) {
        physicsWorld.removeBody(bodies[i]);
    }
}
function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects([buttonreset,
        groupChangeMap.getObjectByName('arrowrigh'), groupChangeMap.getObjectByName('arrowleft')], true);

    if (intersects.length > 0) {

        const res = intersects.filter(function (res) {

            return res && res.object;

        })[0];

        if (res && res.object) {
            var currenttime = Date.now()
            if (currenttime - latertime > 1000 && isAnimationEnd == false) {
                if (res.object.name == 'arrowrigh') {
                    level += 1
                    if (level > 18) level = 18
                    clearScene()
                    initOBJ(level)
                    latertime = currenttime
                }
                else if (res.object.name == 'arrowleft') {

                    level -= 1
                    if (level < 1) level = 1
                    clearScene()
                    initOBJ(level)
                    latertime = currenttime
                }
                else if (res.object.name == "button2") {
                    clearScene()
                    initOBJ(level)
                    latertime = currenttime
                }
            }
        }
    }

}
window.addEventListener('pointerdown', onPointerMove)
document.addEventListener('keydown', (event) => {
    if (event.key == 'v' && maplevel.isloss == false) {
        isPerspectivecamera = !isPerspectivecamera
    }
})
function animationMap(mixerUpdateDelta) {
    if (groupChangeMap) {
        var changemap = groupChangeMap.getObjectByName('boxmap')
        if (changemap) {
            changemap.rotation.x += mixerUpdateDelta / 2
            changemap.rotation.y += mixerUpdateDelta / 2
            changemap.rotation.z += mixerUpdateDelta / 2
        }
    }

}

//animation to end game
function animationEndGame() {
    isPerspectivecamera = 0

    camera.position.set(30, 40, 20)
    // camera.position.lookAt(groupChangeMap.position)
    const cameraMoveTween = new TWEEN.Tween(camera.position)
        .to(new THREE.Vector3(50, 200, 150), 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onStart(() => {
            controls.enabled = false;
            isAnimationEnd = true
        })
        .onComplete(() => {
            controls.enabled = true;
            isAnimationEnd = false
        })
    const changeMapMoveTween = new TWEEN.Tween(groupChangeMap.position)
        .to(new THREE.Vector3(50, 100, 130), 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
    const resetMapMoveTween = new TWEEN.Tween(buttonreset.position)
        .to(new THREE.Vector3(-10, 150, 100), 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)

    const resetMapRotateTween = new TWEEN.Tween(buttonreset.rotation)
        .to({ x: -Math.PI / 4, y: Math.PI / 8 }, 2000)

        .easing(TWEEN.Easing.Quadratic.InOut);


    cameraMoveTween.start()
    changeMapMoveTween.start()
    resetMapMoveTween.start()
    resetMapRotateTween.start()
}
// animation to appearent text when end game
function animateTextAppear(text) {
    const fadeInDuration = 3000;
    new TWEEN.Tween(text.material)
        .to({ opacity: 1 }, fadeInDuration)
        .easing(TWEEN.Easing.Bounce.Out)

        .start();
}
var initialY = 20; // Giá trị y ban đầu
var initialAngle = Math.acos(initialY / RADIUS); // Tính góc ban đầu dựa trên y ban đầu
var elapsedTime = 2 * Math.PI - (initialAngle * 60) / Math.PI
function animateSun(mixerUpdateDelta) {
    sun.rotation.y += mixerUpdateDelta
    //tốc độ quay
    elapsedTime += 0.0065;
    // Tính toán góc quay của mặt trời dựa trên thời gian đã trôi qua với bán kính RADIUS
    var angle = Math.PI * (elapsedTime / 60);
    var x = Math.sin(angle) * RADIUS; // Di chuyển theo trục X
    var y = Math.cos(angle) * RADIUS; // Di chuyển theo trục Y
    sun.position.set(x, y, - 10)
    dirLight.position.copy(sun.position)
}

function animate() {
    // Render loop
    requestAnimationFrame(animate);
    // Lấy thời gian đã trôi qua kể từ khung cuối cùng, được sử dụng để cập nhật bộ trộn (nếu không ở chế độ một bước)
    mixerUpdateDelta = clock.getDelta();
    if (maplevel.isload) {

        maplevel.update(mixerUpdateDelta)
        animateSun(mixerUpdateDelta)

        if (maplevel.iswin == true && isstop == false) {
            audioWin.play()
            createText('WIN',)
            animationEndGame()
            isstop = true
            physicsWorld.gravity.set(0, -1000, 0);
        }
        else if (maplevel.isloss == true && isstop == false) {
            audioLoss.play()
            createText('LOSS',)
            animationEndGame()
            isstop = true
            physicsWorld.gravity.set(0, -1000, 0);
        }

        if (isPerspectivecamera == 1) {
            maplevel.character.updateCameraTarget()
        }

    }

    animationMap(mixerUpdateDelta)


    TWEEN.update()

    // cannonDebugger.update()

    // composer.render() // bật cái này rất nặng cần có card độ họa đủ tốt

    physicsWorld.step(1 / 60);

    stats.update();
    renderer.render(scene, camera);

}

