"use strict";

var gl; // webgl context
var canvas;

var prog_Box; // skybox program
var skybox;// skybox object

var prog; // orbuculum program
var orbuculum; // orbuculum object

var rotator; // rotator object

var projection = mat4.create();
var modelview = mat4.create();
var normalMV = mat3.create();
var invMV = mat3.create();

var oldmodelview = mat4.create();
var lightPosition = vec3.fromValues(10,10,-10);

var textures = {};

function draw() {
    gl.clearColor(0,0,0,1);
	
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(projection, Math.PI/3, canvas.width/canvas.height, 10, 2000);

    modelview = rotator.getViewMatrix();
    mat3.normalFromMat4(normalMV, modelview);
    mat3.fromMat4(invMV, modelview);
    mat3.invert(invMV, invMV);

    // draw skybox
    if (textures.skyboxTex) {
        gl.useProgram(prog_Box);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, textures.skyboxTex);
        gl.enableVertexAttribArray(skybox.coords_loc);
        skybox.render(projection, oldmodelview);
        gl.disableVertexAttribArray(skybox.coords_loc);
    }

    // draw orbuculum
    if (textures.orbuculumTex && orbuculum) {
        gl.useProgram(prog);
		gl.uniform3fv(gl.getUniformLocation(prog,"lightPosition"),lightPosition);
		gl.uniform1f(gl.getUniformLocation(prog,"shininess"),50);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, textures.orbuculumTex);
        gl.enableVertexAttribArray(orbuculum.coords_loc);
        gl.enableVertexAttribArray(orbuculum.normal_loc);
        orbuculum.render(projection, modelview, normalMV, invMV);
        gl.disableVertexAttribArray(orbuculum.coords_loc);
        gl.disableVertexAttribArray(orbuculum.normal_loc);
    }

}

const inmemoryCanvases = [1,2,3,4,5,6]
    .map(id => `inmemoryCanvas${id}`)
    .map(id => {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('id', id);
        canvas.width = 1; canvas.height = 1;
        return canvas;
    });
function loadTextureCube(texID, urls) {
    Promise.all(urls.map((url, idx) => {
        return new Promise(resolve => {
            let img = new Image();
            img.crossOrigin = '';
            img.onload = function() {
                resolve(img);
            }
            img.src = url;
        }).then(img => {
            if (texID === 'orbuculumTex') {
                return new Promise(resolve => {
                    const blurRadius = 0;
                    stackBlurImage(img, inmemoryCanvases[idx], blurRadius, false);
                    const bluredImg = new Image();
                    bluredImg.onload = function() {
                        resolve(bluredImg);
                    }
                    bluredImg.src = inmemoryCanvases[idx].toDataURL();
                })
            } else {
                return img;
            }
        })
    })).then(imgs => {
        textures[texID] = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, textures[texID]);
        var targets = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
        ];
        for (let j = 0; j < 6; j++) {
            gl.texImage2D(targets[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[j]);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        draw();
    });
}

function init() {
    try {
        canvas = document.getElementById("glcanvas");
        // canvas.width  = window.innerWidth;
        // canvas.height = window.innerHeight * 0.7;
        gl = canvas.getContext("webgl");
        if (!gl) {
            gl = canvas.getContext("experimental-webgl");
        }
        if (!gl) {
            throw "Could not create WebGL context.";
        }
        // gl = WebGLDebugUtils.makeDebugContext(gl, undefined, logAndValidate);
        var vshaderSource = getTextContent("vshaderBox");
        var fshaderSource = getTextContent("fshaderBox");
        prog_Box = createProgram(gl, vshaderSource, fshaderSource);

        vshaderSource = getTextContent("vshader");
        fshaderSource = getTextContent("fshader");
        prog = createProgram(gl, vshaderSource, fshaderSource);

		gl.enable(gl.DEPTH_TEST);
		
        rotator = new SimpleRotator(canvas, draw);
        rotator.setView([0,0,1], [0,1,0], 20);
		
		oldmodelview = rotator.getViewMatrix();
		
		
        skybox = new Cube(25);
        orbuculum = new Sphere(7);

        skybox.link(gl, prog_Box);
        skybox.upload(gl);
        orbuculum.link(gl, prog);
        orbuculum.upload(gl);


    }
    catch(e) {
        document.getElementById("message").innerHTML = "Your browser might not support WebGl: " + e;
        return;
    }
}

// main function
init();
initMap();
loadTextureCube('skyboxTex', [
    "image/strange/pos-x.png", "image/strange/neg-x.png",
    "image/strange/pos-y.png", "image/strange/neg-y.png",
    "image/strange/pos-z.png", "image/strange/neg-z.png"
    ]);
loadTextureCube('orbuculumTex', [pos_x, neg_x, pos_y, neg_y, neg_z, pos_z]);

/* $(document).keydown(function(e){
    moveLocation(e);
    loadTextureCube('orbuculumTex', [pos_x, neg_x, pos_y, neg_y, neg_z, pos_z]);
}) */

/* mapDiv.addEventListener('keydown',function(e){
	moveLocation(e);
    loadTextureCube('orbuculumTex', [pos_x, neg_x, pos_y, neg_y, neg_z, pos_z]);
}); */

$(document).keydown(function(e){
	if(e.keyCode==32){
		if(document.activeElement!=document.getElementById('start_button'))startButton(e);
	}
});

mapDiv.addEventListener('imgready',function(){
	loadTextureCube('orbuculumTex', [pos_x, neg_x, pos_y, neg_y, neg_z, pos_z]);
});