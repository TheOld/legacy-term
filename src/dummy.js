import path from 'path';
import * as vscode from 'vscode';
import fs from 'fs';

const __dirname = path.resolve();

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  this.extensionName = 'LeandroRodrigues.vt220-vscode';
  this.cntx = context;

  const provider = new SettingsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SettingsViewProvider.viewType, provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vt220.setContrast', function () {
      provider.setContrast();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vt220.setBrightness', function () {
      provider.setBrightness();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vt220.setColor', function () {
      provider.setColor();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vt220.setSaturation', function () {
      provider.setSaturation();
    }),
  );

  const disposable = vscode.commands.registerCommand('vt220.enableEffects', init);

  const disable = vscode.commands.registerCommand('vt220.disableEffects', uninstall);

  context.subscriptions.push(disposable);
  context.subscriptions.push(disable);
}

class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vt220.settingsView';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'colorSelected': {
          vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
          break;
        }
      }
    });
  }

  public setColor() {
    if (this._view) {
      this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
      this._view.webview.postMessage({ type: 'setColor' });
    }
  }

  // TODO: Implement other settings

  public clearColors() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'clearColors' });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'),
    );

    // Do the same for the stylesheet.

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'),
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleVSCodeUri}" rel="stylesheet">


				<title>VT220 Settings</title>
			</head>
			<body>
				<ul class="color-list">
				</ul>
				<button class="set-color-button">Set color</button>
        <button class="set-brightness-button">Set brightness</button>
        <button class="set-contrast-button">Set contrast</button>
        <button class="set-saturation-button">Set saturation</button>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function init() {
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

    // Generate chrome styles from css to inject
    const chromeStyles = fs.readFileSync(__dirname + '/css/editor_chrome.css', 'utf-8');

    const jsTemplate = fs.readFileSync(__dirname + '/js/theme_template.js', 'utf-8');

    const themeWithChrome = jsTemplate.replace(/\[CHROME_STYLES\]/g, chromeStyles);

    fs.writeFileSync(templateFile, themeWithChrome, 'utf-8');

    // check if the tag is already there
    const isEnabled = html.includes('vt220.js');

    if (!isEnabled) {
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
}

// this method is called when your extension is deactivated
export function deactivate() {
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
