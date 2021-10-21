(function () {
  const vscode = acquireVsCodeApi();

  let config = vscode.getState();

  const hueInput = document.querySelector('#hue');
  const brightnessInput = document.querySelector('#brightness');
  const contrastInput = document.querySelector('#contrast');
  const saturationInput = document.querySelector('#saturation');
  const crtToggle = document.querySelector('#crt-toggle');

  const applyButton = document.querySelector('.apply');
  const enableThemeButton = document.querySelector('#power');

  const phosphorInputs = document.querySelectorAll('input[name="phosphor"]');

  // Attach event listeners
  hueInput.addEventListener('input', setPreview);
  brightnessInput.addEventListener('input', setPreview);
  contrastInput.addEventListener('input', setPreview);
  saturationInput.addEventListener('input', setPreview);

  crtToggle.addEventListener('click', toggleCRT);

  phosphorInputs.forEach((input) => {
    input.addEventListener('change', changeColorScheme);
  });

  enableThemeButton.addEventListener('click', applyTheme);
  applyButton.addEventListener('click', applyConfig);

  const btns = document.querySelectorAll('.reset');
  btns.forEach((btn) => {
    btn.addEventListener('click', resetValue);
  });

  // Handle messages sent from the extension to the webview
  window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.type) {
      case 'config-changed':
      case 'config': {
        config = message;
        vscode.setState({ config: message });
        setControlValues();
        setPreview();
        break;
      }
      case 'reload': {
        config = message;
        vscode.setState({ config: message });
        setControlValues();
        setPreview();
        break;
      }
      case 'initialized': {
        console.info('Theme initialized');
        config = message;
        vscode.setState({ config: message });
        // vscode.setState({ isInitialized: true });
        toggleElementsState();
        break;
      }
    }
  });

  function overrideDocumentStyle({ property, value }) {
    document.documentElement.style.setProperty(property, value);
  }

  // This will only set the form values, not apply them to the live preview
  function setControlValues() {
    try {
      const state = vscode.getState();
      config = state.config;

      if (!config) {
        vscode.postMessage({ prop: 'error', value: 'VT220 styles are not applied' });

        return;
      }


      console.log('file: main.js ~ line 86 ~ setControlValues ~ config.data', config.data);

      const { brightness, saturation, contrast, crt, color } = config.data;

      // let hueVal = hue.replace(/\D/g, '');

      // const hueLabel = document.querySelector('#hue-value');
      // hueInput.setAttribute('value', hueVal || '0');
      // hueLabel.textContent = hueVal;
      const crtCtrl = document.querySelector('#crt-toggle');

      if (crt) {
        crtCtrl.setAttribute('checked', 'checked');
      } else {
        crtCtrl.removeAttribute('checked');
      }

      switch (color) {
        case 'blue':
          const blue = document.querySelector('#blue');
          blue.setAttribute('checked', true);
          break;
        case 'amber':
          document.querySelector('#amber').setAttribute('checked', true);
          break;
        case 'green':
        default:
          document.querySelector('#green').setAttribute('checked', true);
          break;
      }

      const brightnessLabel = document.querySelector('#brightness-value');
      brightnessInput.setAttribute('value', brightness || '1');
      brightnessLabel.textContent = brightness;

      const contrastLabel = document.querySelector('#contrast-value');
      contrastInput.setAttribute('value', contrast || '1');
      contrastLabel.textContent = contrast;

      const saturationLabel = document.querySelector('#saturation-value');
      saturationInput.setAttribute('value', saturation || '1');
      saturationLabel.textContent = saturation;
    } catch (error) {
      console.log(error.TypeError);
      vscode.postMessage({ prop: 'error', value: error });
    }
  }

  function setPreview() {
    try {
      const state = vscode.getState();
      config = state.config;

      // const hue = hueInput.value;
      const brightness = brightnessInput.value;
      const contrast = contrastInput.value;
      const saturation = saturationInput.value;

      // const hueLabel = document.querySelector('#hue-value');
      const brightnessLabel = document.querySelector('#brightness-value');
      const contrastLabel = document.querySelector('#contrast-value');
      const saturationLabel = document.querySelector('#saturation-value');

      overrideDocumentStyle({ property: '--contrast', value: `${contrast}%` });
      contrastLabel.textContent = contrast;

      overrideDocumentStyle({ property: '--brightness', value: `${brightness}%` });
      brightnessLabel.textContent = brightness;

      overrideDocumentStyle({ property: '--saturation', value: `${saturation}%` });
      saturationLabel.textContent = saturation;

      // overrideDocumentStyle({ property: '--hue', value: `${hue}deg` });
      // hueLabel.textContent = `${hue}deg`;
      changeColorScheme();

      const data = {
        // hue: `${hue}deg`,
        saturation,
        brightness,
        contrast,
      };

      vscode.setState({ config: { data } });
    } catch (error) {
      console.error(error);
      vscode.postMessage({ prop: 'error', value: error });
    }
  }

  function resetValue(e) {
    try {
      e.stopPropagation();
      e.preventDefault();

      const target = e.target;
      const state = vscode.getState();
      config = state.config;

      // if (target.classList.contains('hue')) {
      //   console.log('Reseting HUE value');
      //   const hueLabel = document.querySelector('#hue-value');
      //   hueLabel.textContent = '0deg';
      //   hueInput.value = 0;
      //   overrideDocumentStyle({ property: '--hue', value: '0deg' });
      // }

      if (target.classList.contains('saturation')) {
        const saturationLabel = document.querySelector('#saturation-value');
        saturationLabel.textContent = '100';
        saturationInput.value = 100;
        overrideDocumentStyle({ property: '--saturation', value: '100%' });
      }

      if (target.classList.contains('brightness')) {
        console.log('Reseting brightness value');
        const brightnessLabel = document.querySelector('#brightness-value');
        brightnessLabel.textContent = '100';
        brightness.value = 100;
        overrideDocumentStyle({ property: '--brightness', value: '100%' });
      }

      if (target.classList.contains('contrast')) {
        console.log('Reseting contrast value');
        const contrastLabel = document.querySelector('#contrast-value');
        contrastLabel.textContent = '100';
        contrastInput.value = 100;
        overrideDocumentStyle({ property: '--contrast', value: '100%' });
      }
    } catch (error) {
      vscode.postMessage({ prop: 'error', value: error });
    }
  }

  function toggleElementsState() {
    try {
      const state = vscode.getState();
      config = state.config;

      const { crt } = config.data;

      const warnContainer = document.querySelector('.warning');
      const content = document.querySelector('.content');
      const switches = document.querySelectorAll('.switches');

      warnContainer.classList.add('hidden');
      content.classList.remove('hidden');

      switches.forEach(swt => {
        swt.classList.remove('hidden');
      });

      const power = document.querySelector('#power');
      const powerLight = document.querySelector('.power-light');
      const crtCtrl = document.querySelector('#crt-toggle');

      power.setAttribute('checked', 'checked');

      if (crt) {
        crtCtrl.setAttribute('checked', 'checked');
      }

      powerLight.classList.add('power-light--active');
    } catch (error) {
      console.error(error);
      vscode.postMessage({ prop: 'error', value: error });
    }
  }

  function setConfig(prop, value) {
    vscode.postMessage({ prop, value });
  }

  function toggleCRT(e) {
    const target = e.target;

    vscode.postMessage({
      prop: 'toggle-crt',
      value: { crt: target.checked },
    });
  }

  function applyConfig(e) {
    try {
      e.preventDefault();

      const hue = hueInput.value;
      const brightness = brightnessInput.value;
      const contrast = contrastInput.value;
      const saturation = saturationInput.value;
      const crt = crtToggle.checked;
      const scheme = document.querySelector('input[name="phosphor"]:checked').value;

      vscode.postMessage({
        prop: 'settings',
        value: { hue: `${hue}deg`, brightness, contrast, saturation, crt, color: scheme },
      });
    } catch (error) {
      console.warn(error);
      vscode.postMessage({ prop: 'error', value: error });
    }
  }

  function applyTheme() {
    vscode.postMessage({ prop: 'toggle-theme' });
  }

  function changeColorScheme() {
    const scheme = document.querySelector('input[name="phosphor"]:checked').value;

    switch (scheme) {
      case 'blue':
        overrideDocumentStyle({ property: '--foreground', value: `#00b7ff` });
        break;
      case 'amber':
        overrideDocumentStyle({ property: '--foreground', value: `#ffb000` });
        break;
      case 'green':
      default:
        overrideDocumentStyle({ property: '--foreground', value: `#50af4c` });
        break;
    }
  }
})();
