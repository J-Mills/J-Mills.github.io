// Created using a tutorial from Redstapler
// GLTF 3D Model from Shaw Pen https://codepen.io/shshaw/pen/yPPOEg

// Three JS needs mainly below three things

/* //////////////////////////////////////// */

// SCENE
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

/* //////////////////////////////////////// */

// CAMERA
var camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 1, 800 );
camera.position.set(2, 10, 10);

/* ////////////////////////////////////////// */

// RENDERER
var renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( window.innerWidth, window.innerHeight );

// Append canvas to the body
// document.querySelector('body').appendChild(renderer.domElement);
document.getElementById('3d-dice').appendChild(renderer.domElement);

/* ////////////////////////////////////////// */

// Camera Rotation Control
// var controls = new THREE.OrbitControls( camera );
var controls = new THREE.TrackballControls(camera);

controls.rotateSpeed = 5;
// controls.zoomSpeed = 0.9;

// controls.minDistance = 3;
// controls.maxDistance = 20;

// controls.minPolarAngle = 0; // radians
// controls.maxPolarAngle = Math.PI * 100; // radians
// controls.maxPolarAngle = 1; // radian

// controls.enableDamping = true;
// controls.dampingFactor = 5;

controls.dynamicDampingFactor = 0.1;
controls.noPan = true;
controls.noZoom = true;

// controls.autoRotate = true;
// controls.autoRotateSpeed = 0.1;

/* /////////////////////////////////////////////// */

// Point Light
var light = new THREE.PointLight( 0xffffff, 2, 200 );
light.position.set( 3, 20, 20 );
// scene.add( light );

var light2 = new THREE.AmbientLight( 0x000033, 1, 200 );
light2.position.set( 30, -10, 30 );
// scene.add( light2 );

/* ////////////////////////////////////////// */

// GLTF Loader to Load and manipulate 3D Models
var loader = new THREE.GLTFLoader();

loader.crossOrigin = true;

loader.load('../3D/Dice_Textured_RW.gltf', function ( data ) {
    var object = data.scene;
    object.position.set(0, 0, 0);
    // object.scale.set(0.5,0.5,0.5);
    scene.add( object );
});

/* //////////////////////////////////////// */

// New Group
let lightLoader = new THREE.Group();
lightLoader.add(light);
lightLoader.add(light2);
scene.add(lightLoader);

// Render animation on every rendering phase
function render () {
  requestAnimationFrame( render ); 
  renderer.render( scene, camera ); // Render Scene and Camera
  controls.update(); // For Orbit Controller
  lightLoader.quaternion.copy(camera.quaternion);
}

render();

/*////////////////////////////////////////*/

// Update Camera Aspect Ratio and Renderer ScreenSize on Window resize
window.addEventListener( 'resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}, false );

/*////////////////////////////////////////*/