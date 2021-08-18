(function () {
  // Grab body node
  const bodyNode = document.querySelector('body');

  let viewWidth = undefined;
  let viewHeight = undefined;
  let canvas = undefined;
  let ctx = undefined;

  // Canvas settings
  const patternSize = 64;
  const patternScaleX = 3;
  const patternScaleY = 1;
  const patternRefreshInterval = 2;
  const patternAlpha = 5; // int between 0 and 255,

  const patternPixelDataLength = patternSize * patternSize * 4;
  let patternCanvas = undefined;
  let patternCtx = undefined;
  let patternData = undefined;
  let frame = 0;

  // Entrypoint, it all starts here
  const initVT220 = (obs) => {
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

    setStatusbarTopPosition();

    window.onresize = handleResize;

    // Create canvas

    const canvasTag = document.createElement('canvas');
    canvasTag.setAttribute('id', 'canvas');
    canvasTag.setAttribute('width', '100%');
    canvasTag.setAttribute('height', '100%');
    document.body.appendChild(canvasTag);
    console.log(canvasTag);
    canvas = canvasTag;

    /* append the remaining styles */
    updatedThemeStyles = `${updatedThemeStyles}[CHROME_STYLES]`;

    const newStyleTag = document.createElement('style');
    newStyleTag.setAttribute('id', 'vt220-theme-styles');
    newStyleTag.innerText = updatedThemeStyles.replace(/(\r\n|\n|\r)/gm, '');
    document.body.appendChild(newStyleTag);

    console.log('VT220: initialised!');

    initCanvas();
    initGrain();
    requestAnimationFrame(loop);

    // disconnect the observer because we don't need it anymore
    if (obs) {
      obs.disconnect();
    }
  };

  const handleResize = () => {
    console.log('VSCode resized');
    setStatusbarTopPosition();
  };

  // create a canvas which will render the grain
  const initCanvas = () => {
    console.log(canvas);
    viewWidth = canvas.width = canvas.clientWidth;
    viewHeight = canvas.height = canvas.clientHeight;
    ctx = canvas.getContext('2d');

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
          initVT220(observer);
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
  initVT220();

  // Use a mutation observer to check when we can bootstrap the theme
  const observer = new MutationObserver(watchForBootstrap);
  observer.observe(bodyNode, { attributes: true });
})();
