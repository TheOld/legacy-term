(function () {
  // Grab body node
  const bodyNode = document.querySelector('body');

  let config = undefined;

  // CRT Variables
  // let canvas = undefined;
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

  const patternRefreshInterval = 0.5;
  let frame = 0;

  const overrideDocumentStyle = ({ property, value }) => {
    document.documentElement.style.setProperty(property, value);
  };

  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      if (entry.contentBoxSize) {
        readjustLayout();
      }
    }
  });

  // Entrypoint, it all starts here
  const initCRT = (withCRT, obs) => {
    var themeStyleTag = document.querySelector('.vscode-tokens-styles');

    if (!themeStyleTag) {
      return;
    }

    // Additional classes
    const gridView = document.querySelector('.chromium > .monaco-grid-view');
    gridView.classList.add('main-container');

    const content = document.querySelector('body');
    const sidebar = document.querySelector('.sidebar');
    resizeObserver.observe(content);
    resizeObserver.observe(sidebar);

    // if (withCRT) {
    const defaultCrtArgs = {
      scanLineColor: 0x33,
      scanLineOpacity: 0,
      pctNoise: 0.25,
      pctFlicker: 0.05,
      refreshInterval: 200,
      blur: 0,
    };
    initCRTEffects({ ...defaultCrtArgs });

    requestAnimationFrame(loop);
    // }

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

  const initCRTEffects = ({
    scanLineColor,
    scanLineOpacity,
    pctNoise,
    pctFlicker,
    refreshInterval,
    blur,
  }) => {
    const canvas = document.createElement('canvas');

    if (!canvas || !canvas.getContext) {
      return;
    }

    if (isNaN(scanLineColor)) {
      scanLineColor = 0;
    }

    alpha = 0; //scanLineOpacity === undefined ? 50 : Math.floor(255 * scanLineOpacity);
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
        // if (scanLineColor) {
        //   data[px] = scanLineColor;
        //   data[px + 1] = scanLineColor;
        //   data[px + 2] = scanLineColor;
        // }
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
       will-change: background, opacity;
       background-image:url(${canvas.toDataURL('image/png')});`,
    );

    bodyNode.appendChild(overlay);
  };

  // put a random shade of gray into every pixel of the pattern
  const update = () => {
    const { style } = overlay;

    style.backgroundPosition =
      Math.floor(Math.random() * w) + 'px ' + Math.floor((Math.random() * h) / 2) * 2 + 'px';
    if (amountFlicker) {
      flicker = useSmoothFlickering
        ? Math.max(0, Math.min(amountFlicker, flicker + (Math.random() - 0.5) * amountFlicker))
        : Math.random() * amountFlicker;
      style.opacity = 1 - flicker;
    }
  };

  const loop = () => {
    if (++frame % patternRefreshInterval === 0) {
      update();
    }

    requestAnimationFrame(loop);
  };

  const readjustLayout = () => {
    // const sidebarContainer = document.querySelector('.sidebar').parentElement;
    // const statusbarContainer = document.querySelector('.statusbar').parentElement;
    // const mainContent = sidebarContainer.nextElementSibling;
    // const chromium = document.querySelector('.chromium');
    // const content = document.querySelector('.editor>.content');
    // // Editor width
    // const width = document.body.clientWidth;
    // const height = document.body.clientHeight;
    // statusbarContainer.style.setProperty('top', `${height - 120}px`);
    // chromium.style.setProperty('width', `${width - 120}px`);
    // chromium.style.setProperty('height', `${height - 120}px`);
    // chromium.style.setProperty('top', '55px');
    // // 161 is right-margin + activity-bar
    // let contentWidth = width - (240 - sidebarContainer.offsetWidth);
    // mainContent.style.setProperty('width', `${contentWidth}px`);
    // content.style.setProperty('width', `${contentWidth}px`);
  };

  // Callback function to execute when mutations are observed
  const watchForBootstrap = (mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === 'attributes') {
        // only init if we're using a VT220 subtheme
        const isUsingCRT = document.querySelector('[class*="leandro-rodrigues-crt-vscode-themes"]');
        // does the style div exist yet?
        const tokensLoaded = document.querySelector('.vscode-tokens-styles');
        // does it have content ?
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
          initCRT([CRT], observer);
        }
      }
    }
  };

  // const setStatusbarTopPosition = () => {
  //   const statusbarContainer = document.querySelector('.statusbar').parentElement;
  //   statusbarContainer.style.setProperty('top', 'calc(100% - 37px)');
  //   statusbarContainer.style.setProperty('z-index', '10');
  // };

  // try to initialise the theme
  initCRT([CRT]);

  // Use a mutation observer to check when we can bootstrap the theme
  const observer = new MutationObserver(watchForBootstrap);
  observer.observe(bodyNode, { attributes: true });
})();
