(function() {
  var digest;

  digest = require('./digester').digest;

  module.exports = {
    digest: digest
  };

}).call(this);
