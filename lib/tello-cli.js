(function() {
  var digest, fs, getArgs, main;

  fs = require('fs');

  digest = require('./digester').digest;

  getArgs = function() {
    var argv, optimist;
    optimist = require('optimist').usage("Usage: $0 [options] [source_files]").options('o', {
      alias: 'output-file',
      describe: 'The output directory',
      "default": './api.json'
    }).options('i', {
      alias: 'input-file',
      describe: 'The output directory',
      "default": './metadata.json'
    }).options('h', {
      alias: 'help',
      describe: 'Show the help'
    });
    argv = optimist.argv;
    if (argv.h) {
      return console.log(optimist.help());
    } else {
      return {
        input: argv.i,
        output: argv.o
      };
    }
  };

  main = function() {
    var args, json, metadata;
    if (!(args = getArgs())) {
      return;
    }
    metadata = JSON.parse(fs.readFileSync(args.input, 'utf8'));
    json = digest(metadata);
    return fs.writeFileSync(args.output, JSON.stringify(json, null, '  '));
  };

  module.exports = {
    main: main
  };

}).call(this);
