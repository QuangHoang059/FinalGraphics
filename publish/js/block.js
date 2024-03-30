import * as THREE from 'three';
const map = new THREE.TextureLoader().load('./publish/image/square-outline-textured.png');
map.colorSpace = THREE.SRGBColorSpace;

var cubeGeo = new THREE.BoxGeometry(WIDTH, WIDTH, WIDTH);
cubeGeo.castShadow = true
var cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, map: map });
export class Block {
    scene
    positon = new THREE.Vector2()
    constructor(scene, positon = new THREE.Vector2(0, 0)) {
        this.positon = positon
        this.scene = scene
        this.load()
    }
    load() {
        this.cube = new THREE.Mesh(cubeGeo, cubeMaterial);
        this.cube.position.set(this.positon.x, WIDTH / 2, this.positon.y);
        this.cube.castShadow = true
        this.scene.add(this.cube)
    }
    controlcube(position) {

    }


}