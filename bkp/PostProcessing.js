/**
 * We can set up a Three.js scene, use the XTerm screen as an image texture, and
 * add fragment shaders using the "postprocessing" npm package.
 *
 * XTerm inserts 4 canvases into the DOM:
 *   1) one to render any text output
 *   2) one to render the background for any selected text done with the mouse
 *   3) one to render any clickable links to webpages
 *   4) one to render the cursor
 *
 * So we must apply any shader effects to all of these layers.
 *
 * One big downside: it's possible that mouse events do not visually sync with
 * outputted text. I haven't looked into the magic XTerm uses to add a selection
 * background when clicking with the mouse, but whatever it is, it will be either
 * impossible or really really difficult to make it work with arbitrary fragment
 * shaders.
 */

// import {
//   Scene,
//   OrthographicCamera,
//   WebGLRenderer,
//   PlaneGeometry,
//   Mesh,
//   Vector2,
//   MeshBasicMaterial,
//   CanvasTexture,
//   LinearFilter,
//   Clock,
// } from 'three';
// import { EffectComposer, RenderPass } from 'postprocessing';
// import {
//   createPassFromFragmentString,
//   createPassFromOptions,
//   createPassFromCallback,
// } from './shader-loader';
'use strict';
const THREE = require('three');
const PostProc = require('postprocessing');
const {
  createPassFromFragmentString,
  createPassFromOptions,
  createPassFromCallback,
} = require('./shader-loader');

const CanvasTexture = THREE.CanvasTexture;
const Clock = THREE.Clock;
const LinearFilter = THREE.LinearFilter;
const Mesh = THREE.Mesh;
const MeshBasicMaterial = THREE.MeshBasicMaterial;
const OrthographicCamera = THREE.OrthographicCamera;
const PlaneGeometry = THREE.PlaneGeometry;
const Scene = THREE.Scene;
// const ShaderMaterial = THREE.ShaderMaterial;
const Vector2 = THREE.Vector2;
const WebGLRenderer = THREE.WebGLRenderer;

const EffectComposer = PostProc.EffectComposer;
const RenderPass = PostProc.RenderPass;

const SHADER = ({ ShaderPass, ShaderMat }) => {
  const crtFragmentShader = `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float timeElapsed;
    uniform float separation;
    uniform sampler2D lastRender;
    varying vec2 vUv;
    float random(in float diff)
    {
      return fract(sin(diff)*100000.0);
    }
    vec4 screenDoor(vec4 fragColor)
    {
      float width = 3.0;
      float height = 3.0;
      float brightness = 0.5;
      vec2 bvector = vec2(brightness);
      float x = mod((vUv.x * resolution.x), width) / 3.0;
      float y = mod((vUv.y * resolution.y), (height+1.0));
      // r g and b channels in each pixel
      if (x < 0.33) {
          fragColor.gb *= bvector;
      }
      else if (x < 0.66) {
          fragColor.rb *= bvector;
      }
      else {
          fragColor.rg *= bvector;
      }
      if (y <= 1.0) {
          fragColor.rgb *= vec3(0);
      }
      return fragColor;
    }
    vec4 separate(vec4 fragColor)
    {
      // Separate colors
      int separationPixels = 2;
      float separationPercentage = float(separationPixels) / resolution.x;
      float separationValue = separation*separationPercentage;
      vec4 blueColor = texture2D(tDiffuse, vUv - vec2(separationValue, 0)) * vec4(0, 0.5, 1, 1);
      vec4 redColor = texture2D(tDiffuse, vUv + vec2(separationValue, 0)) * vec4(1, 0.5, 0, 1);
      fragColor = blueColor + redColor;
      return fragColor;
    }
    vec4 flicker(in vec4 fragColor)
    {
      //flicker
      float magnitude = 0.1;
      fragColor.rgb *= vec3(1.0 - (random(timeElapsed) * magnitude));
      return fragColor;
    }
    void main()
    {
      gl_FragColor = texture2D(tDiffuse, vUv);
      gl_FragColor = separate(gl_FragColor);
      gl_FragColor = flicker(gl_FragColor);
      gl_FragColor = screenDoor(gl_FragColor);
    }
  `;

  class CustomShaderPass extends ShaderPass {
    render(renderer, readBuffer, writeBuffer, timeDelta) {
      // set any custom uniforms here -- important to go before the `super` call
      this.material.uniforms.separation.value = Math.min(
        1.0,
        Math.max(0.0, this.material.uniforms.separation.value + (Math.random() - 0.5) / 5),
      );

      if (this.lastRender) {
        this.material.uniforms.lastRender.value = this.lastRender;
      }

      super.render(...arguments);

      this.lastRender = writeBuffer.texture.clone();
    }
  }

  const crtShaderMaterial = new ShaderMat({
    fragmentShader: crtFragmentShader,
    uniforms: {
      separation: { value: 0.5 },
      lastRender: { value: null },
    },
  });

  const curvedFragmentShader = `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    float easeInQuart(float time, float begin, float change, float duration) {
      return change * (time /= duration) * time * time * time + begin;
    }
    vec2 curvedMonitor(vec2 inputUV) {
      vec2 screenCenter = vec2(0.5);
      float radius = 0.5;
      float magnitude = 0.05; // how far the center of the "monitor" points out
      float cutShort = 0.3; // how far along the the easing curve we travel...I think...
      vec2 coords = vec2(inputUV.x - screenCenter.x, inputUV.y - screenCenter.y);
      float distFromOrigin = distance(inputUV, screenCenter);
      float scalar = easeInQuart(distFromOrigin, 1.0 / cutShort - magnitude, magnitude, radius);
      coords *= scalar * cutShort;
      return vec2(coords.x + screenCenter.x, coords.y + screenCenter.y);
    }
    void main() {
      vec2 pos = curvedMonitor(vUv);
      // avoids awkward texture sampling when pixel is not constrained to (0, 1)
      if (pos.x < 0.0 || pos.y < 0.0 || pos.x > 1.0 || pos.y > 1.0) {
        discard;
      }
      gl_FragColor = texture2D(tDiffuse, pos);
    }
  `;

  return [
    { shaderPass: new CustomShaderPass(crtShaderMaterial) },
    { shaderMaterial: new ShaderMat({ fragmentShader: curvedFragmentShader }) },
  ];
};

class CustomPostProcessing {
  constructor() {
    this._isInit = false; // have we already initialized?
    this._body = null; // IV for the argument passed in `onDecorated`
    this._xTermScreen = null; // xterm's container for render layers
    this._container = null; // container for the canvas we will inject
    this._canvas = null; // the canvas we will inject
    this._layers = {}; // holds XTerms rendered canvas, as well as the threejs Textures
    this.passes = []; // all of the shader passes for effectcomposer
    this._clock = this._scene = this._renderer = this._camera = this._composer = null; // threejs + postprocessing stuff
  }

  onDecorated(body) {
    if (!body) {
      return;
    }

    if (!this._isInit) {
      this._body = body;
      this.init();
    }
  }

  init() {
    let shaders;
    try {
      shaders = this.parseShadersFromConfig(SHADER);
    } catch (e) {
      console.warn(e);
    }

    if (!shaders) {
      return;
    }

    this._isInit = true;

    // TODO: Might need to add a canvas to the body

    // this._xTermScreen = this._container.querySelector('body');

    // // initialize this._layers["someClassList"] to an object holding an element.
    // // later we will also set the "material" key on this object
    // this._xTermScreen.querySelectorAll('canvas').forEach((el) => {
    //   this._layers[el.classList.toString()] = { el };
    // });

    // listen for any changes that happen inside XTerm's screen
    this._layerObserver = new MutationObserver(this.onCanvasReplacement);
    this._layerObserver.observe(this._body, { childList: true });

    Object.values(this._layers).forEach(({ el }) => (el.style.opacity = 0));
    this._clock = new Clock({ autoStart: false });

    this.setupScene();

    this.passes = [
      new RenderPass(this._scene, this._camera),
      ...(Array.isArray(shaders) ? shaders : [shaders]),
    ];
    this.passes[this.passes.length - 1].renderToScreen = true;
    this.passes.forEach((pass) => this._composer.addPass(pass));

    // i dont think there's a need to remove this listener later -- hyper takes care of it
    window.onresize = () => {
      const canvasWidth = this._body.clientWidth;
      const canvasHeight = this._body.clientHeight;

      const scaledCanvasWidth = this._body.clientWidth;
      const scaledCanvasHeight = this._body.clientHeight;
      // const { canvasWidth, canvasHeight, scaledCanvasWidth, scaledCanvasHeight } =
      //   this._body.term.renderer.dimensions;

      this._composer.setSize(canvasWidth, canvasHeight);

      this.setUniforms({
        aspect: canvasWidth / canvasHeight,
        resolution: new Vector2(scaledCanvasWidth, scaledCanvasHeight),
      });
    };

    const that = this;
    window.onresize(function resizeOnce() {
      // that._body.off('resize', resizeOnce);
      that.startAnimationLoop();
    });
  }

  parseShadersFromConfig(config) {
    console.log(config);
    // if config is a function, call it passing in the ShaderPass and
    // ShaderMaterial classes. we still need to parse the return value
    if (typeof config === 'function') {
      config = createPassFromCallback(config, { hyperTerm: this._body, xTerm: this._body });
    }

    if (!config) {
      return null;
    }

    if (typeof config === 'string') {
      return createPassFromFragmentString(config);
    } else if (Array.isArray(config)) {
      const shaders = config
        .map((item) => this.parseShadersFromConfig(item))
        .filter((item) => !!item);
      return shaders.length === 0 ? null : shaders;
    } else if (typeof config === 'object') {
      return createPassFromOptions(config);
    }

    return null;
  }

  /**
   * Boilerplate for threejs.
   */
  setupScene() {
    const canvasWidth = this._body.clientWidth;
    const canvasHeight = this._body.clientHeight;
    // const { canvasWidth, canvasHeight } = this._body.term.renderer.dimensions;

    this._canvas = document.createElement('canvas');
    this._canvas.classList.add('hyper-postprocessing', 'canvas');

    // scene!
    this._scene = new Scene();

    // renderer!
    this._renderer = new WebGLRenderer({
      canvas: this._canvas,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(canvasWidth, canvasHeight);

    // camera!
    const [w, h] = [canvasWidth / 2, canvasHeight / 2];
    this._camera = new OrthographicCamera(-w, w, h, -h, 1, 1000);

    // composer!
    this._composer = new EffectComposer(this._renderer);

    // create a texture and mesh for each of XTerm's canvases
    Object.values(this._layers).forEach((layerObj, idx) => {
      const canvas = layerObj.el;
      const texture = new CanvasTexture(canvas);
      texture.minFilter = LinearFilter;

      const geometry = new PlaneGeometry(canvasWidth, canvasHeight);
      const material = new MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
        transparent: true,
      });
      const mesh = new Mesh(geometry, material);
      mesh.position.z = idx;

      layerObj.material = material;

      this._scene.add(mesh);
      this._camera.position.z += 1;
    });

    // add the element to the page
    this._body.append(this._renderer.domElement);
  }

  /**
   * On tab switch, cancel/start the rendering loop.
   */
  // componentWillReceiveProps(props) {
  // 	if (!this._isInit) {
  // 		return;
  // 	}

  // 	if (this.props.isTermActive && !props.isTermActive) {
  // 		this._cancelAnimationLoop();
  // 	} else if (!this.props.isTermActive && props.isTermActive) {
  // 		this._startAnimationLoop();
  // 	}
  // }

  setUniforms(obj) {
    const defaultPasses = this.passes.filter((pass) => pass.name === 'DefaultShaderPass');

    Object.keys(obj).forEach((uniform) => {
      const value = obj[uniform];
      defaultPasses.forEach((pass) => pass.setUniform(uniform, value));
    });
  }

  startAnimationLoop() {
    const materials = Object.values(this._layers).map(({ material }) => material);
    const defaultPasses = this.passes.filter((pass) => pass.name === 'DefaultShaderPass');
    this._clock.start();

    const that = this;

    (function render() {
      that._animationId = window.requestAnimationFrame(render);

      for (let i = 0, length = defaultPasses.length; i < length; i++) {
        defaultPasses[i].setUniform('timeElapsed', that._clock.getElapsedTime());
      }

      for (let i = 0, length = materials.length; i < length; i++) {
        materials[i].map.needsUpdate = true;
      }

      that._composer.render(that._clock.getDelta());
    })();
  }

  cancelAnimationLoop() {
    window.cancelAnimationFrame(this._animationId);
    this._clock.stop();
  }

  /**
   * XTerm sometimes removes and replaces render layer canvases. afaik there
   * isn't an event that fires when this happens (i think it only happens
   * when Terminal#setTransparency is called). this function is the callback
   * for a MutationObserver that observes `.xterm-screen` whenever the
   * childList changes.
   */
  onCanvasReplacement([e]) {
    const { removedNodes, addedNodes } = e;
    for (let i = 0; i < removedNodes.length; i++) {
      this.replaceTexture(removedNodes[i], addedNodes[i]);
    }
  }

  replaceTexture(removedCanvas, addedCanvas) {
    const affectedLayer = this._layers[removedCanvas.classList.toString()];
    const newTexture = new CanvasTexture(addedCanvas);
    newTexture.minFilter = LinearFilter;

    affectedLayer.material.map.dispose();
    affectedLayer.material.map = newTexture;
  }

  componentWillUnmount() {
    if (this._isInit) {
      this.destroy();
    }
  }

  destroy() {
    this.cancelAnimationLoop();

    while (this._scene.children.length > 0) {
      const mesh = this._scene.children[0];
      this._scene.remove(mesh);

      mesh.material.map.dispose();
      mesh.material.dispose();
      mesh.geometry.dispose();
    }

    this._layerObserver.disconnect();
    this._canvas.remove();
    this._composer.dispose();

    this._renderer.dispose();
    this._renderer.forceContextLoss();
    this._renderer.context = null;
    this._renderer.domElement = null;

    this._isInit = false;
    this._body = this._container = this._xTermScreen = this._canvas = null;
    this._layerObserver = this._layers = this.passes = null;
    this._clock = this._scene = this._renderer = this._camera = this._composer = null;
  }
}

window.CustomPostProcessing = CustomPostProcessing;

module.exports = CustomPostProcessing;

// CSS to position the our canvas correctly
// exports.decorateConfig = (config) => {
// 	return Object.assign({}, config, {
// 		css: `
// 		${config.css || ''}
// 		.term_term {
// 			position: relative;
// 		}
// 		.hyper-postprocessing.canvas {
// 			position: absolute;
// 			top: 0;
// 			left: 0;
// 		}
// 		`
// 	});
// };
