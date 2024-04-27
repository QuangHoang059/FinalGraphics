import * as THREE from 'three';
import { TGALoader } from '/jsm/loaders/TGALoader.js';
import { TeapotGeometry } from '/jsm/geometries/TeapotGeometry.js'
export class Block {
    loader = new TGALoader()
    cubeGeo = new THREE.BoxGeometry(WIDTH, WIDTH, WIDTH);
    teapotBuffer = new TeapotGeometry(4)
    scene
    positon = new THREE.Vector3()
    physicsWorld
    body
    runVelocity = 20
    walkVelocity = 13
    ismover = false
    // temporary data
    walkDirection = new THREE.Vector3(0, 0, 1)
    // trục quay
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion = new THREE.Quaternion()
    cameraTarget = new THREE.Vector3()
    mover
    index
    constructor(scene, physicsWorld, isTagert, positon = new THREE.Vector3(0, 0, 0)) {
        this.positon = positon
        var x = Math.round(positon.x / WIDTH)
        var y = Math.round(positon.z / WIDTH)
        this.index = { x, y }
        this.scene = scene
        this.physicsWorld = physicsWorld

        if (isTagert)
            this.texture = this.loader.load('image/crate_color8.tga');
        else
            this.texture = this.loader.load('image/crate_grey8.tga');
        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.cubeMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: this.texture,


        });

        this.isTagert = isTagert
        this.load()
    }
    setisTagert(isTagert) {
        this.isTagert = isTagert
        if (isTagert)
            this.texture = this.loader.load('image/crate_color8.tga');
        else
            this.texture = this.loader.load('image/crate_grey8.tga');

        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.cube.material.map = this.texture
    }
    changeGeometry(isTeaport) {
        if (isTeaport) {
            this.cube.geometry = this.teapotBuffer
        }
        else {
            this.cube.geometry = this.cubeGeo
        }
    }
    setPosition(positon) {
        this.body.position.copy(positon)
        this.cube.position.copy(positon)

    }
    setQuaternion(quaternion) {
        this.body.quaternion.copy(quaternion)
        this.cube.quaternion.copy(quaternion)
    }
    setVelocity(runVelocity, walkVelocity) {
        this.runVelocity = runVelocity
        this.walkVelocity = walkVelocity
    }
    load() {

        this.cube = new THREE.Mesh(this.cubeGeo, this.cubeMaterial);

        this.cube.position.copy(this.positon)
        this.cube.castShadow = true

        var shape = new CANNON.Box(new CANNON.Vec3(WIDTH / 2, WIDTH / 2, WIDTH / 2));
        this.body = new CANNON.Body({
            mass: 1,
            shape: shape,
            type: CANNON.Body.DYNAMIC,
            material: new CANNON.Material(),
            collisionFilterGroup: GROUP3,
            collisionFilterMask: GROUP1 | GROUP4
        });
        // this.body.collisionFilterMask &= ~GROUP3;

        this.body.position.copy(this.cube.position)
        this.body.quaternion.copy(this.cube.quaternion);

        this.physicsWorld.addBody(this.body);
        this.scene.add(this.cube)

    }

    update() {
        this.cube.position.copy(this.body.position)
        this.cube.quaternion.copy(this.body.quaternion)
    }

    async move(delta, currentAction, directionOffset, callback) {
        // // tính direction
        this._directionOffset(directionOffset)

        // run/walk velocity
        const velocity = currentAction == 'Run' ? this.runVelocity : this.walkVelocity

        // move cube & camera

        var moveX = this.walkDirection.x * velocity * delta
        var moveZ = this.walkDirection.z * velocity * delta

        if (this.mover) { clearInterval(this.mover); }

        var countStep = 0
        this.mover = setInterval(() => {
            if (Math.round(this.cube.position.x) % WIDTH == 0 && Math.round(this.cube.position.z) % WIDTH == 0 && this.ismover && countStep > 10) {
                this.cube.position.x = Math.round(this.cube.position.x)
                this.cube.position.z = Math.round(this.cube.position.z)
                this.body.position.copy(this.cube.position)

                this.ismover = false
                clearInterval(this.mover);
                callback(this.cube.position)
            }
            else {
                // console.log("step");
                countStep += 1
                this.ismover = true
                this.cube.position.x += moveX
                this.cube.position.z += moveZ
                this.body.position.x += moveX
                this.body.position.z += moveZ

            }
        }, 1)

    }
    _directionOffset(directionOffset) {
        if (directionOffset == 0) {
            this.walkDirection.set(0, 0, -1)
        } else if (directionOffset == Math.PI) {
            this.walkDirection.set(0, 0, 1)
        } else if (directionOffset == Math.PI / 2) {
            this.walkDirection.set(-1, 0, 0)
        } else if (directionOffset == - Math.PI / 2) {
            this.walkDirection.set(1, 0, 0)
        }


    }
}