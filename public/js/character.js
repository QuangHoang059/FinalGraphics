import * as THREE from 'three'
import { FBXLoader } from '/jsm/loaders/FBXLoader.js';


export class Character {
    model
    mixer
    animationsMap = new Map()
    camera
    scene
    cameraAngle = 0
    pathAnimations = ['Walk', 'Run', 'Push'];
    loadAnimation = new FBXLoader();
    // state
    keysPressed = {}
    toggleRun = true
    togglePush = false
    currentAction = 'Idle'
    // temporary data
    walkDirection = new THREE.Vector3()
    // trục quay
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion = new THREE.Quaternion(0, 0, 0, 0)
    cameraTarget = new THREE.Vector3()

    // constants
    fadeDuration = 0.2
    runVelocity = 20
    walkVelocity = 13
    position = new THREE.Vector3(0, 0, 0)
    mover
    ismover = false
    directionOffset = 0
    constructor(scene, camera, physicsWorld, position, currentAction, fadeDuration = 0.2) {
        this.currentAction = currentAction
        this.fadeDuration = fadeDuration
        this.cameraAngle = 0
        this.camera = camera
        this.scene = scene
        this.position = position
        this.physicsWorld = physicsWorld

        this._camera = this.camera.clone()


    }

    setPosition(position) {
        var positionbody = position.clone()

        positionbody.setY(position.y + 9)
        this.body.position.copy(positionbody)
        this.model.position.copy(position)

    }
    setQuaternion(quaternion) {

        this.body.quaternion.copy(quaternion)
        this.model.quaternion.copy(quaternion)
    }
    async initModel() {
        const loader = new FBXLoader();
        await this.loadAnimations()

            .then((animations) => {
                loader.load('models/stickman/source/Idle.fbx', (gltf) => {

                    this.model = gltf;
                    this.model.scale.setScalar(0.002);
                    this.scene.add(this.model);
                    this.model.position.copy(this.position)
                    // set tạo bóng cho tất cả các mesh của this.model
                    let _this = this
                    this.model.traverse(function (child) {

                        if (child.isMesh) {

                            var loadTexture = new THREE.TextureLoader()
                            var texturemap = loadTexture.load('image/square-outline-textured.png')
                            child.material.color = 0x00000
                            child.material.map = texturemap
                            var halfExtents = new CANNON.Vec3(
                                4,
                                9,
                                4
                            );

                            var shape = new CANNON.Box(halfExtents);
                            _this.characterPhyMat = new CANNON.Material()
                            _this.body = new CANNON.Body({
                                mass: 1,
                                shape: shape,
                                type: CANNON.Body.DYNAMIC,
                                material: _this.characterPhyMat,
                                collisionFilterGroup: GROUP2,
                                collisionFilterMask: GROUP1 | GROUP4

                            });

                            var position = _this.model.position.clone()

                            position.setY(position.y + 9)
                            _this.body.position.copy(position)
                            _this.body.quaternion.copy(_this.model.quaternion);

                            _this.physicsWorld.addBody(_this.body);

                            child.castShadow = true;
                        }

                    });

                    // khởi tạo khung xương cho this.model
                    this.skeleton = new THREE.SkeletonHelper(this.model);
                    this.skeleton.visible = false;
                    this.scene.add(this.skeleton);


                    // Thêm animation cho this.model
                    // lấy animations có sẵn trong this.model
                    animations.unshift(gltf.animations[0])
                    this.pathAnimations.unshift("Idle")
                    // thêm các hành động vào this.model để thực thực thi
                    this.mixer = new THREE.AnimationMixer(this.model);


                    animations.forEach((a, i) => {
                        a.name = this.pathAnimations[i]
                        this.animationsMap.set(a.name, this.mixer.clipAction(a))
                    })

                    this.animationsMap.forEach((value, key) => {
                        if (key == this.currentAction) {
                            value.play()
                        }
                    })
                    this.updateCameraTarget()

                })
            })



    }

    // load animation
    async loadAnimations() {
        let animations = [];
        var PATH = 'animation';
        for (let i = 0; i < this.pathAnimations.length; i++) {
            await new Promise((resolve, reject) => {
                this.loadAnimation.load(PATH + '/' + this.pathAnimations[i] + ".fbx", function (gltf) {
                    gltf.scale.setScalar(0.0001);
                    animations.push(gltf.animations[0]);
                    resolve();
                });
            });
        }
        return animations
    }

    switchRunToggle() {
        this.toggleRun = !this.toggleRun
    }
    move(delta) {

        if (this.currentAction == 'Run' || this.currentAction == 'Push') {

            // run/walk velocity
            const velocity = this.currentAction == 'Run' ? this.runVelocity : this.walkVelocity

            // move model & camera

            var moveX = this.walkDirection.x * velocity * delta
            var moveZ = this.walkDirection.z * velocity * delta

            if (this.mover) { clearInterval(this.mover); }

            var countStep = 0
            this.mover = setInterval(() => {
                if (Math.round(this.model.position.x) % WIDTH == 0 && Math.round(this.model.position.z) % WIDTH == 0 && this.ismover && countStep > 20) {
                    this.model.position.x = Math.round(this.model.position.x)
                    this.model.position.z = Math.round(this.model.position.z)
                    this.ismover = false
                    console.log("step");
                    clearInterval(this.mover);
                }
                else {

                    countStep += 1
                    this.ismover = true
                    this.model.position.x += moveX
                    this.model.position.z += moveZ
                    this.body.position.x = this.model.position.x
                    this.body.position.z = this.model.position.z

                }
            }, 1)

        }



    }
    moveCharacter(delta, directionPressed, isavailabel) {

        // bù góc chuyển động chéo
        this._directionOffset(this.keysPressed)
        // quay mô hình
        this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, this.directionOffset + Math.PI)
        // thông số 2 là độ mượt khi quay theo từng step 
        this.model.quaternion.rotateTowards(this.rotateQuarternion, 3)
        this.body.quaternion.copy(this.model.quaternion)

        if (!this.ismover && isavailabel[directionPressed])
            setTimeout(() => {
                this.move(delta)
            }, 10)
    }
    update(delta) {
        const directionPressed = DIRECTIONS.find(key => {
            return this.keysPressed[key];
        });
        var play = '';
        if (directionPressed && this.togglePush) {
            play = 'Push'
        }
        else if (directionPressed && this.toggleRun) {
            play = 'Run'
        } else if (directionPressed) {
            play = 'Walk'
        }
        else {
            play = 'Idle'
        }
        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play)
            const current = this.animationsMap.get(this.currentAction)
            current.fadeOut(this.fadeDuration)
            toPlay.reset().fadeIn(this.fadeDuration).play();
            this.currentAction = play

        }
        // update physical
        this.mixer.update(delta)
        this.updatePhysical()

    }
    updatePhysical() {
        var positionmodel = this.body.position.clone()
        positionmodel.y = positionmodel.y - 9
        this.model.position.copy(positionmodel)
        this.model.quaternion.copy(this.body.quaternion)

    }
    updateCameraTarget(height) {
        this.cameraAngle = THREE.MathUtils.lerp(this.cameraAngle, 0, 0.01);
        this.camera.position.setFromSphericalCoords(height, 0.7, this.cameraAngle);
        this.camera.position.add(this.model.position);
        this.camera.lookAt(this.model.position);
    }

    _directionOffset() {

        if (this.keysPressed[W]) {
            this.directionOffset = 0 // w
            this.walkDirection.set(0, 0, -1)
        } else if (this.keysPressed[S]) {
            this.walkDirection.set(0, 0, 1)
            this.directionOffset = Math.PI // s
        } else if (this.keysPressed[A]) {
            this.walkDirection.set(-1, 0, 0)
            this.directionOffset = Math.PI / 2 // a
        } else if (this.keysPressed[D]) {
            this.walkDirection.set(1, 0, 0)
            this.directionOffset = - Math.PI / 2 // d
        }


    }
}