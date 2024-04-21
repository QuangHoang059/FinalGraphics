const express = require('express')
const app = express()
const path = require('path')

app.use(express.static(__dirname + '/public'))

app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')))
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')))
app.use('/tween/', express.static(path.join(__dirname, 'node_modules/@tweenjs/tween.js/dist')))
app.use('/node_modules/', express.static(path.join(__dirname, 'node_modules')))
app.use('/cannon-es-debugger/', express.static(path.join(__dirname, 'node_modules/cannon-es-debugger')))
// Serve models directory
app.use('/models/', express.static(path.join(__dirname, 'models')));

// Serve textures directory
app.use('/textures/', express.static(path.join(__dirname, 'textures')));

port = 3000
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});