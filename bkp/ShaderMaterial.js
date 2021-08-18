const THREE = require('three');
const ShaderMaterial = THREE.ShaderMaterial;

const vertexShader = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float aspect;
uniform float timeElapsed;
uniform float timeDelta;
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float aspect;
uniform float timeElapsed;
uniform float timeDelta;
varying vec2 vUv;
void main() {
	gl_FragColor = texture2D(tDiffuse, vUv);
}
`;

const DEFAULTS = {
  vertexShader,
  fragmentShader,
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: null },
    aspect: { value: null },
    timeElapsed: { value: null },
    timeDelta: { value: null },
  },
};

class ShaderMat extends ShaderMaterial {
  constructor(options = {}) {
    console.log('file: shadermaterial.js ~ line 43 ~ ShaderMat ~ constructor ~ options', options);
    const uniforms = Object.assign({}, DEFAULTS.uniforms, options.uniforms || {});
    options = Object.assign({}, DEFAULTS, options);
    options.uniforms = uniforms;
    super(options);
  }
}

module.exports = ShaderMat;
