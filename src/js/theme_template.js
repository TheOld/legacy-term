(function () {
  // Grab body node
  const bodyNode = document.querySelector('body');

  let config = undefined; //vscode.configuration.getConfiguration('vt220');

  // CRT Variables
  let canvas = undefined;
  let ctx = undefined;
  let canvasData = undefined;
  let data = undefined;
  let x = undefined;
  let y = undefined;
  let px = undefined;
  let py = undefined;
  let alpha = undefined;
  let dAlpha = undefined;
  let filter = undefined;

  let overlay = undefined;
  let flicker = 0;
  let amountFlicker = undefined;
  let useSmoothFlickering = true;
  let w = 64;
  let h = 32;

  let viewWidth = undefined;
  let viewHeight = undefined;
  let noiseCanvas = undefined;

  // Canvas settings
  const patternSize = 64;
  const patternScaleX = 3;
  const patternScaleY = 1;
  const patternRefreshInterval = 1;
  const patternAlpha = 5; // int between 0 and 255,

  const patternPixelDataLength = patternSize * patternSize * 4;
  let patternCanvas = undefined;
  let patternCtx = undefined;
  let patternData = undefined;
  let frame = 0;

  const overrideDocumentStyle = ({ property, value }) => {
    document.documentElement.style.setProperty(property, value);
  };

  // Entrypoint, it all starts here
  const initVT220 = (withCRT, obs) => {
    var themeStyleTag = document.querySelector('.vscode-tokens-styles');

    if (!themeStyleTag) {
      return;
    }

    var initialThemeStyles = themeStyleTag.innerText;
    var updatedThemeStyles = initialThemeStyles;

    // Additional classes
    // bodyNode.classList.add('noise');

    // Update main container with data attribute for style targeting
    const gridView = document.querySelector('.chromium > .monaco-grid-view');
    gridView.classList.add('main-container');

    // setStatusbarTopPosition();

    // window.onresize = handleResize;

    const content = document.querySelector('.main-container');

    const styles = `:root { --saturation: [SATURATION]%; --contrast: [CONTRAST]%; --brightness: [BRIGHTNESS]% }`;

    /* append the remaining styles */
    updatedThemeStyles = `${updatedThemeStyles}[CHROME_STYLES]${styles}`;

    const newStyleTag = document.createElement('style');
    newStyleTag.setAttribute('id', 'vt220-theme-styles');
    newStyleTag.innerText = updatedThemeStyles.replace(/(\r\n|\n|\r)/gm, '');
    document.body.appendChild(newStyleTag);

    // initCanvas();
    // initGrain();
    if (withCRT) {
      const defaultCrtArgs = {
        scanLineColor: 0x33,
        scanLineOpacity: 0.26,
        pctNoise: 0.2,
        pctFlicker: 0.275,
        refreshInterval: 200,
        blur: 0,
      };
      initCRT({ ...defaultCrtArgs });

      requestAnimationFrame(loop);
    }

    console.log('VT220: initialised!');

    // disconnect the observer because we don't need it anymore
    if (obs) {
      obs.disconnect();
    }
  };

  const applyCustomStyles = () => {
    try {
      if (config) {
        const { hue, saturation, contrast, brightness } = config;
        overrideDocumentStyle({ property: '--contrast', value: contrast });
        overrideDocumentStyle({ property: '--hue', value: hue });
        overrideDocumentStyle({ property: '--saturation', value: saturation });
        overrideDocumentStyle({ property: '--brightness', value: brightness });
      }

      return;
    } catch (error) {
      console.error(error);
    }
  };

  const handleResize = () => {
    console.log('VSCode resized');
    setStatusbarTopPosition();
  };

  const initCRT = ({
    scanLineColor,
    scanLineOpacity,
    pctNoise,
    pctFlicker,
    refreshInterval,
    blur,
  }) => {
    canvas = document.createElement('canvas');

    if (!canvas || !canvas.getContext) {
      return;
    }

    if (isNaN(scanLineColor)) {
      scanLineColor = 0;
    }

    alpha = scanLineOpacity === undefined ? 50 : Math.floor(255 * scanLineOpacity);
    dAlpha = pctNoise === undefined ? 5 : 255 * pctNoise;
    amountFlicker = pctFlicker === undefined ? 0.2 : pctFlicker;
    refreshInterval = refreshInterval === undefined ? 60 : refreshInterval;
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext('2d');
    canvasData = ctx.getImageData(0, 0, w, h);
    data = canvasData.data;

    for (y = 1; y < h; y += 2) {
      py = w * 4 * y;
      for (x = 0; x < w; x++) {
        px = py + x * 4;
        if (scanLineColor) {
          data[px] = scanLineColor;
          data[px + 1] = scanLineColor;
          data[px + 2] = scanLineColor;
        }
        data[px + 3] = alpha + Math.random() * dAlpha;
      }
    }

    ctx.putImageData(canvasData, 0, 0);

    overlay = document.createElement('div');
    overlay.setAttribute('id', 'crtEmulation');
    overlay.setAttribute(
      'style',
      `position:fixed;
       left:0px;
       top:0px;
       right:0;
       bottom:0;
       pointer-events:none;
       z-index:16777215;
       background-repeat:repeat;
       background-image:url(${canvas.toDataURL('image/png')});`,
    );

    if (blur > 0) {
      document.body.style['filter'] = `blur(${blur}px)`;
    }

    document.querySelector('html').appendChild(overlay);
  };

  // create a canvas which will render the grain
  const initCanvas = () => {
    viewWidth = noiseCanvas.width = noiseCanvas.clientWidth;
    viewHeight = noiseCanvas.height = noiseCanvas.clientHeight;
    ctx = noiseCanvas.getContext('2d');

    ctx.scale(patternScaleX, patternScaleY);
  };

  // create a canvas which will be used as a pattern
  const initGrain = () => {
    patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;
    patternCtx = patternCanvas.getContext('2d');
    patternData = patternCtx.createImageData(patternSize, patternSize);
  };

  // put a random shade of gray into every pixel of the pattern
  const update = () => {
    const { style } = overlay;

    // var value;

    // // FIXME: May not need this anymore since the CRT effects will do it all
    // for (var i = 0; i < patternPixelDataLength; i += 4) {
    //   value = (Math.random() * 255) | 0;

    //   patternData.data[i] = value;
    //   patternData.data[i + 1] = value;
    //   patternData.data[i + 2] = value;
    //   patternData.data[i + 3] = patternAlpha;
    // }

    // patternCtx.putImageData(patternData, 0, 0);

    style.backgroundPosition =
      Math.floor(Math.random() * w) + 'px ' + Math.floor((Math.random() * h) / 2) * 2 + 'px';
    if (amountFlicker) {
      flicker = useSmoothFlickering
        ? Math.max(0, Math.min(amountFlicker, flicker + (Math.random() - 0.5) * amountFlicker))
        : Math.random() * amountFlicker;
      style.opacity = 1 - flicker;
    }
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

      // draw();
    }

    requestAnimationFrame(loop);
  };

  // Callback function to execute when mutations are observed
  const watchForBootstrap = (mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === 'attributes') {
        // only init if we're using a VT220 subtheme
        const isUsingVt220 = document.querySelector(
          '[class*="LeandroRodrigues-vt220-vscode-themes"]',
        );
        // does the style div exist yet?
        const tokensLoaded = document.querySelector('.vscode-tokens-styles');
        // does it have content ?
        const tokenStyles = document.querySelector('.vscode-tokens-styles').innerText;

        // sometimes VS code takes a while to init the styles content, so stop this observer and add an observer for that
        if (isUsingVt220 && tokensLoaded) {
          observer.disconnect();
          observer.observe(tokensLoaded, { childList: true });
        }
      }
      if (mutation.type === 'childList') {
        const isUsingVt220 = document.querySelector(
          '[class*="LeandroRodrigues-vt220-vscode-themes"]',
        );
        const tokensLoaded = document.querySelector('.vscode-tokens-styles');
        const tokenStyles = document.querySelector('.vscode-tokens-styles').innerText;

        // Everything we need is ready, so initialise
        if (isUsingVt220 && tokensLoaded && tokenStyles) {
          initVT220([CRT], observer);
        }
      }
    }
  };

  const setStatusbarTopPosition = () => {
    const statusbarContainer = document.querySelector('.statusbar').parentElement;
    statusbarContainer.style.setProperty('top', 'calc(100% - 37px)');
    statusbarContainer.style.setProperty('z-index', '10');
  };

  // try to initialise the theme
  initVT220([CRT]);

  // Use a mutation observer to check when we can bootstrap the theme
  const observer = new MutationObserver(watchForBootstrap);
  observer.observe(bodyNode, { attributes: true });
})();
