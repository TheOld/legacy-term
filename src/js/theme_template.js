(function () {
  // Grab body node
  const bodyNode = document.querySelector('body');

  let config = undefined;

  // CRT Variables
  let viewWidth = undefined;
  let viewHeight = undefined;
  let canvas = undefined;
  let ctx = undefined;

  // Canvas settings
  const patternSize = 64;
  const patternScaleX = 3;
  const patternScaleY = 1;
  const patternRefreshInterval = 2;
  const patternAlpha = 16; // int between 0 and 255,

  const patternPixelDataLength = patternSize * patternSize * 4;
  let patternCanvas = undefined;
  let patternCtx = undefined;
  let patternData = undefined;
  let frame = 0;

  const overrideDocumentStyle = ({ property, value }) => {
    document.documentElement.style.setProperty(property, value);
  };

  const initCanvas = () => {
    console.log('Initializing canvas');
    // Create canvas
    const canvasTag = document.createElement('canvas');
    canvasTag.setAttribute('id', 'canvas');
    canvasTag.setAttribute('width', '100%');
    canvasTag.setAttribute('height', '100%');
    bodyNode.appendChild(canvasTag);
    canvas = canvasTag;
    viewWidth = canvas.width = canvas.clientWidth;
    viewHeight = canvas.height = canvas.clientHeight;
    ctx = canvas.getContext('2d');

    ctx.scale(patternScaleX, patternScaleY);
  };

  // create a canvas which will be used as a pattern
  const initGrain = () => {
    console.log('Setting up grain');
    patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;
    patternCtx = patternCanvas.getContext('2d');
    patternData = patternCtx.createImageData(patternSize, patternSize);
  };

  // put a random shade of gray into every pixel of the pattern
  const update = () => {
    var value;

    for (var i = 0; i < patternPixelDataLength; i += 4) {
      value = (Math.random() * 255) | 0;

      patternData.data[i] = value;
      patternData.data[i + 1] = value;
      patternData.data[i + 2] = value;
      patternData.data[i + 3] = patternAlpha;
    }

    patternCtx.putImageData(patternData, 0, 0);
  };

  // fill the canvas using the pattern
  const draw = () => {
    ctx.clearRect(0, 0, viewWidth, viewHeight);

    ctx.fillStyle = ctx.createPattern(patternCanvas, 'repeat');
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  };

  const loop = () => {
    if (++frame % patternRefreshInterval === 0) {
      update();
      draw();
    }

    requestAnimationFrame(loop);
  };

    // Entrypoint, it all starts here
  const initCRT = (obs) => {
    console.log('CRT init');
    var themeStyleTag = document.querySelector('.vscode-tokens-styles');

    if (!themeStyleTag) {
      return;
    }

    // Additional classes
    const gridView = document.querySelector('.chromium > .monaco-grid-view');
    if (gridView) {
      gridView.classList.add('main-container');
    }

    const noiseCanvas = document.querySelector('#canvas');
    if (!noiseCanvas) {
      initCanvas();
      initGrain();

      requestAnimationFrame(loop);
    }

    // disconnect the observer because we don't need it anymore
    if (obs) {
      obs.disconnect();
    }
  };


  // Callback function to execute when mutations are observed
  const watchForBootstrap = (mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === 'attributes') {
        // only init if we're using a CRT subtheme
        const isUsingCRT = document.querySelector('[class*="leandro-rodrigues-crt-vscode-themes"]');
        const tokensLoaded = document.querySelector('.vscode-tokens-styles');
        const tokenStyles = document.querySelector('.vscode-tokens-styles').innerText;

        // sometimes VS code takes a while to init the styles content, so stop this observer and add an observer for that
        if (isUsingCRT && tokensLoaded) {
          observer.disconnect();
          observer.observe(tokensLoaded, { childList: true });
        }
      }

      if (mutation.type === 'childList') {
        const isUsingCRT = document.querySelector('[class*="leandro-rodrigues-crt-vscode-themes"]');
        const tokensLoaded = document.querySelector('.vscode-tokens-styles');
        const tokenStyles = document.querySelector('.vscode-tokens-styles').innerText;

        // Everything we need is ready, so initialise
        if (isUsingCRT && tokensLoaded && tokenStyles) {
          initCRT(observer);
        }
      }
    }
  };

  // try to initialise the theme
  initCRT();

  // Use a mutation observer to check when we can bootstrap the theme
  const observer = new MutationObserver(watchForBootstrap);
  observer.observe(bodyNode, { attributes: true });
})();
