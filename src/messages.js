exports.messages = {
  admin: 'You must run VS code with admin priviliges in order to enable CRT.',
  enabled: 'CRT is enabled. VS code must reload for this change to take effect.',
  disabled: 'CRT is disabled. VS code must reload for this change to take effect',
  notRunning: "CRT isn't running.",
  already_disabled: 'Custom CSS and JS already disabled.',
  genericError: 'Something went wrong: ',
  restartIde: 'Restart Visual Studio Code',
  cannotLoad: 'Error: ',
  notConfigured:
    'Custom CSS and JS path not configured. ' +
    'Please set "vscode_custom_css.imports" in your user settings.',
  reloadAfterVersionUpgrade:
    'Detected reloading CSS / JS after VSCode is upgraded. ' + 'Performing application only.',
};
