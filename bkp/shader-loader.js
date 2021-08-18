// import ShaderPass from './ShaderPass';
// import ShaderMaterial from './ShaderMaterial';

const ShaderPass = require('./ShaderPass');
const ShaderMat = require('./ShaderMaterial');

const createPassFromFragmentString = (fragmentShader) => {
  return createPassFromOptions({ fragmentShader });
};

const createPassFromOptions = (options) => {
  if (options.shaderPass) {
    return options.shaderPass;
  }

  if (options.shaderMaterial) {
    return new ShaderPass(options.shaderMaterial);
  }

  if (options.vertexShader || options.fragmentShader) {
    return new ShaderPass(new ShaderMat(options));
  }

  return null;
};

const createPassFromCallback = (callback, { hyperTerm, xTerm }) => {
  return callback({ ShaderPass, ShaderMat, hyperTerm, xTerm });
};

module.exports = {
  createPassFromFragmentString,
  createPassFromOptions,
  createPassFromCallback,
};
