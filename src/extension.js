const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
// const diff = require('semver/functions/diff');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  this.extensionName = 'LeandroRodrigues.vt220-vscode';
  this.cntx = context;

  let disposable = vscode.commands.registerCommand('vt220.enableEffects', function () {
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

      // const shaderVsContent = fs.readFileSync(__dirname + '/js/draw_shader_vs.js', 'utf-8');
      // const shaderVs = `<script id="draw-shader-vs" type="x-shader/x-vertex">${shaderVsContent}</script>`;

      // const shaderFsContent = fs.readFileSync(__dirname + '/js/draw_shader_fs.js', 'utf-8');
      // const shaderFs = `<script id="draw-shader-fs" type="x-shader/x-fragment">${shaderFsContent}</script>`;

      // Generate chrome styles from css to inject
      const chromeStyles = fs.readFileSync(__dirname + '/css/editor_chrome.css', 'utf-8');

      const jsTemplate = fs.readFileSync(__dirname + '/js/theme_template.js', 'utf-8');

      const themeWithChrome = jsTemplate.replace(/\[CHROME_STYLES\]/g, chromeStyles);

      fs.writeFileSync(templateFile, themeWithChrome, 'utf-8');

      // check if the tag is already there
      const isEnabled = html.includes('vt220.js');

      if (!isEnabled) {
        // let output = html.replace(
        //   /(<\/html>)/g,
        //   '<!-- !! WebGl Shaders !! -->\n' +
        //     shaderVs +
        //     shaderFs +
        //     '<!-- !! WebGl Shaders !! -->\n</html>',
        // );

        let output = html.replace(
          /^.*(<!-- VT220 --><script src="vt220.js"><\/script><!-- VT220 -->).*\n?/gm,
          '',
        );

        // add script tag
        output = output.replace(
          /\<\/html\>/g,
          `	<!-- VT220 --><script src="vt220.js"></script><!-- VT220 -->\n`,
        );

        output += '</html>';

        fs.writeFileSync(htmlFile, output, 'utf-8');

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
          .showInformationMessage('VT220 is already enabled. Reload to refresh JS settings.', {
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
  });

  let disable = vscode.commands.registerCommand('vt220.disableEffects', uninstall);

  context.subscriptions.push(disposable);
  context.subscriptions.push(disable);
}

exports.activate = activate;

function showUpdatePage() {
  const panel = vscode.window.createWebviewPanel(
    `synthwave.whatsNew`, // Identifies the type of the webview. Used internally
    "What's new for Synthwave '84", // Title of the panel displayed to the user
    vscode.ViewColumn.One, // Editor column to show the new webview panel in.
    { enableScripts: !0 }, // Webview options. More on these later.
  );

  const viewPath = path.join(this.cntx.extensionPath, 'whats-new', 'view.html');
  const viewResourcePath = panel.webview.asWebviewUri(viewPath);
  const htmlContent = fs.readFileSync(viewPath, 'utf-8');
  panel.webview.html = htmlContent;
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

module.exports = {
  activate,
  deactivate,
};
