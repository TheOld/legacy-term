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
  const patternAlpha = 6; // int between 0 and 255,

  const patternPixelDataLength = patternSize * patternSize * 4;
  let patternCanvas = undefined;
  let patternCtx = undefined;
  let patternData = undefined;
  let frame = 0;

  const accents = {
    'default': 'rgb(0, 255, 102)',
    'green1': 'rgb(51, 255, 0)',
    'green2': 'rgb(0, 255, 51)',
    'apple2': 'rgb(51, 255, 51)',
    'apple2c': 'rgb(102, 255, 102)',
    'amber': 'rgb(255, 176, 0)',
    'blue': 'rgb(0, 183, 255)',
  };

  const backgrounds = {
    'default': '#000c00',
    'green1': '#000c00',
    'green2': '#000c00',
    'apple2': '#000c00',
    'apple2c': '#000c00',
    'amber': '#180F06',
    'blue': '#00000c',
  }

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

  const watchAttributes = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes') {
        console.log('Attribute changed on chromium');
        const chromium = document.querySelector('div.chromium');

        const isGreen = document.querySelector('[class*="00ff66"]');
        if (isGreen) {
          overrideDocumentStyle({ property: '--foreground', value: accents.default });
          overrideDocumentStyle({ property: '--background', value: backgrounds.default });

          return;
        }

        const isGreen1 = document.querySelector('[class*="33ff00"]');
        if (isGreen1) {
          overrideDocumentStyle({ property: '--foreground', value: accents.green1 });
          overrideDocumentStyle({ property: '--background', value: backgrounds.default });

          return;
        }

        const isGreen2 = document.querySelector('[class*="00ff33"]');
        if (isGreen2) {
          overrideDocumentStyle({ property: '--foreground', value: accents.green2 });
          overrideDocumentStyle({ property: '--background', value: backgrounds.default });

          return;
        }

        const isApple2 = document.querySelector('[class*="33ff33"]');
        if (isApple2) {
          overrideDocumentStyle({ property: '--foreground', value: accents.apple2 });
          overrideDocumentStyle({ property: '--background', value: backgrounds.default });

          return;
        }

        const isApple2c = document.querySelector('[class*="66ff66"]');
        if (isApple2c) {
          overrideDocumentStyle({ property: '--foreground', value: accents.apple2c });
          overrideDocumentStyle({ property: '--background', value: backgrounds.default });

          return;
        }

        const isAmber = document.querySelector('[class*="ffb000"]');
        if (isAmber) {
          overrideDocumentStyle({ property: '--foreground', value: accents.amber });
          overrideDocumentStyle({ property: '--background', value: backgrounds.amber });

          return;
        }

        const isBlue = document.querySelector('[class*="00b7ff"]');
        if (isBlue) {
          overrideDocumentStyle({ property: '--foreground', value: accents.blue });
          overrideDocumentStyle({ property: '--background', value: backgrounds.blue });

          return;
        }

      }
    }
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

    const chromium = document.querySelector('div.chromium');
    const chromeThemeObserver = new MutationObserver(watchAttributes);
    chromeThemeObserver.observe(chromium, { attributes: true });

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
