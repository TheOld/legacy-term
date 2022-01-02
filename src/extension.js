const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const diff = require('semver/functions/diff');
const fetch = require('node-fetch');
const fs = require('fs');
const msg = require('./messages').messages;
const path = require('path');
const postcss = require('postcss');
const Url = require('url');
const uuid = require('uuid');
const vscode = require('vscode');
const UglifyJS = require('uglify-js');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  this.extensionName = 'leandro-rodrigues.crt-vscode';

  const appDir = path.dirname(require.main.filename);
  const base = path.join(appDir, 'vs', 'code');

  const BackupFilePath = (uuid) =>
    path.join(base, 'electron-browser', 'workbench', `workbench.${uuid}.bak-crt`);

  const htmlFile = path.join(base, 'electron-browser', 'workbench', 'workbench.html');

  async function getFileContent(url) {
    if (/^file:/.test(url)) {
      const fp = Url.fileURLToPath(url);
      return await fs.promises.readFile(fp);
    } else {
      const response = await fetch(url);
      return response.buffer();
    }
  }

  async function install() {
    try {
      const uuidSession = uuid.v4();
      await createBackup(uuidSession);
      await patch(uuidSession);
    } catch (error) {
      console.error(error);
    }
  }

  async function reinstall() {
    await uninstallImpl();
    await install();
  }

  async function uninstall() {
    await uninstallImpl();
    restart();
  }

  async function uninstallImpl() {
    const backupUuid = await getBackupUuid(htmlFile);
    if (!backupUuid) return;

    const backupPath = BackupFilePath(backupUuid);
    await restoreBackup(backupPath);
    await deleteBackupFiles();
  }

  async function getBackupUuid(htmlFilePath) {
    try {
      const htmlContent = await fs.promises.readFile(htmlFilePath, 'utf-8');

      const match = htmlContent.match(/<!-- CRT-ID ([0-9a-fA-F-]+) -->/);

      if (!match) {
        return null;
      } else {
        return match[1];
      }
    } catch (e) {
      vscode.window.showInformationMessage(`${msg.genericError}${e}`);
      throw e;
    }
  }

  async function createBackup(uuidSession) {
    try {
      let html = await fs.promises.readFile(htmlFile, 'utf-8');
      html = clearExistingPatches(html);

      await fs.promises.writeFile(BackupFilePath(uuidSession), html, 'utf-8');
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      throw e;
    }
  }

  function clearExistingPatches(html) {
    html = html.replace(/<!-- CRT -->[\s\S]*?<!-- CRT -->\n*/, '');
    html = html.replace(/<!-- CRT-ID [\w-]+ -->\n*/g, '');

    return html;
  }

  /**
   * Restores the backed up workbench.html file
   * @param  {} backupFilePath
   */
  async function restoreBackup(backupFilePath) {
    try {
      if (fs.existsSync(backupFilePath)) {
        await fs.promises.unlink(htmlFile);
        await fs.promises.copyFile(backupFilePath, htmlFile);
      }
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      throw e;
    }
  }

  async function deleteBackupFiles() {
    const htmlDir = path.dirname(htmlFile);
    const htmlDirItems = await fs.promises.readdir(htmlDir);

    for (const item of htmlDirItems) {
      if (item.endsWith('.bak-crt')) {
        await fs.promises.unlink(path.join(htmlDir, item));
      }
    }
  }

  /**
   * Loads the CSS file's contents to be injected into the main HTML document
   * @param  {} uuidSession
   */
  async function patch(uuidSession) {
    let html = await fs.promises.readFile(htmlFile, 'utf-8');
    html = clearHTML(html);
    html = html.replace(/<meta.*http-equiv="Content-Security-Policy".*>/, '');

    const styleTags = await getTags('styles');
    const jsTags = await getTags('javascript');

    html = html.replace(
      /(<\/html>)/,
      `<!-- CRT-ID ${uuidSession} -->\n` +
        '<!-- CRT-CSS-START -->\n' +
        styleTags +
        jsTags +
        '<!-- CRT-CSS-END -->\n</html>',
    );

    try {
      await fs.promises.writeFile(htmlFile, html, 'utf-8');
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      disabledRestart();
    }

    enabledRestart();
  }

  async function getTags(target) {
    const config = vscode.workspace.getConfiguration('crt');

    if (target === 'styles') {
      let res = '';

      const styles = ['/css/editor_chrome.css'];

      for (const url of styles) {
        const imp = await buildTag(url);

        if (imp) {
          res += imp;
        }
      }

      return res;
    }

    if (target === 'javascript') {
      let res = '';
      const js = ['/js/theme_template.js'];

      for (const url of js) {
        const jsTemplate = await fs.promises.readFile(__dirname + url);

        const buffer = jsTemplate.toString();
        const themeWithEffects = buffer.replace(/\[CRT\]/g, config.crt);
        const uglyJS = UglifyJS.minify(themeWithEffects);
        const tag = `<script>${uglyJS.code}</script>\n`;

        if (tag) {
          res += tag;
        }
      }

      return res;
    }
  }

  const minifyCss = async (css) => {
    // We pass in an array of the plugins we want to use: `cssnano` and `autoprefixer`
    const output = await postcss([cssnano]).process(css);

    return output.css;
  };

  async function buildTag(url) {
    try {
      const fetched = await fs.promises.readFile(__dirname + url);

      const miniCSS = await minifyCss(fetched);

      return `<style>${miniCSS}</style>\n`;
    } catch (e) {
      console.error(e);
      vscode.window.showWarningMessage(msg.cannotLoad + url);
      return '';
    }
  }
  /**
   * Removes injected files from workbench.html file
   * @param  {} html
   */
  function clearHTML(html) {
    html = html.replace(/<!-- CRT-CSS-START -->[\s\S]*?<!-- CRT-CSS-END -->\n*/, '');
    html = html.replace(/<!-- CRT-ID [\w-]+ -->\n*/g, '');

    return html;
  }

  function enabledRestart() {
    vscode.window.showInformationMessage(msg.enabled, { title: msg.restartIde }).then(reloadWindow);
  }

  function restart() {
    vscode.window
      .showInformationMessage(msg.disabled, { title: msg.restartIde })
      .then(reloadWindow);
  }

  function reloadWindow() {
    // reload vscode-window
    vscode.commands.executeCommand('workbench.action.reloadWindow');
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
        `crt.viewSettings`,
        'CRT Theme settings',
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

      const config = vscode.workspace.getConfiguration('crt');

      if (currentPanel) {
        currentPanel._panel.reveal(column);
        currentPanel._panel.webview.postMessage({ type: 'config', data: config });

        return;
      }

      // Otherwise, create a new panel.
      const panel = vscode.window.createWebviewPanel(
        `crt.viewSettings`,
        'CRT Theme settings',
        column || vscode.ViewColumn.One,
        getWebviewOptions(extensionUri),
      );

      currentPanel = new SettingsPanel(panel, extensionUri);

      currentPanel._panel.webview.postMessage({ type: 'config', data: config });

      currentPanel._panel.webview.postMessage({ type: 'initialized', data: config });
    } catch (error) {
      vscode.window.showInformationMessage(error);
    }
  }

  const installCRT = vscode.commands.registerCommand('crt.enableEffects', install);
  const uninstallCRT = vscode.commands.registerCommand('crt.disableEffects', uninstall);
  const updateCRT = vscode.commands.registerCommand('crt.reload', reinstall);

  const settings = vscode.commands.registerCommand('crt.viewSettings', createSettingsPanel);

  context.subscriptions.push(installCRT);
  context.subscriptions.push(uninstallCRT);
  context.subscriptions.push(updateCRT);
  context.subscriptions.push(settings);

   let currentPanel = undefined;
   const viewType = 'viewSettings';
   let _panel;
   let _extensionUri;
   let cntx = context;
   let cfg;
   const _disposables = [];
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
              const { hue, brightness, contrast, saturation, color } = message.value;
              // vscode.workspace
              //   .getConfiguration()
              //   .update('vt220.hue', hue, vscode.ConfigurationTarget.Global);
              vscode.workspace
                .getConfiguration()
                .update('crt.brightness', parseInt(brightness), vscode.ConfigurationTarget.Global);
              vscode.workspace
                .getConfiguration()
                .update('crt.saturation', parseInt(saturation), vscode.ConfigurationTarget.Global);
              vscode.workspace
                .getConfiguration()
                .update('crt.contrast', parseInt(contrast), vscode.ConfigurationTarget.Global);
              vscode.workspace
                .getConfiguration()
                .update('crt.color', color, vscode.ConfigurationTarget.Global);

              reinstall();

              return;
            case 'toggle-crt': {
              const { crt } = message.value;

              vscode.workspace
                .getConfiguration()
                .update('crt.crt', crt, vscode.ConfigurationTarget.Global);

              reinstall();

              return;
            }
            case 'toggle-theme':
              if (!this.checkInit()) {
                reinstall();

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

    async checkInit() {
      const htmlContent = await fs.promises.readFile(htmlFile, 'utf-8');

      const match = htmlContent.match(/<!-- CRT-ID ([0-9a-fA-F-]+) -->/);

      if (!match) {
        return false;
      }

      return true;
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
      const config = vscode.workspace.getConfiguration('crt');
      this._panel.webview.postMessage({ type: 'reload', data: config });
    }

    _render(webview) {
      this._panel.title = 'CRT Settings';
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
                 <div>***********************************************************************************</div>
                  <h1 class="title">CRT display set up</h1>
                  <div>***********************************************************************************</div>
                  <div class="warning">
                    <figure>
                      <img nonce="${nonce}" src="${imageUri}" width="300" id="nope" />
                      <div class="blend-layer"></div>
                    </figure>
                    <h2 class="nope-text">You haven't enabled the main theme styles yet.</h2>
                    <p>
                      You can enable the theme by switching the power button or by executing the command
                      <code> > CRT: Enable theme</code> on the Command Palette (needs a restart) [may take a few seconds].
                    </p>
                  </div>
                  <div class="content hidden">
                    <h2>Now you can adjust your terminal in real time!</h2>
                    <p>
                      Play around with the controls, the screen will show you the result of your changes.
                    </p>
                    <p>Select the desired color using the phosphor selection (not real phosphor)</p>
                    <p>
                    <p>
                      Hit the "Apply" button once you're done.
                    </p>
                    <p>
                      You can also disable the CRT effects (scanlines, noise and flicker) using the
                      button bellow. They're subtle but can be too intense depending on the
                      contrast/brightness/saturation settings.
                    </p>
                    <p>
                      To completely disable the theme just switch the power button or execute
                      <code> > CRT: Disable theme</code> on the Command Palette
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
              <div class="switches hidden">
                <p class="button__label">CRT Effects</p>
                <div class="button__container">
                  <label class="button">
                    <input type="checkbox" id="crt-toggle" />
                    <div class="button__surface">ΟI</div>
                    <b class="button__raised-surface"></b>
                  </label>

                </div>
              </div>
              <div class="switches hidden">
                <p class="button__label">Phosphor selection</p>
                <div class="button__container">
                  <label class="button">
                    <input type="radio" name="phosphor" id="green" value="green"/>
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
                  <span class="button__label">P55 BAM <span class="label-color label-color--blue">blue</span></span>
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


}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
