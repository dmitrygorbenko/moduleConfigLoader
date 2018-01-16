
'use strict';

var
    _ = require("lodash"),
    fs = require("fs"),
    path = require("path");

// instead of importing colors I used this article:
// https://ourcodeworld.com/articles/read/298/how-to-show-colorful-messages-in-the-console-in-node-js

function logInfo() {

    var
        args = Array.prototype.slice.call(arguments);

    args.unshift("\x1b[1m\x1b[37m");
    args.push("\x1b[39m\x1b[22m");

    console.log.apply(console, args);
}

function logError() {
    var
        args = Array.prototype.slice.call(arguments);

    args.unshift("\x1b[1m\x1b[31m");
    args.push("\x1b[39m\x1b[22m");

    console.log.apply(console, args);
}

function ConfigPlugin(options) {

    this.options = _.defaults(options, {
        modulesToImportConfigFrom: []
    });
};

ConfigPlugin.prototype.apply = function(compiler) {

    compiler.plugin("environment", function() {

        var
            compiledAliasesList = {},
            importedAliases = {};

        logInfo("Merging config files from different modules if possible...");

        _.each(this.options.modulesToImportConfigFrom, function (moduleName) {

            logInfo("Merging config from: ", moduleName);

            var
                config,
                moduleConfigFileName = path.normalize(compiler.options.context + "/bower_components/" + moduleName + "/config.js");

            if (!fs.existsSync(moduleConfigFileName)) {
                logError("Config file form module '" + moduleName + "' doesn't exists: " + moduleConfigFileName);
                return;
            }

            logInfo("... getting config data from " + moduleConfigFileName);

            var content = fs.readFileSync(moduleConfigFileName);

            var
                functToGetConfig = new Function("myFunc", "var\n" +
                    "        config,\n" +
                    "        requirejs = {\n" +
                    "            config: function (config) {\n" +
                    "                return config;\n" +
                    "            }\n" +
                    "        };\n" +
                    "    \n" +
                    "    config = " + content + " return config;")

            try {
                config = functToGetConfig();
            } catch (e) {
                logError("... failed to get from this file, please, check it");
                return;
            }

            if (!config.webpackConfig) {
                return;
            }

            if (config.webpackConfig.resolve) {
                if (config.webpackConfig.resolve.alias) {
                    importedAliases[moduleName] = config.webpackConfig.resolve.alias;

                    logInfo("... read", Object.keys(config.webpackConfig.resolve.alias).length, "alises");
                }
            }
        });

        _.each(importedAliases, function (aliases, moduleName) {
            compiledAliasesList = _.extend(compiledAliasesList, aliases);
        });

        compiler.options.resolve.alias = _.extend(compiledAliasesList, compiler.options.resolve.alias);

        //logInfo("Aliases are: ", compiler.options.resolve.alias);

    }.bind(this));
};

module.exports = ConfigPlugin;
