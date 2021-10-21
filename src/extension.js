'use strict';
const path = require('path');
const fs = require('fs');
const vscode = require('vscode');

let currentPanel = undefined;
const viewType = 'viewSettings';
let _panel;
let _extensionUri;
let cntx;
let cfg;
const _disposables = [];

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  this._extensionUri = vscode.Uri;
  this.extensionName = 'LeandroRodrigues.vt220-vscode';
  cfg = vscode.workspace.getConfiguration('vt220');
  cntx = context;

  if (checkInit()) {
    vscode.workspace.onDidChangeConfiguration(handleConfigChanged);
  }

  const settings = vscode.commands.registerCommand('vt220.viewSettings', createSettingsPanel);

  const disposable = vscode.commands.registerCommand('vt220.enableEffects', init);

  const disable = vscode.commands.registerCommand('vt220.disableEffects', uninstall);

  context.subscriptions.push(settings);
  context.subscriptions.push(disposable);
  context.subscriptions.push(disable);
}

function handleConfigChanged() {}

function init(config) {
  const isWin = /^win/.test(process.platform);
  const appDir = path.dirname(require.main.filename);
  const base = appDir + (isWin ? '\\vs\\code' : '/vs/code');

  const htmlFile =
    base +
    (isWin
      ? '\\electron-browser\\workbench\\workbench.html'
      : '/electron-browser/workbench/workbench.html');

  const templateFile =
    base +
    (isWin ? '\\electron-browser\\workbench\\vt220.js' : '/electron-browser/workbench/vt220.js');

  try {
    // modify workbench html
    const html = fs.readFileSync(htmlFile, 'utf-8');

    // By default we get the values from the config
    let { contrast, saturation, brightness, crt } = vscode.workspace.getConfiguration('vt220');

    // If we're editing, we'll get the values from the UI instead
    if (config) {
      // hue = config.hue || hue;
      contrast = config.contrast;
      saturation = config.saturation;
      brightness = config.brightness;
      crt = config.crt;
    }

    // Generate chrome styles from css to inject
    const chromeStyles = fs.readFileSync(__dirname + '/css/editor_chrome.css', 'utf-8');
    const jsTemplate = fs.readFileSync(__dirname + '/js/theme_template.js', 'utf-8');
    const themeWithChrome = jsTemplate.replace(/\[CHROME_STYLES\]/g, chromeStyles);
    // const themeWithHue = themeWithChrome.replace(/\[HUE\]/g, hue);
    const themeWithSat = themeWithChrome.replace(/\[SATURATION\]/g, saturation);
    const themeWithContrast = themeWithSat.replace(/\[CONTRAST\]/g, contrast);
    const themeWithBrightness = themeWithContrast.replace(/\[BRIGHTNESS\]/g, brightness);
    const themeWithCrt = themeWithBrightness.replace(/\[CRT\]/g, crt);

    fs.writeFileSync(templateFile, themeWithCrt, 'utf-8');

    // check if the tag is already there
    const isEnabled = html.includes('vt220.js');

    let output = html.replace(
      /^.*(<!-- VT220 --><script src="vt220.js"><\/script><!-- VT220 -->).*\n?/gm,
      '',
    );

    // add script tag
    output = output.replace(
      /<\/html>/g,
      `	<!-- VT220 --><script src="vt220.js"></script><!-- VT220 -->\n`,
    );

    output += '</html>';

    fs.writeFileSync(htmlFile, output, 'utf-8');

    if (!isEnabled) {
      vscode.window
        .showInformationMessage(
          'VT220 is enabled. VS Code must reload for this change to take effect.',
          { title: 'Restart VS Code to complete' },
        )
        .then(function (msg) {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        });
    } else {
      vscode.window
        .showInformationMessage('VS code must reload for changes to take effect.', {
          title: 'Restart VS Code to refresh settings',
        })
        .then(function (msg) {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        });
    }
  } catch (e) {
    console.error(e);
    if (/ENOENT|EACCES|EPERM/.test(e.code)) {
      vscode.window.showInformationMessage(
        'You must run VS code with admin priviliges in order to enable VT220.',
      );
      return;
    } else {
      vscode.window.showErrorMessage('Something went wrong when starting VT220');
      return;
    }
  }
}

// this method is called when your extension is deactivated
function deactivate() {
  // ...
}

function uninstall() {
  var isWin = /^win/.test(process.platform);
  var appDir = path.dirname(require.main.filename);
  var base = appDir + (isWin ? '\\vs\\code' : '/vs/code');
  var htmlFile =
    base +
    (isWin
      ? '\\electron-browser\\workbench\\workbench.html'
      : '/electron-browser/workbench/workbench.html');

  // modify workbench html
  const html = fs.readFileSync(htmlFile, 'utf-8');

  // check if the tag is already there
  const isEnabled = html.includes('vt220.js');

  if (isEnabled) {
    // delete synthwave script tag if there
    let output = html.replace(
      /^.*(<!-- VT220 --><script src="vt220.js"><\/script><!-- VT220 -->).*\n?/gm,
      '',
    );
    fs.writeFileSync(htmlFile, output, 'utf-8');

    vscode.window
      .showInformationMessage(
        'VT220 disabled. VS code must reload for this change to take effect',
        { title: 'Restart editor to complete' },
      )
      .then(function (msg) {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      });
  } else {
    vscode.window.showInformationMessage("VT220 isn't running.");
  }
}

function showSettings() {
  try {
    console.info('Showing settings');

    if (currentPanel) {
      currentPanel._update();
    }
  } catch (error) {
    console.log(error);
  }
}

function createSettingsPanel() {
  try {
    const { extensionUri } = cntx;
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const config = vscode.workspace.getConfiguration('vt220');

    if (currentPanel) {
      currentPanel._panel.reveal(column);
      currentPanel._panel.webview.postMessage({ type: 'config', data: config });

      if (checkInit()) {
        currentPanel._panel.webview.postMessage({ type: 'initialized' });
      }

      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      `vt220.viewSettings`,
      'VT220 Theme settings',
      column || vscode.ViewColumn.One,
      getWebviewOptions(extensionUri),
    );

    currentPanel = new SettingsPanel(panel, extensionUri);

    currentPanel._panel.webview.postMessage({ type: 'config', data: config });

    if (checkInit()) {
      currentPanel._panel.webview.postMessage({ type: 'initialized', data: config });
      currentPanel._panel.webview.postMessage({ type: 'config-changed', data: config });
    }
  } catch (error) {
    vscode.window.showInformationMessage(error);
  }
}

function checkInit() {
  try {
    const isWin = /^win/.test(process.platform);
    const appDir = path.dirname(require.main.filename);
    const base = appDir + (isWin ? '\\vs\\code' : '/vs/code');

    const htmlFile =
      base +
      (isWin
        ? '\\electron-browser\\workbench\\workbench.html'
        : '/electron-browser/workbench/workbench.html');

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const isEnabled = html.includes('vt220.js');

    return isEnabled;
  } catch (error) {
    console.log(error);
    console.log(typeof error);
    vscode.window.showErrorMessage(error);
  }
}

function getWebviewOptions(extensionUri) {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    // localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
  };
}

function showCustomSettingsPage() {
  try {
    const panel = vscode.window.createWebviewPanel(
      `vt220.viewSettings`,
      'VT220 Theme settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      },
    );

    const isWin = /^win/.test(process.platform);
    const filePath = isWin ? '\\src\\settings.html' : '/src/settings.html';

    const viewPath = `${__dirname}${filePath}`;
    const viewResourcePath = panel.webview.asWebviewUri(viewPath);
    const htmlContent = fs.readFileSync(viewPath, 'utf-8');

    panel.webview.html = htmlContent;
  } catch (error) {
    console.error(error);
  }
}

class SettingsPanel {
  constructor(panel, extensionUri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      (e) => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables,
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        console.log(message);
        switch (message.prop) {
          case 'settings':
            const { hue, brightness, contrast, saturation } = message.value;
            // vscode.workspace
            //   .getConfiguration()
            //   .update('vt220.hue', hue, vscode.ConfigurationTarget.Global);
            vscode.workspace
              .getConfiguration()
              .update('vt220.brightness', parseInt(brightness), vscode.ConfigurationTarget.Global);
            vscode.workspace
              .getConfiguration()
              .update('vt220.saturation', parseInt(saturation), vscode.ConfigurationTarget.Global);
            vscode.workspace
              .getConfiguration()
              .update('vt220.contrast', parseInt(contrast), vscode.ConfigurationTarget.Global);

            init(message.value);

            return;
          case 'toggle-crt': {
            const { crt } = message.value;

            vscode.workspace
              .getConfiguration()
              .update('vt220.crt', crt, vscode.ConfigurationTarget.Global);

            init(message.value);

            return;
          }
          case 'toggle-theme':
            if (!checkInit()) {
              init();

              return;
            }

            uninstall();
            return;
          case 'error':
            vscode.window.showInformationMessage(message.value);
            return;
        }
      },
      null,
      this._disposables,
    );
  }

  revive(panel, extensionUri) {
    currentPanel = new SettingsPanel(panel, extensionUri);
  }

  doRefactor() {
    // Send a message to the webview webview.
    // You can send any JSON serializable data.
    this._panel.webview.postMessage({ command: 'refactor' });
  }

  dispose() {
    currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    if (this._disposables) {
      while (this._disposables.length) {
        const x = this._disposables.pop();
        if (x) {
          x.dispose();
        }
      }
    }
  }

  _update() {
    const webview = this._panel.webview;

    this._render(webview);
    const config = vscode.workspace.getConfiguration('vt220');
    this._panel.webview.postMessage({ type: 'reload', data: config });
  }

  _render(webview) {
    this._panel.title = 'VT220 Settings';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  _getHtmlForWebview(webview) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');

    const imagePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'nope.gif');

    // And the uri we use to load this script in the webview
    const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });

    const imageUri = imagePathOnDisk.with({ scheme: 'vscode-resource' });

    // Local path to css styles
    const stylesPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'terminal.css');

    // Uri to load styles into webview
    const stylesUri = webview.asWebviewUri(stylesPath);

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${stylesUri}" rel="stylesheet">
				<title>VT220 Settings</title>
			</head>
			<body>
       <section class="terminal">
        <div class="terminal__screen--bevel">
          <section class="terminal__screen">
            <div id="crt" class="crt-size frame">
              <div class="text-area" id="outputEl">
                <main class="main">
                  <h1 class="title">Set up display</h1>
                  <div>=====================================================================</div>
                  <div class="warning">
                    <figure>
                      <img nonce="${nonce}" src="${imageUri}" width="300" id="nope" />
                      <div class="blend-layer"></div>
                    </figure>
                    <h2 class="nope-text">You haven't enabled the main theme styles yet.</h2>
                    <p>
                      You can enable the theme by executing the command
                      <code> > VT220: Enable theme</code>
                      effects or you can switch the power button bellow (needs a restart) [it might
                      take a few seconds depending on how many extensions you have loading].
                    </p>
                  </div>
                  <div class="content hidden">
                    <p>Here you can adjust the theme's look and feel.</p>
                    <p>
                      Play around with the controls, the screen here will show you in realtime the
                      results of your changes.
                    </p>
                    <p>
                      When you think you got a good setting just hit the "Apply" button. Keep in mind
                      that you'll have to restart VS Code for the changes to take effect.
                    </p>
                    <p>
                      You can also disable the CRT effects (scanlines, noise and flicker) using the
                      button bellow. They're subtle but can be too intense depending on the
                      contrast/brightness/saturation settings.
                    </p>
                    <p>
                      To completely disable the theme just switch the power button or execute
                      <code> > VT220: Disable theme</code>
                    </p>

                    <form>
                      <div class="form-element hidden">
                        <label for="hue">Hue <span id="hue-value">0</span></label>
                        <div class="slider-hue">
                          <div class="input-container">
                            <input type="range" min="0" max="360" value="0" class="slider" id="hue" />
                            <button class="reset hue">Reset</button>
                          </div>
                        </div>
                      </div>
                      <div class="form-element">
                        <label for="brightness"
                          >Brightness <span id="brightness-value">100</span></label
                        >
                        <div class="input-container">
                          <input
                            type="range"
                            min="0"
                            max="200"
                            step="1"
                            class="slider"
                            id="brightness"
                          />
                          <button class="reset brightness">Reset</button>
                        </div>
                      </div>
                      <div class="form-element">
                        <label for="contrast">Contrast <span id="contrast-value">100</span></label>
                        <div class="input-container">
                          <input
                            type="range"
                            min="0"
                            max="200"
                            step="1"
                            class="slider"
                            id="contrast"
                          />
                          <button class="reset contrast">Reset</button>
                        </div>
                      </div>
                      <div class="form-element">
                        <label for="saturation"
                          >Saturation <span id="saturation-value">100</span></label
                        >
                        <div class="input-container">
                          <input
                            type="range"
                            min="0"
                            max="400"
                            step="1"
                            class="slider"
                            id="saturation"
                          />
                          <button class="reset saturation">Reset</button>
                        </div>
                      </div>

                      <button class="apply push-button after push-button--enabled">
                        Apply styles
                      </button>
                    </form>
                  </div>
                </main>
              </div>
            </div>
          </section>
        </div>

        <section class="terminal__lower">
          <div class="terminal__front-panel">
            <div class="plaque">
              <div class="front">
                <div class="brand">
                  <span>d</span>
                  <span>i</span>
                  <span>g</span>
                  <span>i</span>
                  <span>t</span>
                  <span>a</span>
                  <span>l</span>
                </div>
                <span class="model">VT220</span>
              </div>
            </div>
            <span class="power-light"></span>

            <div class="switches__container">
              <div class="switches ">
                <p class="button__label">CRT Effects</p>
                <div class="button__container">
                  <label class="button">
                    <input type="checkbox" id="crt-toggle" />
                    <div class="button__surface">ΟI</div>
                    <b class="button__raised-surface"></b>
                  </label>

                </div>
              </div>
              <div class="switches">
                <p class="button__label">Phosphor selection</p>
                <div class="button__container">
                  <label class="button">
                    <input type="radio" name="phosphor" id="green" checked value="green"/>
                    <div class="button__surface">ΟI</div>
                    <b class="button__raised-surface"></b>
                  </label>
                  <span class="button__label">P1 GJ <span class="label-color label-color--green">green</span>
                  </span>
                </div>
                <div class="button__container">
                  <label class="button">
                    <input type="radio" name="phosphor" id="amber" value="amber"/>
                    <div class="button__surface">ΟI</div>
                    <b class="button__raised-surface"></b>
                  </label>
                  <span class="button__label">P3 <span class="label-color label-color--amber">amber</span>
                  </span>
                </div>
                <div class="button__container">
                  <label class="button">
                    <input type="radio" name="phosphor" value="blue" id="blue" />
                    <div class="button__surface">ΟI</div>
                    <b class="button__raised-surface"></b>
                  </label>
                  <span class="button__label">P5 <span class="label-color label-color--blue">blue</span></span>
                </div>
              </div>
            </div>

            <label class="power-button">
              <input type="checkbox" id="power" class="toggle" />
              <div class="switch"></div>
            </label>
          </div>
        </section>
      </section>
				<script nonce="${nonce}" src="${scriptUri}"></script>

			</body>
			</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

exports.activate = activate;

module.exports = {
  activate,
  deactivate,
};
